from contextlib import contextmanager

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from core.api import ClinicScopedModelViewSet
from encounters.models import Appointment, AvailabilitySlot, Encounter
from encounters.serializers import (
    APPOINTMENT_CONFLICT_ERROR,
    APPOINTMENT_UNIQUE_CONSTRAINT,
    SLOT_OVERLAP_ERROR,
    AppointmentSerializer,
    AvailabilitySlotSerializer,
    EncounterSerializer,
    conflicting_appointments,
    overlapping_availability_slots,
)
from encounters.services import schedule_appointment_reminder
from users.models import PractitionerProfile


@extend_schema_view(
    list=extend_schema(
        tags=["Appointments & Encounters"],
        summary="List availability slots",
        description="Return practitioner weekly availability slots for the current clinic.",
    ),
)
class AvailabilitySlotViewSet(ClinicScopedModelViewSet):
    queryset = AvailabilitySlot.objects.all()
    serializer_class = AvailabilitySlotSerializer
    filterset_fields = ("practitioner", "day_of_week", "is_available", "is_active")
    ordering_fields = ("day_of_week", "start_time", "created_at")

    def perform_create(self, serializer):
        self._save_without_overlap(serializer, super().perform_create)

    def perform_update(self, serializer):
        self._save_without_overlap(serializer, super().perform_update)

    def _save_without_overlap(self, serializer, save):
        """Serialize concurrent slot writes per practitioner and re-check overlap
        while holding the lock.

        The serializer's validate() already rejects overlaps, but that check is
        a check-then-act race: under concurrency two requests can both read "no
        overlap" before either row is written, and both then insert (the TOCTOU
        gap the breaker reproduced). Taking a row lock on the practitioner forces
        those requests to run one at a time, so the re-check below sees any slot a
        competing request has already committed and rejects the overlap for real.
        """
        data = serializer.validated_data
        instance = serializer.instance
        practitioner = data.get("practitioner") or (instance.practitioner if instance else None)
        day_of_week = data.get("day_of_week", instance.day_of_week if instance else None)
        start_time = data.get("start_time", instance.start_time if instance else None)
        end_time = data.get("end_time", instance.end_time if instance else None)

        with transaction.atomic():
            if practitioner is not None:
                # Lock the practitioner row so concurrent slot writes for the same
                # practitioner serialize on it; the lock is released at commit.
                PractitionerProfile.objects.select_for_update().filter(pk=practitioner.pk).first()
            if practitioner is not None and day_of_week is not None and start_time and end_time:
                conflict = overlapping_availability_slots(
                    practitioner,
                    day_of_week,
                    start_time,
                    end_time,
                    exclude_pk=instance.pk if instance else None,
                )
                if conflict.exists():
                    raise drf_serializers.ValidationError(SLOT_OVERLAP_ERROR)
            save(serializer)


@contextmanager
def _appointment_slot_guard():
    """Turn a lost double-booking race into the same 400 the serializer gives.

    The savepoint keeps the surrounding transaction usable after the
    IntegrityError (tests, ATOMIC_REQUESTS)."""
    try:
        with transaction.atomic():
            yield
    except IntegrityError as exc:
        diag = getattr(exc.__cause__, "diag", None)
        if getattr(diag, "constraint_name", None) != APPOINTMENT_UNIQUE_CONSTRAINT:
            raise
        raise drf_serializers.ValidationError({"scheduled_time": [APPOINTMENT_CONFLICT_ERROR]}) from exc


