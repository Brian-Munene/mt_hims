from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from billing.models import Invoice, InvoiceLine, ServiceCatalogue
from booking.models import Booking, BookingEvent, BookingQueue
from encounters.models import Encounter
from laboratory.models import LabOrderItem
from pharmacy.models import PrescriptionItem


ALLOWED_STATUS_TRANSITIONS = {
    "pending": {"confirmed", "arrived", "cancelled", "no_show"},
    "confirmed": {"arrived", "waiting_triage", "waiting_consultation", "cancelled", "no_show"},
    "arrived": {"waiting_triage", "waiting_consultation", "cancelled"},
    "waiting_triage": {"in_triage", "cancelled"},
    "in_triage": {"waiting_consultation", "cancelled"},
    "waiting_consultation": {"in_consultation", "cancelled"},
    "in_consultation": {"awaiting_disposition", "waiting_lab", "waiting_pharmacy", "waiting_billing", "cancelled"},
    "awaiting_disposition": {"waiting_lab", "waiting_pharmacy", "waiting_billing", "cancelled"},
    "waiting_lab": {"in_lab", "cancelled"},
    "in_lab": {"awaiting_disposition", "cancelled"},
    "waiting_pharmacy": {"in_pharmacy", "cancelled"},
    "in_pharmacy": {"awaiting_disposition", "cancelled"},
    "waiting_billing": {"not_paid", "ready_for_checkout", "cancelled"},
    "not_paid": {"ready_for_checkout", "cancelled"},
    "ready_for_checkout": {"completed", "cancelled"},
}

QUEUE_BY_STATUS = {
    "waiting_triage": "triage",
    "in_triage": "triage",
    "waiting_consultation": "consultation",
    "in_consultation": "consultation",
    "waiting_lab": "laboratory",
    "in_lab": "laboratory",
    "waiting_pharmacy": "pharmacy",
    "in_pharmacy": "pharmacy",
    "waiting_billing": "billing",
    "not_paid": "billing",
    "ready_for_checkout": "billing",
}


def log_booking_event(booking, event_type, performed_by=None, notes="", payload=None, from_status="", to_status=""):
    return BookingEvent.objects.create(
        clinic=booking.clinic,
        created_by=performed_by,
        booking=booking,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        performed_by=performed_by,
        notes=notes,
        payload=payload or {},
    )


def get_open_queue(booking, queue_type):
    return booking.queues.filter(queue_type=queue_type, status__in=["waiting", "called", "in_progress"]).order_by("entered_at").first()


def enter_queue(booking, queue_type, performed_by=None, position=None, assigned_practitioner=None, assigned_user=None, notes=""):
    queue = get_open_queue(booking, queue_type)
    if queue is not None:
        updates = []
        if position is not None:
            queue.position = position
            updates.append("position")
        if assigned_practitioner is not None:
            queue.assigned_practitioner = assigned_practitioner
            updates.append("assigned_practitioner")
        if assigned_user is not None:
            queue.assigned_user = assigned_user
            updates.append("assigned_user")
        if updates:
            queue.save(update_fields=updates + ["updated_at"])
        return queue

    queue = BookingQueue.objects.create(
        clinic=booking.clinic,
        created_by=performed_by,
        booking=booking,
        queue_type=queue_type,
        status="waiting",
        position=position,
        assigned_practitioner=assigned_practitioner,
        assigned_user=assigned_user,
    )
    log_booking_event(
        booking,
        event_type=f"entered_{queue_type}_queue",
        performed_by=performed_by,
        notes=notes,
        payload={"queue_id": str(queue.id), "queue_type": queue_type},
    )
    return queue


