from unittest.mock import patch

from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from laboratory.services import queue_lab_result_notification
from laboratory.tasks import notify_lab_result_ready


class LaboratoryServiceTests(ClinicAPIFixtureMixin, TestCase):
    @patch("laboratory.services.notify_lab_result_ready.delay")
    def test_queue_lab_result_notification_enqueues_task(self, delay_mock):
        queued = queue_lab_result_notification(self.lab_result)

        self.assertTrue(queued)
        delay_mock.assert_called_once_with(str(self.lab_result.id))

    def test_notify_lab_result_ready_returns_notification_payload(self):
        payload = notify_lab_result_ready(str(self.lab_result.id))

        self.assertEqual(payload["lab_result_id"], str(self.lab_result.id))
        self.assertEqual(payload["patient_id"], str(self.patient.id))
