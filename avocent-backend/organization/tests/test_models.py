from django.test import TestCase

from organization.models import Clinic


class ClinicModelTests(TestCase):
    def test_string_representation_returns_name(self):
        clinic = Clinic.objects.create(name="Avocent Health", registration_number="ORG-001")

        self.assertEqual(str(clinic), "Avocent Health")

    def test_default_ordering_is_by_name(self):
        Clinic.objects.create(name="Zulu Clinic", registration_number="ORG-002")
        Clinic.objects.create(name="Alpha Clinic", registration_number="ORG-003")

        ordered_names = list(Clinic.objects.values_list("name", flat=True))

        self.assertEqual(ordered_names, ["Alpha Clinic", "Zulu Clinic"])

    def test_clinic_code_generation(self):
        clinic = Clinic.objects.create(name="Beta Clinic", registration_number="ORG-004")
        self.assertEqual(len(clinic.code), 6)
        self.assertTrue(clinic.code.isalnum())
        self.assertTrue(clinic.code.isupper())

    def test_clinic_code_is_unique(self):
        from django.db import IntegrityError
        Clinic.objects.create(name="Gamma Clinic", registration_number="ORG-005", code="ABCDEF")
        with self.assertRaises(IntegrityError):
            Clinic.objects.create(name="Delta Clinic", registration_number="ORG-006", code="ABCDEF")
