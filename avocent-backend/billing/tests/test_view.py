from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from billing.models import Invoice
from patients.models import Patient


class BillingViewTests(ClinicAPIFixtureMixin, APITestCase):
    @patch("billing.views.queue_mpesa_callback_processing")
    def test_mpesa_payment_creation_enqueues_callback_processing(self, queue_mock):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(self.invoice.id),
                "amount": "2500.00",
                "payment_method": "mpesa",
                "status": "pending",
                "callback_payload": {"ResultCode": 0, "CheckoutRequestID": "ws-123"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        queue_mock.assert_called_once()

    def test_receptionist_can_list_invoices(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/billing/invoices/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.invoice.id))

    def test_receptionist_can_create_payment(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(self.invoice.id),
                "amount": "2500.00",
                "payment_method": "cash",
                "status": "successful",
                "transaction_date": "2099-01-01T11:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_payment_rejects_non_positive_amount(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(self.invoice.id),
                "amount": "0.00",
                "payment_method": "cash",
                "status": "successful",
                "transaction_date": "2099-01-01T11:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invoice_rejects_patient_encounter_mismatch(self):
        other_patient_same_clinic = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            first_name="Mismatch",
            last_name="Patient",
        )
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/invoices/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(other_patient_same_clinic.id),
                "encounter": str(self.encounter.id),
                "total_amount": "1200.00",
                "status": "unpaid",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_rejects_invoice_from_another_clinic(self):
        foreign_invoice = Invoice.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            total_amount="3300.00",
            status="unpaid",
        )
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(foreign_invoice.id),
                "amount": "2500.00",
                "payment_method": "cash",
                "status": "successful",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(API_ENCRYPTION_ENABLED=True, API_ENCRYPTION_ENFORCE=True)
    def test_plaintext_write_is_rejected_when_encryption_is_enforced(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/billing/payments/",
            {
                "clinic": str(self.clinic.id),
                "invoice": str(self.invoice.id),
                "amount": "2500.00",
                "payment_method": "cash",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "encryption_required")
