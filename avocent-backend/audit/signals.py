import json

from django.core.files.base import File
from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.utils import timezone

from audit.context import get_audit_actor, get_audit_ip_address
from audit.models import AuditLog

SENSITIVE_MODEL_LABELS = (
    "organization.Clinic",
    "users.User",
    "users.Role",
    "users.UserRole",
    "users.PractitionerProfile",
    "patients.Patient",
    "patients.PatientIdentifier",
    "patients.Allergy",
    "patients.ChronicCondition",
    "encounters.Appointment",
    "encounters.Encounter",
    "clinical.ClinicalNote",
    "clinical.Diagnosis",
    "clinical.Observation",
    "billing.ServiceCatalogue",
    "billing.Invoice",
    "billing.InvoiceLine",
    "payments.Payment",
    "pharmacy.Medication",
    "pharmacy.StockBatch",
    "pharmacy.Prescription",
    "pharmacy.PrescriptionItem",
    "laboratory.LabTestCatalogue",
    "laboratory.LabOrder",
    "laboratory.LabOrderItem",
    "laboratory.LabResult",
    "telemedicine.TelemedicineSession",
    "telemedicine.ChatSessionState",
)


def _serialize(instance):
    raw = {}
    for field in instance._meta.concrete_fields:
        value = field.value_from_object(instance)
        if isinstance(value, File):
            raw[field.name] = value.name
        else:
            raw[field.name] = value
    return json.loads(json.dumps(raw, cls=DjangoJSONEncoder))


def _clinic_for(instance):
    if hasattr(instance, "clinic"):
        return instance.clinic
    if instance._meta.label_lower == "organization.clinic":
        return instance
    return None


def _create_audit_log(instance, action, before_snapshot=None, after_snapshot=None):
    if instance._meta.label_lower == "audit.auditlog":
        return

    clinic = _clinic_for(instance)
    if clinic is None:
        return

    actor = get_audit_actor()
    audit_user = actor if getattr(actor, "is_authenticated", False) else None
    created_by = audit_user or getattr(instance, "created_by", None)

    AuditLog.objects.create(
        clinic=clinic,
        created_by=created_by,
        user=audit_user,
        action=action,
        model_name=instance._meta.label,
        object_id=str(instance.pk),
        before_snapshot=before_snapshot or {},
        after_snapshot=after_snapshot or {},
        ip_address=get_audit_ip_address(),
        timestamp=timezone.now(),
    )


def capture_previous_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._audit_before_snapshot = {}
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance._audit_before_snapshot = _serialize(previous)
    except sender.DoesNotExist:
        instance._audit_before_snapshot = {}


def log_save(sender, instance, created, **kwargs):
    before_snapshot = getattr(instance, "_audit_before_snapshot", {})
    after_snapshot = _serialize(instance)
    action = "CREATE" if created else "UPDATE"
    _create_audit_log(instance, action, before_snapshot=before_snapshot, after_snapshot=after_snapshot)


def capture_delete_state(sender, instance, **kwargs):
    instance._audit_before_snapshot = _serialize(instance)


def log_delete(sender, instance, **kwargs):
    before_snapshot = getattr(instance, "_audit_before_snapshot", {})
    _create_audit_log(instance, "DELETE", before_snapshot=before_snapshot, after_snapshot={})


def connect_audit_signals():
    for label in SENSITIVE_MODEL_LABELS:
        model = apps.get_model(label)
        pre_save.connect(capture_previous_state, sender=model, weak=False, dispatch_uid=f"audit-pre-save-{label}")
        post_save.connect(log_save, sender=model, weak=False, dispatch_uid=f"audit-post-save-{label}")
        pre_delete.connect(capture_delete_state, sender=model, weak=False, dispatch_uid=f"audit-pre-delete-{label}")
        post_delete.connect(log_delete, sender=model, weak=False, dispatch_uid=f"audit-post-delete-{label}")
