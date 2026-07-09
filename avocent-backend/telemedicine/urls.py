from rest_framework.routers import DefaultRouter

from telemedicine.views import ChatSessionStateViewSet, TelemedicineSessionViewSet

app_name = "telemedicine"

router = DefaultRouter()
router.register("sessions", TelemedicineSessionViewSet, basename="telemedicine-session")
router.register("chat-states", ChatSessionStateViewSet, basename="chat-session-state")

urlpatterns = router.urls
