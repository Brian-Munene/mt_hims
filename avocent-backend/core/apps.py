from django.apps import AppConfig
from django.core import checks
from django.core.exceptions import ImproperlyConfigured

from core.fields import resolve_field_encryption_key


@checks.register()
def field_encryption_key_check(app_configs, **kwargs):
    """Fail fast when PHI field encryption is misconfigured.

    Runs on every management command (runserver, migrate, test), so a shell
    without the env file loaded stops immediately instead of silently
    encrypting data under the wrong key. Delegates to the same resolver
    EncryptedTextField uses, so this check can never pass on a key that
    encryption/decryption would then reject.
    """
    try:
        resolve_field_encryption_key()
    except ImproperlyConfigured as exc:
        return [
            checks.Error(
                str(exc),
                hint=(
                    "Load your env file (`set -a && source .env.local && set +a`) "
                    "or generate keys with `python manage.py generate_keys`."
                ),
                id="core.E001",
            )
        ]
    except ValueError as exc:
        return [
            checks.Error(
                str(exc),
                hint="Regenerate it with `python manage.py generate_keys`.",
                id="core.E002",
            )
        ]
    return []


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
