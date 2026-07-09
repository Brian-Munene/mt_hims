from django.db import transaction

from users.constants import DEFAULT_ROLE_DEFINITIONS
from users.models import PractitionerProfile, Role, User, UserRole


@transaction.atomic
def ensure_clinic_roles(clinic, created_by=None):
    roles = []
    for name, description in DEFAULT_ROLE_DEFINITIONS:
        role, created = Role.objects.get_or_create(
            clinic=clinic,
            name=name,
            defaults={
                "description": description,
                "created_by": created_by,
            },
        )
        if not created and role.description != description:
            role.description = description
            role.save(update_fields=["description", "updated_at"])
        roles.append(role)
    return roles


@transaction.atomic
def assign_role(*, user, role, assigned_by=None):
    return UserRole.objects.get_or_create(
        clinic=user.clinic,
        user=user,
        role=role,
        defaults={"created_by": assigned_by},
    )


@transaction.atomic
def provision_practitioner(*, clinic, user_data, profile_data, assign_roles=None, assigned_by=None):
    """
    Creates a User and PractitionerProfile atomically, and assigns roles.
    """
    password = user_data.pop("password", None)
    
    # Ensure clinic is set on user data
    user_data["clinic"] = clinic
    
    user = User(**user_data)
    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()
    user.save()
    
    profile_data["clinic"] = clinic
    profile_data["user"] = user
    profile = PractitionerProfile.objects.create(**profile_data)
    
    if assign_roles:
        roles = Role.objects.filter(clinic=clinic, name__in=assign_roles)
        for role in roles:
            assign_role(user=user, role=role, assigned_by=assigned_by)
            
    return profile
