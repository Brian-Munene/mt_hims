from django.test import TestCase
from django.core.exceptions import ValidationError

from audit.context import reset_audit_actor, set_audit_actor
from audit.models import AuditLog
from organization.models import Clinic
from patients.models import Patient
from users.models import User


class AuditSignalTestCase(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="REG-AUDIT")
        self.user = User.objects.create_user(
            email="auditor@example.com",
            password="secret123",
            clinic=self.clinic,
        )

    def test_sensitive_model_changes_create_audit_log(self):
        token_user, token_ip = set_audit_actor(user=self.user, ip_address="127.0.0.1")
        try:
            Patient.objects.create(
                clinic=self.clinic,
                created_by=self.user,
                first_name="Audit",
                last_name="Patient",
            )
        finally:
            reset_audit_actor(token_user, token_ip)

        self.assertTrue(AuditLog.objects.filter(action="CREATE", model_name="patients.Patient").exists())

    def test_audit_logs_are_immutable(self):
        log = AuditLog.objects.create(
            clinic=self.clinic,
            created_by=self.user,
            user=self.user,
            action="VIEW",
            model_name="patients.Patient",
            object_id="patient-1",
        )

        log.action = "UPDATE"
        with self.assertRaises(ValidationError):
            log.save()

        with self.assertRaises(ValidationError):
            log.delete()
