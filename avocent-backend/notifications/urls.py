from rest_framework.routers import DefaultRouter

from notifications.views import EmailLogViewSet, NotificationTemplateViewSet, NotificationViewSet

app_name = "notifications"

router = DefaultRouter()
router.register("", NotificationViewSet, basename="notification")
router.register("email-logs", EmailLogViewSet, basename="email-log")
router.register("templates", NotificationTemplateViewSet, basename="notification-template")

urlpatterns = router.urls
