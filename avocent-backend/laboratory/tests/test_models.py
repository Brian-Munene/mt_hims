from django.db import IntegrityError
from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from laboratory.models import LabOrderItem, LabResult


class LaboratoryModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_lab_order_item_must_be_unique_per_test_within_order_and_clinic(self):
        with self.assertRaises(IntegrityError):
            LabOrderItem.objects.create(
                clinic=self.clinic,
                created_by=self.doctor,
                lab_order=self.lab_order,
                lab_test=self.lab_test,
            )

    def test_lab_result_is_one_to_one_with_lab_order_item(self):
        with self.assertRaises(IntegrityError):
            LabResult.objects.create(
                clinic=self.clinic,
                created_by=self.lab_technician,
                lab_order_item=self.lab_order_item,
                result_value="Abnormal",
                verified_by=self.lab_practitioner,
            )
