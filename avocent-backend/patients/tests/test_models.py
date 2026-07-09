from django.db import IntegrityError
from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from patients.models import PatientIdentifier


class PatientModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_patient_string_representation_uses_full_name(self):
        self.assertEqual(str(self.patient), "Amina Otieno")

    def test_patient_identifier_type_must_be_unique_per_patient_in_clinic(self):
        PatientIdentifier.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            patient=self.patient,
            identifier_type="national_id",
            identifier_value="12345678",
        )

        with self.assertRaises(IntegrityError):
            PatientIdentifier.objects.create(
                clinic=self.clinic,
                created_by=self.admin,
                patient=self.patient,
                identifier_type="national_id",
                identifier_value="87654321",
            )
