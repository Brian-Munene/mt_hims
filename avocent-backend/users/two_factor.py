from django.core import signing

# Short-lived, purpose-scoped token proving a user has already passed the
# password check and only needs to submit a TOTP code. Reuses Django's
# built-in signing (HMAC over SECRET_KEY) rather than a new token type or
# model -- the salt keeps it cryptographically distinct from any other use
# of signing.dumps/loads elsewhere in the codebase, and max_age on load is
# what makes it expire; there is nothing to revoke or clean up.
CHALLENGE_SALT = "users.two_factor.challenge"
CHALLENGE_MAX_AGE_SECONDS = 300


def issue_challenge_token(user) -> str:
    return signing.dumps({"user_id": str(user.pk)}, salt=CHALLENGE_SALT)


def resolve_challenge_token(token: str) -> str | None:
    """Return the user id embedded in a challenge token, or None if it's missing,
    tampered with, or older than CHALLENGE_MAX_AGE_SECONDS."""
    try:
        payload = signing.loads(token, salt=CHALLENGE_SALT, max_age=CHALLENGE_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return None
    return payload.get("user_id")
