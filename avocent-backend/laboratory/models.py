from django.db import models

from core.fields import EncryptedTextField
from core.models import CoreModel


class LabTestCatalogue(CoreModel):
    name = models.CharField(max_length=255)
    loinc_code = models.CharField(max_length=30, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    sample_type = models.CharField(max_length=100, blank=True)


class LabOrder(CoreModel):
    STATUS_CHOICES = [
        ("ordered", "Ordered"),
        ("collected", "Collected"),
        ("processing", "Processing"),
        ("completed", "Completed"),
    ]
    PRIORITY_CHOICES = [
        ("routine", "Routine"),
        ("urgent", "Urgent"),
        ("stat", "STAT"),
    ]

    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="lab_orders")
    ordered_by = models.ForeignKey("users.PractitionerProfile", on_delete=models.PROTECT, related_name="lab_orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ordered")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="routine")


class LabOrderItem(CoreModel):
    lab_order = models.ForeignKey("laboratory.LabOrder", on_delete=models.CASCADE, related_name="items")
    lab_test = models.ForeignKey("laboratory.LabTestCatalogue", on_delete=models.PROTECT, related_name="order_items")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "lab_order", "lab_test"], name="uniq_lab_test_per_order_per_clinic"),
        ]


class LabResult(CoreModel):
    lab_order_item = models.OneToOneField("laboratory.LabOrderItem", on_delete=models.CASCADE, related_name="result")
    result_value = EncryptedTextField()
    unit = models.CharField(max_length=40, blank=True)
    reference_range = models.CharField(max_length=120, blank=True)
    abnormal_flag = models.CharField(max_length=40, blank=True)
    verified_by = models.ForeignKey(
        "users.PractitionerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_lab_results",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
