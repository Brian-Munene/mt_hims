import pyotp
from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenObtainSerializer
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from core.api import ClinicScopedModelViewSet
from notifications.email import send_notification_email
from users.models import Department, PractitionerProfile, Role, User, UserRole
from users.serializers import (
    DepartmentSerializer,
    EmptySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PractitionerProfileSerializer,
    RoleSerializer,
    TwoFactorCodeSerializer,
    TwoFactorLoginSerializer,
    UserRoleSerializer,
    UserSerializer,
)
from users.two_factor import issue_challenge_token, resolve_challenge_token


@extend_schema(
    tags=["Authentication"],
    summary="Get current user profile",
    description="Return the authenticated staff member profile, including clinic context and assigned role names.",
)
class CurrentUserAPIView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["Authentication"],
    summary="Log in with DRF token",
    description="Authenticate with email and password, then issue a DRF token for sessionless API access.",
    examples=[
        OpenApiExample(
            "Token Login Request",
            value={"username": "doctor@example.com", "password": "secret123"},
            request_only=True,
        ),
        OpenApiExample(
            "Token Login Response",
            value={"token": "0d7c...", "user": {"id": "uuid", "email": "doctor@example.com", "role_names": ["Doctor"]}},
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Token Login Error",
            value={"non_field_errors": ["Unable to log in with provided credentials."]},
            response_only=True,
            status_codes=["400"],
        ),
    ],
)
class LoginAPIView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        token = Token.objects.select_related("user").get(key=response.data["token"])
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(token.user, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Log out current user",
    description="Invalidate the current user's DRF token and end API token access for that token.",
    responses={204: EmptySerializer},
)
class LogoutAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer

    def post(self, request, *args, **kwargs):
        Token.objects.filter(user=request.user).delete()
        request.user.last_login = timezone.now()
        request.user.save(update_fields=["last_login"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TwoFactorTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Same as the stock serializer for accounts without 2FA -- byte-identical
    {refresh, access} response. For a 2FA-enabled account, stops short of
    minting tokens and instead returns a short-lived challenge_token that
    TwoFactorLoginVerifyAPIView exchanges for real tokens once the correct
    TOTP code is supplied.
    """

    def validate(self, attrs):
        # Calls the grandparent directly (not super().validate()) so
        # credentials are authenticated exactly once here, rather than once
        # in this call and again inside TokenObtainPairSerializer.validate()
        # if we fell through to it below.
        TokenObtainSerializer.validate(self, attrs)

        if self.user.is_2fa_enabled:
            return {"two_factor_required": True, "challenge_token": issue_challenge_token(self.user)}

        refresh = self.get_token(self.user)
        data = {"refresh": str(refresh), "access": str(refresh.access_token)}
        if jwt_api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, self.user)
        return data


class TwoFactorTokenObtainPairView(TokenObtainPairView):
    serializer_class = TwoFactorTokenObtainPairSerializer


@extend_schema(
    tags=["Authentication"],
    summary="Complete JWT login with a TOTP code",
    description=(
        "Exchange the challenge_token returned by jwt/token/ (when the account has 2FA enabled) "
        "plus a current authenticator code for a real access/refresh token pair."
    ),
)
class TwoFactorLoginVerifyAPIView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = TwoFactorLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = resolve_challenge_token(serializer.validated_data["challenge_token"])
        user = User.objects.filter(pk=user_id, is_active=True).first() if user_id else None

        if (
            user is None
            or not user.is_2fa_enabled
            or not pyotp.TOTP(user.otp_secret).verify(serializer.validated_data["code"], valid_window=1)
        ):
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        if jwt_api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return Response(
            {"refresh": str(refresh), "access": str(refresh.access_token)},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Start two-factor authentication setup",
    description=(
        "Generate a new authenticator secret for the current user and return it (with a "
        "provisioning URI for QR/manual entry). Does not enable 2FA by itself -- the user must "
        "prove possession of the authenticator via 2fa/enable/ first."
    ),
)
class TwoFactorSetupAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer

    def post(self, request, *args, **kwargs):
        user = request.user
        secret = pyotp.random_base32()
        user.otp_secret = secret
        user.save(update_fields=["otp_secret"])

        provisioning_uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Avocent Health Centre")
        return Response({"secret": secret, "provisioning_uri": provisioning_uri}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Authentication"],
    summary="Enable two-factor authentication",
    description="Confirm a pending authenticator secret with a current code and turn 2FA on.",
)
class TwoFactorEnableAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TwoFactorCodeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.otp_secret:
            return Response(
                {"detail": "Start setup first by requesting a new authenticator secret."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not pyotp.TOTP(user.otp_secret).verify(serializer.validated_data["code"], valid_window=1):
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_2fa_enabled = True
        user.save(update_fields=["is_2fa_enabled"])
        return Response({"detail": "Two-factor authentication enabled."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Authentication"],
    summary="Disable two-factor authentication",
    description="Turn 2FA off. Requires a current authenticator code, not just an active session.",
)
class TwoFactorDisableAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TwoFactorCodeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.is_2fa_enabled or not pyotp.TOTP(user.otp_secret).verify(
            serializer.validated_data["code"], valid_window=1
        ):
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_2fa_enabled = False
        user.otp_secret = ""
        user.save(update_fields=["is_2fa_enabled", "otp_secret"])
        return Response({"detail": "Two-factor authentication disabled."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Authentication"],
    summary="Request a password reset email",
    description=(
        "Send a password reset link to the given email if it belongs to an active account. "
        "Always responds with a generic success message, regardless of whether the email is registered, "
        "to avoid revealing which addresses have accounts."
    ),
)
class PasswordResetRequestAPIView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()

        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

            send_notification_email(
                clinic=user.clinic,
                recipient_email=user.email,
                subject="Reset your Avocent password",
                body=(
                    "We received a request to reset your Avocent account password.\n\n"
                    f"Reset it here: {reset_url}\n\n"
                    "If you didn't request this, you can safely ignore this email."
                ),
                event_type="password_reset",
            )

        return Response(
            {"detail": "If that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Confirm a password reset",
    description="Set a new password using the uid/token pair issued by the password reset email.",
)
class PasswordResetConfirmAPIView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response(
                {"detail": "Invalid or expired reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()

        return Response({"detail": "Password has been reset."}, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(
        tags=["User Administration"],
        summary="List staff users",
        description="Return clinic-scoped staff users with filtering by active status and staff/superuser flags.",
    ),
    retrieve=extend_schema(
        tags=["User Administration"],
        summary="Retrieve staff user",
        description="Return a single staff user record for the current clinic.",
    ),
    create=extend_schema(
        tags=["User Administration"],
        summary="Create staff user",
        description="Create a new clinic-scoped staff user account. Passwords are hashed before storage.",
        examples=[
            OpenApiExample(
                "Create User",
                value={
                    "clinic": "clinic-uuid",
                    "email": "nurse@example.com",
                    "phone": "+254700000000",
                    "password": "secret123",
                    "is_active": True,
                },
                request_only=True,
            )
        ],
    ),
    update=extend_schema(
        tags=["User Administration"],
        summary="Replace staff user",
        description="Replace a clinic staff user record, including active status. Admin flags (is_staff/is_superuser) are read-only.",
    ),
    partial_update=extend_schema(
        tags=["User Administration"],
        summary="Partially update staff user",
        description="Update selected fields on a clinic staff user without replacing the full record.",
    ),
)
class UserViewSet(ClinicScopedModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_fields = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "phone")
    ordering_fields = ("created_at", "updated_at", "email")
    required_permission = "users.manage"


@extend_schema_view(
    list=extend_schema(
        tags=["User Administration"],
        summary="List roles",
        description="Return available RBAC roles for the current clinic.",
    ),
    retrieve=extend_schema(
        tags=["User Administration"],
        summary="Retrieve role",
        description="Return details for a single clinic role.",
    ),
    create=extend_schema(
        tags=["User Administration"],
        summary="Create role",
        description="Create a clinic role. Role names are restricted to the supported platform roles.",
    ),
)
class RoleViewSet(ClinicScopedModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    filterset_fields = ("name", "is_active")
    search_fields = ("name", "description")
    ordering_fields = ("created_at", "updated_at", "name")
    required_permission = "roles.manage"


@extend_schema_view(
    list=extend_schema(
        tags=["User Administration"],
        summary="List role assignments",
        description="Return user-to-role assignments for the current clinic.",
    ),
    create=extend_schema(
        tags=["User Administration"],
        summary="Assign role to user",
        description="Assign a clinic role to a clinic staff user.",
    ),
)
class UserRoleViewSet(ClinicScopedModelViewSet):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    filterset_fields = ("role", "user", "is_active")
    search_fields = ("user__email", "role__name")
    ordering_fields = ("created_at", "updated_at")
    required_permission = "roles.manage"


@extend_schema_view(
    list=extend_schema(
        tags=["User Administration"],
        summary="List practitioner profiles",
        description="Return practitioner licensing and specialty profiles for clinical staff.",
    ),
    create=extend_schema(
        tags=["User Administration"],
        summary="Create practitioner profile",
        description="Create a practitioner profile. You can optionally pass `user_data` and `assign_roles` to create the User and assign roles in the same request, utilizing the pre-save signal to unify the onboarding flow.",
        examples=[
            OpenApiExample(
                "Unified Practitioner Onboarding",
                value={
                    "clinic": "clinic-uuid",
                    "license_number": "DOC-12345",
                    "specialty": "Cardiology",
                    "user_data": {
                        "email": "doctor@example.com",
                        "phone": "+254700000000",
                        "password": "securepassword"
                    },
                    "assign_roles": ["Doctor"]
                },
                request_only=True,
            )
        ],
    ),
)
class PractitionerProfileViewSet(ClinicScopedModelViewSet):
    queryset = PractitionerProfile.objects.all()
    serializer_class = PractitionerProfileSerializer
    filterset_fields = ("is_verified", "specialty", "is_active", "department", "is_online")
    search_fields = ("user__email", "license_number", "specialty", "bio")
    ordering_fields = ("created_at", "updated_at", "license_number")


@extend_schema_view(
    list=extend_schema(tags=["User Administration"], summary="List departments"),
    create=extend_schema(tags=["User Administration"], summary="Create department"),
)
class DepartmentViewSet(ClinicScopedModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filterset_fields = ("is_active",)
    search_fields = ("name", "code")
    ordering_fields = ("created_at", "name")
    required_permission = "users.manage"

