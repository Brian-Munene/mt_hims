from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from users.views import (
    CurrentUserAPIView,
    DepartmentViewSet,
    LoginAPIView,
    LogoutAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    PractitionerProfileViewSet,
    RoleViewSet,
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
    path("jwt/token/", TokenObtainPairView.as_view(), name="jwt-token-obtain"),
    path("jwt/refresh/", TokenRefreshView.as_view(), name="jwt-token-refresh"),
    path("jwt/verify/", TokenVerifyView.as_view(), name="jwt-token-verify"),
    path("me/", CurrentUserAPIView.as_view(), name="me"),
]

urlpatterns += router.urls
