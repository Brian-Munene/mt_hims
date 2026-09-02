from rest_framework import status
from rest_framework.test import APITestCase

from booking.models import Booking
from booking.services import initialize_booking_defaults
from core.tests.utils import ClinicAPIFixtureMixin


class BookingViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_create_booking_without_clinic_uses_request_user_clinic(self):
        # The frontend's "Clinic override" field is left blank in the normal
        # case, so `clinic` is never sent. Regression test for a real bug:
        # clinic was missing from read_only_fields, so DRF rejected every
        # create with "This field is required." before perform_create ever
        # got a chance to fill it in.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/booking/bookings/",
            {
                "patient": str(self.patient.id),
                "booking_type": "walk_in",
                "encounter_type": "in_person",
                "reason_for_visit": "General consultation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.clinic_id, self.clinic.id)

    def test_create_booking_ignores_client_supplied_clinic(self):
        # clinic is read-only: an explicit "Clinic override" value must be
        # silently overridden by the requester's own clinic, not honored —
        # otherwise any authenticated user could book a patient into a
        # clinic they don't belong to.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/booking/bookings/",
            {
                "clinic": str(self.other_clinic.id),
                "patient": str(self.patient.id),
                "booking_type": "walk_in",
                "encounter_type": "in_person",
                "reason_for_visit": "General consultation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.clinic_id, self.clinic.id)

    def test_receptionist_can_create_walk_in_booking(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/booking/bookings/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "booking_type": "walk_in",
                "encounter_type": "in_person",
                "reason_for_visit": "General consultation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "arrived")

    def test_full_booking_workflow_until_checkout(self):
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            appointment=self.appointment,
            assigned_practitioner=self.practitioner,
            booking_type="scheduled",
            encounter_type="video",
        )
        initialize_booking_defaults(booking, performed_by=self.receptionist)
        self.client.force_authenticate(self.receptionist)
        self.client.post(f"/api/booking/bookings/{booking.id}/arrive/", {}, format="json")
        initialize_booking_defaults(booking, performed_by=self.receptionist)
        self.client.post(f"/api/booking/bookings/{booking.id}/check-in/", {}, format="json")

        self.client.force_authenticate(self.nurse)
        self.client.post(f"/api/booking/bookings/{booking.id}/start-triage/", {}, format="json")
        self.client.post(f"/api/booking/bookings/{booking.id}/complete-triage/", {}, format="json")

        self.client.force_authenticate(self.doctor)
        self.client.post(f"/api/booking/bookings/{booking.id}/start-consultation/", {}, format="json")
        self.client.post(f"/api/booking/bookings/{booking.id}/complete-consultation/", {}, format="json")
        self.client.post(f"/api/booking/bookings/{booking.id}/route-to-billing/", {}, format="json")

        self.client.force_authenticate(self.receptionist)
        booking.refresh_from_db()
        invoice = booking.invoices.get()
        self.assertEqual(booking.status, "not_paid")

        payment_response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(invoice.id),
                "amount": "2500.00",
                "payment_method": "cash",
                "status": "successful",
            },
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)

        booking.refresh_from_db()
        self.assertEqual(booking.status, "ready_for_checkout")

        checkout_response = self.client.post(f"/api/booking/bookings/{booking.id}/checkout/", {}, format="json")
        self.assertEqual(checkout_response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "completed")

    def test_checkout_rejects_unpaid_booking(self):
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            booking_type="walk_in",
            encounter_type="in_person",
        )
        initialize_booking_defaults(booking, performed_by=self.receptionist)
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(f"/api/booking/bookings/{booking.id}/checkout/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_queue_board_and_report_summary_are_available(self):
        self.client.force_authenticate(self.receptionist)
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            booking_type="walk_in",
            encounter_type="in_person",
        )
        self.client.post(f"/api/booking/bookings/{booking.id}/check-in/", {}, format="json")
        queue_response = self.client.get("/api/booking/bookings/queue-board/")
        report_response = self.client.get("/api/booking/bookings/reports/summary/")

        self.assertEqual(queue_response.status_code, status.HTTP_200_OK)
        self.assertEqual(report_response.status_code, status.HTTP_200_OK)
        self.assertIn("total_bookings", report_response.data)
    def test_route_to_billing_generates_editable_invoice(self):
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            appointment=self.appointment,
            assigned_practitioner=self.practitioner,
            booking_type="scheduled",
            encounter_type="video",
        )
        self.client.force_authenticate(self.receptionist)
        initialize_booking_defaults(booking, performed_by=self.receptionist)
        self.client.post(f"/api/booking/bookings/{booking.id}/check-in/", {}, format="json")
        self.client.force_authenticate(self.nurse)
        self.client.post(f"/api/booking/bookings/{booking.id}/start-triage/", {}, format="json")
        self.client.post(f"/api/booking/bookings/{booking.id}/complete-triage/", {}, format="json")
        self.client.force_authenticate(self.doctor)
        self.client.post(f"/api/booking/bookings/{booking.id}/start-consultation/", {}, format="json")
        self.client.post(f"/api/booking/bookings/{booking.id}/complete-consultation/", {}, format="json")
        response = self.client.post(f"/api/booking/bookings/{booking.id}/route-to-billing/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        invoice = booking.invoices.first()
        self.assertIsNotNone(invoice)
        self.assertGreater(invoice.lines.count(), 0)
        self.assertEqual(booking.status, "not_paid")

