from django.utils import timezone

from core.tasking import shared_task


@shared_task(name="payments.process_mpesa_callback")
def process_mpesa_callback(payment_id, callback_payload):
    from payments.models import Payment

    payment = Payment.objects.get(pk=payment_id)
    payment.callback_payload = callback_payload or {}

    result_code = payment.callback_payload.get("ResultCode")
    payment.status = "successful" if result_code == 0 else "failed"
    payment.transaction_date = timezone.now()
    payment.save(update_fields=["callback_payload", "status", "transaction_date", "updated_at"])
    return {
        "payment_id": str(payment.id),
        "status": payment.status,
        "result_code": result_code,
    }
