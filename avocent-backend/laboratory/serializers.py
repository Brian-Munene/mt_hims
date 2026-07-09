from rest_framework import serializers

from core.serializers import validate_clinic_match
from laboratory.models import LabOrder, LabOrderItem, LabResult, LabTestCatalogue
from users.constants import ROLE_ADMIN, ROLE_DOCTOR, ROLE_LAB_TECHNICIAN
from users.serializer_restrictions import require_any_role


class LabTestCatalogueSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_LAB_TECHNICIAN),
                "Only lab technicians or admins can create or update lab tests.",
            )
        return attrs

    class Meta:
        model = LabTestCatalogue
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class LabOrderSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR),
                "Only doctors or admins can create or update lab orders.",
            )
        validate_clinic_match(self, attrs, "encounter", "Lab order clinic must match the encounter clinic.")
        validate_clinic_match(
            self, attrs, "ordered_by", "Lab order clinic must match the ordering practitioner clinic."
        )
        return attrs

    class Meta:
        model = LabOrder
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class LabOrderItemSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR, ROLE_LAB_TECHNICIAN),
                "Only doctors, lab technicians, or admins can create or update lab order items.",
            )
        validate_clinic_match(self, attrs, "lab_order", "Lab order item clinic must match the lab order clinic.")
        validate_clinic_match(self, attrs, "lab_test", "Lab order item clinic must match the lab test clinic.")
        return attrs

    class Meta:
        model = LabOrderItem
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class LabResultSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR, ROLE_LAB_TECHNICIAN),
                "Only doctors, lab technicians, or admins can create or update lab results.",
            )
        validate_clinic_match(
            self, attrs, "lab_order_item", "Lab result clinic must match the lab order item clinic."
        )
        validate_clinic_match(
            self, attrs, "verified_by", "Lab result clinic must match the verifying practitioner clinic."
        )
        return attrs

    class Meta:
        model = LabResult
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
