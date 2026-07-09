from django.db.models.signals import post_save
from django.dispatch import receiver

from billing.models import Invoice
from payments.models import Payment

from booking.services import sync_booking_billing_state


@receiver(post_save, sender=Invoice)
def sync_booking_after_invoice_save(sender, instance, **kwargs):
    if instance.booking_id:
        sync_booking_billing_state(instance.booking)


@receiver(post_save, sender=Payment)
def sync_booking_after_payment_save(sender, instance, **kwargs):
    booking = getattr(instance.invoice, "booking", None)
    if booking is not None:
        sync_booking_billing_state(booking)
