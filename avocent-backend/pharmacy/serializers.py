from rest_framework import serializers
from django.utils import timezone

from core.serializers import resolve_field, validate_clinic_match
from pharmacy.models import Medication, Prescription, PrescriptionItem, StockBatch
from users.constants import ROLE_ADMIN, ROLE_DOCTOR, ROLE_PHARMACIST
from users.serializer_restrictions import require_any_role


class MedicationSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_PHARMACIST),
                "Only pharmacists or admins can create or update medications.",
            )
        return attrs

    class Meta:
        model = Medication
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class StockBatchSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_PHARMACIST),
                "Only pharmacists or admins can create or update stock batches.",
            )
        validate_clinic_match(self, attrs, "medication", "Stock batch clinic must match the medication clinic.")
        expiry_date = resolve_field(self, attrs, "expiry_date")
        quantity_received = attrs.get("quantity_received", getattr(self.instance, "quantity_received", None))
        quantity_remaining = attrs.get("quantity_remaining", getattr(self.instance, "quantity_remaining", None))

        if expiry_date and expiry_date < timezone.localdate():
            raise serializers.ValidationError({"expiry_date": "Stock batch expiry date cannot be in the past."})
        if quantity_received is not None and quantity_remaining is not None and quantity_remaining > quantity_received:
            raise serializers.ValidationError({"quantity_remaining": "Remaining quantity cannot exceed received quantity."})
        return attrs

    class Meta:
        model = StockBatch
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class PrescriptionSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR),
                "Only doctors or admins can create or update prescriptions.",
            )
        validate_clinic_match(self, attrs, "encounter", "Prescription clinic must match the encounter clinic.")
        validate_clinic_match(
            self, attrs, "prescribed_by", "Prescription clinic must match the prescribing practitioner clinic."
        )
        return attrs

    class Meta:
        model = Prescription
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class PrescriptionItemSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is None or attrs:
            require_any_role(
                self,
                (ROLE_ADMIN, ROLE_DOCTOR, ROLE_PHARMACIST),
                "Only doctors, pharmacists, or admins can create or update prescription items.",
            )
        validate_clinic_match(
            self, attrs, "prescription", "Prescription item clinic must match the prescription clinic."
        )
        validate_clinic_match(self, attrs, "medication", "Prescription item clinic must match the medication clinic.")
        return attrs

    class Meta:
        model = PrescriptionItem
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
