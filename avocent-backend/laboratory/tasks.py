from core.tasking import shared_task


@shared_task(name="laboratory.notify_lab_result_ready")
def notify_lab_result_ready(lab_result_id):
    from notifications.models import Notification

    from laboratory.models import LabResult

    lab_result = LabResult.objects.select_related(
        "clinic",
        "lab_order_item__lab_order__encounter__patient",
        "lab_order_item__lab_order__ordered_by__user",
        "lab_order_item__lab_test",
    ).get(pk=lab_result_id)
    patient = lab_result.lab_order_item.lab_order.encounter.patient
    lab_test_name = lab_result.lab_order_item.lab_test.name
    ordered_by = lab_result.lab_order_item.lab_order.ordered_by

    from notifications.email import send_notification_email

    Notification.objects.create(
        clinic=lab_result.clinic,
        recipient=ordered_by.user,
        title=f"Lab result ready: {lab_test_name}",
        body=f"Result for {patient.first_name} {patient.last_name} is ready for review.",
        href=f"/laboratory/orders/{lab_result.lab_order_item.lab_order_id}",
        source_app="laboratory",
        source_object_id=str(lab_result.id),
    )

    send_notification_email(
        clinic=lab_result.clinic,
        recipient_email=ordered_by.user.email,
        subject=f"Lab result ready: {lab_test_name}",
        body=(
            f"A lab result for {patient.first_name} {patient.last_name} is ready for review.\n\n"
            f"Test: {lab_test_name}\n"
            f"Please log in to the clinic portal to view the full result."
        ),
        event_type="lab_result_ready",
    )

    return {
        "lab_result_id": str(lab_result.id),
        "clinic_id": str(lab_result.clinic_id),
        "patient_id": str(patient.id),
        "patient_phone": patient.phone,
        "lab_test_name": lab_test_name,
    }
