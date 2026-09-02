import pyotp
from rest_framework import status
from rest_framework.test import APITestCase

from organization.models import Clinic
from users.models import User

TOKEN_URL = "/api/auth/jwt/token/"
TOKEN_2FA_URL = "/api/auth/jwt/token/2fa/"
SETUP_URL = "/api/auth/2fa/setup/"
ENABLE_URL = "/api/auth/2fa/enable/"
DISABLE_URL = "/api/auth/2fa/disable/"


class TwoFactorSetupEnableDisableTests(APITestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="2FA-001")
        self.user = User.objects.create_user(
            email="2fa-fixture@example.com", password="OriginalPass123", clinic=self.clinic
        )

    def _current_code(self):
        self.user.refresh_from_db()
        return pyotp.TOTP(self.user.otp_secret).now()

    def test_setup_generates_secret_without_enabling(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(SETUP_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("secret", response.data)
        self.assertIn("provisioning_uri", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.otp_secret)
        self.assertFalse(self.user.is_2fa_enabled)

    def test_enable_with_correct_code_turns_2fa_on(self):
        self.client.force_authenticate(self.user)
        self.client.post(SETUP_URL)

        response = self.client.post(ENABLE_URL, {"code": self._current_code()})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_2fa_enabled)

    def test_enable_with_wrong_code_is_rejected(self):
        self.client.force_authenticate(self.user)
        self.client.post(SETUP_URL)

        response = self.client.post(ENABLE_URL, {"code": "000000"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_2fa_enabled)

    def test_enable_without_prior_setup_is_rejected(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(ENABLE_URL, {"code": "123456"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_with_correct_code_clears_secret(self):
        self.client.force_authenticate(self.user)
        self.client.post(SETUP_URL)
        self.client.post(ENABLE_URL, {"code": self._current_code()})

        response = self.client.post(DISABLE_URL, {"code": self._current_code()})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_2fa_enabled)
        self.assertEqual(self.user.otp_secret, "")

    def test_disable_with_wrong_code_leaves_2fa_enabled(self):
        self.client.force_authenticate(self.user)
        self.client.post(SETUP_URL)
        self.client.post(ENABLE_URL, {"code": self._current_code()})

        response = self.client.post(DISABLE_URL, {"code": "000000"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_2fa_enabled)


class TwoFactorLoginTests(APITestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="2FA-002")
        self.user = User.objects.create_user(
            email="2fa-login-fixture@example.com", password="OriginalPass123", clinic=self.clinic
        )

    def test_login_without_2fa_is_unaffected(self):
        response = self.client.post(TOKEN_URL, {"email": self.user.email, "password": "OriginalPass123"})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotIn("two_factor_required", response.data)

    def _enable_2fa(self):
        self.client.force_authenticate(self.user)
        setup = self.client.post(SETUP_URL)
        secret = setup.data["secret"]
        self.client.post(ENABLE_URL, {"code": pyotp.TOTP(secret).now()})
        self.client.force_authenticate(None)
        return secret

    def test_login_with_2fa_enabled_returns_challenge_not_tokens(self):
        self._enable_2fa()

        response = self.client.post(TOKEN_URL, {"email": self.user.email, "password": "OriginalPass123"})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["two_factor_required"])
        self.assertIn("challenge_token", response.data)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)

    def test_login_with_wrong_password_is_rejected_before_any_2fa_challenge(self):
        self._enable_2fa()

        response = self.client.post(TOKEN_URL, {"email": self.user.email, "password": "WrongPass123"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_verify_2fa_with_correct_code_returns_tokens(self):
        secret = self._enable_2fa()
        challenge = self.client.post(
            TOKEN_URL, {"email": self.user.email, "password": "OriginalPass123"}
        ).data["challenge_token"]

        response = self.client.post(TOKEN_2FA_URL, {"challenge_token": challenge, "code": pyotp.TOTP(secret).now()})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_verify_2fa_with_wrong_code_is_rejected(self):
        self._enable_2fa()
        challenge = self.client.post(
            TOKEN_URL, {"email": self.user.email, "password": "OriginalPass123"}
        ).data["challenge_token"]

        response = self.client.post(TOKEN_2FA_URL, {"challenge_token": challenge, "code": "000000"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_2fa_with_tampered_challenge_token_is_rejected(self):
        self._enable_2fa()

        response = self.client.post(TOKEN_2FA_URL, {"challenge_token": "not-a-real-token", "code": "123456"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_2fa_after_2fa_was_disabled_is_rejected(self):
        # A challenge_token issued while 2FA was on must not still work if the
        # user (or an attacker with a stale challenge_token) disables 2FA and
        # then replays it -- resolve_challenge_token only proves who the user
        # is, not that 2FA is still the account's current state.
        secret = self._enable_2fa()
        challenge = self.client.post(
            TOKEN_URL, {"email": self.user.email, "password": "OriginalPass123"}
        ).data["challenge_token"]

        self.client.force_authenticate(self.user)
        self.client.post(DISABLE_URL, {"code": pyotp.TOTP(secret).now()})
        self.client.force_authenticate(None)

        response = self.client.post(TOKEN_2FA_URL, {"challenge_token": challenge, "code": pyotp.TOTP(secret).now()})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
