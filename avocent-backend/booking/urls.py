from rest_framework.routers import DefaultRouter

from booking.views import BookingEventViewSet, BookingQueueViewSet, BookingViewSet

app_name = "booking"

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")
router.register("events", BookingEventViewSet, basename="booking-event")
router.register("queues", BookingQueueViewSet, basename="booking-queue")

urlpatterns = router.urls
