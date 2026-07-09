from django.test import TestCase

from booking.models import Booking, BookingEvent, BookingQueue
from booking.services import initialize_booking_defaults
from core.tests.utils import ClinicAPIFixtureMixin


class BookingModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_walk_in_booking_defaults_to_arrived(self):
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            booking_type="walk_in",
            reason_for_visit="Fever",
        )
        initialize_booking_defaults(booking, performed_by=self.receptionist)

        booking.refresh_from_db()
        self.assertTrue(booking.booking_number.startswith("BK-"))
        self.assertEqual(booking.status, "arrived")
        self.assertIsNotNone(booking.arrival_time)
        self.assertTrue(booking.events.filter(event_type="booking_created").exists())

    def test_booking_queue_and_event_string_related_data_exists(self):
        booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            booking_type="walk_in",
        )
        event = BookingEvent.objects.create(clinic=self.clinic, created_by=self.receptionist, booking=booking, event_type="checked_in")
        queue = BookingQueue.objects.create(clinic=self.clinic, created_by=self.receptionist, booking=booking, queue_type="triage")

        self.assertEqual(event.booking, booking)
        self.assertEqual(queue.booking, booking)
