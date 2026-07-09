from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Appointment, Encounter


class EncounterModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_appointment_defaults_to_in_person_and_scheduled(self):
        appointment = Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=timezone.now() + timedelta(days=1),
        )

        self.assertEqual(appointment.encounter_type, "in_person")
        self.assertEqual(appointment.status, "scheduled")

    def test_encounter_defaults_to_active_green_triage(self):
        encounter = Encounter.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            practitioner=self.practitioner,
        )

        self.assertEqual(encounter.status, "active")
        self.assertEqual(encounter.triage_level, "green")
        self.assertFalse(encounter.physical_escalation_required)
