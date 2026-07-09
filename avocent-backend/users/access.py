from users.permissions import MODEL_PERMISSION_MAP, has_permission


def get_object_clinic(obj):
    if obj is None:
        return None
    if hasattr(obj, "clinic"):
        return obj.clinic
    if obj.__class__._meta.label_lower == "organization.clinic":
        return obj
    return None


def get_model_permission(model_or_instance, action):
    meta = getattr(model_or_instance, "_meta", None)
    if meta is None:
        return None
    mapping = MODEL_PERMISSION_MAP.get(meta.label_lower, {})
    return mapping.get(action)


def can_access_object(user, obj, action="read"):
    if getattr(user, "is_superuser", False):
        return True

    permission = get_model_permission(obj, action)
    if permission is None:
        return False

    object_clinic = get_object_clinic(obj)
    if object_clinic is not None and getattr(user, "clinic_id", None) != getattr(object_clinic, "id", None):
        return False

    return has_permission(user, permission, clinic=object_clinic)
