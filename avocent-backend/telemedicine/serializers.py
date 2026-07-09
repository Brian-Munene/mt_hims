from rest_framework import serializers

from core.serializers import resolve_field, validate_clinic_match
from telemedicine.models import ChatSessionState, TelemedicineSession


class TelemedicineSessionSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        patient = resolve_field(self, attrs, "patient")
        encounter = resolve_field(self, attrs, "encounter")
        start_time = resolve_field(self, attrs, "start_time")
        end_time = resolve_field(self, attrs, "end_time")

        validate_clinic_match(self, attrs, "patient", "Telemedicine session clinic must match the patient clinic.")
        validate_clinic_match(
            self, attrs, "encounter", "Telemedicine session clinic must match the encounter clinic."
        )
        if patient and encounter and patient != encounter.patient:
            raise serializers.ValidationError("Telemedicine session patient must match the encounter patient.")
        if start_time and end_time and end_time < start_time:
            raise serializers.ValidationError({"end_time": "Telemedicine session end time must be after start time."})
        return attrs

    class Meta:
        model = TelemedicineSession
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class ChatSessionStateSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "encounter", "Chat session state clinic must match the encounter clinic.")
        return attrs

    class Meta:
        model = ChatSessionState
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
