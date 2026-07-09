from payments.tasks import process_mpesa_callback


def queue_mpesa_callback_processing(payment) -> bool:
    if payment.payment_method != "mpesa":
        return False
    if not payment.callback_payload:
        return False

    process_mpesa_callback.delay(str(payment.id), payment.callback_payload)
    return True
