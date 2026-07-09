from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from booking.serializers import BookingSerializer
from core.tests.utils import ClinicAPIFixtureMixin


class BookingSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.request = self.factory.post("/api/booking/bookings/")
        self.request.user = self.receptionist

    def test_serializer_rejects_mismatched_patient_clinic(self):
        serializer = BookingSerializer(
            data={
                "clinic": str(self.clinic.id),
                "patient": str(self.other_patient.id),
                "booking_type": "walk_in",
                "encounter_type": "in_person",
            },
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_serializer_rejects_past_scheduled_booking(self):
        serializer = BookingSerializer(
            data={
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "booking_type": "scheduled",
                "encounter_type": "video",
                "scheduled_time": (timezone.now() - timedelta(hours=1)).isoformat(),
            },
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("scheduled_time", serializer.errors)
