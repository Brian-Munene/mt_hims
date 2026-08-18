from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from users.models import PractitionerProfile, Role, User, UserRole


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "clinic", "phone", "is_staff", "is_superuser", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active", "clinic")
    search_fields = ("email", "phone")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Clinic", {"fields": ("clinic", "created_by", "metadata")}),
        ("Personal info", {"fields": ("phone",)}),
        # is_staff/is_superuser are intentionally not editable anywhere;
        # admin access is granted only via the createsuperuser command.
        ("Permissions", {"fields": ("is_active", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "clinic", "phone", "password1", "password2"),
            },
        ),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "clinic", "is_active")
    list_filter = ("clinic", "is_active", "name")
    search_fields = ("name", "description")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "clinic", "is_active", "created_at")
    list_filter = ("clinic", "role", "is_active")
    search_fields = ("user__email", "role__name")
    autocomplete_fields = ("user", "role", "created_by")


@admin.register(PractitionerProfile)
class PractitionerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "license_number", "specialty", "is_verified", "clinic")
    list_filter = ("is_verified", "clinic", "specialty")
    search_fields = ("user__email", "license_number", "specialty")
    autocomplete_fields = ("user", "created_by")
