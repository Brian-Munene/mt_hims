import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.core.exceptions import ImproperlyConfigured
from django.db import models

FIELD_ENCRYPTION_KEY_ENV = "FIELD_ENCRYPTION_KEY"


def resolve_field_encryption_key() -> bytes:
    """Read, decode, and validate FIELD_ENCRYPTION_KEY from the environment.

    Shared by EncryptedTextField (every encrypt/decrypt call) and the
    core.E001/E002 system check, so "looks valid at check-time" can never
    drift from "accepted at write-time" — a mismatch here is exactly how PHI
    once got encrypted under a key nobody meant to use.

    Raises ImproperlyConfigured if the env var is unset, ValueError if it
    isn't valid base64 or doesn't decode to exactly 32 bytes.
    """
    raw_key = os.environ.get(FIELD_ENCRYPTION_KEY_ENV)
    if not raw_key:
        raise ImproperlyConfigured(
            f"{FIELD_ENCRYPTION_KEY_ENV} is not set. Load your env file (e.g. "
            "`set -a && source .env.local && set +a`) or generate keys with "
            "`python manage.py generate_keys --path .env.local`."
        )
    key = base64.b64decode(raw_key.encode("utf-8"))
    if len(key) != 32:
        raise ValueError(f"{FIELD_ENCRYPTION_KEY_ENV} must decode to exactly 32 bytes.")
    return key


class EncryptedTextField(models.TextField):
    description = "AES-256-GCM encrypted text field"
    prefix = "enc::v1::"

    def _get_key(self) -> bytes:
        # No fallback on purpose: deriving a key from SECRET_KEY silently
        # encrypted PHI under an implicit key once, and that data became
        # unrecoverable when settings changed.
        return resolve_field_encryption_key()

    def _encrypt(self, value: str) -> str:
        nonce = os.urandom(12)
        ciphertext = AESGCM(self._get_key()).encrypt(nonce, value.encode("utf-8"), self.name.encode("utf-8"))
        payload = base64.b64encode(nonce + ciphertext).decode("utf-8")
        return f"{self.prefix}{payload}"

    def _decrypt(self, value: str) -> str:
        payload = value[len(self.prefix):]
        raw = base64.b64decode(payload.encode("utf-8"))
        nonce, ciphertext = raw[:12], raw[12:]
        plaintext = AESGCM(self._get_key()).decrypt(nonce, ciphertext, self.name.encode("utf-8"))
        return plaintext.decode("utf-8")

    def from_db_value(self, value, expression, connection):
        return self.to_python(value)

    def to_python(self, value):
        if value is None or value == "":
            return value
        if isinstance(value, str) and value.startswith(self.prefix):
            return self._decrypt(value)
        return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None or value == "":
            return value
        if isinstance(value, str) and value.startswith(self.prefix):
            return value
        return self._encrypt(str(value))