def mark_queue_in_progress(booking, queue_type, performed_by=None, assigned_practitioner=None, assigned_user=None, notes=""):
    queue = enter_queue(
        booking,
        queue_type,
        performed_by=performed_by,
        assigned_practitioner=assigned_practitioner,
        assigned_user=assigned_user,
    )
    queue.status = "in_progress"
    queue.called_at = queue.called_at or timezone.now()
    if assigned_practitioner is not None:
        queue.assigned_practitioner = assigned_practitioner
    if assigned_user is not None:
        queue.assigned_user = assigned_user
    queue.save(update_fields=["status", "called_at", "assigned_practitioner", "assigned_user", "updated_at"])
    log_booking_event(
        booking,
        event_type=f"started_{queue_type}",
        performed_by=performed_by,
        notes=notes,
        payload={"queue_id": str(queue.id), "queue_type": queue_type},
    )
    return queue


def complete_queue(booking, queue_type, performed_by=None, notes=""):
    queue = get_open_queue(booking, queue_type)
    if queue is None:
        return None
    queue.status = "completed"
    queue.completed_at = timezone.now()
    queue.save(update_fields=["status", "completed_at", "updated_at"])
    log_booking_event(
        booking,
        event_type=f"completed_{queue_type}",
        performed_by=performed_by,
        notes=notes,
        payload={"queue_id": str(queue.id), "queue_type": queue_type},
    )
    return queue


def transition_booking(booking, new_status, performed_by=None, notes="", payload=None, timestamp_field=None, force=False):
    current_status = booking.status
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current_status, set())
    if not force and current_status and new_status != current_status and new_status not in allowed:
        raise ValueError(f"Cannot transition booking from {current_status} to {new_status}.")

    booking.status = new_status
    if timestamp_field:
        setattr(booking, timestamp_field, getattr(booking, timestamp_field) or timezone.now())

    update_fields = ["status", "updated_at"]
    if timestamp_field:
        update_fields.append(timestamp_field)
    booking.save(update_fields=update_fields)
    log_booking_event(
        booking,
        event_type=f"status_changed_to_{new_status}",
        performed_by=performed_by,
        notes=notes,
        payload=payload or {},
        from_status=current_status,
        to_status=new_status,
    )
    return booking


def initialize_booking_defaults(booking, performed_by=None):
    changed_fields = []
    if booking.appointment:
        if not booking.scheduled_time:
            booking.scheduled_time = booking.appointment.scheduled_time
            changed_fields.append("scheduled_time")
        if not booking.assigned_practitioner:
            booking.assigned_practitioner = booking.appointment.practitioner
            changed_fields.append("assigned_practitioner")
        if booking.booking_type == "walk_in":
            booking.booking_type = "scheduled"
            changed_fields.append("booking_type")
        if not booking.encounter_type:
            booking.encounter_type = booking.appointment.encounter_type
            changed_fields.append("encounter_type")

    if booking.booking_type == "telemedicine" and not booking.arrival_time:
        booking.arrival_time = timezone.now()
        changed_fields.append("arrival_time")

    if booking.booking_type == "walk_in" and not booking.arrival_time:
        booking.arrival_time = timezone.now()
        booking.status = "arrived"
        changed_fields.extend(["arrival_time", "status"])
    elif booking.status == "pending":
        booking.status = "confirmed"
        changed_fields.append("status")

    if changed_fields:
        booking.save(update_fields=list(dict.fromkeys(changed_fields + ["updated_at"])))

    log_booking_event(
        booking,
        event_type="booking_created",
        performed_by=performed_by or booking.created_by,
        payload={"booking_type": booking.booking_type, "status": booking.status},
        to_status=booking.status,
    )
    return booking


