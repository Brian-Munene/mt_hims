from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Encounter
from telemedicine.serializers import ChatSessionStateSerializer, TelemedicineSessionSerializer


class TelemedicineSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def test_telemedicine_session_serializer_rejects_patient_encounter_mismatch(self):
        serializer = TelemedicineSessionSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.other_patient.id,
                "encounter": self.encounter.id,
                "session_type": "video",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_telemedicine_session_serializer_rejects_end_before_start(self):
        start_time = timezone.now()
        serializer = TelemedicineSessionSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.patient.id,
                "encounter": self.encounter.id,
                "session_type": "video",
                "start_time": start_time,
                "end_time": start_time - timedelta(minutes=5),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("end_time", serializer.errors)

    def test_chat_session_state_serializer_rejects_foreign_encounter(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        serializer = ChatSessionStateSerializer(
            data={
                "clinic": self.clinic.id,
                "patient_phone": self.patient.phone,
                "current_state": "handoff",
                "encounter": foreign_encounter.id,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
