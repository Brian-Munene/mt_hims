from rest_framework.routers import DefaultRouter

from clinical.views import ClinicalNoteViewSet, DiagnosisViewSet, ObservationViewSet

app_name = "clinical"

router = DefaultRouter()
router.register("notes", ClinicalNoteViewSet, basename="clinical-note")
router.register("diagnoses", DiagnosisViewSet, basename="diagnosis")
router.register("observations", ObservationViewSet, basename="observation")

urlpatterns = router.urls
