from rest_framework.routers import DefaultRouter

from compliance.views import ComplianceRecordViewSet, PolicyVersionViewSet, PolicyViewSet

app_name = "compliance"

router = DefaultRouter()
router.register("records", ComplianceRecordViewSet, basename="compliance-record")
router.register("policies", PolicyViewSet, basename="policy")
router.register("policy-versions", PolicyVersionViewSet, basename="policy-version")

urlpatterns = router.urls
