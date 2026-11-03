from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from patients.models import Patient


class PatientViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_create_patient_without_clinic_uses_request_user_clinic(self):
        # The frontend registration form never sends `clinic` — it relies on
        # the server deriving it from the requesting user. Regression test
        # for a real bug: clinic was missing from read_only_fields, so DRF
        # rejected every create with "This field is required." before
        # perform_create ever got a chance to fill it in.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/patients/patients/",
            {"first_name": "New", "last_name": "Arrival", "gender": "unknown"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        patient = Patient.objects.get(id=response.data["id"])
        self.assertEqual(patient.clinic_id, self.clinic.id)

    def test_create_patient_ignores_client_supplied_clinic(self):
        # clinic is read-only: even an explicit attempt to register a patient
        # into a different clinic must be silently overridden by the
        # requester's own clinic, not honored.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/patients/patients/",
            {
                "first_name": "Cross",
                "last_name": "Clinic",
                "gender": "unknown",
                "clinic": str(self.other_clinic.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        patient = Patient.objects.get(id=response.data["id"])
        self.assertEqual(patient.clinic_id, self.clinic.id)

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

    def test_import_csv_rejects_a_file_past_the_row_cap(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from patients.views import MAX_IMPORT_ROWS

        self.client.force_authenticate(self.receptionist)
        before = Patient.objects.count()
        body = "first_name,last_name\n" + "".join(
            f"Patient {i},Arrival\n" for i in range(MAX_IMPORT_ROWS + 1)
        )
        response = self.client.post(
            "/api/patients/patients/import-csv/",
            {"file": SimpleUploadedFile("patients.csv", body.encode(), content_type="text/csv")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn("import limit", response.data["error"])
        self.assertEqual(Patient.objects.count(), before)

    def test_import_csv_creates_rows_and_sanitizes_bad_ones(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.receptionist)
        before = Patient.objects.count()
        body = (
            "first_name,last_name,gender,date_of_birth\n"
            "Ada,Lovelace,female,1815-12-10\n"
            "Bad,Gender,alien,\n"
            "Bad,Date,female,not-a-date\n"
            "Alan,Turing,male,\n"
        )
        response = self.client.post(
            "/api/patients/patients/import-csv/",
            {"file": SimpleUploadedFile("patients.csv", body.encode(), content_type="text/csv")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual([error["row"] for error in response.data["errors"]], [3, 4])
        # The messages are ours, not whatever the database said.
        for error in response.data["errors"]:
            self.assertNotIn("Exception", error["error"])
        self.assertEqual(Patient.objects.count(), before + 2)