@extend_schema_view(
    list=extend_schema(
        tags=["Appointments & Encounters"],
        summary="List appointments",
        description="Return scheduled clinic appointments with filtering by patient, practitioner, status, and encounter type.",
    ),
    create=extend_schema(
        tags=["Appointments & Encounters"],
        summary="Create appointment",
        description="Schedule an appointment for a patient with a practitioner in the same clinic.",
        examples=[
            OpenApiExample(
                "Create Appointment",
                value={
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "practitioner": "practitioner-uuid",
                    "scheduled_time": "2099-01-01T10:00:00Z",
                    "encounter_type": "video",
                    "status": "scheduled",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Appointment Response",
                value={
                    "id": "appointment-uuid",
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "practitioner": "practitioner-uuid",
                    "scheduled_time": "2099-01-01T10:00:00Z",
                    "encounter_type": "video",
                    "status": "scheduled",
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Appointment Error",
                value={"non_field_errors": ["Appointment clinic must match the patient clinic."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    ),
)
class AppointmentViewSet(ClinicScopedModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    filterset_fields = ("encounter_type", "status", "patient", "practitioner", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "practitioner__user__email")
    ordering_fields = ("created_at", "updated_at", "scheduled_time")

    def perform_create(self, serializer):
        with _appointment_slot_guard():
            super().perform_create(serializer)
        schedule_appointment_reminder(serializer.instance)

    def perform_update(self, serializer):
        with _appointment_slot_guard():
            super().perform_update(serializer)

    @extend_schema(
        tags=["Appointments & Encounters"],
        summary="Reschedule appointment",
        description="Change the scheduled time for an existing appointment. Logs the change as a booking event if a booking is linked.",
    )
    @action(detail=True, methods=["patch"], url_path="reschedule")
    def reschedule(self, request, pk=None):
        appointment = self.get_object()
        new_time_raw = request.data.get("scheduled_time")
        if not new_time_raw:
            raise drf_serializers.ValidationError({"scheduled_time": "This field is required."})

        new_time = parse_datetime(str(new_time_raw))
        if new_time is None:
            raise drf_serializers.ValidationError({"scheduled_time": "Enter a valid ISO 8601 datetime."})
        if new_time < timezone.now():
            raise drf_serializers.ValidationError({"scheduled_time": "Rescheduled time cannot be in the past."})

        if appointment.is_active and conflicting_appointments(
            appointment.practitioner, new_time, exclude_pk=appointment.pk
        ).exists():
            raise drf_serializers.ValidationError({"scheduled_time": [APPOINTMENT_CONFLICT_ERROR]})

        appointment.scheduled_time = new_time
        appointment.status = "scheduled"
        with _appointment_slot_guard():
            appointment.save(update_fields=["scheduled_time", "status", "updated_at"])
        schedule_appointment_reminder(appointment)
        return Response(AppointmentSerializer(appointment, context={"request": request}).data)


@extend_schema_view(
    list=extend_schema(
        tags=["Appointments & Encounters"],
        summary="List encounters",
        description="Return visit records for the current clinic, including triage and status metadata.",
    ),
    create=extend_schema(
        tags=["Appointments & Encounters"],
        summary="Create encounter",
        description="Open a new encounter for a patient, optionally linking it to an appointment.",
        examples=[
            OpenApiExample(
                "Create Encounter",
                value={
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "practitioner": "practitioner-uuid",
                    "appointment": "appointment-uuid",
                    "encounter_type": "in_person",
                    "triage_score": 2,
                    "triage_level": "yellow",
                    "physical_escalation_required": False,
                    "status": "active",
                    "start_time": "2099-01-01T10:15:00Z",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Encounter Response",
                value={
                    "id": "encounter-uuid",
                    "clinic": "clinic-uuid",
                    "patient": "patient-uuid",
                    "practitioner": "practitioner-uuid",
                    "appointment": "appointment-uuid",
                    "encounter_type": "in_person",
                    "triage_score": 2,
                    "triage_level": "yellow",
                    "physical_escalation_required": False,
                    "status": "active",
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Encounter Error",
                value={"end_time": ["Encounter end time must be after start time."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    ),
    retrieve=extend_schema(
        tags=["Appointments & Encounters"],
        summary="Retrieve encounter",
        description="Return a single encounter with its patient, practitioner, and workflow metadata.",
    ),
)
class EncounterViewSet(ClinicScopedModelViewSet):
    queryset = Encounter.objects.all()
    serializer_class = EncounterSerializer
    filterset_fields = ("encounter_type", "triage_level", "status", "patient", "practitioner", "booking", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "practitioner__user__email")
    ordering_fields = ("created_at", "updated_at", "start_time", "end_time")
