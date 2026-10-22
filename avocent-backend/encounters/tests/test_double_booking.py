"""Regression tests for #36: duplicate appointments and 500s when the broker is down."""

import importlib
import threading
from datetime import timedelta
from unittest.mock import patch

from django.apps import apps
from django.db import IntegrityError, connection, transaction
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from kombu.exceptions import OperationalError as BrokerOperationalError
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Appointment
from encounters.serializers import APPOINTMENT_CONFLICT_ERROR

APPOINTMENTS_URL = "/api/encounters/appointments/"


class AppointmentDoubleBookingTests(ClinicAPIFixtureMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.receptionist)
        self.slot = (timezone.now() + timedelta(days=5)).replace(microsecond=0)

    def _payload(self, **overrides):
        payload = {
            "clinic": str(self.clinic.id),
            "patient": str(self.patient.id),
            "practitioner": str(self.practitioner.id),
            "scheduled_time": self.slot.isoformat(),
            "encounter_type": "in_person",
            "status": "scheduled",
        }
        payload.update(overrides)
        return payload

    def _book(self, **overrides):
        return Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=overrides.pop("scheduled_time", self.slot),
            **overrides,
        )

    def test_second_booking_for_same_practitioner_and_time_is_rejected(self):
        first = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")
        second = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST, second.data)
        self.assertEqual(second.data["scheduled_time"], [APPOINTMENT_CONFLICT_ERROR])
        self.assertEqual(Appointment.objects.filter(scheduled_time=self.slot).count(), 1)

    def test_other_practitioner_can_take_the_same_time(self):
        self._book()

        response = self.client.post(
            APPOINTMENTS_URL, self._payload(practitioner=str(self.nurse_practitioner.id)), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_cancelled_slot_can_be_rebooked(self):
        self._book(status="cancelled")

        response = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_update_into_taken_slot_is_rejected(self):
        self._book()
        other = self._book(scheduled_time=self.slot + timedelta(hours=1))

        response = self.client.patch(
            f"{APPOINTMENTS_URL}{other.id}/", {"scheduled_time": self.slot.isoformat()}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reschedule_into_taken_slot_is_rejected(self):
        self._book()
        other = self._book(scheduled_time=self.slot + timedelta(hours=1))

        response = self.client.patch(
            f"{APPOINTMENTS_URL}{other.id}/reschedule/", {"scheduled_time": self.slot.isoformat()}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["scheduled_time"], [APPOINTMENT_CONFLICT_ERROR])
        other.refresh_from_db()
        self.assertEqual(other.scheduled_time, self.slot + timedelta(hours=1))

    def test_reschedule_cancelled_appointment_into_taken_slot_is_rejected(self):
        self._book()
        cancelled = self._book(scheduled_time=self.slot + timedelta(hours=1), status="cancelled")

        response = self.client.patch(
            f"{APPOINTMENTS_URL}{cancelled.id}/reschedule/", {"scheduled_time": self.slot.isoformat()}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_database_constraint_rejects_duplicate_even_without_serializer(self):
        self._book()

        with self.assertRaises(IntegrityError), transaction.atomic():
            self._book()

    @override_settings(CELERY_BROKER_CONFIGURED=True)
    @patch(
        "encounters.services.send_appointment_reminder.apply_async",
        side_effect=BrokerOperationalError("broker unreachable"),
    )
    def test_unreachable_broker_does_not_fail_the_booking(self, apply_async_mock):
        with self.assertLogs("encounters.services", level="WARNING"):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        apply_async_mock.assert_called_once()
        self.assertTrue(Appointment.objects.filter(id=response.data["id"]).exists())

    @override_settings(CELERY_BROKER_CONFIGURED=True)
    @patch("encounters.services.send_appointment_reminder.apply_async")
    def test_reminder_is_not_queued_when_booking_is_rejected(self, apply_async_mock):
        self._book()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        apply_async_mock.assert_not_called()


    def test_migration_refuses_to_add_constraint_over_existing_double_bookings(self):
        migration = importlib.import_module("encounters.migrations.0005_appointment_unique_practitioner_time")
        with connection.schema_editor() as editor:
            editor.remove_constraint(Appointment, Appointment._meta.constraints[0])
        self._book()
        self._book()

        with self.assertRaisesMessage(RuntimeError, "active double bookings exist"):
            migration.refuse_if_double_booked(apps, None)

        Appointment.objects.filter(scheduled_time=self.slot).update(status="cancelled")
        migration.refuse_if_double_booked(apps, None)

    @patch("encounters.serializers.conflicting_appointments", return_value=Appointment.objects.none())
    def test_constraint_violation_past_the_serializer_maps_to_400(self, _precheck):
        """Simulates losing the race: the pre-check saw nothing, the constraint fires."""
        self._book()

        response = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["scheduled_time"], [APPOINTMENT_CONFLICT_ERROR])

    @patch("encounters.views.conflicting_appointments", return_value=Appointment.objects.none())
    def test_reschedule_constraint_violation_maps_to_400(self, _precheck):
        self._book()
        other = self._book(scheduled_time=self.slot + timedelta(hours=1))

        response = self.client.patch(
            f"{APPOINTMENTS_URL}{other.id}/reschedule/", {"scheduled_time": self.slot.isoformat()}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["scheduled_time"], [APPOINTMENT_CONFLICT_ERROR])

    def test_unrelated_integrity_error_is_not_masked_as_a_conflict(self):
        from encounters.views import _appointment_slot_guard

        with self.assertRaises(IntegrityError), _appointment_slot_guard():
            Appointment.objects.create(
                clinic=self.clinic,
                created_by=self.receptionist,
                patient=self.patient,
                practitioner=self.practitioner,
                scheduled_time=None,
            )

    @override_settings(CELERY_BROKER_CONFIGURED=True)
    @patch(
        "encounters.services.send_appointment_reminder.apply_async",
        side_effect=RuntimeError("result backend unreachable"),
    )
    def test_unexpected_enqueue_error_does_not_fail_the_booking(self, apply_async_mock):
        with self.assertLogs("encounters.services", level="ERROR"):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(APPOINTMENTS_URL, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

class AppointmentConcurrentBookingTests(ClinicAPIFixtureMixin, TransactionTestCase):
    """Real commits from parallel connections, so the serializer pre-check can't save us."""

    def test_concurrent_requests_for_same_slot_create_exactly_one_row(self):
        slot = (timezone.now() + timedelta(days=7)).replace(microsecond=0)
        payload = {
            "clinic": str(self.clinic.id),
            "patient": str(self.patient.id),
            "practitioner": str(self.practitioner.id),
            "scheduled_time": slot.isoformat(),
            "encounter_type": "in_person",
            "status": "scheduled",
        }
        attempts = 8
        barrier = threading.Barrier(attempts, timeout=10)
        status_codes = []
        errors = []
        lock = threading.Lock()

        def book():
            client = APIClient()
            client.force_authenticate(self.receptionist)
            try:
                barrier.wait()
                response = client.post(APPOINTMENTS_URL, payload, format="json")
                with lock:
                    status_codes.append(response.status_code)
            except Exception as exc:  # surfaced via the assertion below
                with lock:
                    errors.append(repr(exc))
            finally:
                connection.close()

        threads = [threading.Thread(target=book) for _ in range(attempts)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(errors, [])
        self.assertEqual(sorted(status_codes), [201] + [400] * (attempts - 1))
        self.assertEqual(
            Appointment.objects.filter(practitioner=self.practitioner, scheduled_time=slot).count(), 1
        )
