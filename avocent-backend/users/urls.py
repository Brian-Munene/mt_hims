from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from users.views import (
    CurrentUserAPIView,
    DepartmentViewSet,
    LoginAPIView,
    LogoutAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    PractitionerProfileViewSet,
    RoleViewSet,
    TwoFactorDisableAPIView,
    TwoFactorEnableAPIView,
    TwoFactorLoginVerifyAPIView,
    TwoFactorSetupAPIView,
    TwoFactorTokenObtainPairView,
    UserRoleViewSet,
    UserViewSet,
)

app_name = "users"

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")
router.register("user-roles", UserRoleViewSet, basename="user-role")
router.register("practitioners", PractitionerProfileViewSet, basename="practitioner")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("password-reset/", PasswordResetRequestAPIView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmAPIView.as_view(), name="password-reset-confirm"),
    path("jwt/token/", TwoFactorTokenObtainPairView.as_view(), name="jwt-token-obtain"),
    path("jwt/token/2fa/", TwoFactorLoginVerifyAPIView.as_view(), name="jwt-token-2fa-verify"),
    path("jwt/refresh/", TokenRefreshView.as_view(), name="jwt-token-refresh"),
    path("jwt/verify/", TokenVerifyView.as_view(), name="jwt-token-verify"),
    path("me/", CurrentUserAPIView.as_view(), name="me"),
    path("2fa/setup/", TwoFactorSetupAPIView.as_view(), name="2fa-setup"),
    path("2fa/enable/", TwoFactorEnableAPIView.as_view(), name="2fa-enable"),
    path("2fa/disable/", TwoFactorDisableAPIView.as_view(), name="2fa-disable"),
]

urlpatterns += router.urls
