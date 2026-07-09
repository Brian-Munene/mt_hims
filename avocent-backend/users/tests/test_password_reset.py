from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from notifications.models import EmailLog
from organization.models import Clinic
from users.models import User

REQUEST_URL = "/api/auth/password-reset/"
CONFIRM_URL = "/api/auth/password-reset/confirm/"


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="PWDRESET-001")
        self.user = User.objects.create_user(
            email="reset-fixture@example.com",
            password="OriginalPass123",
            clinic=self.clinic,
        )

    def _make_token(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return uid, token

    @override_settings(EMAIL_CONFIGURED=True)
    def test_request_with_existing_email_sends_email_and_returns_generic_message(self):
        response = self.client.post(REQUEST_URL, {"email": self.user.email})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"], "If that email exists, a reset link has been sent."
        )
        self.assertEqual(EmailLog.objects.filter(recipient_email=self.user.email).count(), 1)
        log = EmailLog.objects.get(recipient_email=self.user.email)
        self.assertEqual(log.status, "sent")
        self.assertEqual(log.event_type, "password_reset")

    @override_settings(EMAIL_CONFIGURED=True)
    def test_request_with_unknown_email_returns_same_generic_message_and_sends_nothing(self):
        response = self.client.post(REQUEST_URL, {"email": "nobody@example.com"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"], "If that email exists, a reset link has been sent."
        )
        self.assertEqual(EmailLog.objects.count(), 0)

    def test_confirm_with_valid_token_resets_password_and_revokes_existing_tokens(self):
        Token.objects.create(user=self.user)
        uid, token = self._make_token(self.user)

        response = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "BrandNewPass456"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPass456"))
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_confirm_with_garbage_token_is_rejected(self):
        uid, _ = self._make_token(self.user)

        response = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": "not-a-real-token", "new_password": "BrandNewPass456"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OriginalPass123"))

    def test_confirm_token_cannot_be_reused_after_password_change(self):
        uid, token = self._make_token(self.user)

        first = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "BrandNewPass456"},
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "AnotherPass789"},
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPass456"))

    def test_confirm_rejects_weak_password(self):
        uid, token = self._make_token(self.user)

        response = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "12345"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OriginalPass123"))
