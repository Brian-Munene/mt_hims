from rest_framework.routers import DefaultRouter

from audit.views import AuditLogViewSet

app_name = "audit"

router = DefaultRouter()
router.register("logs", AuditLogViewSet, basename="audit-log")

urlpatterns = router.urls
