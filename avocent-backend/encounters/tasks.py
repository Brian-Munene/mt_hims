from core.tasking import shared_task


@shared_task(name="encounters.send_appointment_reminder")
def send_appointment_reminder(appointment_id):
    from notifications.email import send_notification_email
    from notifications.models import Notification

    from encounters.models import Appointment

    appointment = Appointment.objects.select_related(
        "patient",
        "practitioner__user",
        "clinic",
    ).get(pk=appointment_id)

    body = (
        f"Appointment with {appointment.patient.first_name} {appointment.patient.last_name}"
        f" at {appointment.scheduled_time.isoformat()}."
    )

    Notification.objects.create(
        clinic=appointment.clinic,
        recipient=appointment.practitioner.user,
        title="Upcoming appointment reminder",
        body=body,
        href=f"/encounters/appointments/{appointment.id}",
        source_app="encounters",
        source_object_id=str(appointment.id),
    )

    if appointment.patient.email:
        send_notification_email(
            clinic=appointment.clinic,
            recipient_email=appointment.patient.email,
            subject="Appointment reminder",
            body=(
                f"Dear {appointment.patient.first_name},\n\n"
                f"This is a reminder for your upcoming appointment on "
                f"{appointment.scheduled_time.strftime('%d %B %Y at %H:%M')}.\n\n"
                "Please contact the clinic if you need to reschedule."
            ),
            event_type="appointment_reminder",
        )

    return {
        "appointment_id": str(appointment.id),
        "clinic_id": str(appointment.clinic_id),
        "patient_id": str(appointment.patient_id),
        "patient_phone": appointment.patient.phone,
        "practitioner_email": appointment.practitioner.user.email,
        "scheduled_time": appointment.scheduled_time.isoformat(),
        "encounter_type": appointment.encounter_type,
    }