def create_consultation_encounter(booking, performed_by=None):
    active_encounter = booking.encounters.filter(status="active").order_by("-start_time").first()
    if active_encounter:
        return active_encounter

    practitioner = booking.assigned_practitioner or booking.appointment.practitioner if booking.appointment else booking.assigned_practitioner
    if practitioner is None:
        raise ValueError("A practitioner must be assigned before consultation starts.")

    encounter = Encounter.objects.create(
        clinic=booking.clinic,
        created_by=performed_by,
        patient=booking.patient,
        practitioner=practitioner,
        appointment=booking.appointment,
        booking=booking,
        encounter_type=booking.encounter_type,
        status="active",
        start_time=timezone.now(),
    )
    log_booking_event(
        booking,
        event_type="encounter_opened",
        performed_by=performed_by,
        payload={"encounter_id": str(encounter.id)},
    )
    return encounter


def mark_arrived(booking, performed_by=None, notes=""):
    return transition_booking(booking, "arrived", performed_by=performed_by, notes=notes, timestamp_field="arrival_time")


def check_in_booking(booking, performed_by=None, notes="", queue_position=None):
    booking.check_in_time = booking.check_in_time or timezone.now()
    booking.save(update_fields=["check_in_time", "updated_at"])
    log_booking_event(booking, "checked_in", performed_by=performed_by, notes=notes)
    next_status = "waiting_triage" if booking.triage_required else "waiting_consultation"
    queue_type = "triage" if booking.triage_required else "consultation"
    transition_booking(booking, next_status, performed_by=performed_by, notes=notes)
    enter_queue(
        booking,
        queue_type,
        performed_by=performed_by,
        position=queue_position,
        assigned_practitioner=booking.assigned_practitioner if queue_type == "consultation" else None,
        notes=notes,
    )
    return booking


def start_triage(booking, performed_by=None, notes=""):
    mark_queue_in_progress(booking, "triage", performed_by=performed_by, notes=notes)
    return transition_booking(booking, "in_triage", performed_by=performed_by, notes=notes, timestamp_field="triage_start_time")


def complete_triage(booking, performed_by=None, notes="", queue_position=None):
    complete_queue(booking, "triage", performed_by=performed_by, notes=notes)
    booking.triage_end_time = booking.triage_end_time or timezone.now()
    booking.save(update_fields=["triage_end_time", "updated_at"])
    transition_booking(booking, "waiting_consultation", performed_by=performed_by, notes=notes)
    enter_queue(
        booking,
        "consultation",
        performed_by=performed_by,
        position=queue_position,
        assigned_practitioner=booking.assigned_practitioner,
        notes=notes,
    )
    return booking


def start_consultation(booking, performed_by=None, notes=""):
    mark_queue_in_progress(
        booking,
        "consultation",
        performed_by=performed_by,
        assigned_practitioner=booking.assigned_practitioner,
        notes=notes,
    )
    create_consultation_encounter(booking, performed_by=performed_by)
    return transition_booking(booking, "in_consultation", performed_by=performed_by, notes=notes, timestamp_field="consultation_start_time")


def complete_consultation(booking, performed_by=None, notes=""):
    complete_queue(booking, "consultation", performed_by=performed_by, notes=notes)
    booking.consultation_end_time = booking.consultation_end_time or timezone.now()
    booking.save(update_fields=["consultation_end_time", "updated_at"])
    active_encounter = booking.encounters.filter(status="active").order_by("-start_time").first()
    if active_encounter is not None:
        active_encounter.status = "completed"
        active_encounter.end_time = active_encounter.end_time or timezone.now()
        active_encounter.save(update_fields=["status", "end_time", "updated_at"])
    return transition_booking(booking, "awaiting_disposition", performed_by=performed_by, notes=notes)


def route_booking(booking, queue_type, performed_by=None, notes="", position=None, assigned_practitioner=None, assigned_user=None):
    target_status_map = {
        "laboratory": "waiting_lab",
        "pharmacy": "waiting_pharmacy",
        "billing": "waiting_billing",
    }
    target_status = target_status_map[queue_type]
    transition_booking(booking, target_status, performed_by=performed_by, notes=notes)
    enter_queue(
        booking,
        queue_type,
        performed_by=performed_by,
        position=position,
        assigned_practitioner=assigned_practitioner,
        assigned_user=assigned_user,
        notes=notes,
    )
    if queue_type == "billing":
        generate_booking_invoice(booking, performed_by=performed_by, refresh=True)
    return booking


