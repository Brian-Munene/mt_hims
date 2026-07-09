from drf_spectacular.utils import extend_schema_view, extend_schema
from core.api import ClinicScopedModelViewSet
from laboratory.models import LabOrder, LabOrderItem, LabResult, LabTestCatalogue
from laboratory.services import queue_lab_result_notification
from laboratory.serializers import (
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabResultSerializer,
    LabTestCatalogueSerializer,
)


@extend_schema_view(
    list=extend_schema(
        tags=["Laboratory"],
        summary="List lab tests",
        description="Return the clinic laboratory catalogue of available tests and pricing.",
    ),
    create=extend_schema(
        tags=["Laboratory"],
        summary="Create lab test",
        description="Create a laboratory test catalogue entry. Restricted to lab-tech/admin roles.",
    ),
)
class LabTestCatalogueViewSet(ClinicScopedModelViewSet):
    queryset = LabTestCatalogue.objects.all()
    serializer_class = LabTestCatalogueSerializer
    filterset_fields = ("sample_type", "is_active")
    search_fields = ("name", "loinc_code", "sample_type")
    ordering_fields = ("created_at", "updated_at", "name", "price")


@extend_schema_view(
    list=extend_schema(
        tags=["Laboratory"],
        summary="List lab orders",
        description="Return lab orders raised from encounters in the current clinic.",
    ),
    create=extend_schema(
        tags=["Laboratory"],
        summary="Create lab order",
        description="Create a lab order for an encounter. Restricted to doctor/admin roles.",
    ),
)
class LabOrderViewSet(ClinicScopedModelViewSet):
    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer
    filterset_fields = ("encounter", "ordered_by", "status", "priority", "is_active")
    search_fields = ("encounter__patient__first_name", "encounter__patient__last_name", "ordered_by__user__email")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Laboratory"],
        summary="List lab order items",
        description="Return requested tests attached to laboratory orders.",
    ),
    create=extend_schema(
        tags=["Laboratory"],
        summary="Create lab order item",
        description="Attach a lab test to an existing lab order.",
    ),
)
class LabOrderItemViewSet(ClinicScopedModelViewSet):
    queryset = LabOrderItem.objects.all()
    serializer_class = LabOrderItemSerializer
    filterset_fields = ("lab_order", "lab_test", "is_active")
    search_fields = ("lab_test__name", "lab_test__loinc_code")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Laboratory"],
        summary="List lab results",
        description="Return completed or in-progress lab results for the current clinic.",
    ),
    create=extend_schema(
        tags=["Laboratory"],
        summary="Create lab result",
        description="Record a result for a lab order item. Restricted to lab-tech/doctor/admin roles.",
    ),
)
class LabResultViewSet(ClinicScopedModelViewSet):
    queryset = LabResult.objects.all()
    serializer_class = LabResultSerializer
    filterset_fields = ("lab_order_item", "verified_by", "is_active")
    search_fields = ("result_value", "unit", "abnormal_flag", "lab_order_item__lab_test__name")
    ordering_fields = ("created_at", "updated_at", "verified_at")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        queue_lab_result_notification(serializer.instance)
