from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from telemedicine.services import cache_chat_session_state, get_chat_session_state, upsert_chat_session_state


class TelemedicineServiceTests(ClinicAPIFixtureMixin, TestCase):
    def test_cache_chat_session_state_reads_back_from_cache(self):
        cache_chat_session_state(self.chat_state)

        payload = get_chat_session_state(
            clinic_id=self.clinic.id,
            patient_phone=self.chat_state.patient_phone,
        )

        self.assertEqual(payload["id"], str(self.chat_state.id))
        self.assertEqual(payload["current_state"], self.chat_state.current_state)

    def test_upsert_chat_session_state_updates_db_and_cache(self):
        chat_state = upsert_chat_session_state(
            clinic=self.clinic,
            patient_phone=self.patient.phone,
            current_state="triage_complete",
            encounter=self.encounter,
            created_by=self.doctor,
        )

        payload = get_chat_session_state(
            clinic_id=self.clinic.id,
            patient_phone=self.patient.phone,
        )

        self.assertEqual(chat_state.current_state, "triage_complete")
        self.assertEqual(payload["current_state"], "triage_complete")
