from django.contrib import admin

from encounters.models import Appointment, AvailabilitySlot, Encounter


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "practitioner", "scheduled_time", "encounter_type", "status", "clinic")
    list_filter = ("clinic", "encounter_type", "status", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "practitioner__user__email")
    autocomplete_fields = ("patient", "practitioner", "created_by")


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("practitioner", "day_of_week", "start_time", "end_time", "is_available", "clinic")
    list_filter = ("clinic", "day_of_week", "is_available", "is_active")
    search_fields = ("practitioner__user__email",)
    autocomplete_fields = ("practitioner", "created_by")


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ("patient", "practitioner", "encounter_type", "triage_level", "status", "clinic")
    list_filter = ("clinic", "encounter_type", "triage_level", "status", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "practitioner__user__email")
    autocomplete_fields = ("patient", "practitioner", "appointment", "created_by")
