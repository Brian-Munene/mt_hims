import hashlib
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


logger = logging.getLogger(__name__)


def _reuse_cache_key(raw_refresh_token):
    return "jwt-rotated:" + hashlib.sha256(raw_refresh_token.encode()).hexdigest()


# The grace window is a convenience layered on a strictly single-use token. If the
# cache (Redis) is unavailable, degrade to no grace rather than failing refresh:
# a 500 here makes the frontend proxy drop the session.
def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:
        logger.warning("JWT reuse cache unavailable; refresh grace window disabled.", exc_info=True)
        return None


def _cache_set(key, value):
    try:
        cache.set(key, value, timeout=settings.JWT_REFRESH_REUSE_GRACE_SECONDS)
    except Exception:
        logger.warning("JWT reuse cache unavailable; refresh grace window disabled.", exc_info=True)


class RotatingTokenRefreshSerializer(TokenRefreshSerializer):
    """Single-use refresh tokens with a short reuse grace window (#38).

    simplejwt's own blacklist-after-rotation uses get_or_create, so concurrent
    refreshes with one token all succeed and each mints a fresh pair. Here the
    blacklist insert is the claim: the OneToOne unique constraint lets exactly one
    request win.

    The grace window exists for the frontend proxy, which refreshes independently
    on every request that arrives without an access cookie: a page load plus its
    parallel /api/proxy fetches all present the same refresh cookie. Within
    JWT_REFRESH_REUSE_GRACE_SECONDS, a replay gets back the pair the winner
    issued rather than a 401 (which would log the user out); after it, the token
    is dead.
    """

    def validate(self, attrs):
        raw = attrs["refresh"]
        cache_key = _reuse_cache_key(raw)
        if (reissued := _cache_get(cache_key)) is not None:
            return self._reissue(reissued)

        try:
            refresh = self.token_class(raw)  # verifies signature, expiry and blacklist
            self._check_user_is_active(refresh)
            with transaction.atomic():
                self._claim(refresh)
                data = self._rotate(refresh)
                # Before commit, so any request that can see the blacklist row can
                # also see the winner's pair.
                _cache_set(cache_key, data)
        except (TokenError, IntegrityError) as exc:
            # Lost a race to a concurrent refresh of this exact token -- either at the
            # unique insert, or the winner committed between our first cache read and
            # the blacklist check in token_class(). Either way its pair is cached.
            if (reissued := _cache_get(cache_key)) is not None:
                return self._reissue(reissued)
            if isinstance(exc, IntegrityError):
                raise TokenError("Token is blacklisted") from exc
            raise
        return data

    def _reissue(self, data):
        # Expected a handful of times per rotation from the proxy's parallel requests;
        # a stream of these from an unfamiliar address is what token theft looks like.
        request = self.context.get("request")
        logger.info(
            "Rotated refresh token replayed inside grace window from %s",
            request.META.get("REMOTE_ADDR") if request else "unknown",
        )
        return data

    def _check_user_is_active(self, refresh):
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM)
        user = get_user_model().objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
        if user is None or not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed(self.error_messages["no_active_account"], "no_active_account")

    @staticmethod
    def _claim(refresh):
        # outstand() is simplejwt's own get_or_create for this jti (tokens minted
        # before the blacklist app was installed have no row yet); create(), not
        # get_or_create(), so a second claimant hits the unique constraint.
        outstanding, _ = refresh.outstand()
        BlacklistedToken.objects.create(token=outstanding)

    @staticmethod
    def _rotate(refresh):
        data = {"access": str(refresh.access_token)}
        refresh.set_jti()
        refresh.set_exp()
        refresh.set_iat()
        refresh.outstand()
        data["refresh"] = str(refresh)
        return data


def revoke_all_refresh_tokens(user):
    """Blacklist every unexpired refresh token issued to this user, e.g. after a
    password reset, so existing sessions can't keep minting access tokens."""
    pending = OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in pending], ignore_conflicts=True
    )
