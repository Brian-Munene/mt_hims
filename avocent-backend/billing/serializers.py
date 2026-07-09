from rest_framework import serializers

from billing.models import Invoice, InvoiceLine, ServiceCatalogue
from core.serializers import resolve_field, validate_clinic_match
from payments.models import Payment


class ServiceCatalogueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalogue
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class InvoiceSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        clinic = resolve_field(self, attrs, "clinic")
        patient = resolve_field(self, attrs, "patient")
        encounter = resolve_field(self, attrs, "encounter")
        booking = resolve_field(self, attrs, "booking")

        validate_clinic_match(self, attrs, "patient", "Invoice clinic must match the patient clinic.")
        if encounter:
            if clinic and clinic != encounter.clinic:
                raise serializers.ValidationError("Invoice clinic must match the encounter clinic.")
            if patient and patient != encounter.patient:
                raise serializers.ValidationError("Invoice patient must match the encounter patient.")
        if booking:
            if clinic and clinic != booking.clinic:
                raise serializers.ValidationError("Invoice clinic must match the booking clinic.")
            if patient and patient != booking.patient:
                raise serializers.ValidationError("Invoice patient must match the booking patient.")
        if booking and encounter and encounter.booking_id and booking != encounter.booking:
            raise serializers.ValidationError("Invoice booking must match the encounter booking.")
        return attrs

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class InvoiceLineSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        validate_clinic_match(self, attrs, "invoice", "Invoice line clinic must match the invoice clinic.")
        return attrs

    class Meta:
        model = InvoiceLine
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class PaymentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        amount = attrs.get("amount", getattr(self.instance, "amount", None))

        validate_clinic_match(self, attrs, "invoice", "Payment clinic must match the invoice clinic.")
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})
        return attrs

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")
