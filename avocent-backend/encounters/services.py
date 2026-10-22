import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from kombu.exceptions import OperationalError as BrokerOperationalError

from encounters.tasks import send_appointment_reminder

logger = logging.getLogger(__name__)


def schedule_appointment_reminder(appointment) -> bool:
    """Queue the reminder once the appointment row has committed.

    Returns True when a reminder was handed to on_commit. Delivery is
    best-effort: a broker outage is logged, never raised, because the
    appointment is already saved and a 500 would make clients retry and
    create duplicates (#36).
    """
    if appointment.status != "scheduled" or not appointment.is_active:
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

    appointment_id = str(appointment.id)
    transaction.on_commit(lambda: _enqueue_reminder(appointment_id, eta))
    return True


def _enqueue_reminder(appointment_id, eta):
    try:
        # ignore_result: nothing reads the outcome, and with a Redis result backend every
        # send would otherwise subscribe to it first -- ~20 reconnect attempts (~19s) and
        # a RuntimeError, not an OperationalError, when Redis is down.
        send_appointment_reminder.apply_async(args=(appointment_id,), eta=eta, ignore_result=True)
    except BrokerOperationalError:
        logger.warning("Broker unavailable; reminder for appointment %s was not queued.", appointment_id, exc_info=True)
    except Exception:
        # Runs after the row has committed: anything escaping here becomes a 500 for a
        # booking that succeeded, which is exactly what made clients retry into duplicates.
        logger.exception("Unexpected error queueing reminder for appointment %s.", appointment_id)
