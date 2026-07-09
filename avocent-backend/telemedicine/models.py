from django.db import models
from django.utils import timezone

from core.models import CoreModel


class TelemedicineSession(CoreModel):
    SESSION_TYPE_CHOICES = [
        ("video", "Video"),
        ("chat", "Chat"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="telemedicine_sessions")
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="telemedicine_sessions")
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default="video")
    session_link = models.URLField(blank=True)
    status = models.CharField(max_length=30, default="active")
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)


class ChatSessionState(CoreModel):
    patient_phone = models.CharField(max_length=30, db_index=True)
    current_state = models.CharField(max_length=120)
    last_interaction_at = models.DateTimeField(default=timezone.now)
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.SET_NULL, null=True, blank=True, related_name="chat_states")
