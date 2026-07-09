from django.contrib import admin

from patients.models import Allergy, ChronicCondition, Patient, PatientIdentifier


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "clinic", "phone", "gender", "is_active")
    list_filter = ("clinic", "gender", "is_active")
    search_fields = ("first_name", "last_name", "phone", "email", "sha_number")
    autocomplete_fields = ("created_by",)


@admin.register(PatientIdentifier)
class PatientIdentifierAdmin(admin.ModelAdmin):
    list_display = ("patient", "identifier_type", "clinic", "is_active")
    list_filter = ("clinic", "identifier_type", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "identifier_value")
    autocomplete_fields = ("patient", "created_by")


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ("patient", "substance", "severity", "clinic", "is_active")
    list_filter = ("clinic", "severity", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "substance")
    autocomplete_fields = ("patient", "created_by")


@admin.register(ChronicCondition)
class ChronicConditionAdmin(admin.ModelAdmin):
    list_display = ("patient", "diagnosis", "icd10_code", "diagnosed_date", "clinic")
    list_filter = ("clinic", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "diagnosis", "icd10_code")
    autocomplete_fields = ("patient", "created_by")
