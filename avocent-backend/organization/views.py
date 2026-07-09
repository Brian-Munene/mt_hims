from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.api import ClinicRBACPermission, ClinicScopedModelViewSet
from organization.models import Clinic
from organization.serializers import ClinicSerializer
from users.decorators import require_permission
from users.permissions import PERM_ALL


@extend_schema_view(
    list=extend_schema(
        tags=["Organization - Clinics"],
        summary="List all clinics",
        description="Retrieve a list of all clinics. Superusers can see all clinics; other users see only their assigned clinic.",
        responses={200: ClinicSerializer(many=True)},
    ),
    retrieve=extend_schema(
        tags=["Organization - Clinics"],
        summary="Retrieve a clinic",
        description="Get details of a specific clinic by its UUID.",
        responses={200: ClinicSerializer},
    ),
    create=extend_schema(
        tags=["Organization - Clinics"],
        summary="Create a clinic",
        description="Create a new clinic. Restricted to superusers only.",
        request=ClinicSerializer,
        responses={
            201: OpenApiExample(
                "Clinic Created",
                value={
                    "id": "uuid",
                    "code": "A1B2C3",
                    "name": "Avocent Health Centre",
                    "registration_number": "AVO-001",
                    "address": "123 Medical Drive",
                    "phone": "+254712345678",
                    "email": "info@avocent.health",
                    "timezone": "Africa/Nairobi",
                    "is_active": True,
                    "metadata": {},
                    "created_at": "2026-04-24T19:00:00Z",
                    "updated_at": "2026-04-24T19:00:00Z",
                },
                response_only=True,
                status_codes=["201"],
            )
        },
    ),
    update=extend_schema(
        tags=["Organization - Clinics"],
        summary="Full update a clinic",
        description="Fully update a clinic. Restricted to superusers only.",
        request=ClinicSerializer,
        responses={200: ClinicSerializer},
    ),
    partial_update=extend_schema(
        tags=["Organization - Clinics"],
        summary="Partial update a clinic",
        description="Partially update a clinic. Restricted to superusers only.",
        request=ClinicSerializer,
        responses={200: ClinicSerializer},
    ),
    destroy=extend_schema(
        tags=["Organization - Clinics"],
        summary="Delete a clinic",
        description="Delete a clinic. Restricted to superusers only.",
        responses={204: OpenApiExample("Clinic Deleted", value={"detail": "Clinic deleted successfully."}, response_only=True, status_codes=["204"])},
    ),
)
class ClinicViewSet(ClinicScopedModelViewSet):
    """
    ViewSet for Clinic CRUD operations.
    Restricted to superusers only.
    """

    queryset = Clinic.objects.all()
    serializer_class = ClinicSerializer
    permission_classes = [IsAuthenticated, ClinicRBACPermission]

    def get_queryset(self):
        user = self.request.user
        # Superusers can see all clinics
        if user.is_superuser:
            return Clinic.objects.all()
        # Other users only see their clinic
        return Clinic.objects.filter(pk=user.clinic_id)

    @require_permission(PERM_ALL)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @require_permission(PERM_ALL)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @require_permission(PERM_ALL)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @require_permission(PERM_ALL)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_permission(PERM_ALL)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @require_permission(PERM_ALL)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
