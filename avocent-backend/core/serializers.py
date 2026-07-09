from rest_framework import serializers


def resolve_field(serializer, attrs, field_name):
    """Return the incoming value for field_name, falling back to the existing instance's value."""
    return attrs.get(field_name) or getattr(serializer.instance, field_name, None)


def validate_clinic_match(serializer, attrs, related_field, message):
    """Raise ValidationError(message) if attrs/instance clinic doesn't match related_field's clinic."""
    clinic = resolve_field(serializer, attrs, "clinic")
    related = resolve_field(serializer, attrs, related_field)
    if clinic and related and clinic != related.clinic:
        raise serializers.ValidationError(message)
