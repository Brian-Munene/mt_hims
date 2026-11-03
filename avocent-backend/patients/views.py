import csv
import io

from django.db import transaction
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from clinical.models import ClinicalNote
from clinical.serializers import ClinicalNoteSerializer
from core.api import ClinicScopedModelViewSet
from encounters.models import Encounter
from encounters.serializers import EncounterSerializer
from patients.models import Allergy, ChronicCondition, Patient, PatientAlert, PatientDocument, PatientIdentifier

#: Bounds on the synchronous patient CSV import: past these, the request is a
#: data-loading job, not a form upload, and it must not tie up a worker.
MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024
MAX_IMPORT_ROWS = 5000
IMPORT_CHUNK_SIZE = 500
from patients.serializers import (
    AllergySerializer,
    ChronicConditionSerializer,
    PatientAlertSerializer,
    PatientDocumentSerializer,
    PatientIdentifierSerializer,
    PatientSerializer,
)

@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List patients",
        description="Return clinic-scoped patient records with search across demographic and contact fields.",
    ),
    retrieve=extend_schema(
        tags=["Patient Records"],
        summary="Retrieve patient",
        description="Return the full demographic record for one patient in the current clinic.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Register patient",
        description="Create a new patient record for the current clinic.",
        examples=[
            OpenApiExample(
                "Create Patient",
                value={
                    "clinic": "clinic-uuid",
                    "first_name": "Amina",
                    "last_name": "Otieno",
                    "date_of_birth": "1994-08-15",
                    "gender": "female",
                    "phone": "+254711111111",
                    "email": "amina@example.com",
                    "sha_number": "SHA123456",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Patient Registration Response",
                value={
                    "id": "patient-uuid",
                    "clinic": "clinic-uuid",
                    "first_name": "Amina",
                    "last_name": "Otieno",
                    "date_of_birth": "1994-08-15",
                    "gender": "female",
                    "phone": "+254711111111",
                    "email": "amina@example.com",
                    "sha_number": "SHA123456",
                    "created_by": "user-uuid",
                    "is_active": True,
                    "metadata": {},
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Patient Registration Error",
                value={"date_of_birth": ["Date of birth cannot be in the future."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    ),
)
class PatientViewSet(ClinicScopedModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filterset_fields = ("gender", "is_active")
    search_fields = ("first_name", "last_name", "phone", "email", "sha_number")
    ordering_fields = ("created_at", "updated_at", "first_name", "last_name", "date_of_birth")

    @extend_schema(tags=["Patient Records"], summary="Export patients as CSV")
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        patients = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="patients.csv"'
        writer = csv.writer(response)
        writer.writerow(["id", "first_name", "last_name", "date_of_birth", "gender", "phone", "email", "address"])
        for p in patients:
            writer.writerow([p.id, p.first_name, p.last_name, p.date_of_birth or "", p.gender, p.phone, p.email, p.address])
        return response

    @extend_schema(tags=["Patient Records"], summary="Import patients from CSV")
    @action(detail=False, methods=["post"], url_path="import-csv", parser_classes=[MultiPartParser])
    def import_csv(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded. Send a multipart/form-data request with a 'file' field."}, status=400)
        # A patient-registration export is thousands of rows at most; a file
        # past these bounds is a data-loading job, not a form upload.
        if file_obj.size > MAX_IMPORT_FILE_BYTES:
            return Response(
                {"error": f"File is larger than the {MAX_IMPORT_FILE_BYTES // (1024 * 1024)} MB import limit."},
                status=400,
            )
        try:
            decoded = file_obj.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response({"error": "File must be UTF-8 encoded."}, status=400)
        reader = csv.DictReader(io.StringIO(decoded))
        required = {"first_name", "last_name"}
        if not required.issubset(set(reader.fieldnames or [])):
            return Response({"error": f"CSV must contain columns: {', '.join(required)}."}, status=400)
        rows = list(reader)
        if len(rows) > MAX_IMPORT_ROWS:
            return Response(
                {"error": f"File has {len(rows):,} rows; the import limit is {MAX_IMPORT_ROWS:,}."},
                status=400,
            )

        valid_genders = {choice for choice, _ in Patient.GENDER_CHOICES}
        created, errors = 0, []
        batch: list[Patient] = []
        with transaction.atomic():
            for i, row in enumerate(rows, start=2):
                gender = (row.get("gender") or "").strip() or "unknown"
                if gender not in valid_genders:
                    errors.append({"row": i, "error": "gender is not one of the accepted values."})
                    continue
                raw_dob = (row.get("date_of_birth") or "").strip()
                date_of_birth = parse_date(raw_dob) if raw_dob else None
                if raw_dob and date_of_birth is None:
                    errors.append({"row": i, "error": "date_of_birth is not a valid date."})
                    continue
                batch.append(
                    Patient(
                        clinic=request.user.clinic,
                        created_by=request.user,
                        first_name=(row.get("first_name") or "").strip(),
                        last_name=(row.get("last_name") or "").strip(),
                        gender=gender,
                        date_of_birth=date_of_birth,
                        phone=(row.get("phone") or "").strip(),
                        email=(row.get("email") or "").strip(),
                        address=(row.get("address") or "").strip(),
                    )
                )
                if len(batch) >= IMPORT_CHUNK_SIZE:
                    Patient.objects.bulk_create(batch)
                    created += len(batch)
                    batch = []
            if batch:
                Patient.objects.bulk_create(batch)
                created += len(batch)
        return Response({"created": created, "errors": errors})

    @extend_schema(
        tags=["Appointments & Encounters"],
        summary="List patient encounters",
        description="Return the encounter history for a single patient, ordered from most recent to oldest.",
        responses=EncounterSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="encounters")
    def encounters(self, request, pk=None):
        patient = self.get_object()
        queryset = Encounter.objects.filter(patient=patient).order_by("-start_time")
        return self.paginate_action_queryset(queryset, EncounterSerializer)

    @extend_schema(
        tags=["Clinical Documentation"],
        summary="List patient clinical notes",
        description="Return SOAP notes linked to encounters for a single patient.",
        responses=ClinicalNoteSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="notes")
    def notes(self, request, pk=None):
        patient = self.get_object()
        queryset = ClinicalNote.objects.filter(encounter__patient=patient).order_by("-created_at")
        return self.paginate_action_queryset(queryset, ClinicalNoteSerializer)


@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List patient identifiers",
        description="Return external and official identifiers such as SHA, passport, or national ID references.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Create patient identifier",
        description="Attach an additional identifier to a patient record within the same clinic.",
    ),
)
class PatientIdentifierViewSet(ClinicScopedModelViewSet):
    queryset = PatientIdentifier.objects.all()
    serializer_class = PatientIdentifierSerializer
    filterset_fields = ("identifier_type", "patient", "is_active")
    search_fields = ("identifier_value", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List allergies",
        description="Return allergy records for patients in the current clinic.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Create allergy record",
        description="Record a patient allergy and severity classification.",
    ),
)
class AllergyViewSet(ClinicScopedModelViewSet):
    queryset = Allergy.objects.all()
    serializer_class = AllergySerializer
    filterset_fields = ("severity", "patient", "is_active")
    search_fields = ("substance", "reaction", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at")


@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List chronic conditions",
        description="Return chronic condition records associated with clinic patients.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Create chronic condition",
        description="Add a chronic condition and diagnosis metadata to a patient record.",
    ),
)
class ChronicConditionViewSet(ClinicScopedModelViewSet):
    queryset = ChronicCondition.objects.all()
    serializer_class = ChronicConditionSerializer
    filterset_fields = ("patient", "is_active")
    search_fields = ("diagnosis", "icd10_code", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at", "diagnosed_date")


@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List patient documents",
        description="Return uploaded medical documents for patients in the current clinic.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Upload patient document",
        description="Upload a medical document (report, scan, form, etc.) for a patient. Use multipart/form-data.",
    ),
)
class PatientDocumentViewSet(ClinicScopedModelViewSet):
    queryset = PatientDocument.objects.all()
    serializer_class = PatientDocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ("patient", "document_type", "is_finalised", "is_active")
    search_fields = ("title", "description", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at")

    @extend_schema(tags=["Patient Records"], summary="Finalise document")
    @action(detail=True, methods=["post"], url_path="finalise")
    def finalise(self, request, pk=None):
        document = self.get_object()
        document.is_finalised = True
        document.save(update_fields=["is_finalised", "updated_at"])
        return Response(self.get_serializer(document).data)

    @extend_schema(tags=["Patient Records"], summary="Void document")
    @action(detail=True, methods=["post"], url_path="void")
    def void(self, request, pk=None):
        document = self.get_object()
        document.is_active = False
        document.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(document).data)


@extend_schema_view(
    list=extend_schema(
        tags=["Patient Records"],
        summary="List patient alerts",
        description="Return active clinical alerts for patients in the current clinic.",
    ),
    create=extend_schema(
        tags=["Patient Records"],
        summary="Create patient alert",
        description="Flag a clinical, medication, or administrative alert on a patient record.",
    ),
)
class PatientAlertViewSet(ClinicScopedModelViewSet):
    queryset = PatientAlert.objects.all()
    serializer_class = PatientAlertSerializer
    filterset_fields = ("patient", "alert_type", "severity", "is_active")
    search_fields = ("message", "patient__first_name", "patient__last_name")
    ordering_fields = ("created_at", "updated_at", "severity")
