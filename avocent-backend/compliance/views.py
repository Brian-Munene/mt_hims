from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from compliance.models import ComplianceRecord, Policy, PolicyVersion
from compliance.serializers import ComplianceRecordSerializer, PolicySerializer, PolicyVersionSerializer
from core.api import ClinicScopedModelViewSet


@extend_schema_view(
    list=extend_schema(
        tags=["Compliance"],
        summary="List compliance records",
        description="Return system-flagged compliance records for the current clinic.",
    ),
)
class ComplianceRecordViewSet(ClinicScopedModelViewSet):
    queryset = ComplianceRecord.objects.all()
    serializer_class = ComplianceRecordSerializer
    filterset_fields = ("status", "resource_type", "is_active")
    search_fields = ("resource_type", "flag_reason")
    ordering_fields = ("created_at", "reviewed_at")
    http_method_names = ["get", "patch", "head", "options"]

    def perform_update(self, serializer):
        if "status" in self.request.data:
            if self.request.data["status"] != "open":
                serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())
            else:
                serializer.save(reviewed_by=None, reviewed_at=None)
        else:
            serializer.save()


@extend_schema_view(
    list=extend_schema(
        tags=["Compliance"],
        summary="List policies",
        description="Return clinic policies, procedures, and compliance documents.",
    ),
    create=extend_schema(
        tags=["Compliance"],
        summary="Create policy",
        description="Create a new clinic policy document.",
    ),
)
class PolicyViewSet(ClinicScopedModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer
    filterset_fields = ("status", "category", "is_active")
    search_fields = ("title", "category", "body")
    ordering_fields = ("created_at", "updated_at", "effective_date")

    def perform_update(self, serializer):
        policy = serializer.instance
        PolicyVersion.objects.create(
            clinic=policy.clinic,
            created_by=self.request.user,
            policy=policy,
            version_label=policy.version,
            title=policy.title,
            category=policy.category,
            body=policy.body,
            status=policy.status,
            effective_date=policy.effective_date,
            expiry_date=policy.expiry_date,
            changed_by=self.request.user,
        )
        serializer.save()


class PolicyVersionViewSet(ClinicScopedModelViewSet):
    queryset = PolicyVersion.objects.all()
    serializer_class = PolicyVersionSerializer
    filterset_fields = ("policy", "is_active")
    ordering_fields = ("created_at",)
    http_method_names = ["get", "head", "options"]
