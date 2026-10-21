import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models

from core.fields import EncryptedTextField
from core.models import CoreModel
from organization.models import Clinic
from users.constants import DEFAULT_ROLE_DEFINITIONS


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def _resolve_superuser_clinic(self, clinic=None):
        if clinic is not None:
            return clinic

        clinics = Clinic.objects.filter(is_active=True).order_by("created_at")
        clinic_count = clinics.count()

        if clinic_count == 1:
            return clinics.first()

        if clinic_count == 0:
            return Clinic.objects.create(
                name="Default Clinic",
                registration_number=f"DEFAULT-{uuid.uuid4().hex[:12].upper()}",
            )

        raise ValueError(
            "Superuser creation requires an explicit clinic when multiple clinics exist."
        )

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        extra_fields["clinic"] = self._resolve_superuser_clinic(extra_fields.get("clinic"))
        user = self.create_user(email=email, password=password, **extra_fields)

        from users.constants import ROLE_ADMIN
        from users.services import assign_role, ensure_clinic_roles

        roles = ensure_clinic_roles(user.clinic, created_by=user)
        admin_role = next((role for role in roles if role.name == ROLE_ADMIN), None)
        if admin_role is not None:
            assign_role(user=user, role=admin_role, assigned_by=user)

        return user


class User(AbstractBaseUser, PermissionsMixin, CoreModel):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    is_staff = models.BooleanField(default=False)

    # otp_secret is written as soon as 2FA setup starts (see
    # TwoFactorSetupAPIView) but is_2fa_enabled only flips to True once the
    # user proves possession of the authenticator by submitting a valid code
    # (TwoFactorEnableAPIView) -- a secret alone never gates login.
    otp_secret = EncryptedTextField(blank=True, default="")
    is_2fa_enabled = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email

    def role_names(self, clinic=None):
        target_clinic = clinic or self.clinic
        return list(
            self.role_links.filter(clinic=target_clinic, is_active=True)
            .values_list("role__name", flat=True)
            .order_by("role__name")
        )

    def has_role(self, role_name, clinic=None):
        return role_name in self.role_names(clinic=clinic)

    def has_any_role(self, role_names, clinic=None):
        assigned = set(self.role_names(clinic=clinic))
        return bool(assigned.intersection(role_names))


class Role(CoreModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "name"], name="uniq_role_name_per_clinic"),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        allowed_names = {name for name, _ in DEFAULT_ROLE_DEFINITIONS}
        if self.name not in allowed_names:
            raise ValidationError({"name": f"Role name must be one of: {', '.join(sorted(allowed_names))}."})


class UserRole(CoreModel):
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="role_links")
    role = models.ForeignKey("users.Role", on_delete=models.CASCADE, related_name="user_links")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "user", "role"], name="uniq_user_role_per_clinic"),
        ]

    def clean(self):
        super().clean()
        if self.clinic_id != self.user.clinic_id:
            raise ValidationError({"clinic": "Role assignment clinic must match the user's clinic."})
        if self.clinic_id != self.role.clinic_id:
            raise ValidationError({"clinic": "Role assignment clinic must match the role's clinic."})


class Department(CoreModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=40)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "code"], name="uniq_dept_code_per_clinic"),
        ]

    def __str__(self):
        return self.name


class PractitionerProfile(CoreModel):
    user = models.OneToOneField("users.User", on_delete=models.CASCADE, related_name="practitioner_profile")
    license_number = models.CharField(max_length=100, unique=True)
    specialty = models.CharField(max_length=120, blank=True)
    qualifications = models.TextField(blank=True)
    signature_file = models.FileField(upload_to="signatures/", blank=True)
    is_verified = models.BooleanField(default=False)
    photo = models.ImageField(upload_to="practitioner_photos/", blank=True)
    bio = models.TextField(blank=True)
    department = models.ForeignKey(
        "users.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="practitioners",
    )
    public_slug = models.SlugField(max_length=120, unique=True, null=True, blank=True)
    is_online = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.public_slug:
            import uuid
            self.public_slug = str(uuid.uuid4())[:8] + "-" + self.license_number.lower().replace(" ", "-")[:20]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} ({self.license_number})"
