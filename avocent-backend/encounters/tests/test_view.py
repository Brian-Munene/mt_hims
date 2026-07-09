from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin


class EncounterViewTests(ClinicAPIFixtureMixin, APITestCase):
    @patch("encounters.views.schedule_appointment_reminder")
    def test_appointment_creation_enqueues_reminder_workflow(self, schedule_mock):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": (timezone.now() + timedelta(days=1)).isoformat(),
                "encounter_type": "video",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        schedule_mock.assert_called_once()

    def test_appointment_list_returns_current_clinic_records(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/encounters/appointments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.appointment.id))


    def test_appointment_creation_rejects_past_time(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": (timezone.now() - timedelta(hours=1)).isoformat(),
                "encounter_type": "in_person",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_encounter_creation_rejects_end_before_start(self):
        self.client.force_authenticate(self.doctor)
        start_time = timezone.now()
        response = self.client.post(
            "/api/encounters/encounters/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "encounter_type": "video",
                "status": "active",
                "start_time": start_time.isoformat(),
                "end_time": (start_time - timedelta(minutes=15)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
