from django.conf import settings
from django.db import models

from core.models import CoreModel


class ComplianceRecord(CoreModel):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    resource_type = models.CharField(max_length=100)
    resource_id = models.UUIDField()
    flag_reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compliance_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)


class Policy(CoreModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    body = models.TextField(blank=True)
    version = models.CharField(max_length=20, default="1.0")
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")


class PolicyVersion(CoreModel):
    """Immutable snapshot of a Policy captured before each update."""

    policy = models.ForeignKey("compliance.Policy", on_delete=models.CASCADE, related_name="versions")
    version_label = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=20)
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="policy_versions",
    )

    class Meta:
        ordering = ["-created_at"]
