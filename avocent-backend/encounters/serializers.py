from rest_framework import serializers
from django.utils import timezone

from core.serializers import resolve_effective_clinic, resolve_field, validate_clinic_match
from encounters.models import Appointment, AvailabilitySlot, Encounter


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        practitioner = resolve_field(self, attrs, "practitioner")
        day_of_week = resolve_field(self, attrs, "day_of_week")
        start_time = resolve_field(self, attrs, "start_time")
        end_time = resolve_field(self, attrs, "end_time")

        validate_clinic_match(self, attrs, "practitioner", "Availability slot clinic must match the practitioner clinic.")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if practitioner and day_of_week is not None and start_time and end_time:
            overlapping = AvailabilitySlot.objects.filter(
                practitioner=practitioner,
                day_of_week=day_of_week,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError("This slot overlaps with an existing availability slot for this practitioner.")
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
        return attrs

    class Meta:
        model = Appointment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


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
