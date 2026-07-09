from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.serializers import AppointmentSerializer, EncounterSerializer


class EncounterSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def test_appointment_serializer_rejects_past_scheduled_time(self):
        serializer = AppointmentSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.patient.id,
                "practitioner": self.practitioner.id,
                "scheduled_time": timezone.now() - timedelta(hours=1),
                "encounter_type": "video",
                "status": "scheduled",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("scheduled_time", serializer.errors)

    def test_encounter_serializer_rejects_end_before_start(self):
        start_time = timezone.now()
        serializer = EncounterSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.patient.id,
                "practitioner": self.practitioner.id,
                "start_time": start_time,
                "end_time": start_time - timedelta(minutes=5),
                "encounter_type": "in_person",
                "status": "active",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("end_time", serializer.errors)

    def test_encounter_serializer_rejects_mismatched_appointment_patient(self):
        serializer = EncounterSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.patient.id,
                "practitioner": self.practitioner.id,
                "appointment": self.appointment.id,
                "encounter_type": "video",
                "status": "active",
            }
        )
        serializer.initial_data["patient"] = self.other_patient.id

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
