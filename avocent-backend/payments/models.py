from django.db import models
from django.utils import timezone

from core.models import CoreModel


class Payment(CoreModel):
    METHOD_CHOICES = [
        ("mpesa", "M-PESA"),
        ("cash", "Cash"),
        ("card", "Card"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("successful", "Successful"),
        ("failed", "Failed"),
    ]

    invoice = models.ForeignKey("billing.Invoice", on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, db_index=True)
    phone_number = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    transaction_date = models.DateTimeField(default=timezone.now)
    callback_payload = models.JSONField(default=dict, blank=True)
