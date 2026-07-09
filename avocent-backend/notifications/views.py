from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.response import Response

from core.api import ClinicScopedModelViewSet
from notifications.models import EmailLog, Notification, NotificationTemplate
from notifications.serializers import EmailLogSerializer, NotificationSerializer, NotificationTemplateSerializer


@extend_schema_view(
    list=extend_schema(
        tags=["Notifications"],
        summary="List my notifications",
        description="Return notifications for the authenticated user, optionally filtered to those created after `since`.",
    ),
)
class NotificationViewSet(ClinicScopedModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    ordering_fields = ("created_at",)
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user, clinic_id=self.request.user.clinic_id, is_active=True
        )
        since = self.request.query_params.get("since")
        if since:
            parsed = parse_datetime(since)
            if parsed is not None:
                queryset = queryset.filter(created_at__gt=parsed)
        return queryset

    @extend_schema(tags=["Notifications"], summary="Mark notification read")
    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["read", "read_at", "updated_at"])
        return Response(self.get_serializer(notification).data)

    @extend_schema(tags=["Notifications"], summary="Mark all notifications read")
    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        self.get_queryset().filter(read=False).update(read=True, read_at=timezone.now())
        return Response(status=204)


class NotificationTemplateViewSet(ClinicScopedModelViewSet):
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    filterset_fields = ("event_type", "is_active")
    ordering_fields = ("created_at", "event_type")


class EmailLogViewSet(ClinicScopedModelViewSet):
    queryset = EmailLog.objects.all()
    serializer_class = EmailLogSerializer
    filterset_fields = ("status", "event_type", "is_active")
    search_fields = ("recipient_email", "subject")
    ordering_fields = ("created_at",)
    http_method_names = ["get", "head", "options"]
