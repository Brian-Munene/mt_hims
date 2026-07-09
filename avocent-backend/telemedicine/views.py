from drf_spectacular.utils import extend_schema_view, extend_schema
from core.api import ClinicScopedModelViewSet
from telemedicine.models import ChatSessionState, TelemedicineSession
from telemedicine.serializers import ChatSessionStateSerializer, TelemedicineSessionSerializer
from telemedicine.services import cache_chat_session_state


@extend_schema_view(
    list=extend_schema(
        tags=["Telemedicine"],
        summary="List telemedicine sessions",
        description="Return remote consultation sessions linked to patient encounters.",
    ),
    create=extend_schema(
        tags=["Telemedicine"],
        summary="Create telemedicine session",
        description="Create a video or chat session record for a patient encounter.",
    ),
)
class TelemedicineSessionViewSet(ClinicScopedModelViewSet):
    queryset = TelemedicineSession.objects.all()
    serializer_class = TelemedicineSessionSerializer
    filterset_fields = ("patient", "encounter", "session_type", "status", "is_active")
    search_fields = ("session_link", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at", "start_time", "end_time")


@extend_schema_view(
    list=extend_schema(
        tags=["Telemedicine"],
        summary="List chat session states",
        description="Return persisted chatbot conversation state records for the clinic.",
    ),
    create=extend_schema(
        tags=["Telemedicine"],
        summary="Create chat session state",
        description="Persist chatbot workflow state for a patient phone number and optional encounter.",
    ),
)
class ChatSessionStateViewSet(ClinicScopedModelViewSet):
    queryset = ChatSessionState.objects.all()
    serializer_class = ChatSessionStateSerializer
    filterset_fields = ("encounter", "is_active")
    search_fields = ("patient_phone", "current_state")
    ordering_fields = ("created_at", "updated_at", "last_interaction_at")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        cache_chat_session_state(serializer.instance)

    def perform_update(self, serializer):
        chat_state = serializer.save()
        cache_chat_session_state(chat_state)
