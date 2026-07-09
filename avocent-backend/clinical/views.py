from drf_spectacular.utils import extend_schema_view, extend_schema
from clinical.models import ClinicalNote, Diagnosis, Observation
from clinical.serializers import ClinicalNoteSerializer, DiagnosisSerializer, ObservationSerializer
from core.api import ClinicScopedModelViewSet


@extend_schema_view(
    list=extend_schema(
        tags=["Clinical Documentation"],
        summary="List clinical notes",
        description="Return SOAP notes recorded for encounters in the current clinic.",
    ),
    create=extend_schema(
        tags=["Clinical Documentation"],
        summary="Create clinical note",
        description="Create a SOAP note linked to an encounter.",
    ),
)
class ClinicalNoteViewSet(ClinicScopedModelViewSet):
    queryset = ClinicalNote.objects.all()
    serializer_class = ClinicalNoteSerializer
    filterset_fields = ("encounter", "is_active")
    search_fields = ("encounter__patient__first_name", "encounter__patient__last_name")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Clinical Documentation"],
        summary="List diagnoses",
        description="Return diagnoses documented across clinic encounters.",
    ),
    create=extend_schema(
        tags=["Clinical Documentation"],
        summary="Create diagnosis",
        description="Add a diagnosis to an encounter. Restricted to doctor/admin roles.",
    ),
)
class DiagnosisViewSet(ClinicScopedModelViewSet):
    queryset = Diagnosis.objects.all()
    serializer_class = DiagnosisSerializer
    filterset_fields = ("encounter", "is_primary", "is_active")
    search_fields = ("icd10_code", "description", "encounter__patient__first_name", "encounter__patient__last_name")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Clinical Documentation"],
        summary="List observations",
        description="Return observation and vital sign measurements captured during encounters.",
    ),
    create=extend_schema(
        tags=["Clinical Documentation"],
        summary="Create observation",
        description="Record an observation or vital sign for an encounter.",
    ),
)
class ObservationViewSet(ClinicScopedModelViewSet):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    filterset_fields = ("encounter", "is_active")
    search_fields = ("name", "loinc_code", "value", "encounter__patient__first_name", "encounter__patient__last_name")
    ordering_fields = ("created_at", "updated_at", "name")
