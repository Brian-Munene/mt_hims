from rest_framework import serializers


def resolve_field(serializer, attrs, field_name):
    """Return the incoming value for field_name, falling back to the existing instance's value."""
    return attrs.get(field_name) or getattr(serializer.instance, field_name, None)


def resolve_effective_clinic(serializer, attrs):
    """Resolve the clinic a create/update will actually be saved under.

    Must mirror ClinicScopedModelViewSet.perform_create()/perform_update():
    non-superusers are always forced into their own clinic there, no matter
    what `clinic` value (if any) is in attrs. If this function trusted a
    client-supplied attrs["clinic"] instead, a non-superuser could pick a
    foreign clinic X, pass validate_clinic_match() by pairing it with a
    real X-owned related object (e.g. another clinic's patient), and still
    have perform_create silently re-clinic the saved record back to their
    own clinic Y — leaving a Y-clinic record pointing at an X-clinic
    patient/practitioner/etc. Resolving to the same forced value here
    means that combination is rejected outright instead of slipping through
    validation and landing in an inconsistent state.

    Superusers are the one legitimate cross-clinic bypass (see
    can_access_object / has_permission), so for them this still honors an
    explicit attrs["clinic"], falling back to the instance's/request user's
    clinic only when omitted.
    """
    request = serializer.context.get("request")
    user = getattr(request, "user", None)
    if user is not None and not getattr(user, "is_superuser", False):
        return getattr(user, "clinic", None)

    clinic = resolve_field(serializer, attrs, "clinic")
    if clinic:
        return clinic
    return getattr(user, "clinic", None)


def validate_clinic_match(serializer, attrs, related_field, message):
    """Raise ValidationError(message) if attrs/instance clinic doesn't match related_field's clinic."""
    clinic = resolve_effective_clinic(serializer, attrs)
    related = resolve_field(serializer, attrs, related_field)
    if clinic and related and clinic != related.clinic:
        raise serializers.ValidationError(message)
