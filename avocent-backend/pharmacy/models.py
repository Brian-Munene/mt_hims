from django.db import models

from core.models import CoreModel


class Medication(CoreModel):
    name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True)
    strength = models.CharField(max_length=100, blank=True)
    dosage_form = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    is_controlled = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)


class StockBatch(CoreModel):
    medication = models.ForeignKey("pharmacy.Medication", on_delete=models.PROTECT, related_name="stock_batches")
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    quantity_received = models.PositiveIntegerField(default=0)
    quantity_remaining = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "medication", "batch_number"],
                name="uniq_batch_per_medication_per_clinic",
            )
        ]


class Prescription(CoreModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("dispensed", "Dispensed"),
        ("cancelled", "Cancelled"),
    ]

    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="prescriptions")
    prescribed_by = models.ForeignKey("users.PractitionerProfile", on_delete=models.PROTECT, related_name="prescriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    hash_signature = models.CharField(max_length=255, blank=True)


class PrescriptionItem(CoreModel):
    prescription = models.ForeignKey("pharmacy.Prescription", on_delete=models.CASCADE, related_name="items")
    medication = models.ForeignKey("pharmacy.Medication", on_delete=models.PROTECT, related_name="prescription_items")
    dosage = models.CharField(max_length=120, blank=True)
    frequency = models.CharField(max_length=120, blank=True)
    duration = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField(default=1)
