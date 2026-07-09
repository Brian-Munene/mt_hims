from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from audit.models import AuditLog
from organization.models import Clinic
from users.constants import ROLE_DOCTOR, ROLE_RECEPTIONIST
from users.models import User
from users.services import assign_role, ensure_clinic_roles


class AuditLogAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="AUDIT-001")
        self.other_clinic = Clinic.objects.create(name="Other", registration_number="AUDIT-002")
        ensure_clinic_roles(self.clinic)
        ensure_clinic_roles(self.other_clinic)

        self.doctor = User.objects.create_user(
            email="doctor-audit@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.receptionist = User.objects.create_user(
            email="reception-audit@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        clinic_roles = {role.name: role for role in self.clinic.roles.all()}
        assign_role(user=self.doctor, role=clinic_roles[ROLE_DOCTOR])
        assign_role(user=self.receptionist, role=clinic_roles[ROLE_RECEPTIONIST])

        self.log = AuditLog.objects.create(
            clinic=self.clinic,
            user=self.doctor,
            action="CREATE",
            model_name="patients.Patient",
            object_id="00000000-0000-0000-0000-000000000001",
        )
        self.foreign_log = AuditLog.objects.create(
            clinic=self.other_clinic,
            action="CREATE",
            model_name="patients.Patient",
            object_id="00000000-0000-0000-0000-000000000002",
        )

    def test_doctor_can_list_audit_logs_scoped_to_their_clinic(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/audit/logs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {result["id"] for result in response.data["results"]}
        self.assertIn(str(self.log.id), returned_ids)
        self.assertNotIn(str(self.foreign_log.id), returned_ids)

    def test_receptionist_without_audit_read_permission_is_forbidden(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/audit/logs/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_endpoint_rejects_writes(self):
        # write permission for audit.auditlog is intentionally unset (see MODEL_PERMISSION_MAP),
        # so ClinicRBACPermission denies this before DRF even checks http_method_names.
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/audit/logs/",
            {
                "clinic": str(self.clinic.id),
                "action": "CREATE",
                "model_name": "patients.Patient",
                "object_id": "00000000-0000-0000-0000-000000000003",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
