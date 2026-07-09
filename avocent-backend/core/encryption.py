import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.core.exceptions import ImproperlyConfigured


NONCE_SIZE = 12
ALGORITHM = "AES-256-GCM"


def _b64encode(value: bytes) -> str:
    return base64.b64encode(value).decode("utf-8")


def _b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode("utf-8"))


def get_encryption_key() -> bytes:
    raw_key = os.environ.get("API_ENCRYPTION_KEY", "")
    if not raw_key:
        raise ImproperlyConfigured("Missing API_ENCRYPTION_KEY for API payload encryption.")

    try:
        key = _b64decode(raw_key)
    except Exception as exc:
        raise ImproperlyConfigured("API_ENCRYPTION_KEY must be base64 encoded.") from exc

    if len(key) != 32:
        raise ImproperlyConfigured("API_ENCRYPTION_KEY must decode to exactly 32 bytes.")
    return key


def encrypt_json_bytes(plaintext: bytes, *, aad: bytes | None = None) -> dict:
    key = get_encryption_key()
    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)
    return {
        "alg": ALGORITHM,
        "nonce": _b64encode(nonce),
        "ciphertext": _b64encode(ciphertext),
    }


def decrypt_json_payload(payload: dict, *, aad: bytes | None = None) -> bytes:
    if payload.get("alg") != ALGORITHM:
        raise ValueError("Unsupported encryption algorithm.")
    nonce = _b64decode(payload["nonce"])
    ciphertext = _b64decode(payload["ciphertext"])
    key = get_encryption_key()
    return AESGCM(key).decrypt(nonce, ciphertext, aad)


def json_bytes(data: dict) -> bytes:
    return json.dumps(data).encode("utf-8")
