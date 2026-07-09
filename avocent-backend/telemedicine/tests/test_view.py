from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Encounter


class TelemedicineViewTests(ClinicAPIFixtureMixin, APITestCase):
    @patch("telemedicine.views.cache_chat_session_state")
    def test_chat_state_creation_syncs_cache(self, cache_mock):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/telemedicine/chat-states/",
            {
                "clinic": str(self.clinic.id),
                "patient_phone": self.patient.phone,
                "current_state": "awaiting_lab_review",
                "encounter": str(self.encounter.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cache_mock.assert_called_once()

    def test_doctor_can_list_telemedicine_sessions(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/telemedicine/sessions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.telemedicine_session.id))

    def test_chat_state_list_returns_current_clinic_records(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/telemedicine/chat-states/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.chat_state.id))

    def test_telemedicine_session_rejects_mismatched_patient(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/telemedicine/sessions/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.other_patient.id),
                "encounter": str(self.encounter.id),
                "session_type": "video",
                "session_link": "https://meet.example.com/bad-session",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_chat_state_rejects_foreign_encounter(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/telemedicine/chat-states/",
            {
                "clinic": str(self.clinic.id),
                "patient_phone": self.patient.phone,
                "current_state": "handoff",
                "encounter": str(foreign_encounter.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_telemedicine_session_rejects_end_before_start(self):
        self.client.force_authenticate(self.doctor)
        start_time = timezone.now()
        response = self.client.post(
            "/api/telemedicine/sessions/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "encounter": str(self.encounter.id),
                "session_type": "video",
                "session_link": "https://meet.example.com/session-2",
                "start_time": start_time.isoformat(),
                "end_time": (start_time - timedelta(minutes=5)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
