from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from telemedicine.models import ChatSessionState, TelemedicineSession


class TelemedicineModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_telemedicine_session_defaults_to_video_and_active(self):
        session = TelemedicineSession.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            encounter=self.encounter,
        )

        self.assertEqual(session.session_type, "video")
        self.assertEqual(session.status, "active")

    def test_chat_session_state_allows_null_encounter(self):
        chat_state = ChatSessionState.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient_phone="+254722000000",
            current_state="triage_started",
        )

        self.assertIsNone(chat_state.encounter)
