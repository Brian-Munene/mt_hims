from rest_framework.routers import DefaultRouter

from organization.views import ClinicViewSet

app_name = "organization"

router = DefaultRouter()
router.register("clinics", ClinicViewSet, basename="clinic")

urlpatterns = router.urls