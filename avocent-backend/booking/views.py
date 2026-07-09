from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.serializers import InvoiceSerializer
from booking.models import Booking, BookingEvent, BookingQueue
from booking.serializers import BookingActionSerializer, BookingEventSerializer, BookingQueueSerializer, BookingSerializer
from booking.services import (
    cancel_booking,
    check_in_booking,
    checkout_booking,
    complete_consultation,
    complete_station,
    complete_triage,
    generate_booking_invoice,
    mark_arrived,
    mark_no_show,
    route_booking,
    start_consultation,
    start_station,
    start_triage,
    sync_booking_billing_state,
)
from core.api import ClinicRBACPermission, ClinicScopedModelViewSet
from encounters.serializers import EncounterSerializer
from users.models import PractitionerProfile, User


@extend_schema_view(
    list=extend_schema(
        tags=["Bookings & Flow"],
        summary="List bookings",
        description="Return clinic bookings that orchestrate the patient journey from arrival through billing and checkout.",
    ),
    create=extend_schema(
        tags=["Bookings & Flow"],
        summary="Create booking",
        description="Create a walk-in, scheduled, or telemedicine booking that manages the patient visit workflow.",
    ),
    retrieve=extend_schema(
        tags=["Bookings & Flow"],
        summary="Retrieve booking",
        description="Return a single booking with operational status, timestamps, and workflow metadata.",
    ),
)
class BookingViewSet(ClinicScopedModelViewSet):
    queryset = Booking.objects.select_related(
        "clinic",
        "patient",
        "appointment",
        "assigned_practitioner",
        "created_by",
    ).all()
    serializer_class = BookingSerializer
    filterset_fields = (
        "booking_type",
        "source",
        "encounter_type",
        "priority",
        "status",
        "payment_status",
        "triage_required",
        "patient",
        "appointment",
        "assigned_practitioner",
        "is_active",
    )
    search_fields = ("booking_number", "patient__first_name", "patient__last_name", "reason_for_visit")
    ordering_fields = ("created_at", "updated_at", "scheduled_time", "arrival_time", "checkout_time")

    def _resolve_actor_targets(self, serializer):
        data = serializer.validated_data
        practitioner = None
        assigned_user = None
        if data.get("assigned_practitioner"):
            practitioner = PractitionerProfile.objects.filter(pk=data["assigned_practitioner"], clinic=self.request.user.clinic).first()
        if data.get("assigned_user"):
            assigned_user = User.objects.filter(pk=data["assigned_user"], clinic=self.request.user.clinic).first()
        return practitioner, assigned_user

    def _run_action(self, request, booking, handler):
        serializer = BookingActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        practitioner, assigned_user = self._resolve_actor_targets(serializer)
        kwargs = {
            "performed_by": request.user,
            "notes": serializer.validated_data.get("notes", ""),
        }
        if serializer.validated_data.get("position") is not None:
            kwargs["queue_position"] = serializer.validated_data["position"]
            kwargs["position"] = serializer.validated_data["position"]
        if practitioner is not None:
            kwargs["assigned_practitioner"] = practitioner
        if assigned_user is not None:
            kwargs["assigned_user"] = assigned_user

        try:
            updated_booking = handler(booking, **kwargs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(updated_booking).data)

    @extend_schema(tags=["Bookings & Flow"], summary="Mark booking arrived")
    @action(detail=True, methods=["post"], url_path="arrive")
    def arrive(self, request, pk=None):
        return self._run_action(request, self.get_object(), mark_arrived)

    @extend_schema(tags=["Bookings & Flow"], summary="Check in booking")
    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        return self._run_action(request, self.get_object(), check_in_booking)

    @extend_schema(tags=["Bookings & Flow"], summary="Start triage")
    @action(detail=True, methods=["post"], url_path="start-triage")
    def start_triage(self, request, pk=None):
        return self._run_action(request, self.get_object(), start_triage)

    @extend_schema(tags=["Bookings & Flow"], summary="Complete triage")
    @action(detail=True, methods=["post"], url_path="complete-triage")
    def complete_triage(self, request, pk=None):
        return self._run_action(request, self.get_object(), complete_triage)

    @extend_schema(tags=["Bookings & Flow"], summary="Start consultation")
    @action(detail=True, methods=["post"], url_path="start-consultation")
    def start_consultation(self, request, pk=None):
        booking = self.get_object()
        if not booking.assigned_practitioner and getattr(request.user, "practitioner_profile", None):
            booking.assigned_practitioner = request.user.practitioner_profile
            booking.save(update_fields=["assigned_practitioner", "updated_at"])
        return self._run_action(request, booking, start_consultation)

    @extend_schema(tags=["Bookings & Flow"], summary="Complete consultation")
    @action(detail=True, methods=["post"], url_path="complete-consultation")
    def complete_consultation(self, request, pk=None):
        return self._run_action(request, self.get_object(), complete_consultation)

    @extend_schema(tags=["Bookings & Flow"], summary="Route booking to lab")
    @action(detail=True, methods=["post"], url_path="route-to-lab")
    def route_to_lab(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: route_booking(booking, "laboratory", **kwargs))

    @extend_schema(tags=["Bookings & Flow"], summary="Start lab workflow")
    @action(detail=True, methods=["post"], url_path="start-lab")
    def start_lab(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: start_station(booking, "laboratory", **kwargs))

    @extend_schema(tags=["Bookings & Flow"], summary="Complete lab workflow")
    @action(detail=True, methods=["post"], url_path="complete-lab")
    def complete_lab(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: complete_station(booking, "laboratory", **kwargs))

    @extend_schema(tags=["Bookings & Flow"], summary="Route booking to pharmacy")
    @action(detail=True, methods=["post"], url_path="route-to-pharmacy")
    def route_to_pharmacy(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: route_booking(booking, "pharmacy", **kwargs))

    @extend_schema(tags=["Bookings & Flow"], summary="Start pharmacy workflow")
    @action(detail=True, methods=["post"], url_path="start-pharmacy")
    def start_pharmacy(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: start_station(booking, "pharmacy", **kwargs))

    @extend_schema(tags=["Bookings & Flow"], summary="Complete pharmacy workflow")
    @action(detail=True, methods=["post"], url_path="complete-pharmacy")
    def complete_pharmacy(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: complete_station(booking, "pharmacy", **kwargs))

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Route booking to billing",
        description="Move the booking to billing and auto-generate or refresh editable invoice lines from consultation, lab, and medication activity.",
    )
    @action(detail=True, methods=["post"], url_path="route-to-billing")
    def route_to_billing(self, request, pk=None):
        return self._run_action(request, self.get_object(), lambda booking, **kwargs: route_booking(booking, "billing", **kwargs))

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Generate or refresh booking invoice",
        description="Assemble editable invoice lines from the booking workflow. Auto-generated lines can be refreshed without removing manual billing adjustments.",
    )
    @action(detail=True, methods=["post"], url_path="generate-invoice")
    def generate_invoice(self, request, pk=None):
        booking = self.get_object()
        invoice = generate_booking_invoice(booking, performed_by=request.user, refresh=bool(request.data.get("refresh", False)))
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Synchronize billing state",
        description="Recalculate the booking payment state from linked invoices and successful payments, updating statuses such as not_paid, partially_paid, paid, and ready_for_checkout.",
    )
    @action(detail=True, methods=["post"], url_path="sync-billing")
    def sync_billing(self, request, pk=None):
        booking = sync_booking_billing_state(self.get_object(), performed_by=request.user)
        return Response(self.get_serializer(booking).data)

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Checkout booking",
        description="Complete the booking once all required care steps are done and payment status is fully paid.",
    )
    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        return self._run_action(request, self.get_object(), checkout_booking)

    @extend_schema(tags=["Bookings & Flow"], summary="Cancel booking")
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        return self._run_action(request, self.get_object(), cancel_booking)

    @extend_schema(tags=["Bookings & Flow"], summary="Mark booking as no-show")
    @action(detail=True, methods=["post"], url_path="no-show")
    def no_show(self, request, pk=None):
        return self._run_action(request, self.get_object(), mark_no_show)

    @extend_schema(tags=["Bookings & Flow"], summary="List booking events", responses=BookingEventSerializer(many=True))
    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        queryset = self.get_object().events.all()
        return self.paginate_action_queryset(queryset, BookingEventSerializer)

    @extend_schema(tags=["Bookings & Flow"], summary="List booking queues", responses=BookingQueueSerializer(many=True))
    @action(detail=True, methods=["get"], url_path="queues")
    def queues(self, request, pk=None):
        queryset = self.get_object().queues.all()
        return self.paginate_action_queryset(queryset, BookingQueueSerializer)

    @extend_schema(tags=["Bookings & Flow"], summary="List booking encounters", responses=EncounterSerializer(many=True))
    @action(detail=True, methods=["get"], url_path="encounters")
    def encounters(self, request, pk=None):
        queryset = self.get_object().encounters.all()
        return self.paginate_action_queryset(queryset, EncounterSerializer)

    @extend_schema(tags=["Bookings & Flow"], summary="List booking invoices", responses=InvoiceSerializer(many=True))
    @action(detail=True, methods=["get"], url_path="invoices")
    def invoices(self, request, pk=None):
        queryset = self.get_object().invoices.all()
        return self.paginate_action_queryset(queryset, InvoiceSerializer)

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Queue board",
        description="Return the currently active operational queues by station for reception, triage, consultation, laboratory, pharmacy, and billing.",
    )
    @action(detail=False, methods=["get"], url_path="queue-board")
    def queue_board(self, request):
        queryset = BookingQueue.objects.filter(
            clinic=request.user.clinic,
            status__in=["waiting", "called", "in_progress"],
        )
        queue_type = request.query_params.get("queue_type")
        if queue_type:
            queryset = queryset.filter(queue_type=queue_type)
        return self.paginate_action_queryset(queryset.order_by("queue_type", "position", "entered_at"), BookingQueueSerializer)

    @extend_schema(
        tags=["Bookings & Flow"],
        summary="Booking workflow summary",
        description="Return aggregate operational metrics for bookings, statuses, payment state, open queues, wait time, and turnaround time.",
    )
    @action(detail=False, methods=["get"], url_path="reports/summary")
    def report_summary(self, request):
        queryset = self.get_queryset()
        today = timezone.localdate()
        completed = queryset.filter(status="completed", checkout_time__date=today)
        wait_expression = ExpressionWrapper(F("consultation_start_time") - F("check_in_time"), output_field=DurationField())
        turnaround_expression = ExpressionWrapper(F("checkout_time") - F("arrival_time"), output_field=DurationField())
        data = {
            "total_bookings": queryset.count(),
            "active_bookings": queryset.exclude(status__in=["completed", "cancelled", "no_show"]).count(),
            "completed_today": completed.count(),
            "by_status": list(queryset.values("status").annotate(count=Count("id")).order_by("status")),
            "by_payment_status": list(queryset.values("payment_status").annotate(count=Count("id")).order_by("payment_status")),
            "average_wait_time": completed.filter(check_in_time__isnull=False, consultation_start_time__isnull=False).annotate(wait_time=wait_expression).aggregate(avg=Avg("wait_time"))["avg"],
            "average_turnaround_time": completed.filter(arrival_time__isnull=False, checkout_time__isnull=False).annotate(turnaround_time=turnaround_expression).aggregate(avg=Avg("turnaround_time"))["avg"],
            "open_queues": list(
                BookingQueue.objects.filter(clinic=request.user.clinic, status__in=["waiting", "called", "in_progress"]).values("queue_type").annotate(count=Count("id")).order_by("queue_type")
            ),
        }
        return Response(data)


class BookingEventViewSet(ClinicScopedModelViewSet):
    permission_classes = [ClinicRBACPermission]
    queryset = BookingEvent.objects.all()
    serializer_class = BookingEventSerializer
    filterset_fields = ("booking", "event_type", "is_active")
    search_fields = ("event_type", "booking__booking_number", "booking__patient__first_name", "booking__patient__last_name")
    ordering_fields = ("created_at", "updated_at", "occurred_at")
    http_method_names = ["get", "head", "options"]


class BookingQueueViewSet(ClinicScopedModelViewSet):
    permission_classes = [ClinicRBACPermission]
    queryset = BookingQueue.objects.all()
    serializer_class = BookingQueueSerializer
    filterset_fields = ("booking", "queue_type", "status", "is_active")
    search_fields = ("booking__booking_number", "booking__patient__first_name", "booking__patient__last_name")
    ordering_fields = ("created_at", "updated_at", "entered_at", "position")
    http_method_names = ["get", "head", "options"]
