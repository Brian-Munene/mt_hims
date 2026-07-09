from django.db.models.signals import post_save
from django.dispatch import receiver

from organization.models import Clinic
from users.services import ensure_clinic_roles


@receiver(post_save, sender=Clinic)
def seed_default_roles_for_clinic(sender, instance, created, **kwargs):
    if created:
        ensure_clinic_roles(instance, created_by=None)
