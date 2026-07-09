from django.contrib import admin

from booking.models import Booking, BookingEvent, BookingQueue


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "booking_number",
        "patient",
        "booking_type",
        "status",
        "payment_status",
        "assigned_practitioner",
        "clinic",
    )
    list_filter = ("clinic", "booking_type", "status", "payment_status", "priority", "triage_required", "is_active")
    search_fields = ("booking_number", "patient__first_name", "patient__last_name", "reason_for_visit")
    autocomplete_fields = ("patient", "appointment", "assigned_practitioner", "created_by")


@admin.register(BookingEvent)
class BookingEventAdmin(admin.ModelAdmin):
    list_display = ("booking", "event_type", "from_status", "to_status", "performed_by", "occurred_at")
    list_filter = ("clinic", "event_type", "is_active")
    search_fields = ("booking__booking_number", "event_type", "notes")
    autocomplete_fields = ("booking", "performed_by", "created_by")


@admin.register(BookingQueue)
class BookingQueueAdmin(admin.ModelAdmin):
    list_display = ("booking", "queue_type", "status", "position", "assigned_practitioner", "assigned_user", "clinic")
    list_filter = ("clinic", "queue_type", "status", "is_active")
    search_fields = ("booking__booking_number", "booking__patient__first_name", "booking__patient__last_name")
    autocomplete_fields = ("booking", "assigned_practitioner", "assigned_user", "created_by")
