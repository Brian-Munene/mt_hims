from django.contrib import admin

from billing.models import Invoice, InvoiceLine, ServiceCatalogue


@admin.register(ServiceCatalogue)
class ServiceCatalogueAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "category", "price", "clinic", "is_active")
    list_filter = ("clinic", "category", "is_active")
    search_fields = ("name", "code")
    autocomplete_fields = ("created_by",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("patient", "booking", "encounter", "total_amount", "status", "due_date", "clinic")
    list_filter = ("clinic", "status", "is_active")
    search_fields = ("patient__first_name", "patient__last_name")
    autocomplete_fields = ("patient", "booking", "encounter", "created_by")


@admin.register(InvoiceLine)
class InvoiceLineAdmin(admin.ModelAdmin):
    list_display = ("invoice", "service_name", "quantity", "unit_price", "total_price", "clinic")
    list_filter = ("clinic", "is_active")
    search_fields = ("service_name", "invoice__patient__first_name", "invoice__patient__last_name")
    autocomplete_fields = ("invoice", "created_by")
