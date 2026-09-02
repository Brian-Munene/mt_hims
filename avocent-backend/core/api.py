from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.response import Response

from users.access import can_access_object, get_model_permission
from users.permissions import has_permission


class ClinicRBACPermission(permissions.BasePermission):
    def _get_model(self, view):
        queryset = getattr(view, "queryset", None)
        if queryset is not None:
            return queryset.model

        serializer_class = getattr(view, "serializer_class", None)
        if serializer_class is not None:
            meta = getattr(serializer_class, "Meta", None)
            if meta is not None:
                return getattr(meta, "model", None)

        return None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        model = self._get_model(view)
        action = "read" if request.method in permissions.SAFE_METHODS else "write"
        permission_name = getattr(view, "required_permission", None)

        if permission_name is None and model is not None:
            permission_name = get_model_permission(model, action)

        if permission_name is None:
            return False

        return has_permission(user, permission_name, clinic=getattr(user, "clinic", None))

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_access_object(request.user, obj, action="read")
        return can_access_object(request.user, obj, action="write")


class ClinicScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [ClinicRBACPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering = ("-created_at",)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()

        model = queryset.model
        if model._meta.label_lower == "organization.clinic":
            return queryset.filter(pk=user.clinic_id)
        if hasattr(model, "clinic_id"):
            return queryset.filter(clinic_id=user.clinic_id)
        return queryset

    def perform_create(self, serializer):
        model = serializer.Meta.model
        model_field_names = {field.name for field in model._meta.concrete_fields}
        save_kwargs = {}

        if "clinic" in model_field_names:
            if self.request.user.is_superuser:
                # Superusers are the codebase's one established cross-clinic
                # bypass (see can_access_object / has_permission) — only
                # default clinic for them when the client omitted it.
                if "clinic" not in serializer.validated_data:
                    save_kwargs["clinic"] = self.request.user.clinic
            else:
                # Every other user must be forced into their own clinic,
                # overriding whatever `clinic` value the client submitted —
                # not just defaulting an omitted one. Without this, any
                # authenticated user with write access could create a
                # record in an arbitrary clinic by supplying its id.
                save_kwargs["clinic"] = self.request.user.clinic
        if "created_by" in model_field_names and "created_by" not in serializer.validated_data:
            save_kwargs["created_by"] = self.request.user

        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        model = serializer.Meta.model
        model_field_names = {field.name for field in model._meta.concrete_fields}
        save_kwargs = {}

        if "clinic" in model_field_names and not self.request.user.is_superuser:
            # get_queryset() already scopes non-superusers to their own
            # clinic, so serializer.instance.clinic is always their clinic
            # here — this just blocks a client from moving the record to a
            # different clinic by including `clinic` in the update payload.
            save_kwargs["clinic"] = serializer.instance.clinic

        serializer.save(**save_kwargs)

    def paginate_action_queryset(self, queryset, serializer_class):
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=True, context={"request": self.request})
            return self.get_paginated_response(serializer.data)
        serializer = serializer_class(queryset, many=True, context={"request": self.request})
        return Response(serializer.data)
