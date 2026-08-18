from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from users.models import Department, PractitionerProfile, Role, User, UserRole


class EmptySerializer(serializers.Serializer):
    pass


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class UserSerializer(serializers.ModelSerializer):
    role_names = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "clinic",
            "email",
            "phone",
            "password",
            "is_staff",
            "is_active",
            "is_superuser",
            "role_names",
            "created_at",
            "updated_at",
        )
        # is_staff/is_superuser gate Django admin access; they are only ever
        # set by the createsuperuser command, never through the API.
        read_only_fields = ("id", "is_staff", "is_superuser", "created_at", "updated_at", "role_names")

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_role_names(self, obj):
        return obj.role_names()

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = (
            "id",
            "clinic",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = (
            "id",
            "clinic",
            "user",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class PractitionerProfileSerializer(serializers.ModelSerializer):
    user_data = serializers.DictField(write_only=True, required=False)
    assign_roles = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = PractitionerProfile
        fields = (
            "id",
            "clinic",
            "user",
            "user_data",
            "assign_roles",
            "license_number",
            "specialty",
            "qualifications",
            "signature_file",
            "is_verified",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "created_at", "updated_at")

    def create(self, validated_data):
        user_data = validated_data.pop("user_data", None)
        assign_roles = validated_data.pop("assign_roles", [])
        
        if user_data:
            from users.services import provision_practitioner
            assigned_by = self.context["request"].user if "request" in self.context else None
            clinic = validated_data.get("clinic")
            
            instance = provision_practitioner(
                clinic=clinic,
                user_data=user_data,
                profile_data=validated_data,
                assign_roles=assign_roles,
                assigned_by=assigned_by
            )
        else:
            instance = PractitionerProfile.objects.create(**validated_data)
            
        return instance
