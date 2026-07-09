from rest_framework import serializers

from notifications.models import EmailLog, Notification, NotificationTemplate


class NotificationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "title", "body", "read", "href", "createdAt")
        read_only_fields = ("id", "title", "body", "href", "createdAt")


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "created_by")


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = "__all__"
        read_only_fields = [field.name for field in EmailLog._meta.concrete_fields]
