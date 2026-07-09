from django.db import models
from django.utils import timezone

from core.models import CoreModel


class Appointment(CoreModel):
    ENCOUNTER_TYPE_CHOICES = [
        ("in_person", "In Person"),
        ("video", "Video"),
        ("audio", "Audio"),
    ]
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="appointments")
    practitioner = models.ForeignKey("users.PractitionerProfile", on_delete=models.PROTECT, related_name="appointments")
    scheduled_time = models.DateTimeField()
    encounter_type = models.CharField(max_length=20, choices=ENCOUNTER_TYPE_CHOICES, default="in_person")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")


class AvailabilitySlot(CoreModel):
    DAY_OF_WEEK_CHOICES = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    practitioner = models.ForeignKey(
        "users.PractitionerProfile", on_delete=models.CASCADE, related_name="availability_slots"
    )
    day_of_week = models.PositiveSmallIntegerField(choices=DAY_OF_WEEK_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)


class Encounter(CoreModel):
    TRIAGE_LEVEL_CHOICES = [
        ("green", "Green"),
        ("yellow", "Yellow"),
        ("orange", "Orange"),
        ("red", "Red"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="encounters")
    practitioner = models.ForeignKey("users.PractitionerProfile", on_delete=models.PROTECT, related_name="encounters")
    appointment = models.ForeignKey("encounters.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="encounters")
    booking = models.ForeignKey("booking.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="encounters")
    encounter_type = models.CharField(max_length=20, choices=Appointment.ENCOUNTER_TYPE_CHOICES, default="in_person")
    triage_score = models.PositiveIntegerField(null=True, blank=True)
    triage_level = models.CharField(max_length=20, choices=TRIAGE_LEVEL_CHOICES, default="green")
    physical_escalation_required = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
