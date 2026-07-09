from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin


class PatientViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_patient_list_is_clinic_scoped(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/patients/patients/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.patient.id))

    def test_patient_encounters_action_returns_related_encounter(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get(f"/api/patients/patients/{self.patient.id}/encounters/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.encounter.id))

    def test_patient_notes_action_returns_related_note(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get(f"/api/patients/patients/{self.patient.id}/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.clinical_note.id))

    def test_identifier_creation_rejects_patient_from_another_clinic(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/patients/identifiers/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.other_patient.id),
                "identifier_type": "passport",
                "identifier_value": "P1234567",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
