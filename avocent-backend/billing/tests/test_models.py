from django.db import IntegrityError
from django.test import TestCase

from billing.models import ServiceCatalogue
from core.tests.utils import ClinicAPIFixtureMixin


class BillingModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_service_code_must_be_unique_within_a_clinic(self):
        with self.assertRaises(IntegrityError):
            ServiceCatalogue.objects.create(
                clinic=self.clinic,
                created_by=self.admin,
                name="Repeat Consultation",
                code=self.service.code,
                price="3000.00",
                category="consultation",
            )

    def test_service_code_can_be_reused_in_another_clinic(self):
        service = ServiceCatalogue.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            name="Consultation",
            code=self.service.code,
            price="2000.00",
            category="consultation",
        )

        self.assertEqual(service.code, self.service.code)
