from django.contrib import admin

from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "read", "created_at", "clinic")
    list_filter = ("clinic", "read", "is_active")
    search_fields = ("title", "body", "recipient__email")
    autocomplete_fields = ("recipient", "created_by")
