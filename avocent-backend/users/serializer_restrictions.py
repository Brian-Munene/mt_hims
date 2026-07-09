from rest_framework import serializers


def require_any_role(serializer, allowed_roles, message):
    request = serializer.context.get("request")
    user = getattr(request, "user", None)

    if not user or not getattr(user, "is_authenticated", False):
        raise serializers.ValidationError(message)

    if getattr(user, "is_superuser", False):
        return

    if not user.has_any_role(allowed_roles, clinic=getattr(user, "clinic", None)):
        raise serializers.ValidationError(message)
