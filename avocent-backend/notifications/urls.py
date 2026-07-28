from rest_framework.routers import DefaultRouter

from notifications.views import EmailLogViewSet, NotificationTemplateViewSet, NotificationViewSet

app_name = "notifications"

router = DefaultRouter()
router.register("email-logs", EmailLogViewSet, basename="email-log")
router.register("templates", NotificationTemplateViewSet, basename="notification-template")
router.register("", NotificationViewSet, basename="notification")

urlpatterns = router.urls
