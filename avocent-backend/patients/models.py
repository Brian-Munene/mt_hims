from django.conf import settings
from django.db import models

from core.fields import EncryptedTextField
from core.models import CoreModel


class Patient(CoreModel):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("unknown", "Unknown"),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default="unknown")
    phone = models.CharField(max_length=30, db_index=True, blank=True)
    email = models.EmailField(blank=True)
    national_id = EncryptedTextField(blank=True)
    sha_number = EncryptedTextField(blank=True)
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class PatientIdentifier(CoreModel):
    IDENTIFIER_TYPES = [
        ("national_id", "National ID"),
        ("sha", "SHA"),
        ("passport", "Passport"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="identifiers")
    identifier_type = models.CharField(max_length=40, choices=IDENTIFIER_TYPES)
    identifier_value = EncryptedTextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient", "identifier_type"],
                name="uniq_patient_identifier_type_per_clinic",
            ),
        ]


class Allergy(CoreModel):
    SEVERITY_CHOICES = [
        ("mild", "Mild"),
        ("moderate", "Moderate"),
        ("severe", "Severe"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="allergies")
    substance = models.CharField(max_length=255)
    reaction = EncryptedTextField(blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="mild")


class ChronicCondition(CoreModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="chronic_conditions")
    diagnosis = EncryptedTextField()
    icd10_code = models.CharField(max_length=20, blank=True)
    diagnosed_date = models.DateField(null=True, blank=True)


class PatientAlert(CoreModel):
    ALERT_TYPE_CHOICES = [
        ("allergy", "Allergy"),
        ("medication", "Medication"),
        ("clinical", "Clinical"),
        ("administrative", "Administrative"),
        ("other", "Other"),
    ]
    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="alerts")
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES, default="other")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="warning")
    message = EncryptedTextField()
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_alerts_flagged",
    )


def patient_document_upload_path(instance, filename):
    return f"patient_documents/{instance.clinic_id}/{instance.patient_id}/{filename}"


class PatientDocument(CoreModel):
    DOCUMENT_TYPE_CHOICES = [
        ("report", "Report"),
        ("scan", "Scan / Imaging"),
        ("form", "Form"),
        ("referral", "Referral"),
        ("consent", "Consent"),
        ("other", "Other"),
    ]

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES, default="other")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=patient_document_upload_path)
    is_finalised = models.BooleanField(default=False)
