import os


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "avocent_backend.settings")

try:
    from celery import Celery
    from celery.schedules import crontab
except ImportError:  # pragma: no cover - optional dependency before install
    app = None
else:
    app = Celery("avocent_backend")
    app.config_from_object("django.conf:settings", namespace="CELERY")
    app.autodiscover_tasks()
    app.conf.beat_schedule = {
        "flag-overdue-outpatient-encounters": {
            "task": "compliance.flag_overdue_outpatient_encounters",
            "schedule": crontab(minute=0),
        },
    }
