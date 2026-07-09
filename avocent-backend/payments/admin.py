from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "payment_method", "status", "transaction_date", "clinic")
    list_filter = ("clinic", "payment_method", "status", "is_active")
    search_fields = ("invoice__patient__first_name", "invoice__patient__last_name", "mpesa_receipt_number")
    autocomplete_fields = ("invoice", "created_by")
