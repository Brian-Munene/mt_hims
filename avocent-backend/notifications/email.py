from django.conf import settings
from django.core.mail import send_mail


def send_notification_email(
    *,
    clinic,
    recipient_email: str,
    subject: str,
    body: str,
    event_type: str = "other",
) -> bool:
    """Send a plain-text notification email and record the result in EmailLog.

    Returns True on success, False if sending fails or email is not configured.
    """
    if not settings.EMAIL_CONFIGURED:
        return False

    if not recipient_email:
        return False

    from notifications.models import EmailLog

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        EmailLog.objects.create(
            clinic=clinic,
            recipient_email=recipient_email,
            subject=subject,
            event_type=event_type,
            status="sent",
        )
        return True
    except Exception as exc:
        EmailLog.objects.create(
            clinic=clinic,
            recipient_email=recipient_email,
            subject=subject,
            event_type=event_type,
            status="failed",
            error=str(exc),
        )
        return False
