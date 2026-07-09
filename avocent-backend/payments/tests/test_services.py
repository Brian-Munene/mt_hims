from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from payments.services import queue_mpesa_callback_processing
from payments.tasks import process_mpesa_callback


class PaymentServiceTests(ClinicAPIFixtureMixin, TestCase):
    def test_mpesa_callback_task_updates_payment_status(self):
        payment = self.invoice.payments.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            amount="2500.00",
            payment_method="mpesa",
            status="pending",
        )

        result = process_mpesa_callback(str(payment.id), {"ResultCode": 0, "Receipt": "XYZ123"})
        payment.refresh_from_db()

        self.assertEqual(payment.status, "successful")
        self.assertEqual(payment.callback_payload["Receipt"], "XYZ123")
        self.assertEqual(result["status"], "successful")

    def test_queue_mpesa_callback_processing_skips_non_mpesa_payments(self):
        payment = self.invoice.payments.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            amount="2500.00",
            payment_method="cash",
            status="successful",
        )

        queued = queue_mpesa_callback_processing(payment)

        self.assertFalse(queued)
