from rest_framework import serializers


def resolve_field(serializer, attrs, field_name):
    """Return the incoming value for field_name, falling back to the existing instance's value."""
    return attrs.get(field_name) or getattr(serializer.instance, field_name, None)


def resolve_effective_clinic(serializer, attrs):
    """Resolve the clinic a create/update will actually be saved under.

    Checks attrs (a writable clinic field) and the existing instance
    (updates), then falls back to the requesting user's own clinic — the
    same value ClinicScopedModelViewSet.perform_create() assigns whenever a
    serializer's clinic field is read-only and therefore never in attrs.
    Without this fallback, making a serializer's own `clinic` read-only
    silently disables every cross-clinic consistency check below, since
    they'd otherwise compare against an always-None value.
    """
    clinic = resolve_field(serializer, attrs, "clinic")
    if clinic:
        return clinic
    request = serializer.context.get("request")
    return getattr(getattr(request, "user", None), "clinic", None)


def validate_clinic_match(serializer, attrs, related_field, message):
    """Raise ValidationError(message) if attrs/instance clinic doesn't match related_field's clinic."""
    clinic = resolve_effective_clinic(serializer, attrs)
    related = resolve_field(serializer, attrs, related_field)
    if clinic and related and clinic != related.clinic:
        raise serializers.ValidationError(message)
