from django.utils import timezone
from rest_framework import serializers

from booking.models import Booking, BookingEvent, BookingQueue
from booking.services import initialize_booking_defaults
from core.serializers import resolve_field, validate_clinic_match


class BookingSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        clinic = resolve_field(self, attrs, "clinic")
        patient = resolve_field(self, attrs, "patient")
        appointment = resolve_field(self, attrs, "appointment")
        practitioner = resolve_field(self, attrs, "assigned_practitioner")
        scheduled_time = resolve_field(self, attrs, "scheduled_time")
        booking_type = resolve_field(self, attrs, "booking_type")
        encounter_type = resolve_field(self, attrs, "encounter_type")

        validate_clinic_match(self, attrs, "patient", "Booking clinic must match the patient clinic.")
        validate_clinic_match(
            self, attrs, "assigned_practitioner", "Assigned practitioner clinic must match the booking clinic."
        )
        if appointment:
            if clinic and clinic != appointment.clinic:
                raise serializers.ValidationError("Booking clinic must match the appointment clinic.")
            if patient and patient != appointment.patient:
                raise serializers.ValidationError("Booking patient must match the appointment patient.")
            if practitioner and practitioner != appointment.practitioner:
                raise serializers.ValidationError("Assigned practitioner must match the appointment practitioner.")
            if encounter_type and encounter_type != appointment.encounter_type:
                raise serializers.ValidationError("Booking encounter type must match the appointment encounter type.")
        if scheduled_time and booking_type == "scheduled" and scheduled_time < timezone.now():
            raise serializers.ValidationError({"scheduled_time": "Scheduled booking time cannot be in the past."})
        return attrs

    def create(self, validated_data):
        booking = super().create(validated_data)
        initialize_booking_defaults(booking, performed_by=self.context["request"].user)
        return booking

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ("id", "booking_number", "payment_status", "created_at", "updated_at", "created_by")


class BookingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class BookingQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingQueue
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class BookingActionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    position = serializers.IntegerField(required=False, min_value=1)
    assigned_practitioner = serializers.UUIDField(required=False)
    assigned_user = serializers.UUIDField(required=False)
