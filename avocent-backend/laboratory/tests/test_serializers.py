from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Encounter
from laboratory.models import LabOrderItem, LabTestCatalogue
from laboratory.serializers import LabOrderSerializer, LabResultSerializer, LabTestCatalogueSerializer


class LaboratorySerializerTests(ClinicAPIFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    def serializer_context_for(self, user):
        request = self.factory.post("/api/laboratory/")
        request.user = user
        return {"request": request}

    def test_lab_test_serializer_rejects_receptionist_role(self):
        serializer = LabTestCatalogueSerializer(
            data={
                "clinic": self.clinic.id,
                "name": "Urinalysis",
                "price": "600.00",
            },
            context=self.serializer_context_for(self.receptionist),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_lab_order_serializer_rejects_foreign_encounter(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        serializer = LabOrderSerializer(
            data={
                "clinic": self.clinic.id,
                "encounter": foreign_encounter.id,
                "ordered_by": self.practitioner.id,
                "status": "ordered",
                "priority": "routine",
            },
            context=self.serializer_context_for(self.doctor),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_lab_result_serializer_rejects_foreign_verifier(self):
        lab_test = LabTestCatalogue.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            name="Renal Panel",
            loinc_code="24362-6",
            price="1100.00",
            sample_type="Blood",
        )
        lab_order_item = LabOrderItem.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            lab_order=self.lab_order,
            lab_test=lab_test,
        )
        serializer = LabResultSerializer(
            data={
                "clinic": self.clinic.id,
                "lab_order_item": lab_order_item.id,
                "result_value": "Normal",
                "verified_by": self.other_practitioner.id,
            },
            context=self.serializer_context_for(self.lab_technician),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
