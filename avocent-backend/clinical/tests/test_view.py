from rest_framework import status
from rest_framework.test import APITestCase

from encounters.models import Encounter
from core.tests.utils import ClinicAPIFixtureMixin


class ClinicalViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_doctor_can_list_clinical_notes(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/clinical/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.clinical_note.id))

    def test_nurse_can_create_observation(self):
        self.client.force_authenticate(self.nurse)
        response = self.client.post(
            "/api/clinical/observations/",
            {
                "clinic": str(self.clinic.id),
                "encounter": str(self.encounter.id),
                "name": "Pulse",
                "value": "72",
                "unit": "bpm",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_nurse_cannot_create_diagnosis(self):
        self.client.force_authenticate(self.nurse)
        response = self.client.post(
            "/api/clinical/diagnoses/",
            {
                "clinic": str(self.clinic.id),
                "encounter": str(self.encounter.id),
                "icd10_code": "B01",
                "description": "Restricted diagnosis",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clinical_note_rejects_encounter_from_another_clinic(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/clinical/notes/",
            {
                "clinic": str(self.clinic.id),
                "encounter": str(foreign_encounter.id),
                "subjective": "Clinic mismatch",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
