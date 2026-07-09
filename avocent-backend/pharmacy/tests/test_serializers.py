from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from core.tests.utils import ClinicAPIFixtureMixin
from pharmacy.models import Medication
from pharmacy.serializers import MedicationSerializer, PrescriptionItemSerializer, StockBatchSerializer


class PharmacySerializerTests(ClinicAPIFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    def serializer_context_for(self, user):
        request = self.factory.post("/api/pharmacy/")
        request.user = user
        return {"request": request}

    def test_medication_serializer_rejects_receptionist_role(self):
        serializer = MedicationSerializer(
            data={
                "clinic": self.clinic.id,
                "name": "Ibuprofen",
                "strength": "400mg",
            },
            context=self.serializer_context_for(self.receptionist),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_stock_batch_serializer_rejects_invalid_quantities(self):
        serializer = StockBatchSerializer(
            data={
                "clinic": self.clinic.id,
                "medication": self.medication.id,
                "batch_number": "STOCK-001",
                "expiry_date": timezone.localdate() + timedelta(days=30),
                "quantity_received": 10,
                "quantity_remaining": 11,
            },
            context=self.serializer_context_for(self.pharmacist),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("quantity_remaining", serializer.errors)

    def test_prescription_item_serializer_rejects_foreign_medication(self):
        foreign_medication = Medication.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            name="Foreign Drug",
            strength="20mg",
        )
        serializer = PrescriptionItemSerializer(
            data={
                "clinic": self.clinic.id,
                "prescription": self.prescription.id,
                "medication": foreign_medication.id,
                "dosage": "1 tablet",
                "frequency": "daily",
                "duration": "5 days",
                "quantity": 5,
            },
            context=self.serializer_context_for(self.pharmacist),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
