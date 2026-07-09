import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import CoreModel


class Booking(CoreModel):
    BOOKING_TYPE_CHOICES = [
        ("walk_in", "Walk In"),
        ("scheduled", "Scheduled"),
        ("telemedicine", "Telemedicine"),
    ]
    SOURCE_CHOICES = [
        ("reception", "Reception"),
        ("public_portal", "Public Portal"),
        ("call_center", "Call Center"),
        ("internal_referral", "Internal Referral"),
    ]
    ENCOUNTER_TYPE_CHOICES = [
        ("in_person", "In Person"),
        ("video", "Video"),
        ("audio", "Audio"),
    ]
    PRIORITY_CHOICES = [
        ("routine", "Routine"),
        ("urgent", "Urgent"),
        ("emergency", "Emergency"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("arrived", "Arrived"),
        ("waiting_triage", "Waiting Triage"),
        ("in_triage", "In Triage"),
        ("waiting_consultation", "Waiting Consultation"),
        ("in_consultation", "In Consultation"),
        ("awaiting_disposition", "Awaiting Disposition"),
        ("waiting_lab", "Waiting Lab"),
        ("in_lab", "In Lab"),
        ("waiting_pharmacy", "Waiting Pharmacy"),
        ("in_pharmacy", "In Pharmacy"),
        ("waiting_billing", "Waiting Billing"),
        ("not_paid", "Not Paid"),
        ("ready_for_checkout", "Ready For Checkout"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("not_paid", "Not Paid"),
        ("partially_paid", "Partially Paid"),
        ("paid", "Paid"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="bookings")
    appointment = models.ForeignKey(
        "encounters.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    assigned_practitioner = models.ForeignKey(
        "users.PractitionerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    booking_number = models.CharField(max_length=20)
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPE_CHOICES, default="walk_in")
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="reception")
    encounter_type = models.CharField(max_length=20, choices=ENCOUNTER_TYPE_CHOICES, default="in_person")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="routine")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="not_paid")
    triage_required = models.BooleanField(default=True)
    reason_for_visit = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    check_in_time = models.DateTimeField(null=True, blank=True)
    triage_start_time = models.DateTimeField(null=True, blank=True)
    triage_end_time = models.DateTimeField(null=True, blank=True)
    consultation_start_time = models.DateTimeField(null=True, blank=True)
    consultation_end_time = models.DateTimeField(null=True, blank=True)
    checkout_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=["clinic", "booking_number"], name="uniq_booking_number_per_clinic"),
        ]

    def __str__(self):
        return f"{self.booking_number} - {self.patient}"

    def save(self, *args, **kwargs):
        if not self.booking_number:
            self.booking_number = f"BK-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class BookingEvent(CoreModel):
    booking = models.ForeignKey("booking.Booking", on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=80)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_events_performed",
    )
    notes = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-occurred_at", "-created_at")


class BookingQueue(CoreModel):
    QUEUE_TYPE_CHOICES = [
        ("reception", "Reception"),
        ("triage", "Triage"),
        ("consultation", "Consultation"),
        ("laboratory", "Laboratory"),
        ("pharmacy", "Pharmacy"),
        ("billing", "Billing"),
    ]
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("called", "Called"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    booking = models.ForeignKey("booking.Booking", on_delete=models.CASCADE, related_name="queues")
    queue_type = models.CharField(max_length=30, choices=QUEUE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    position = models.PositiveIntegerField(null=True, blank=True)
    assigned_practitioner = models.ForeignKey(
        "users.PractitionerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_queues",
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_booking_queues",
    )
    entered_at = models.DateTimeField(default=timezone.now)
    called_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("entered_at", "created_at")
