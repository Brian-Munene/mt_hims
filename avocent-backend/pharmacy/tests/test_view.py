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

    def test_pharmacist_medication_defaults_to_own_clinic_when_clinic_omitted(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {"name": "Metformin", "strength": "500mg", "dosage_form": "tablet", "reorder_level": 5},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Medication.objects.get(pk=response.data["id"]).clinic_id, self.clinic.id)
        self.assertEqual(response.data["clinic_name"], self.clinic.name)

    def test_medication_list_includes_clinic_name(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.get("/api/pharmacy/medications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["results"])
        self.assertTrue(all(row["clinic_name"] == self.clinic.name for row in response.data["results"]))

    def test_pharmacist_cannot_create_medication_in_another_clinic(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.other_clinic.id),
                "name": "Losartan",
                "strength": "50mg",
                "dosage_form": "tablet",
                "reorder_level": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Medication.objects.get(pk=response.data["id"]).clinic_id, self.clinic.id)

    def test_superuser_can_create_medication_for_chosen_clinic(self):
        superuser = type(self.pharmacist).objects.create_superuser(
            email="root-pharm@avocent.test", password="pass12345", clinic=self.clinic
        )
        self.client.force_authenticate(superuser)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.other_clinic.id),
                "name": "Amlodipine",
                "strength": "5mg",
                "dosage_form": "tablet",
                "reorder_level": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Medication.objects.get(pk=response.data["id"]).clinic_id, self.other_clinic.id)

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


class PharmacyClinicDefaultingTests(ClinicAPIFixtureMixin, APITestCase):
    """Stock batches, prescriptions and prescription items no longer require
    `clinic` in the payload; non-superusers get their own clinic, superusers
    may target another clinic explicitly."""

    def _future_date(self):
        return (timezone.localdate() + timedelta(days=365)).isoformat()

    def test_pharmacist_stock_batch_defaults_to_own_clinic(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/stock-batches/",
            {
                "medication": str(self.medication.id),
                "batch_number": "B-001",
                "expiry_date": self._future_date(),
                "quantity_received": 500,
                "quantity_remaining": 500,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["clinic"], self.clinic.id)

    def test_doctor_prescription_and_item_default_to_own_clinic(self):
        self.client.force_authenticate(self.doctor)
        rx = self.client.post(
            "/api/pharmacy/prescriptions/",
            {
                "encounter": str(self.encounter.id),
                "prescribed_by": str(self.practitioner.id),
                "status": "active",
                "hash_signature": "sig",
            },
            format="json",
        )
        self.assertEqual(rx.status_code, status.HTTP_201_CREATED, rx.data)
        self.assertEqual(rx.data["clinic"], self.clinic.id)

        item = self.client.post(
            "/api/pharmacy/prescription-items/",
            {
                "prescription": rx.data["id"],
                "medication": str(self.medication.id),
                "dosage": "500mg",
                "frequency": "TDS",
                "duration": "5 days",
                "quantity": 15,
            },
            format="json",
        )
        self.assertEqual(item.status_code, status.HTTP_201_CREATED, item.data)
        self.assertEqual(item.data["clinic"], self.clinic.id)

    def test_superuser_can_add_stock_batch_for_another_clinic(self):
        from users.models import User

        superuser = User.objects.create_superuser(email="root-stock@avocent.test", password="pass12345", clinic=self.clinic)
        foreign_med = Medication.objects.create(clinic=self.other_clinic, created_by=self.admin, name="Foreign", strength="1mg")
        self.client.force_authenticate(superuser)
        response = self.client.post(
            "/api/pharmacy/stock-batches/",
            {
                "clinic": str(self.other_clinic.id),
                "medication": str(foreign_med.id),
                "batch_number": "B-002",
                "expiry_date": self._future_date(),
                "quantity_received": 10,
                "quantity_remaining": 10,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["clinic"], self.other_clinic.id)

    def test_duplicate_batch_number_in_same_clinic_is_rejected(self):
        self.client.force_authenticate(self.pharmacist)
        payload = {
            "medication": str(self.medication.id),
            "batch_number": "DUP-1",
            "expiry_date": self._future_date(),
            "quantity_received": 5,
            "quantity_remaining": 5,
        }
        self.assertEqual(self.client.post("/api/pharmacy/stock-batches/", payload, format="json").status_code, 201)
        response = self.client.post("/api/pharmacy/stock-batches/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
