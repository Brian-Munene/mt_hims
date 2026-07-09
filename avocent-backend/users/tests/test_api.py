import base64
import os

from django.test import override_settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from clinical.models import ClinicalNote, Diagnosis, Observation
from core.encryption import decrypt_json_payload, encrypt_json_bytes
from encounters.models import Encounter
from laboratory.models import LabOrder
from organization.models import Clinic
from patients.models import Patient
from pharmacy.models import Medication, Prescription
from telemedicine.models import TelemedicineSession
from users.constants import ROLE_DOCTOR, ROLE_NURSE, ROLE_RECEPTIONIST
from users.models import PractitionerProfile, User
from users.services import assign_role, ensure_clinic_roles


class UsersAndPatientsAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="API-001")
        self.other_clinic = Clinic.objects.create(name="Other", registration_number="API-002")
        ensure_clinic_roles(self.clinic)
        ensure_clinic_roles(self.other_clinic)

        self.doctor = User.objects.create_user(
            email="doctor-api@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.receptionist = User.objects.create_user(
            email="reception-api@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.nurse = User.objects.create_user(
            email="nurse-api@example.com",
            password="secret123",
            clinic=self.clinic,
        )

        clinic_roles = {role.name: role for role in self.clinic.roles.all()}
        assign_role(user=self.doctor, role=clinic_roles[ROLE_DOCTOR])
        assign_role(user=self.receptionist, role=clinic_roles[ROLE_RECEPTIONIST])
        assign_role(user=self.nurse, role=clinic_roles[ROLE_NURSE])

        self.practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            user=self.doctor,
            license_number="LIC-001",
            specialty="General Medicine",
        )
        self.nurse_practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            user=self.nurse,
            license_number="LIC-002",
            specialty="Nursing",
        )

        self.patient = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            first_name="Alice",
            last_name="Clinic",
        )
        self.encounter = Encounter.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            practitioner=self.practitioner,
        )
        self.clinical_note = ClinicalNote.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            subjective="Headache",
        )
        self.diagnosis = Diagnosis.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            icd10_code="A01",
            description="Typhoid fever",
            is_primary=True,
        )
        self.observation = Observation.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            name="Blood Pressure",
            value="120/80",
            unit="mmHg",
        )
        self.medication = Medication.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            name="Amoxicillin",
            strength="500mg",
        )
        self.prescription = Prescription.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            prescribed_by=self.practitioner,
        )
        self.lab_order = LabOrder.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            ordered_by=self.practitioner,
        )
        self.telemedicine_session = TelemedicineSession.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            encounter=self.encounter,
            session_type="video",
            session_link="https://meet.example.com/session-1",
        )
        self.foreign_patient = Patient.objects.create(
            clinic=self.other_clinic,
            first_name="Bob",
            last_name="Foreign",
        )

    def test_current_user_endpoint_returns_authenticated_user(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.doctor.email)

    def test_schema_endpoint_is_available(self):
        response = self.client.get("/api/schema/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_redoc_endpoint_is_available(self):
        response = self.client.get("/api/docs/redoc/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_endpoint_returns_token(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": self.doctor.email, "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertTrue(Token.objects.filter(user=self.doctor).exists())

    def test_jwt_token_endpoint_returns_access_and_refresh(self):
        response = self.client.post(
            "/api/auth/jwt/token/",
            {"email": self.doctor.email, "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_patient_list_is_clinic_scoped(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/patients/patients/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.patient.id))

    def test_receptionist_cannot_list_users(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/auth/users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_list_clinical_notes(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/clinical/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.clinical_note.id))

    def test_patient_nested_notes_endpoint_returns_patient_notes(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get(f"/api/patients/patients/{self.patient.id}/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.clinical_note.id))

    def test_appointment_rejects_foreign_patient(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.foreign_patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": "2099-01-01T10:00:00Z",
                "encounter_type": "in_person",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nurse_cannot_create_diagnosis_due_to_role_specific_serializer_rule(self):
        self.client.force_authenticate(self.nurse)
        response = self.client.post(
            "/api/clinical/diagnoses/",
            {
                "clinic": str(self.clinic.id),
                "encounter": str(self.encounter.id),
                "icd10_code": "B01",
                "description": "Restricted diagnosis",
                "is_primary": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_can_list_pharmacy_laboratory_and_telemedicine_endpoints(self):
        self.client.force_authenticate(self.doctor)

        prescription_response = self.client.get("/api/pharmacy/prescriptions/")
        lab_order_response = self.client.get("/api/laboratory/orders/")
        telemedicine_response = self.client.get("/api/telemedicine/sessions/")

        self.assertEqual(prescription_response.status_code, status.HTTP_200_OK)
        self.assertEqual(lab_order_response.status_code, status.HTTP_200_OK)
        self.assertEqual(telemedicine_response.status_code, status.HTTP_200_OK)
        self.assertEqual(prescription_response.data["results"][0]["id"], str(self.prescription.id))
        self.assertEqual(lab_order_response.data["results"][0]["id"], str(self.lab_order.id))
        self.assertEqual(telemedicine_response.data["results"][0]["id"], str(self.telemedicine_session.id))

    @override_settings(API_ENCRYPTION_ENABLED=True)
    def test_encrypted_login_payload_returns_encrypted_response(self):
        key = base64.b64encode(b"0123456789abcdef0123456789abcdef").decode("utf-8")
        previous_key = os.environ.get("API_ENCRYPTION_KEY")
        os.environ["API_ENCRYPTION_KEY"] = key
        try:
            plaintext = b'{"username":"doctor-api@example.com","password":"secret123"}'
            payload = encrypt_json_bytes(plaintext, aad=b"/api/auth/login/")
            response = self.client.post(
                "/api/auth/login/",
                data=payload,
                format="json",
                HTTP_X_ENCRYPTED_PAYLOAD="1",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response["X-Encrypted-Payload"], "1")
            decrypted = decrypt_json_payload(response.json(), aad=b"response")
            self.assertIn(b'"token"', decrypted)
        finally:
            if previous_key is None:
                os.environ.pop("API_ENCRYPTION_KEY", None)
            else:
                os.environ["API_ENCRYPTION_KEY"] = previous_key
