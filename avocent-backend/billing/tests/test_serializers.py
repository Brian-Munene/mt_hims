from django.test import TestCase

from billing.serializers import InvoiceSerializer, PaymentSerializer
from core.tests.utils import ClinicAPIFixtureMixin
from patients.models import Patient


class BillingSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def test_invoice_serializer_rejects_patient_encounter_mismatch(self):
        other_patient_same_clinic = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            first_name="Mismatch",
            last_name="Patient",
        )
        serializer = InvoiceSerializer(
            data={
                "clinic": self.clinic.id,
                "patient": other_patient_same_clinic.id,
                "encounter": self.encounter.id,
                "total_amount": "2500.00",
                "status": "unpaid",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_payment_serializer_rejects_non_positive_amount(self):
        serializer = PaymentSerializer(
            data={
                "clinic": self.clinic.id,
                "invoice": self.invoice.id,
                "amount": "0.00",
                "payment_method": "cash",
                "status": "successful",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)

    def test_payment_serializer_rejects_foreign_invoice(self):
        serializer = PaymentSerializer(
            data={
                "clinic": self.clinic.id,
                "invoice": self.invoice.id,
                "amount": "500.00",
                "payment_method": "cash",
            }
        )
        serializer.initial_data["invoice"] = str(self.invoice.id)
        serializer.initial_data["clinic"] = str(self.other_clinic.id)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
