import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.db import models


class EncryptedTextField(models.TextField):
    description = "AES-256-GCM encrypted text field"
    prefix = "enc::v1::"

    def _get_key(self) -> bytes:
        raw_key = os.environ.get("FIELD_ENCRYPTION_KEY")
        if raw_key:
            key = base64.b64decode(raw_key.encode("utf-8"))
            if len(key) != 32:
                raise ValueError("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes.")
            return key
        return hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()

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
