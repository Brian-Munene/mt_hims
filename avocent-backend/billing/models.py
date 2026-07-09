from django.db import models

from core.models import CoreModel


class ServiceCatalogue(CoreModel):
    CATEGORY_CHOICES = [
        ("consultation", "Consultation"),
        ("lab_test", "Lab Test"),
        ("medication", "Medication"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "code"], name="uniq_service_code_per_clinic"),
        ]


class Invoice(CoreModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
        ("void", "Void"),
    ]

    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    booking = models.ForeignKey("booking.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="invoices")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    due_date = models.DateField(null=True, blank=True)


class InvoiceLine(CoreModel):
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.CASCADE, related_name="lines")
    service_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
