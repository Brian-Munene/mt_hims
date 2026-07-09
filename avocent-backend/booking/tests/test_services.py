from django.test import TestCase

from billing.models import InvoiceLine
from booking.models import Booking
from booking.services import (
    check_in_booking,
    checkout_booking,
    complete_consultation,
    complete_station,
    complete_triage,
    generate_booking_invoice,
    initialize_booking_defaults,
    route_booking,
    start_consultation,
    start_station,
    start_triage,
    sync_booking_billing_state,
)
from core.tests.utils import ClinicAPIFixtureMixin
from payments.models import Payment


class BookingServiceTests(ClinicAPIFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            appointment=self.appointment,
            assigned_practitioner=self.practitioner,
            booking_type="scheduled",
            encounter_type="video",
        )
        initialize_booking_defaults(self.booking, performed_by=self.receptionist)

    def test_check_in_routes_to_triage(self):
        check_in_booking(self.booking, performed_by=self.receptionist)
        self.booking.refresh_from_db()

        self.assertEqual(self.booking.status, "waiting_triage")
        self.assertTrue(self.booking.queues.filter(queue_type="triage", status="waiting").exists())

    def test_full_paid_checkout_flow(self):
        check_in_booking(self.booking, performed_by=self.receptionist)
        start_triage(self.booking, performed_by=self.nurse)
        complete_triage(self.booking, performed_by=self.nurse)
        start_consultation(self.booking, performed_by=self.doctor)
        complete_consultation(self.booking, performed_by=self.doctor)
        route_booking(self.booking, "billing", performed_by=self.receptionist)
        invoice = self.booking.invoices.get()
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "not_paid")
        Payment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            invoice=invoice,
            amount="2500.00",
            payment_method="cash",
            status="successful",
        )
        sync_booking_billing_state(self.booking, performed_by=self.receptionist)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertEqual(self.booking.status, "ready_for_checkout")
        checkout_booking(self.booking, performed_by=self.receptionist)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")

    def test_complete_station_returns_to_awaiting_disposition(self):
        check_in_booking(self.booking, performed_by=self.receptionist)
        start_triage(self.booking, performed_by=self.nurse)
        complete_triage(self.booking, performed_by=self.nurse)
        start_consultation(self.booking, performed_by=self.doctor)
        complete_consultation(self.booking, performed_by=self.doctor)
        route_booking(self.booking, "laboratory", performed_by=self.doctor)
        start_station(self.booking, "laboratory", performed_by=self.lab_technician)
        complete_station(self.booking, "laboratory", performed_by=self.lab_technician)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "awaiting_disposition")
    def test_generated_invoice_preserves_manual_lines_on_refresh(self):
        check_in_booking(self.booking, performed_by=self.receptionist)
        start_triage(self.booking, performed_by=self.nurse)
        complete_triage(self.booking, performed_by=self.nurse)
        start_consultation(self.booking, performed_by=self.doctor)
        complete_consultation(self.booking, performed_by=self.doctor)
        route_booking(self.booking, "laboratory", performed_by=self.doctor)
        invoice = generate_booking_invoice(self.booking, performed_by=self.receptionist, refresh=True)
        InvoiceLine.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            invoice=invoice,
            service_name="Manual admin fee",
            quantity="1.00",
            unit_price="100.00",
            total_price="100.00",
            metadata={"auto_generated": False},
        )
        refreshed = generate_booking_invoice(self.booking, performed_by=self.receptionist, refresh=True)
        self.assertTrue(refreshed.lines.filter(service_name="Manual admin fee").exists())

