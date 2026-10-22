"""Regression tests for #37: hostile JSON bodies must fail as 4xx, never RecursionError/500."""

import base64
import io
import json
import os

from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.exceptions import ParseError
from rest_framework.test import APITestCase

from core.encryption import encrypt_json_bytes
from core.parsers import SafeJSONParser, exceeds_depth
from core.tests.utils import ClinicAPIFixtureMixin
from patients.models import Patient

PATIENTS_URL = "/api/patients/patients/"


def nested(levels):
    """{"x": {"x": ... {}}} as raw text, so building it can't recurse either."""
    return '{"x":' * levels + "{}" + "}" * levels


class ExceedsDepthTests(SimpleTestCase):
    def test_counts_top_level_container_as_depth_one(self):
        self.assertFalse(exceeds_depth({}, 1))
        self.assertFalse(exceeds_depth({"a": 1}, 1))
        self.assertTrue(exceeds_depth({"a": {}}, 1))

    def test_lists_count_as_levels(self):
        self.assertFalse(exceeds_depth([[[]]], 3))
        self.assertTrue(exceeds_depth([[[[]]]], 3))

    def test_scalars_have_no_depth(self):
        self.assertFalse(exceeds_depth("text", 0))

    def test_handles_very_deep_input_without_recursing(self):
        data = json.loads(nested(900))
        self.assertTrue(exceeds_depth(data, 32))


class SafeJSONParserTests(SimpleTestCase):
    @override_settings(API_JSON_MAX_DEPTH=10**6)
    def test_recursion_error_while_parsing_becomes_parse_error(self):
        # Depth check disabled, so only the RecursionError guard stands between
        # this payload and a 500.
        with self.assertRaisesMessage(ParseError, "nesting is too deep"):
            SafeJSONParser().parse(io.BytesIO(nested(100_000).encode()))

    @override_settings(API_JSON_MAX_BYTES=10)
    def test_body_exactly_at_the_size_limit_is_accepted(self):
        self.assertEqual(SafeJSONParser().parse(io.BytesIO(b'{"a":"12"}')), {"a": "12"})


class HostileJSONBodyTests(ClinicAPIFixtureMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.receptionist)

    def _post_raw(self, body, **extra):
        return self.client.generic("POST", PATIENTS_URL, body, content_type="application/json", **extra)

    def test_deeply_nested_body_returns_400_not_500(self):
        body = '{"first_name":"a","last_name":"b","gender":"unknown","metadata":' + nested(5000) + "}"

        response = self._post_raw(body)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nesting", response.json()["detail"])
        self.assertFalse(Patient.objects.filter(first_name="a", last_name="b").exists())

    def test_nesting_exactly_at_the_limit_is_accepted(self):
        # Top-level object is level 1, metadata's outermost object level 2, so
        # nested(30) ends at level 32 == API_JSON_MAX_DEPTH.
        body = '{"first_name":"At","last_name":"Limit","gender":"unknown","metadata":' + nested(30) + "}"

        response = self._post_raw(body)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_nesting_one_over_the_limit_is_rejected(self):
        body = '{"first_name":"a","last_name":"b","gender":"unknown","metadata":' + nested(31) + "}"

        response = self._post_raw(body)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patient_document_endpoint_uses_the_safe_parser(self):
        response = self.client.generic(
            "POST", "/api/patients/documents/", '{"title":' + nested(5000) + "}", content_type="application/json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reasonable_nesting_is_accepted(self):
        body = '{"first_name":"Nested","last_name":"Ok","gender":"unknown","metadata":' + nested(5) + "}"

        response = self._post_raw(body)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    @override_settings(API_JSON_MAX_BYTES=200)
    def test_oversized_body_returns_413(self):
        body = json.dumps({"first_name": "a", "last_name": "b", "gender": "unknown", "notes": "x" * 500})

        response = self._post_raw(body)

        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    def test_malformed_json_still_returns_400(self):
        response = self._post_raw('{"first_name": ')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(API_ENCRYPTION_ENABLED=True, API_JSON_MAX_BYTES=200)
    def test_encrypted_oversized_body_returns_413(self):
        key = base64.b64encode(b"0123456789abcdef0123456789abcdef").decode("utf-8")
        previous_key = os.environ.get("API_ENCRYPTION_KEY")
        os.environ["API_ENCRYPTION_KEY"] = key
        try:
            plaintext = json.dumps({"first_name": "a", "last_name": "b", "notes": "x" * 500}).encode()
            envelope = encrypt_json_bytes(plaintext, aad=PATIENTS_URL.encode())

            response = self._post_raw(json.dumps(envelope), HTTP_X_ENCRYPTED_PAYLOAD="1")

            self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        finally:
            if previous_key is None:
                os.environ.pop("API_ENCRYPTION_KEY", None)
            else:
                os.environ["API_ENCRYPTION_KEY"] = previous_key

    @override_settings(API_ENCRYPTION_ENABLED=True)
    def test_encrypted_deeply_nested_body_returns_400(self):
        key = base64.b64encode(b"0123456789abcdef0123456789abcdef").decode("utf-8")
        previous_key = os.environ.get("API_ENCRYPTION_KEY")
        os.environ["API_ENCRYPTION_KEY"] = key
        try:
            plaintext = ('{"first_name":"a","last_name":"b","metadata":' + nested(5000) + "}").encode()
            envelope = encrypt_json_bytes(plaintext, aad=PATIENTS_URL.encode())

            response = self._post_raw(json.dumps(envelope), HTTP_X_ENCRYPTED_PAYLOAD="1")

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        finally:
            if previous_key is None:
                os.environ.pop("API_ENCRYPTION_KEY", None)
            else:
                os.environ["API_ENCRYPTION_KEY"] = previous_key
