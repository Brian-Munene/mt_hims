from django.core.management.base import BaseCommand
from django.db import transaction

from organization.models import Clinic
from users.constants import ROLE_ADMIN
from users.models import User
from users.services import assign_role, ensure_clinic_roles

E2E_CLINIC_REGISTRATION_NUMBER = "E2E-000001"
E2E_EMAIL = "e2e@avocent.test"
E2E_PASSWORD = "E2E-test-pass-123!"  # fixed on purpose: only ever used against disposable test databases


class Command(BaseCommand):
    help = (
        "Create (or reset) a deterministic Admin user + clinic for end-to-end tests. "
        "Idempotent — safe to run before every test suite invocation. "
        "Never run this against a real/production database."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        clinic, _ = Clinic.objects.get_or_create(
            registration_number=E2E_CLINIC_REGISTRATION_NUMBER,
            defaults={"name": "E2E Test Clinic"},
        )

        user, created = User.objects.get_or_create(
            email=E2E_EMAIL,
            defaults={"clinic": clinic, "phone": "+254700000000", "is_active": True},
        )
        # Reset every field on repeat runs so a suite never inherits state
        # (a disabled account, a stale password) left over from a prior run.
        user.clinic = clinic
        user.is_active = True
        user.set_password(E2E_PASSWORD)
        user.save()

        roles = {role.name: role for role in ensure_clinic_roles(clinic)}
        assign_role(user=user, role=roles[ROLE_ADMIN], assigned_by=user)

        self.stdout.write(self.style.SUCCESS(f"E2E user ready: {E2E_EMAIL} / {E2E_PASSWORD} (clinic={clinic.id})"))
