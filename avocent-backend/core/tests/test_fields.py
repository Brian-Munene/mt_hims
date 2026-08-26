import base64
import os
from unittest import mock

from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase

from core.apps import field_encryption_key_check
from core.fields import EncryptedTextField


class EncryptedTextFieldKeyTests(TestCase):
    def _field(self):
        field = EncryptedTextField()
        field.name = "national_id"
        return field

    def test_roundtrip_with_configured_key(self):
        field = self._field()
        encrypted = field._encrypt("12345678")
        self.assertTrue(encrypted.startswith(EncryptedTextField.prefix))
        self.assertEqual(field._decrypt(encrypted), "12345678")

    def test_missing_key_raises_instead_of_falling_back(self):
        field = self._field()
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("FIELD_ENCRYPTION_KEY", None)
            with self.assertRaises(ImproperlyConfigured):
                field._get_key()

    def test_invalid_length_key_raises(self):
        field = self._field()
        short_key = base64.b64encode(b"too-short").decode()
        with mock.patch.dict(os.environ, {"FIELD_ENCRYPTION_KEY": short_key}):
            with self.assertRaises(ValueError):
                field._get_key()

    def test_system_check_flags_missing_key(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("FIELD_ENCRYPTION_KEY", None)
            errors = field_encryption_key_check(None)
        self.assertEqual([error.id for error in errors], ["core.E001"])

    def test_system_check_flags_malformed_key(self):
        with mock.patch.dict(os.environ, {"FIELD_ENCRYPTION_KEY": "not-32-bytes"}):
            errors = field_encryption_key_check(None)
        self.assertEqual([error.id for error in errors], ["core.E002"])

    def test_system_check_passes_with_valid_key(self):
        valid = base64.b64encode(os.urandom(32)).decode()
        with mock.patch.dict(os.environ, {"FIELD_ENCRYPTION_KEY": valid}):
            self.assertEqual(field_encryption_key_check(None), [])
