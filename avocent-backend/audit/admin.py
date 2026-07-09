from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "model_name", "object_id", "user", "clinic", "timestamp")
    list_filter = ("action", "clinic", "timestamp")
    search_fields = ("model_name", "object_id", "user__email", "ip_address")
    readonly_fields = (
        "id",
        "clinic",
        "created_at",
        "updated_at",
        "created_by",
        "is_active",
        "metadata",
        "user",
        "action",
        "model_name",
        "object_id",
        "before_snapshot",
        "after_snapshot",
        "ip_address",
        "timestamp",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
