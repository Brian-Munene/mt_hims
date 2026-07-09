from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Encounter
from laboratory.models import LabOrderItem, LabTestCatalogue


class LaboratoryViewTests(ClinicAPIFixtureMixin, APITestCase):
    @patch("laboratory.views.queue_lab_result_notification")
    def test_lab_result_creation_enqueues_notification_workflow(self, queue_mock):
        self.client.force_authenticate(self.lab_technician)
        lab_test = LabTestCatalogue.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            name="Liver Panel",
            loinc_code="24325-3",
            price="900.00",
            sample_type="Blood",
        )
        lab_order_item = LabOrderItem.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            lab_order=self.lab_order,
            lab_test=lab_test,
        )
        response = self.client.post(
            "/api/laboratory/results/",
            {
                "clinic": str(self.clinic.id),
                "lab_order_item": str(lab_order_item.id),
                "result_value": "Normal",
                "verified_by": str(self.lab_practitioner.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        queue_mock.assert_called_once()

    def test_lab_technician_can_create_lab_result(self):
        self.client.force_authenticate(self.lab_technician)
        lab_test = LabTestCatalogue.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            name="Electrolytes",
            loinc_code="24323-8",
            price="900.00",
            sample_type="Blood",
        )
        lab_order_item = LabOrderItem.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            lab_order=self.lab_order,
            lab_test=lab_test,
        )
        response = self.client.post(
            "/api/laboratory/results/",
            {
                "clinic": str(self.clinic.id),
                "lab_order_item": str(lab_order_item.id),
                "result_value": "Within range",
                "verified_by": str(self.lab_practitioner.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_doctor_can_list_lab_orders(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/laboratory/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.lab_order.id))

    def test_receptionist_cannot_create_lab_test(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/laboratory/tests/",
            {
                "clinic": str(self.clinic.id),
                "name": "Urinalysis",
                "price": "600.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lab_order_rejects_encounter_from_another_clinic(self):
        foreign_encounter = Encounter.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            patient=self.other_patient,
            practitioner=self.other_practitioner,
        )
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/laboratory/orders/",
            {
                "clinic": str(self.clinic.id),
                "encounter": str(foreign_encounter.id),
                "ordered_by": str(self.practitioner.id),
                "status": "ordered",
                "priority": "routine",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lab_result_rejects_verifier_from_another_clinic(self):
        self.client.force_authenticate(self.lab_technician)
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
        response = self.client.post(
            "/api/laboratory/results/",
            {
                "clinic": str(self.clinic.id),
                "lab_order_item": str(lab_order_item.id),
                "result_value": "Normal",
                "verified_by": str(self.other_practitioner.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
