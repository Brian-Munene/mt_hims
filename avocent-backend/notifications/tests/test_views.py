from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from notifications.models import Notification


class NotificationRecipientScopingTests(ClinicAPIFixtureMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.doctor_notification = Notification.objects.create(
            clinic=self.clinic,
            recipient=self.doctor,
            title="Lab result ready",
            body="Result for Amina Otieno is ready for review.",
        )
        self.nurse_notification = Notification.objects.create(
            clinic=self.clinic,
            recipient=self.nurse,
            title="Upcoming appointment reminder",
            body="Appointment with Amina Otieno tomorrow.",
        )

    def test_user_only_sees_own_notifications(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(returned_ids, {str(self.doctor_notification.id)})

    def test_user_cannot_mark_another_users_notification_read(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(f"/api/notifications/{self.nurse_notification.id}/read/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.nurse_notification.refresh_from_db()
        self.assertFalse(self.nurse_notification.read)
