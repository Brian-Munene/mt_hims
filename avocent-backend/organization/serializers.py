from rest_framework import serializers

from organization.models import Clinic


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = [
            "id",
            "code",
            "name",
            "registration_number",
            "address",
            "phone",
            "email",
            "timezone",
            "is_active",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "created_at", "updated_at"]

    def validate_registration_number(self, value):
        # Exclude current instance during update
        instance = self.instance
        if instance and instance.registration_number == value:
            return value

        if Clinic.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError(
                "A clinic with this registration number already exists."
            )
        return value