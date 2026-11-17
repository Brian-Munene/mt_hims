from rest_framework import serializers
from django.utils import timezone

from core.serializers import resolve_effective_clinic, resolve_field, validate_clinic_match
from encounters.models import Appointment, AvailabilitySlot, Encounter

SLOT_OVERLAP_ERROR = "This slot overlaps with an existing availability slot for this practitioner."
APPOINTMENT_CONFLICT_ERROR = "This practitioner already has an appointment at this time."
APPOINTMENT_UNIQUE_CONSTRAINT = "uniq_active_appointment_per_practitioner_time"


def conflicting_appointments(practitioner, scheduled_time, *, exclude_pk=None):
    """Live appointments that would collide with
    uniq_active_appointment_per_practitioner_time. Shared by the serializer and
    the reschedule action so both agree with the database constraint."""
    appointments = Appointment.objects.filter(
        practitioner=practitioner,
        scheduled_time=scheduled_time,
        status="scheduled",
        is_active=True,
    )
    if exclude_pk is not None:
        appointments = appointments.exclude(pk=exclude_pk)
    return appointments


def overlapping_availability_slots(practitioner, day_of_week, start_time, end_time, *, exclude_pk=None):
    """Slots for this practitioner/day whose [start_time, end_time) window overlaps
    the given one. Touching boundaries (end == next start) do not overlap.

    Shared by the serializer's fast-path validation and the viewset's
    lock-guarded re-check so the two never disagree on what "overlap" means.
    """
    slots = AvailabilitySlot.objects.filter(
        practitioner=practitioner,
        day_of_week=day_of_week,
        start_time__lt=end_time,
        end_time__gt=start_time,
    )
    if exclude_pk is not None:
        slots = slots.exclude(pk=exclude_pk)
    return slots


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        practitioner = resolve_field(self, attrs, "practitioner")
        day_of_week = resolve_field(self, attrs, "day_of_week")
        start_time = resolve_field(self, attrs, "start_time")
        end_time = resolve_field(self, attrs, "end_time")

        validate_clinic_match(self, attrs, "practitioner", "Availability slot clinic must match the practitioner clinic.")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        # Fast-path check for a friendly 400 in the common, uncontended case. This
        # is NOT authoritative: two concurrent requests can both pass it before
        # either row commits. AvailabilitySlotViewSet re-runs the same check under
        # a per-practitioner row lock, which is where the race is actually closed.
        if practitioner and day_of_week is not None and start_time and end_time:
            overlapping = overlapping_availability_slots(
                practitioner,
                day_of_week,
                start_time,
                end_time,
                exclude_pk=self.instance.pk if self.instance else None,
            )
            if overlapping.exists():
                raise serializers.ValidationError(SLOT_OVERLAP_ERROR)
        return attrs

    class Meta:
        model = AvailabilitySlot
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class AppointmentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        scheduled_time = resolve_field(self, attrs, "scheduled_time")

        validate_clinic_match(self, attrs, "patient", "Appointment clinic must match the patient clinic.")
        validate_clinic_match(self, attrs, "practitioner", "Appointment clinic must match the practitioner clinic.")
        if scheduled_time and scheduled_time < timezone.now():
            raise serializers.ValidationError({"scheduled_time": "Appointment time cannot be in the past."})

        # Fast-path for a friendly 400. The unique constraint is authoritative
        # under concurrency; the viewset maps its IntegrityError to the same error.
        practitioner = resolve_field(self, attrs, "practitioner")
        status = attrs.get("status", self.instance.status if self.instance else "scheduled")
        is_active = attrs.get("is_active", self.instance.is_active if self.instance else True)
        if practitioner and scheduled_time and status == "scheduled" and is_active:
            exclude_pk = self.instance.pk if self.instance else None
            if conflicting_appointments(practitioner, scheduled_time, exclude_pk=exclude_pk).exists():
                raise serializers.ValidationError({"scheduled_time": APPOINTMENT_CONFLICT_ERROR})
        return attrs

    class Meta:
        model = Appointment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
        # DRF derives a generic "must make a unique set" validator from the
        # conditional UniqueConstraint; validate() already enforces it with a
        # clearer message keyed on scheduled_time. Note this also suppresses
        # validators for any unique constraint added to Appointment later.
        validators = []


class EncounterSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        # resolve_effective_clinic, not resolve_field: the appointment/booking
        # cross-checks below must use the clinic the record will actually be
        # saved under, or omitting `clinic` from the payload (the normal
        # case) would resolve it to None and silently skip both checks.
        clinic = resolve_effective_clinic(self, attrs)
        patient = resolve_field(self, attrs, "patient")
        practitioner = resolve_field(self, attrs, "practitioner")
        appointment = resolve_field(self, attrs, "appointment")
        booking = resolve_field(self, attrs, "booking")
        start_time = resolve_field(self, attrs, "start_time")
        end_time = resolve_field(self, attrs, "end_time")

        validate_clinic_match(self, attrs, "patient", "Encounter clinic must match the patient clinic.")
        validate_clinic_match(self, attrs, "practitioner", "Encounter clinic must match the practitioner clinic.")
        if appointment:
            if clinic and clinic != appointment.clinic:
                raise serializers.ValidationError("Encounter clinic must match the appointment clinic.")
            if patient and patient != appointment.patient:
                raise serializers.ValidationError("Encounter patient must match the appointment patient.")
            if practitioner and practitioner != appointment.practitioner:
                raise serializers.ValidationError("Encounter practitioner must match the appointment practitioner.")
        if booking:
            if clinic and clinic != booking.clinic:
                raise serializers.ValidationError("Encounter clinic must match the booking clinic.")
            if patient and patient != booking.patient:
                raise serializers.ValidationError("Encounter patient must match the booking patient.")
        if start_time and end_time and end_time < start_time:
            raise serializers.ValidationError({"end_time": "Encounter end time must be after start time."})
        return attrs

    class Meta:
        model = Encounter
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
