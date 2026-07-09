from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Encounter
from clinical.serializers import ClinicalNoteSerializer, DiagnosisSerializer, ObservationSerializer


class ClinicalSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    def serializer_context_for(self, user):
        request = self.factory.post("/api/clinical/")
        request.user = user
        return {"request": request}

    def test_diagnosis_serializer_rejects_nurse_role(self):
        serializer = DiagnosisSerializer(
            data={
                "clinic": self.clinic.id,
                "encounter": self.encounter.id,
                "icd10_code": "A01",
                "description": "Restricted",
            },
            context=self.serializer_context_for(self.nurse),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_clinical_note_serializer_rejects_foreign_encounter(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        serializer = ClinicalNoteSerializer(
            data={
                "clinic": self.clinic.id,
                "encounter": foreign_encounter.id,
                "subjective": "Mismatch",
            },
            context=self.serializer_context_for(self.doctor),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_observation_serializer_accepts_nurse_role(self):
        serializer = ObservationSerializer(
            data={
                "clinic": self.clinic.id,
                "encounter": self.encounter.id,
                "name": "Pulse",
                "value": "72",
                "unit": "bpm",
            },
            context=self.serializer_context_for(self.nurse),
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
