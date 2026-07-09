from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin


class UserViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_me_returns_authenticated_user_profile(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.doctor.email)

    def test_admin_can_list_staff_users(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/auth/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 6)

    def test_receptionist_cannot_list_staff_users(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/auth/users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
