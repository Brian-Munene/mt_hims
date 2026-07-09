from django.core.exceptions import PermissionDenied, ValidationError
from django.test import RequestFactory, TestCase

from organization.models import Clinic
from patients.models import Patient
from users.constants import DEFAULT_ROLE_DEFINITIONS
from users.access import can_access_object
from users.constants import ROLE_ADMIN, ROLE_DOCTOR, ROLE_RECEPTIONIST
from users.middleware import RBACMiddleware
from users.models import Role, User, UserRole
from users.permissions import has_permission
from users.services import assign_role, ensure_clinic_roles


class RBACTestCase(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="REG-001")
        self.other_clinic = Clinic.objects.create(name="Other", registration_number="REG-002")

        ensure_clinic_roles(self.clinic)
        ensure_clinic_roles(self.other_clinic)

        self.doctor = User.objects.create_user(
            email="doctor@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.receptionist = User.objects.create_user(
            email="reception@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="secret123",
            clinic=self.clinic,
            is_staff=True,
        )
        self.other_doctor = User.objects.create_user(
            email="doctor2@example.com",
            password="secret123",
            clinic=self.other_clinic,
        )

        role_map = {role.name: role for role in self.clinic.roles.all()}
        assign_role(user=self.doctor, role=role_map[ROLE_DOCTOR])
        assign_role(user=self.receptionist, role=role_map[ROLE_RECEPTIONIST])
        assign_role(user=self.admin, role=role_map[ROLE_ADMIN])

        self.patient = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            first_name="Jane",
            last_name="Doe",
        )
        self.foreign_patient = Patient.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            first_name="John",
            last_name="Roe",
        )

    def test_role_matrix_allows_doctor_clinical_access(self):
        self.assertTrue(has_permission(self.doctor, "clinical.read", clinic=self.clinic))
        self.assertTrue(has_permission(self.doctor, "pharmacy.write", clinic=self.clinic))
        self.assertFalse(has_permission(self.doctor, "payments.write", clinic=self.clinic))

    def test_receptionist_access_is_restricted(self):
        self.assertTrue(has_permission(self.receptionist, "appointments.write", clinic=self.clinic))
        self.assertFalse(has_permission(self.receptionist, "clinical.write", clinic=self.clinic))

    def test_object_access_enforces_same_clinic(self):
        self.assertTrue(can_access_object(self.doctor, self.patient, action="read"))
        self.assertFalse(can_access_object(self.doctor, self.foreign_patient, action="read"))

    def test_middleware_blocks_missing_permission(self):
        request = RequestFactory().get("/api/patients/")
        request.user = self.receptionist

        def dummy_view(request):
            return None

        dummy_view.required_permission = "clinical.write"
        middleware = RBACMiddleware(lambda req: None)

        with self.assertRaises(PermissionDenied):
            middleware.process_view(request, dummy_view, (), {})


class SuperuserBootstrapTestCase(TestCase):
    def test_create_superuser_bootstraps_default_clinic_and_admin_role(self):
        superuser = User.objects.create_superuser(
            email="bootstrap@example.com",
            password="secret123",
        )

        self.assertIsNotNone(superuser.clinic)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.has_role(ROLE_ADMIN, clinic=superuser.clinic))


class UserModelValidationTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Validation Clinic", registration_number="VAL-001")
        self.other_clinic = Clinic.objects.create(name="Validation Other", registration_number="VAL-002")
        ensure_clinic_roles(self.clinic)
        ensure_clinic_roles(self.other_clinic)
        self.user = User.objects.create_user(
            email="validator@example.com",
            password="secret123",
            clinic=self.clinic,
        )

    def test_role_clean_rejects_unknown_role_name(self):
        role = Role(clinic=self.clinic, name="Unknown Role")

        with self.assertRaisesMessage(
            ValidationError,
            f"Role name must be one of: {', '.join(sorted(name for name, _ in DEFAULT_ROLE_DEFINITIONS))}.",
        ):
            role.full_clean()

    def test_user_role_clean_requires_matching_clinic(self):
        role = self.other_clinic.roles.get(name=ROLE_DOCTOR)
        assignment = UserRole(clinic=self.clinic, user=self.user, role=role)

        with self.assertRaisesMessage(ValidationError, "Role assignment clinic must match the role's clinic."):
            assignment.full_clean()
