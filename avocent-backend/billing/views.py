from django.db.models import Avg, Count, Sum
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import ClinicRBACPermission, ClinicScopedModelViewSet
from billing.models import Invoice, InvoiceLine, ServiceCatalogue
from billing.serializers import InvoiceLineSerializer, InvoiceSerializer, PaymentSerializer, ServiceCatalogueSerializer
from payments.models import Payment
from payments.services import queue_mpesa_callback_processing


@extend_schema_view(
    list=extend_schema(
        tags=["Billing & Payments"],
        summary="List billable services",
        description="Return the service catalogue used when assembling invoices and billing lines.",
    ),
    create=extend_schema(
        tags=["Billing & Payments"],
        summary="Create billable service",
        description="Create a new service catalogue entry for consultations, tests, medications, or other chargeable items.",
    ),
)
class ServiceCatalogueViewSet(ClinicScopedModelViewSet):
    queryset = ServiceCatalogue.objects.all()
    serializer_class = ServiceCatalogueSerializer
    filterset_fields = ("category", "is_active")
    search_fields = ("name", "code")
    ordering_fields = ("created_at", "updated_at", "name", "price")


@extend_schema_view(
    list=extend_schema(
        tags=["Billing & Payments"],
        summary="List invoices",
        description="Return patient invoices with filtering by patient, booking, encounter, and payment status. Generated booking invoices remain editable through the normal billing endpoints.",
    ),
    create=extend_schema(
        tags=["Billing & Payments"],
        summary="Create invoice",
        description="Create an invoice for a patient and optionally link it to a booking or clinical encounter. This remains available for manual adjustments even when bookings generate invoices automatically.",
        examples=[
            OpenApiExample(
                "Create Invoice",
                value={
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "encounter": "encounter-uuid",
                    "total_amount": "2500.00",
                    "status": "unpaid",
                    "due_date": "2099-01-07",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Invoice Response",
                value={
                    "id": "invoice-uuid",
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "encounter": "encounter-uuid",
                    "total_amount": "2500.00",
                    "status": "unpaid",
                    "due_date": "2099-01-07",
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Invoice Error",
                value={"non_field_errors": ["Invoice patient must match the encounter patient."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    ),
)
class InvoiceViewSet(ClinicScopedModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filterset_fields = ("status", "patient", "encounter", "booking", "is_active")
    search_fields = ("patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at", "due_date", "total_amount")


    def perform_create(self, serializer):
        if "booking" not in serializer.validated_data:
            encounter = serializer.validated_data.get("encounter")
            if encounter is not None and encounter.booking_id:
                serializer.validated_data["booking"] = encounter.booking
        super().perform_create(serializer)


@extend_schema_view(
    list=extend_schema(
        tags=["Billing & Payments"],
        summary="List invoice lines",
        description="Return line items attached to invoices in the current clinic.",
    ),
    create=extend_schema(
        tags=["Billing & Payments"],
        summary="Create invoice line",
        description="Add a billable line item to an existing invoice. Manual lines are preserved when booking-generated invoice lines are refreshed.",
    ),
)
class InvoiceLineViewSet(ClinicScopedModelViewSet):
    queryset = InvoiceLine.objects.all()
    serializer_class = InvoiceLineSerializer
    filterset_fields = ("invoice", "is_active")
    search_fields = ("service_name", "invoice__patient__first_name", "invoice__patient__last_name")
    ordering_fields = ("created_at", "updated_at", "quantity", "unit_price", "total_price")


@extend_schema_view(
    list=extend_schema(
        tags=["Billing & Payments"],
        summary="List payments",
        description="Return payment transactions collected against clinic invoices.",
    ),
    create=extend_schema(
        tags=["Billing & Payments"],
        summary="Record payment",
        description="Record a patient payment, including M-PESA transaction metadata where applicable.",
        examples=[
            OpenApiExample(
                "Create Payment",
                value={
                    "clinic": "clinic-uuid",
                    "invoice": "invoice-uuid",
                    "amount": "2500.00",
                    "payment_method": "mpesa",
                    "mpesa_receipt_number": "QWE123XYZ",
                    "phone_number": "+254700000000",
                    "status": "successful",
                    "transaction_date": "2099-01-01T11:00:00Z",
                    "callback_payload": {"ResultCode": 0},
                },
                request_only=True,
            ),
            OpenApiExample(
                "Payment Response",
                value={
                    "id": "payment-uuid",
                    "clinic": "clinic-uuid",
                    "invoice": "invoice-uuid",
                    "amount": "2500.00",
                    "payment_method": "mpesa",
                    "mpesa_receipt_number": "QWE123XYZ",
                    "status": "successful",
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Payment Error",
                value={"amount": ["Payment amount must be greater than zero."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    ),
)
class PaymentViewSet(ClinicScopedModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    filterset_fields = ("payment_method", "status", "invoice", "is_active")
    search_fields = ("mpesa_receipt_number", "phone_number", "invoice__patient__first_name", "invoice__patient__last_name")
    ordering_fields = ("created_at", "updated_at", "transaction_date", "amount")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        queue_mpesa_callback_processing(serializer.instance)


@extend_schema(
    tags=["Billing & Payments"],
    summary="Billing report",
    description=(
        "Return aggregated revenue, invoice counts, and payment-method breakdown "
        "for the current clinic. Optional query params: `from_date` (YYYY-MM-DD), "
        "`to_date` (YYYY-MM-DD)."
    ),
)
class BillingReportView(APIView):
    permission_classes = [IsAuthenticated, ClinicRBACPermission]
    required_permission = "billing.read"

    def get(self, request):
        clinic_id = request.user.clinic_id
        qs = Invoice.objects.filter(clinic_id=clinic_id)

        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        if from_date:
            parsed = parse_date(from_date)
            if parsed:
                qs = qs.filter(created_at__date__gte=parsed)
        if to_date:
            parsed = parse_date(to_date)
            if parsed:
                qs = qs.filter(created_at__date__lte=parsed)

        totals = qs.aggregate(
            total_invoices=Count("id"),
            total_revenue=Sum("total_amount"),
            avg_invoice=Avg("total_amount"),
        )

        by_status = list(
            qs.values("status").annotate(count=Count("id"), revenue=Sum("total_amount"))
        )

        paid_invoice_ids = qs.filter(status="paid").values("id")
        payment_qs = Payment.objects.filter(invoice_id__in=paid_invoice_ids, clinic_id=clinic_id)
        by_method = list(
            payment_qs.values("payment_method").annotate(count=Count("id"), total=Sum("amount"))
        )

        return Response({
            "total_invoices": totals["total_invoices"] or 0,
            "total_revenue": str(totals["total_revenue"] or 0),
            "avg_invoice": str(round(totals["avg_invoice"] or 0, 2)),
            "by_status": by_status,
            "by_payment_method": by_method,
        })

