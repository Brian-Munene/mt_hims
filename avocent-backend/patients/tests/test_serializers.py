from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from patients.serializers import ChronicConditionSerializer, PatientIdentifierSerializer, PatientSerializer


class PatientSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def test_patient_serializer_rejects_future_date_of_birth(self):
        serializer = PatientSerializer(
            data={
                "clinic": self.clinic.id,
                "first_name": "Future",
                "last_name": "Child",
                "date_of_birth": timezone.localdate() + timedelta(days=1),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("date_of_birth", serializer.errors)

    def test_identifier_serializer_rejects_foreign_patient(self):
        serializer = PatientIdentifierSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.other_patient.id,
                "identifier_type": "passport",
                "identifier_value": "P123456",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_chronic_condition_serializer_rejects_foreign_patient(self):
        serializer = ChronicConditionSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": self.other_patient.id,
                "diagnosis": "Hypertension",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
