import base64
import os

from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.management.utils import get_random_secret_key


PLACEHOLDER_VALUES = {
    "",
    "django-insecure-change-me",
    "change-me",
}


def generate_base64_key() -> str:
    return base64.b64encode(os.urandom(32)).decode("utf-8")


class Command(BaseCommand):
    help = (
        "Generate SECRET_KEY, API_ENCRYPTION_KEY, and FIELD_ENCRYPTION_KEY and "
        "write them into an environment file."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=".env.local",
            help="Path to the env file to create or update. Defaults to .env.local in the project root.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Rotate keys even if the target env file already contains non-placeholder values.",
        )

    def _resolve_example_path(self, target_path: Path, project_root: Path) -> Path:
        example_by_target = {
            ".env.local": ".env.local.example",
            ".env.staging": ".env.staging.example",
            ".env.prod": ".env.prod.example",
        }
        example_name = example_by_target.get(target_path.name, ".env.local.example")
        return (project_root / example_name).resolve()

    def handle(self, *args, **options):
        env_path = Path(options["path"]).expanduser()
        if not env_path.is_absolute():
            env_path = Path.cwd() / env_path

        project_root = Path.cwd()
        source_path = self._resolve_example_path(env_path, project_root)

        if not env_path.exists():
            if source_path.exists():
                env_path.write_text(source_path.read_text(), encoding="utf-8")
                self.stdout.write(f"Created {env_path} from {source_path.name}.")
            else:
                env_path.write_text("", encoding="utf-8")
                self.stdout.write(f"Created empty env file at {env_path}.")

        lines = env_path.read_text(encoding="utf-8").splitlines()
        target_keys = {
            "SECRET_KEY": get_random_secret_key,
            "API_ENCRYPTION_KEY": generate_base64_key,
            "FIELD_ENCRYPTION_KEY": generate_base64_key,
        }

        updated_lines = []
        seen_keys = set()
        generated = {}

        for line in lines:
            if "=" not in line or line.lstrip().startswith("#"):
                updated_lines.append(line)
                continue

            key, current_value = line.split("=", 1)
            if key not in target_keys:
                updated_lines.append(line)
                continue

            seen_keys.add(key)
            should_replace = options["force"] or current_value.strip() in PLACEHOLDER_VALUES
            if should_replace:
                new_value = target_keys[key]()
                generated[key] = new_value
                updated_lines.append(f"{key}={new_value}")
            else:
                updated_lines.append(line)

        for key, generator in target_keys.items():
            if key in seen_keys:
                continue
            new_value = generator()
            generated[key] = new_value
            updated_lines.append(f"{key}={new_value}")

        env_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")

        if generated:
            self.stdout.write(self.style.SUCCESS(f"Updated {env_path} with generated keys:"))
            for key in ("SECRET_KEY", "API_ENCRYPTION_KEY", "FIELD_ENCRYPTION_KEY"):
                if key in generated:
                    self.stdout.write(f"- {key}")
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"No keys were changed in {env_path}. Use --force to rotate existing values."
                )
            )
