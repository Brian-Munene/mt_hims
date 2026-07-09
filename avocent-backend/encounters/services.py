from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from encounters.tasks import send_appointment_reminder


def schedule_appointment_reminder(appointment) -> bool:
    if appointment.status != "scheduled":
        return False
    if not settings.CELERY_BROKER_CONFIGURED:
        # Without REDIS_URL, CELERY_BROKER_URL falls back to the in-process "memory://" transport,
        # which silently drops anything scheduled with an `eta` since no separate worker process can
        # consume from it. Skip rather than send at the wrong time.
        return False

    eta = appointment.scheduled_time - timedelta(
        minutes=getattr(settings, "APPOINTMENT_REMINDER_LEAD_MINUTES", 1440)
    )
    if eta < timezone.now():
        eta = timezone.now()

    send_appointment_reminder.apply_async(args=(str(appointment.id),), eta=eta)
    return True
