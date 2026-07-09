from django.contrib import admin

from laboratory.models import LabOrder, LabOrderItem, LabResult, LabTestCatalogue


@admin.register(LabTestCatalogue)
class LabTestCatalogueAdmin(admin.ModelAdmin):
    list_display = ("name", "loinc_code", "price", "sample_type", "clinic")
    list_filter = ("clinic", "is_active")
    search_fields = ("name", "loinc_code", "sample_type")
    autocomplete_fields = ("created_by",)


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("encounter", "ordered_by", "status", "priority", "clinic")
    list_filter = ("clinic", "status", "priority", "is_active")
    search_fields = ("encounter__patient__first_name", "encounter__patient__last_name", "ordered_by__user__email")
    autocomplete_fields = ("encounter", "ordered_by", "created_by")


@admin.register(LabOrderItem)
class LabOrderItemAdmin(admin.ModelAdmin):
    list_display = ("lab_order", "lab_test", "clinic", "created_at")
    list_filter = ("clinic", "is_active")
    search_fields = ("lab_test__name",)
    autocomplete_fields = ("lab_order", "lab_test", "created_by")


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("lab_order_item", "result_value", "unit", "abnormal_flag", "verified_by", "clinic")
    list_filter = ("clinic", "is_active", "abnormal_flag")
    search_fields = ("result_value", "lab_order_item__lab_test__name")
    autocomplete_fields = ("lab_order_item", "verified_by", "created_by")
