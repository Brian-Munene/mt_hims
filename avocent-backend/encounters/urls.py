from rest_framework.routers import DefaultRouter

from encounters.views import AppointmentViewSet, AvailabilitySlotViewSet, EncounterViewSet

app_name = "encounters"

router = DefaultRouter()
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("availability-slots", AvailabilitySlotViewSet, basename="availability-slot")
router.register("encounters", EncounterViewSet, basename="encounter")

urlpatterns = router.urls
