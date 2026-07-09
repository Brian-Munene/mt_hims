from django.core.exceptions import PermissionDenied

from users.permissions import has_permission


class RBACMiddleware:
    """
    Enforces permission metadata declared on API views.

    Supported attributes on a view function or class:
    - required_permission = "patients.read"
    - required_permissions = ("patients.read", "encounters.read")
    - required_roles = ("Doctor", "Nurse")
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        view_class = getattr(view_func, "view_class", None)
        required_permission = getattr(view_func, "required_permission", None) or getattr(view_class, "required_permission", None)
        required_permissions = getattr(view_func, "required_permissions", None) or getattr(view_class, "required_permissions", None)
        required_roles = getattr(view_func, "required_roles", None) or getattr(view_class, "required_roles", None)

        if not any((required_permission, required_permissions, required_roles)):
            return None

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Authentication is required.")

        clinic = getattr(user, "clinic", None)

        if required_permission and not has_permission(user, required_permission, clinic=clinic):
            raise PermissionDenied(f"Missing permission: {required_permission}")

        if required_permissions:
            missing = [perm for perm in required_permissions if not has_permission(user, perm, clinic=clinic)]
            if missing:
                raise PermissionDenied(f"Missing permissions: {', '.join(missing)}")

        if required_roles and not user.has_any_role(required_roles, clinic=clinic):
            raise PermissionDenied("Insufficient role assignment.")

        return None
