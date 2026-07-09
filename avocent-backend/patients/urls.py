from rest_framework.routers import DefaultRouter

from patients.views import AllergyViewSet, ChronicConditionViewSet, PatientAlertViewSet, PatientDocumentViewSet, PatientIdentifierViewSet, PatientViewSet

app_name = "patients"

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patient")
router.register("identifiers", PatientIdentifierViewSet, basename="patient-identifier")
router.register("allergies", AllergyViewSet, basename="allergy")
router.register("chronic-conditions", ChronicConditionViewSet, basename="chronic-condition")
router.register("documents", PatientDocumentViewSet, basename="patient-document")
router.register("alerts", PatientAlertViewSet, basename="patient-alert")

urlpatterns = router.urls
