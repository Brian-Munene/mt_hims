from rest_framework import serializers

from compliance.models import ComplianceRecord, Policy, PolicyVersion
from core.serializers import resolve_field


class ComplianceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceRecord
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "resource_type",
            "resource_id",
            "flag_reason",
            "reviewed_by",
            "reviewed_at",
        )


class PolicyVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyVersion
        fields = "__all__"
        read_only_fields = [field.name for field in PolicyVersion._meta.concrete_fields]


class PolicySerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        effective_date = resolve_field(self, attrs, "effective_date")
        expiry_date = resolve_field(self, attrs, "expiry_date")
        if effective_date and expiry_date and expiry_date < effective_date:
            raise serializers.ValidationError({"expiry_date": "Expiry date cannot be before the effective date."})
        return attrs

    class Meta:
        model = Policy
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
