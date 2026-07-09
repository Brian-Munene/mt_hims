from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from payments.models import Payment


class PaymentModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_payment_defaults_to_pending_with_empty_callback_payload(self):
        payment = Payment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            invoice=self.invoice,
            amount="2500.00",
            payment_method="cash",
        )

        self.assertEqual(payment.status, "pending")
        self.assertEqual(payment.callback_payload, {})
