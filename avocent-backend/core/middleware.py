import json

from django.conf import settings
from django.http import JsonResponse

from core.encryption import decrypt_json_payload, encrypt_json_bytes


class APIEncryptionMiddleware:
    """
    AES-256-GCM wrapper for JSON API traffic.

    Request encryption is opt-in via `X-Encrypted-Payload: 1`.
    If `API_ENCRYPTION_ENFORCE` is enabled, plaintext JSON API writes are rejected.
    Encrypted requests receive encrypted JSON responses automatically.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_process(request):
            error_response = self._decrypt_request(request)
            if error_response is not None:
                return error_response

        response = self.get_response(request)

        if self._should_encrypt_response(request, response):
            return self._encrypt_response(response)
        return response

    def _should_process(self, request):
        return bool(getattr(settings, "API_ENCRYPTION_ENABLED", False)) and request.path.startswith("/api/")

    def _is_docs_request(self, request):
        return request.path.startswith("/api/docs/") or request.path == "/api/schema/"

    def _decrypt_request(self, request):
        if self._is_docs_request(request):
            return None

        encrypted = request.headers.get("X-Encrypted-Payload") == "1"
        requires_body = request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.body

        if not encrypted:
            if getattr(settings, "API_ENCRYPTION_ENFORCE", False) and requires_body:
                return JsonResponse(
                    {"detail": "Encrypted API payload required.", "code": "encryption_required"},
                    status=400,
                )
            return None

        try:
            payload = json.loads(request.body.decode("utf-8"))
            plaintext = decrypt_json_payload(payload, aad=request.path.encode("utf-8"))
        except Exception:
            return JsonResponse(
                {"detail": "Invalid encrypted payload.", "code": "invalid_encrypted_payload"},
                status=400,
            )

        request._body = plaintext
        request.META["CONTENT_TYPE"] = "application/json"
        request.META["CONTENT_LENGTH"] = str(len(plaintext))
        request._encrypted_payload = True
        return None

    def _should_encrypt_response(self, request, response):
        if self._is_docs_request(request):
            return False
        if request.headers.get("X-Encrypted-Payload") != "1":
            return False
        content_type = response.get("Content-Type", "")
        return "application/json" in content_type and hasattr(response, "content")

    def _encrypt_response(self, response):
        payload = encrypt_json_bytes(response.content, aad=b"response")
        encrypted_response = JsonResponse(payload, status=response.status_code)
        encrypted_response["X-Encrypted-Payload"] = "1"
        encrypted_response["X-Encryption-Alg"] = payload["alg"]
        return encrypted_response
