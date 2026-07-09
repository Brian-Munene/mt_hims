from django.conf import settings
from django.db import models

from core.models import CoreModel


class Notification(CoreModel):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    href = models.CharField(max_length=500, blank=True)
    read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    source_app = models.CharField(max_length=50, blank=True)
    source_object_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-created_at"]


class NotificationTemplate(CoreModel):
    EVENT_TYPE_CHOICES = [
        ("appointment_reminder", "Appointment Reminder"),
        ("lab_result_ready", "Lab Result Ready"),
        ("compliance_alert", "Compliance Alert"),
        ("other", "Other"),
    ]

    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, unique=True)
    subject = models.CharField(max_length=255)
    html_body = models.TextField(blank=True, help_text="HTML email body. Use {{variable}} placeholders.")
    text_body = models.TextField(blank=True, help_text="Plain-text fallback body.")


class EmailLog(CoreModel):
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    event_type = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="sent")
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
