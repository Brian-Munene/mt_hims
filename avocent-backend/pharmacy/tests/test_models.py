from datetime import timedelta

from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from pharmacy.models import Medication, StockBatch


class PharmacyModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_stock_batch_number_must_be_unique_per_medication_in_clinic(self):
        StockBatch.objects.create(
            clinic=self.clinic,
            created_by=self.pharmacist,
            medication=self.medication,
            batch_number="BATCH-001",
            expiry_date=timezone.localdate() + timedelta(days=90),
            quantity_received=100,
            quantity_remaining=90,
        )

        with self.assertRaises(IntegrityError):
            StockBatch.objects.create(
                clinic=self.clinic,
                created_by=self.pharmacist,
                medication=self.medication,
                batch_number="BATCH-001",
                expiry_date=timezone.localdate() + timedelta(days=120),
                quantity_received=80,
                quantity_remaining=80,
            )

    def test_stock_batch_number_can_repeat_for_same_batch_in_other_clinic(self):
        other_medication = Medication.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            name="Amoxicillin",
            strength="500mg",
        )

        batch = StockBatch.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            medication=other_medication,
            batch_number="BATCH-001",
            expiry_date=timezone.localdate() + timedelta(days=90),
            quantity_received=50,
            quantity_remaining=50,
        )

        self.assertEqual(batch.batch_number, "BATCH-001")
