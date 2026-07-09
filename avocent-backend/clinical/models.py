from django.db import models

from core.fields import EncryptedTextField
from core.models import CoreModel


class ClinicalNote(CoreModel):
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="clinical_notes")
    subjective = EncryptedTextField(blank=True)
    objective = EncryptedTextField(blank=True)
    assessment = EncryptedTextField(blank=True)
    plan = EncryptedTextField(blank=True)


class Diagnosis(CoreModel):
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="diagnoses")
    icd10_code = models.CharField(max_length=20)
    description = EncryptedTextField(blank=True)
    is_primary = models.BooleanField(default=False)


class Observation(CoreModel):
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.CASCADE, related_name="observations")
    loinc_code = models.CharField(max_length=30, blank=True)
    name = models.CharField(max_length=120)
    value = EncryptedTextField()
    unit = models.CharField(max_length=30, blank=True)
    reference_range = models.CharField(max_length=120, blank=True)
    abnormal_flag = models.CharField(max_length=30, blank=True)
