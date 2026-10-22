from django.db import migrations, models
from django.db.models import Count


def refuse_if_double_booked(apps, schema_editor):
    """Stop rather than silently pick a winner: these rows are clinical records,
    so a human decides which duplicate to cancel before the constraint goes on."""
    Appointment = apps.get_model("encounters", "Appointment")
    duplicates = list(
        Appointment.objects.filter(status="scheduled", is_active=True)
        .values("practitioner_id", "scheduled_time")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
        .order_by("scheduled_time")[:20]
    )
    if duplicates:
        listing = "\n".join(
            f"  practitioner={row['practitioner_id']} scheduled_time={row['scheduled_time'].isoformat()} rows={row['n']}"
            for row in duplicates
        )
        raise RuntimeError(
            "Cannot add uniq_active_appointment_per_practitioner_time: active double bookings exist "
            "(first 20 shown). Cancel or deactivate the extras, then re-run migrate.\n" + listing
        )


class Migration(migrations.Migration):
    dependencies = [
        ("encounters", "0004_availabilityslot"),
    ]

    operations = [
        migrations.RunPython(refuse_if_double_booked, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="appointment",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "scheduled"), ("is_active", True)),
                fields=("practitioner", "scheduled_time"),
                name="uniq_active_appointment_per_practitioner_time",
            ),
        ),
    ]
