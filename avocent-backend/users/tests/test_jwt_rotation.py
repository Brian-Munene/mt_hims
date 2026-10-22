"""Regression tests for #38: rotated refresh tokens must not stay usable."""

import threading
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from organization.models import Clinic
from users import jwt as users_jwt
from users.models import User
from users.tasks import flush_expired_tokens

TOKEN_URL = "/api/auth/jwt/token/"
REFRESH_URL = "/api/auth/jwt/refresh/"
BLACKLIST_URL = "/api/auth/jwt/blacklist/"
PASSWORD = "OriginalPass123"

# Isolated per-process cache so tests never touch a developer's Redis.
LOCMEM_CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "jwt-tests"}}


def _make_user(registration_number):
    clinic = Clinic.objects.create(name="Avocent", registration_number=registration_number)
    return User.objects.create_user(email=f"jwt-{registration_number}@example.com", password=PASSWORD, clinic=clinic)


@override_settings(CACHES=LOCMEM_CACHE, JWT_REFRESH_REUSE_GRACE_SECONDS=0)
class RefreshTokenRotationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = _make_user("JWT-001")

    def _login(self):
        response = self.client.post(TOKEN_URL, {"email": self.user.email, "password": PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data["refresh"]

    def _refresh(self, token):
        return self.client.post(REFRESH_URL, {"refresh": token})

    def test_refresh_rotates_and_new_token_works(self):
        first = self._refresh(self._login())
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        self.assertIn("access", first.data)

        second = self._refresh(first.data["refresh"])
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.data)

    def test_rotated_token_cannot_be_replayed(self):
        original = self._login()
        self.assertEqual(self._refresh(original).status_code, status.HTTP_200_OK)

        replay = self._refresh(original)

        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(JWT_REFRESH_REUSE_GRACE_SECONDS=30)
    def test_replay_inside_grace_window_returns_the_same_pair(self):
        original = self._login()
        first = self._refresh(original)

        replay = self._refresh(original)

        self.assertEqual(replay.status_code, status.HTTP_200_OK, replay.data)
        self.assertEqual(replay.data, first.data)
        self.assertEqual(BlacklistedToken.objects.filter(token__user=self.user).count(), 1)

    def test_token_issued_before_blacklist_app_is_still_rotated_once(self):
        # Simulates a token minted before this change: no OutstandingToken row exists.
        legacy = RefreshToken.for_user(self.user)
        legacy_str = str(legacy)
        legacy.outstand()[0].delete()

        self.assertEqual(self._refresh(legacy_str).status_code, status.HTTP_200_OK)
        self.assertEqual(self._refresh(legacy_str).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_refresh(self):
        token = self._login()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self._refresh(token)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_blacklist_endpoint_revokes_token(self):
        token = self._login()

        revoke = self.client.post(BLACKLIST_URL, {"refresh": token})

        self.assertEqual(revoke.status_code, status.HTTP_200_OK, revoke.data)
        self.assertEqual(self._refresh(token).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_reset_revokes_existing_refresh_tokens(self):
        sessions = [self._login(), self._login()]
        self.user.refresh_from_db()  # reset tokens hash last_login, which login just changed
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        reset_token = default_token_generator.make_token(self.user)

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": reset_token, "new_password": "BrandNewPass456"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        for token in sessions:
            self.assertEqual(self._refresh(token).status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(JWT_REFRESH_REUSE_GRACE_SECONDS=30)
    def test_loser_that_sees_the_blacklist_row_still_gets_the_winners_pair(self):
        """The winner commits between a loser's first cache read and the blacklist
        check inside token_class(); the loser must re-check the cache, not 401."""
        original = self._login()
        first = self._refresh(original)
        real_cache_get = users_jwt._cache_get

        with patch("users.jwt._cache_get", side_effect=[None, real_cache_get(users_jwt._reuse_cache_key(original))]):
            replay = self._refresh(original)

        self.assertEqual(replay.status_code, status.HTTP_200_OK, replay.data)
        self.assertEqual(replay.data, first.data)

    @override_settings(JWT_REFRESH_REUSE_GRACE_SECONDS=30)
    def test_cache_outage_degrades_to_strict_single_use_instead_of_500(self):
        original = self._login()
        with (
            patch.object(users_jwt.cache, "get", side_effect=ConnectionError("redis down")),
            patch.object(users_jwt.cache, "set", side_effect=ConnectionError("redis down")),
            self.assertLogs("users.jwt", level="WARNING"),
        ):
            first = self._refresh(original)
            replay = self._refresh(original)

        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_flush_task_removes_expired_tokens(self):
        self._login()
        expired = RefreshToken.for_user(self.user)
        OutstandingToken.objects.filter(jti=expired["jti"]).update(expires_at=timezone.now() - timedelta(days=1))

        flush_expired_tokens()

        self.assertFalse(OutstandingToken.objects.filter(jti=expired["jti"]).exists())
        self.assertEqual(OutstandingToken.objects.filter(user=self.user).count(), 1)


@override_settings(CACHES=LOCMEM_CACHE)
class ConcurrentRefreshTests(TransactionTestCase):
    """Real commits from parallel connections, as the frontend proxy produces them."""

    attempts = 8

    def setUp(self):
        cache.clear()
        self.user = _make_user("JWT-002")
        self.token = str(RefreshToken.for_user(self.user))

    def _refresh_concurrently(self):
        barrier = threading.Barrier(self.attempts, timeout=10)
        results, errors = [], []
        lock = threading.Lock()

        def refresh():
            try:
                barrier.wait()
                response = APIClient().post(REFRESH_URL, {"refresh": self.token})
                with lock:
                    results.append((response.status_code, response.data.get("refresh")))
            except Exception as exc:  # surfaced via the assertion in the caller
                with lock:
                    errors.append(repr(exc))
            finally:
                connection.close()

        threads = [threading.Thread(target=refresh) for _ in range(self.attempts)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        self.assertEqual(errors, [])
        return results

    @override_settings(JWT_REFRESH_REUSE_GRACE_SECONDS=30)
    def test_parallel_refreshes_all_receive_the_single_rotated_pair(self):
        results = self._refresh_concurrently()

        self.assertEqual([code for code, _ in results], [200] * self.attempts)
        self.assertEqual(len({new_refresh for _, new_refresh in results}), 1)
        self.assertEqual(BlacklistedToken.objects.count(), 1)

    @override_settings(JWT_REFRESH_REUSE_GRACE_SECONDS=0)
    def test_without_grace_exactly_one_parallel_refresh_succeeds(self):
        results = self._refresh_concurrently()

        self.assertEqual(sorted(code for code, _ in results), [200] + [401] * (self.attempts - 1))
