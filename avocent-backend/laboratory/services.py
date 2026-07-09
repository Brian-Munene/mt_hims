from laboratory.tasks import notify_lab_result_ready


def queue_lab_result_notification(lab_result) -> bool:
    notify_lab_result_ready.delay(str(lab_result.id))
    return True