def start_station(booking, queue_type, performed_by=None, notes="", assigned_practitioner=None, assigned_user=None):
    target_status_map = {
        "laboratory": "in_lab",
        "pharmacy": "in_pharmacy",
    }
    mark_queue_in_progress(
        booking,
        queue_type,
        performed_by=performed_by,
        assigned_practitioner=assigned_practitioner,
        assigned_user=assigned_user,
        notes=notes,
    )
    return transition_booking(booking, target_status_map[queue_type], performed_by=performed_by, notes=notes)


def complete_station(booking, queue_type, performed_by=None, notes=""):
    complete_queue(booking, queue_type, performed_by=performed_by, notes=notes)
    return transition_booking(booking, "awaiting_disposition", performed_by=performed_by, notes=notes)


def _consultation_service_for_booking(booking):
    queryset = ServiceCatalogue.objects.filter(
        clinic=booking.clinic,
        category="consultation",
        is_active=True,
    ).order_by("name", "created_at")
    return queryset.first()


def _generated_invoice_line_payloads(booking):
    payloads = []
    skipped = []

    consultation_service = _consultation_service_for_booking(booking)
    if consultation_service is not None:
        payloads.append({
            "service_name": consultation_service.name,
            "quantity": Decimal("1.00"),
            "unit_price": consultation_service.price,
            "total_price": consultation_service.price,
            "metadata": {
                "auto_generated": True,
                "source_type": "consultation",
                "source_key": "consultation",
                "service_code": consultation_service.code,
            },
        })
    else:
        skipped.append({"source_type": "consultation", "reason": "No active consultation service catalogue entry found."})

    lab_items = LabOrderItem.objects.select_related("lab_order", "lab_test").filter(
        clinic=booking.clinic,
        lab_order__encounter__booking=booking,
    )
    for item in lab_items:
        payloads.append({
            "service_name": item.lab_test.name,
            "quantity": Decimal("1.00"),
            "unit_price": item.lab_test.price,
            "total_price": item.lab_test.price,
            "metadata": {
                "auto_generated": True,
                "source_type": "lab_test",
                "source_key": f"lab-order-item:{item.id}",
                "lab_order_item_id": str(item.id),
            },
        })

    prescription_items = PrescriptionItem.objects.select_related("prescription", "medication").filter(
        clinic=booking.clinic,
        prescription__encounter__booking=booking,
        prescription__status__in=["active", "dispensed"],
    )
    for item in prescription_items:
        unit_price = item.medication.unit_price or Decimal("0")
        if unit_price <= 0:
            skipped.append({
                "source_type": "medication",
                "source_key": f"prescription-item:{item.id}",
                "reason": f"Medication {item.medication.name} has no unit price configured.",
            })
            continue
        quantity = Decimal(str(item.quantity))
        payloads.append({
            "service_name": item.medication.name,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": unit_price * quantity,
            "metadata": {
                "auto_generated": True,
                "source_type": "medication",
                "source_key": f"prescription-item:{item.id}",
                "prescription_item_id": str(item.id),
            },
        })

    return payloads, skipped


