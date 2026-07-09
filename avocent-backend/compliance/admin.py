from django.contrib import admin

from compliance.models import ComplianceRecord, Policy


@admin.register(ComplianceRecord)
class ComplianceRecordAdmin(admin.ModelAdmin):
    list_display = ("resource_type", "resource_id", "status", "reviewed_by", "clinic")
    list_filter = ("clinic", "status", "is_active")
    search_fields = ("resource_type", "flag_reason")
    autocomplete_fields = ("reviewed_by", "created_by")


@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "version", "effective_date", "clinic")
    list_filter = ("clinic", "status", "category", "is_active")
    search_fields = ("title", "category", "body")
    autocomplete_fields = ("created_by",)
