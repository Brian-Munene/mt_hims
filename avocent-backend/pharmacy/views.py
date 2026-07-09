from drf_spectacular.utils import extend_schema_view, extend_schema
from core.api import ClinicScopedModelViewSet
from pharmacy.models import Medication, Prescription, PrescriptionItem, StockBatch
from pharmacy.serializers import (
    MedicationSerializer,
    PrescriptionItemSerializer,
    PrescriptionSerializer,
    StockBatchSerializer,
)


@extend_schema_view(
    list=extend_schema(
        tags=["Pharmacy"],
        summary="List medications",
        description="Return the medication formulary available to the clinic pharmacy.",
    ),
    create=extend_schema(
        tags=["Pharmacy"],
        summary="Create medication",
        description="Create a formulary medication entry. Restricted to pharmacist/admin roles.",
    ),
)
class MedicationViewSet(ClinicScopedModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    filterset_fields = ("is_active",)
    search_fields = ("name", "strength", "manufacturer")
    ordering_fields = ("created_at", "updated_at", "name", "reorder_level")


@extend_schema_view(
    list=extend_schema(
        tags=["Pharmacy"],
        summary="List stock batches",
        description="Return stock batches for medications, including expiry and remaining quantity.",
    ),
    create=extend_schema(
        tags=["Pharmacy"],
        summary="Create stock batch",
        description="Register a received medication batch in pharmacy inventory.",
    ),
)
class StockBatchViewSet(ClinicScopedModelViewSet):
    queryset = StockBatch.objects.all()
    serializer_class = StockBatchSerializer
    filterset_fields = ("medication", "is_active")
    search_fields = ("batch_number", "medication__name")
    ordering_fields = ("created_at", "updated_at", "expiry_date", "quantity_remaining")


@extend_schema_view(
    list=extend_schema(
        tags=["Pharmacy"],
        summary="List prescriptions",
        description="Return prescriptions issued during clinic encounters.",
    ),
    create=extend_schema(
        tags=["Pharmacy"],
        summary="Create prescription",
        description="Issue a prescription for an encounter. Restricted to doctor/admin roles.",
    ),
)
class PrescriptionViewSet(ClinicScopedModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    filterset_fields = ("encounter", "prescribed_by", "status", "is_active")
    search_fields = ("hash_signature", "encounter__patient__first_name", "encounter__patient__last_name")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Pharmacy"],
        summary="List prescription items",
        description="Return medication items attached to prescriptions.",
    ),
    create=extend_schema(
        tags=["Pharmacy"],
        summary="Create prescription item",
        description="Add a medication item, dosage, frequency, and duration to a prescription.",
    ),
)
class PrescriptionItemViewSet(ClinicScopedModelViewSet):
    queryset = PrescriptionItem.objects.all()
    serializer_class = PrescriptionItemSerializer
    filterset_fields = ("prescription", "medication", "is_active")
    search_fields = ("dosage", "frequency", "duration", "medication__name")
    ordering_fields = ("created_at", "updated_at", "quantity")
