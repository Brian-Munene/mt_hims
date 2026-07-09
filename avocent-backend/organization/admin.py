from django.contrib import admin

from organization.models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("name", "registration_number", "phone", "email", "timezone", "is_active")
    search_fields = ("name", "registration_number", "email", "phone")
    list_filter = ("is_active", "timezone")
