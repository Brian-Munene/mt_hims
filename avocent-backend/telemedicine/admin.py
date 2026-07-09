from django.contrib import admin

from telemedicine.models import ChatSessionState, TelemedicineSession


@admin.register(TelemedicineSession)
class TelemedicineSessionAdmin(admin.ModelAdmin):
    list_display = ("patient", "encounter", "session_type", "status", "start_time", "clinic")
    list_filter = ("clinic", "session_type", "status", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "session_link")
    autocomplete_fields = ("patient", "encounter", "created_by")


@admin.register(ChatSessionState)
class ChatSessionStateAdmin(admin.ModelAdmin):
    list_display = ("patient_phone", "current_state", "last_interaction_at", "clinic", "is_active")
    list_filter = ("clinic", "is_active")
    search_fields = ("patient_phone", "current_state")
    autocomplete_fields = ("encounter", "created_by")
