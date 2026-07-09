from django.apps import apps
from django.core.management.base import BaseCommand

from core.fields import EncryptedTextField


class Command(BaseCommand):
    help = "Re-save existing PHI records so encrypted fields are written to the database ciphertext format."

    def handle(self, *args, **options):
        model_labels = [
            "patients.Patient",
            "patients.PatientIdentifier",
            "patients.Allergy",
            "patients.ChronicCondition",
            "clinical.ClinicalNote",
            "clinical.Diagnosis",
            "clinical.Observation",
            "laboratory.LabResult",
        ]

        total = 0
        for label in model_labels:
            model = apps.get_model(label)
            encrypted_fields = [field.name for field in model._meta.concrete_fields if isinstance(field, EncryptedTextField)]
            if not encrypted_fields:
                continue

            for instance in model.objects.all().iterator():
                instance.save(update_fields=encrypted_fields + ["updated_at"])
                total += 1
            self.stdout.write(f"Encrypted {model._meta.label} records using fields: {', '.join(encrypted_fields)}")

        self.stdout.write(self.style.SUCCESS(f"Completed PHI encryption pass for {total} records."))
