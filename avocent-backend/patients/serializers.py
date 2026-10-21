from rest_framework import serializers
from django.utils import timezone

from core.serializers import validate_clinic_match
from patients.models import Allergy, ChronicCondition, Patient, PatientAlert, PatientDocument, PatientIdentifier


class PatientSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        date_of_birth = attrs.get("date_of_birth")
        if date_of_birth and date_of_birth > timezone.localdate():
            raise serializers.ValidationError({"date_of_birth": "Date of birth cannot be in the future."})
        return attrs

    class Meta:
        model = Patient
        fields = "__all__"
        # clinic is read-only: perform_create derives it from the requesting
        # user, so a client can never register a patient into a clinic that
        # isn't their own.
        read_only_fields = ("id", "clinic", "created_at", "updated_at", "created_by")


class PatientIdentifierSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "patient", "Patient identifier clinic must match the patient clinic.")
        return attrs

    class Meta:
        model = PatientIdentifier
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class AllergySerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "patient", "Allergy clinic must match the patient clinic.")
        return attrs

    class Meta:
        model = Allergy
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class ChronicConditionSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "patient", "Chronic condition clinic must match the patient clinic.")
        return attrs

    class Meta:
        model = ChronicCondition
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class PatientAlertSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "patient", "Alert clinic must match the patient clinic.")
        return attrs

    class Meta:
        model = PatientAlert
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class PatientDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField(read_only=True)

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def validate(self, attrs):
        validate_clinic_match(self, attrs, "patient", "Document clinic must match the patient clinic.")
        return attrs

    class Meta:
        model = PatientDocument
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by", "is_finalised")
