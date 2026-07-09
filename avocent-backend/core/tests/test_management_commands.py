import os
import tempfile

from pathlib import Path

from django.core.management import call_command
from django.test import SimpleTestCase


class GenerateKeysCommandTests(SimpleTestCase):
    def test_generate_keys_populates_placeholder_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / ".env.local"
            env_path.write_text(
                "\n".join(
                    [
                        "SECRET_KEY=django-insecure-change-me",
                        "API_ENCRYPTION_KEY=",
                        "FIELD_ENCRYPTION_KEY=",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            call_command("generate_keys", path=str(env_path))

            content = env_path.read_text(encoding="utf-8")
            self.assertNotIn("SECRET_KEY=django-insecure-change-me", content)
            self.assertIn("SECRET_KEY=", content)
            self.assertIn("API_ENCRYPTION_KEY=", content)
            self.assertIn("FIELD_ENCRYPTION_KEY=", content)

    def test_generate_keys_preserves_existing_values_without_force(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / ".env.local"
            env_path.write_text(
                "\n".join(
                    [
                        "SECRET_KEY=existing-secret",
                        "API_ENCRYPTION_KEY=existing-api-key",
                        "FIELD_ENCRYPTION_KEY=existing-field-key",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            call_command("generate_keys", path=str(env_path))

            content = env_path.read_text(encoding="utf-8")
            self.assertIn("SECRET_KEY=existing-secret", content)
            self.assertIn("API_ENCRYPTION_KEY=existing-api-key", content)
            self.assertIn("FIELD_ENCRYPTION_KEY=existing-field-key", content)

    def test_generate_keys_force_rotates_existing_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / ".env.local"
            env_path.write_text(
                "\n".join(
                    [
                        "SECRET_KEY=existing-secret",
                        "API_ENCRYPTION_KEY=existing-api-key",
                        "FIELD_ENCRYPTION_KEY=existing-field-key",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            call_command("generate_keys", path=str(env_path), force=True)

            content = env_path.read_text(encoding="utf-8")
            self.assertNotIn("SECRET_KEY=existing-secret", content)
            self.assertNotIn("API_ENCRYPTION_KEY=existing-api-key", content)
            self.assertNotIn("FIELD_ENCRYPTION_KEY=existing-field-key", content)

    def test_generate_keys_uses_matching_example_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            env_path = project_root / ".env.staging"
            (project_root / ".env.staging.example").write_text(
                "DEBUG=false\nALLOWED_HOSTS=staging.example.com\n",
                encoding="utf-8",
            )

            current_dir = Path.cwd()
            try:
                os.chdir(project_root)
                call_command("generate_keys", path=str(env_path))
            finally:
                os.chdir(current_dir)

            content = env_path.read_text(encoding="utf-8")
            self.assertIn("DEBUG=false", content)
            self.assertIn("ALLOWED_HOSTS=staging.example.com", content)
            self.assertIn("SECRET_KEY=", content)
