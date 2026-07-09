from rest_framework.routers import DefaultRouter

from laboratory.views import LabOrderItemViewSet, LabOrderViewSet, LabResultViewSet, LabTestCatalogueViewSet

app_name = "laboratory"

router = DefaultRouter()
router.register("tests", LabTestCatalogueViewSet, basename="lab-test")
router.register("orders", LabOrderViewSet, basename="lab-order")
router.register("order-items", LabOrderItemViewSet, basename="lab-order-item")
router.register("results", LabResultViewSet, basename="lab-result")

urlpatterns = router.urls
