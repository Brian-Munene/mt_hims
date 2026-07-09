from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Appointment
from encounters.services import schedule_appointment_reminder


class EncounterServiceTests(ClinicAPIFixtureMixin, TestCase):
    @override_settings(APPOINTMENT_REMINDER_LEAD_MINUTES=60, CELERY_BROKER_CONFIGURED=True)
    @patch("encounters.services.send_appointment_reminder.apply_async")
    def test_schedule_appointment_reminder_enqueues_scheduled_appointments(self, apply_async_mock):
        appointment = Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=timezone.now() + timedelta(hours=3),
            status="scheduled",
        )

        scheduled = schedule_appointment_reminder(appointment)

        self.assertTrue(scheduled)
        apply_async_mock.assert_called_once()

    @patch("encounters.services.send_appointment_reminder.apply_async")
    def test_schedule_appointment_reminder_skips_non_scheduled_appointments(self, apply_async_mock):
        appointment = Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=timezone.now() + timedelta(hours=3),
            status="cancelled",
        )

        scheduled = schedule_appointment_reminder(appointment)

        self.assertFalse(scheduled)
        apply_async_mock.assert_not_called()

    @override_settings(CELERY_BROKER_CONFIGURED=False)
    @patch("encounters.services.send_appointment_reminder.apply_async")
    def test_schedule_appointment_reminder_skips_without_real_broker(self, apply_async_mock):
        appointment = Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=timezone.now() + timedelta(hours=3),
            status="scheduled",
        )

        scheduled = schedule_appointment_reminder(appointment)

        self.assertFalse(scheduled)
        apply_async_mock.assert_not_called()
