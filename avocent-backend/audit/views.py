from audit.models import AuditLog
from audit.serializers import AuditLogSerializer
from core.api import ClinicRBACPermission, ClinicScopedModelViewSet


class AuditLogViewSet(ClinicScopedModelViewSet):
    permission_classes = [ClinicRBACPermission]
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    filterset_fields = ("action", "model_name", "user", "is_active")
    search_fields = ("model_name", "object_id", "user__first_name", "user__last_name")
    ordering_fields = ("timestamp", "created_at")
    ordering = ("-timestamp",)
    http_method_names = ["get", "head", "options"]
