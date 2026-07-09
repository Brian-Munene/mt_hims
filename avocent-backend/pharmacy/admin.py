from django.contrib import admin

from pharmacy.models import Medication, Prescription, PrescriptionItem, StockBatch


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "generic_name", "strength", "dosage_form", "manufacturer", "reorder_level", "is_controlled", "is_available", "clinic")
    list_filter = ("clinic", "is_active", "is_controlled", "is_available")
    search_fields = ("name", "generic_name", "strength", "manufacturer")
    autocomplete_fields = ("created_by",)


@admin.register(StockBatch)
class StockBatchAdmin(admin.ModelAdmin):
    list_display = ("medication", "batch_number", "expiry_date", "quantity_remaining", "clinic")
    list_filter = ("clinic", "is_active", "expiry_date")
    search_fields = ("medication__name", "batch_number")
    autocomplete_fields = ("medication", "created_by")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("encounter", "prescribed_by", "status", "clinic", "created_at")
    list_filter = ("clinic", "status", "is_active")
    search_fields = ("encounter__patient__first_name", "encounter__patient__last_name", "hash_signature")
    autocomplete_fields = ("encounter", "prescribed_by", "created_by")


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = ("prescription", "medication", "dosage", "frequency", "quantity", "clinic")
    list_filter = ("clinic", "is_active")
    search_fields = ("medication__name", "dosage", "frequency")
    autocomplete_fields = ("prescription", "medication", "created_by")
