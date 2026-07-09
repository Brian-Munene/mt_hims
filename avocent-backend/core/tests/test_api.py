import importlib
import inspect

from django.apps import apps
from rest_framework.test import APITestCase

from core.api import ClinicScopedModelViewSet
from users.permissions import MODEL_PERMISSION_MAP

WRITE_METHODS = {"post", "put", "patch", "delete"}


def _resolve_viewset_model(view_class):
    queryset = getattr(view_class, "queryset", None)
    if queryset is not None:
        return queryset.model

    serializer_class = getattr(view_class, "serializer_class", None)
    if serializer_class is not None:
        meta = getattr(serializer_class, "Meta", None)
        if meta is not None:
            return getattr(meta, "model", None)

    return None


def _supports_write(view_class):
    allowed_methods = {method.lower() for method in getattr(view_class, "http_method_names", [])}
    return bool(allowed_methods & WRITE_METHODS)


def _iter_clinic_scoped_viewsets():
    for app_config in apps.get_app_configs():
        try:
            views_module = importlib.import_module(f"{app_config.name}.views")
        except ModuleNotFoundError:
            continue

        for _, obj in inspect.getmembers(views_module, inspect.isclass):
            if (
                obj.__module__ == views_module.__name__
                and issubclass(obj, ClinicScopedModelViewSet)
                and obj is not ClinicScopedModelViewSet
            ):
                yield obj


class RBACPermissionCoverageTests(APITestCase):
    """Guards against ClinicRBACPermission's fail-closed default silently locking out (or,
    before that fix, silently allowing) a viewset whose model has no MODEL_PERMISSION_MAP entry."""

    def test_every_clinic_scoped_viewset_model_has_permission_mapping(self):
        problems = []

        for view_class in _iter_clinic_scoped_viewsets():
            model = _resolve_viewset_model(view_class)
            if model is None:
                problems.append(f"{view_class.__name__}: could not resolve a model (no queryset/serializer Meta.model)")
                continue

            label = model._meta.label_lower
            mapping = MODEL_PERMISSION_MAP.get(label)
            if mapping is None:
                problems.append(f"{view_class.__name__}: model '{label}' missing from MODEL_PERMISSION_MAP")
                continue

            if mapping.get("read") is None:
                problems.append(f"{view_class.__name__}: model '{label}' has no read permission configured")

            if _supports_write(view_class) and mapping.get("write") is None:
                problems.append(
                    f"{view_class.__name__}: model '{label}' allows write HTTP methods but has no write permission configured"
                )

        self.assertEqual(problems, [], "RBAC coverage gaps found:\n" + "\n".join(problems))
