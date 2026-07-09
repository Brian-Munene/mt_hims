from django.contrib import admin

from clinical.models import ClinicalNote, Diagnosis, Observation


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ("encounter", "clinic", "is_active", "created_at")
    list_filter = ("clinic", "is_active")
    search_fields = ("encounter__patient__first_name", "encounter__patient__last_name")
    autocomplete_fields = ("encounter", "created_by")


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("encounter", "icd10_code", "is_primary", "clinic")
    list_filter = ("clinic", "is_primary", "is_active")
    search_fields = ("icd10_code", "description", "encounter__patient__first_name", "encounter__patient__last_name")
    autocomplete_fields = ("encounter", "created_by")


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("encounter", "name", "value", "unit", "abnormal_flag", "clinic")
    list_filter = ("clinic", "is_active")
    search_fields = ("name", "loinc_code", "encounter__patient__first_name", "encounter__patient__last_name")
    autocomplete_fields = ("encounter", "created_by")
