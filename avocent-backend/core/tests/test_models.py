from django.db import connection
from django.test import TestCase

from clinical.models import ClinicalNote
from encounters.models import Encounter
from organization.models import Clinic
from patients.models import Patient, PatientIdentifier
from users.models import PractitionerProfile, User


class EncryptedFieldTestCase(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Encryption Clinic", registration_number="ENC-001")
        self.user = User.objects.create_user(
            email="encrypt@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            user=self.user,
            license_number="ENC-LIC-001",
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.user,
            first_name="Encrypted",
            last_name="Patient",
            national_id="12345678",
            sha_number="SHA-ABC-123",
        )
        self.encounter = Encounter.objects.create(
            clinic=self.clinic,
            created_by=self.user,
            patient=self.patient,
            practitioner=self.practitioner,
        )

    def test_patient_identifier_is_stored_encrypted_and_returned_plaintext(self):
        patient_identifier = PatientIdentifier.objects.create(
            clinic=self.clinic,
            created_by=self.user,
            patient=self.patient,
            identifier_type="national_id",
            identifier_value="98765432",
        )
        self.assertEqual(patient_identifier.identifier_value, "98765432")

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT identifier_value FROM patients_patientidentifier ORDER BY created_at DESC LIMIT 1"
            )
            stored_value = cursor.fetchone()[0]

        self.assertNotEqual(stored_value, "98765432")
        self.assertTrue(stored_value.startswith("enc::v1::"))

    def test_clinical_note_is_decrypted_through_orm(self):
        note = ClinicalNote.objects.create(
            clinic=self.clinic,
            created_by=self.user,
            encounter=self.encounter,
            subjective="Severe headache for 2 days",
        )

        fetched = ClinicalNote.objects.get(pk=note.pk)
        self.assertEqual(fetched.subjective, "Severe headache for 2 days")
