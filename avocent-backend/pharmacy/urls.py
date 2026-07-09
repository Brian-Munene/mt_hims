from rest_framework.routers import DefaultRouter

from pharmacy.views import MedicationViewSet, PrescriptionItemViewSet, PrescriptionViewSet, StockBatchViewSet

app_name = "pharmacy"

router = DefaultRouter()
router.register("medications", MedicationViewSet, basename="medication")
router.register("stock-batches", StockBatchViewSet, basename="stock-batch")
router.register("prescriptions", PrescriptionViewSet, basename="prescription")
router.register("prescription-items", PrescriptionItemViewSet, basename="prescription-item")

urlpatterns = router.urls
