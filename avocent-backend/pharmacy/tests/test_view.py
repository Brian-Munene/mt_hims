from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from pharmacy.models import Medication


class PharmacyViewTests(ClinicAPIFixtureMixin, APITestCase):
    def test_pharmacist_can_create_medication(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.clinic.id),
                "name": "Azithromycin",
                "strength": "250mg",
                "dosage_form": "tablet",
                "manufacturer": "Avocent Pharma",
                "reorder_level": 10,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_doctor_can_list_prescriptions(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.get("/api/pharmacy/prescriptions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["id"], str(self.prescription.id))

    def test_receptionist_cannot_create_medication(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.clinic.id),
                "name": "Cefixime",
                "strength": "200mg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stock_batch_rejects_remaining_quantity_above_received(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/stock-batches/",
            {
                "clinic": str(self.clinic.id),
                "medication": str(self.medication.id),
                "batch_number": "RX-001",
                "expiry_date": str(timezone.localdate() + timedelta(days=30)),
                "quantity_received": 10,
                "quantity_remaining": 11,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_prescription_item_rejects_medication_from_another_clinic(self):
        foreign_medication = Medication.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            name="Foreign Drug",
            strength="20mg",
        )
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/prescription-items/",
            {
                "clinic": str(self.clinic.id),
                "prescription": str(self.prescription.id),
                "medication": str(foreign_medication.id),
                "dosage": "1 tablet",
                "frequency": "daily",
                "duration": "7 days",
                "quantity": 7,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
