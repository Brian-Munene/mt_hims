from django.core.management import call_command

from core.tasking import shared_task


@shared_task(name="users.flush_expired_tokens")
def flush_expired_tokens():
    """Prune expired outstanding/blacklisted JWTs; rotation adds a row per refresh."""
    call_command("flushexpiredtokens")
