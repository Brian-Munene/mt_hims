from rest_framework import serializers

from clinical.models import ClinicalNote, Diagnosis, Observation
from core.serializers import validate_clinic_match
from users.constants import ROLE_ADMIN, ROLE_DOCTOR, ROLE_NURSE
from users.serializer_restrictions import require_any_role


class ClinicalNoteSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR, ROLE_NURSE),
                "Only doctors, nurses, or admins can create or update clinical notes.",
            )
        validate_clinic_match(self, attrs, "encounter", "Clinical note clinic must match the encounter clinic.")
        return attrs

    class Meta:
        model = ClinicalNote
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class DiagnosisSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR),
                "Only doctors or admins can create or update diagnoses.",
            )
        validate_clinic_match(self, attrs, "encounter", "Diagnosis clinic must match the encounter clinic.")
        return attrs

    class Meta:
        model = Diagnosis
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class ObservationSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR, ROLE_NURSE),
                "Only doctors, nurses, or admins can create or update observations.",
            )
        validate_clinic_match(self, attrs, "encounter", "Observation clinic must match the encounter clinic.")
        return attrs

    class Meta:
        model = Observation
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