@transaction.atomic
def generate_booking_invoice(booking, performed_by=None, refresh=False):
    encounter = booking.encounters.order_by("-start_time").first()
    invoice = booking.invoices.exclude(status="void").order_by("-created_at").first()
    if invoice is None:
        invoice = Invoice.objects.create(
            clinic=booking.clinic,
            created_by=performed_by,
            booking=booking,
            encounter=encounter,
            patient=booking.patient,
            total_amount=Decimal("0.00"),
            status="draft",
        )
    else:
        changed = []
        if encounter is not None and invoice.encounter_id != encounter.id:
            invoice.encounter = encounter
            changed.append("encounter")
        if invoice.patient_id != booking.patient_id:
            invoice.patient = booking.patient
            changed.append("patient")
        if invoice.booking_id != booking.id:
            invoice.booking = booking
            changed.append("booking")
        if changed:
            invoice.save(update_fields=changed + ["updated_at"])

    auto_lines = [line for line in invoice.lines.all() if line.metadata.get("auto_generated")]
    if refresh and auto_lines:
        invoice.lines.filter(id__in=[line.id for line in auto_lines]).delete()

    existing_source_keys = {
        line.metadata.get("source_key")
        for line in invoice.lines.all()
        if line.metadata.get("auto_generated") and line.metadata.get("source_key")
    }

    payloads, skipped = _generated_invoice_line_payloads(booking)
    for payload in payloads:
        source_key = payload["metadata"]["source_key"]
        if source_key in existing_source_keys:
            continue
        InvoiceLine.objects.create(
            clinic=booking.clinic,
            created_by=performed_by,
            invoice=invoice,
            service_name=payload["service_name"],
            quantity=payload["quantity"],
            unit_price=payload["unit_price"],
            total_price=payload["total_price"],
            metadata=payload["metadata"],
        )

    total_amount = invoice.lines.aggregate(total=Sum("total_price")).get("total") or Decimal("0.00")
    invoice.total_amount = total_amount
    invoice.status = "unpaid" if total_amount > 0 else "draft"
    invoice.save(update_fields=["total_amount", "status", "updated_at"])

    log_booking_event(
        booking,
        event_type="invoice_generated",
        performed_by=performed_by,
        payload={
            "invoice_id": str(invoice.id),
            "line_count": invoice.lines.count(),
            "skipped": skipped,
            "refreshed": refresh,
        },
    )
    sync_booking_billing_state(booking, performed_by=performed_by)
    return invoice


def sync_booking_billing_state(booking, performed_by=None):
    invoices = booking.invoices.exclude(status="void")
    totals = invoices.aggregate(total_due=Sum("total_amount"))
    total_due = totals.get("total_due") or Decimal("0")
    total_paid = Decimal("0")
    for invoice in invoices:
        paid = invoice.payments.filter(status="successful").aggregate(total=Sum("amount")).get("total") or Decimal("0")
        total_paid += paid

    if total_due <= 0 or total_paid <= 0:
        payment_status = "not_paid"
    elif total_paid < total_due:
        payment_status = "partially_paid"
    else:
        payment_status = "paid"

    changed = []
    if booking.payment_status != payment_status:
        booking.payment_status = payment_status
        changed.append("payment_status")

    if payment_status == "paid" and booking.status in {"waiting_billing", "not_paid"}:
        booking.status = "ready_for_checkout"
        changed.append("status")
    elif total_due > 0 and payment_status != "paid" and booking.status in {"waiting_billing", "ready_for_checkout"}:
        booking.status = "not_paid"
        changed.append("status")

    if changed:
        booking.save(update_fields=list(dict.fromkeys(changed + ["updated_at"])))
        log_booking_event(
            booking,
            event_type="billing_state_synced",
            performed_by=performed_by,
            payload={"payment_status": booking.payment_status, "status": booking.status},
        )
    return booking


def checkout_booking(booking, performed_by=None, notes=""):
    if booking.payment_status != "paid":
        raise ValueError("Booking cannot be checked out before payment is completed.")
    complete_queue(booking, "billing", performed_by=performed_by, notes=notes)
    return transition_booking(booking, "completed", performed_by=performed_by, notes=notes, timestamp_field="checkout_time")


def cancel_booking(booking, performed_by=None, notes=""):
    return transition_booking(booking, "cancelled", performed_by=performed_by, notes=notes)


def mark_no_show(booking, performed_by=None, notes=""):
    return transition_booking(booking, "no_show", performed_by=performed_by, notes=notes)
