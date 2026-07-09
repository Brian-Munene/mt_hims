from django.urls import path
from rest_framework.routers import DefaultRouter

from billing.views import BillingReportView, InvoiceLineViewSet, InvoiceViewSet, PaymentViewSet, ServiceCatalogueViewSet

app_name = "billing"

router = DefaultRouter()
router.register("services", ServiceCatalogueViewSet, basename="service-catalogue")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("invoice-lines", InvoiceLineViewSet, basename="invoice-line")
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("report/", BillingReportView.as_view(), name="billing-report"),
] + router.urls
