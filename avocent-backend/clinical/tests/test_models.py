from django.test import TestCase

from clinical.models import Diagnosis, Observation
from core.tests.utils import ClinicAPIFixtureMixin


class ClinicalModelTests(ClinicAPIFixtureMixin, TestCase):
    def test_diagnosis_description_round_trips_through_orm(self):
        diagnosis = Diagnosis.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            icd10_code="J11",
            description="Influenza-like illness",
        )

        fetched = Diagnosis.objects.get(pk=diagnosis.pk)

        self.assertEqual(fetched.description, "Influenza-like illness")

    def test_observation_value_round_trips_through_orm(self):
        observation = Observation.objects.create(
            clinic=self.clinic,
            created_by=self.nurse,
            encounter=self.encounter,
            name="Respiratory Rate",
            value="18",
            unit="breaths/min",
        )

        fetched = Observation.objects.get(pk=observation.pk)

        self.assertEqual(fetched.value, "18")
