from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Appointment
from pharmacy.models import Medication
from users.models import User


class ClinicScopingWriteTests(ClinicAPIFixtureMixin, APITestCase):
    """ClinicScopedModelViewSet.perform_create()/perform_update() must force every
    clinic-scoped model into the requesting non-superuser's own clinic, no matter
    what `clinic` value (if any) the client supplies. Before this fix, `clinic` was
    only defaulted when omitted from the payload — an explicit foreign clinic id
    was honored as-is, for any authenticated user with write access, on every one
    of the ~25 models that inherit CoreModel.
    """

    def test_create_ignores_client_supplied_foreign_clinic(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.other_clinic.id),
                "name": "Azithromycin",
                "strength": "250mg",
                "dosage_form": "tablet",
                "manufacturer": "Avocent Pharma",
                "reorder_level": 10,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        medication = Medication.objects.get(id=response.data["id"])
        self.assertEqual(medication.clinic_id, self.clinic.id)

    def test_update_ignores_client_supplied_foreign_clinic(self):
        medication = Medication.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            name="Paracetamol",
            strength="500mg",
        )
        self.client.force_authenticate(self.pharmacist)
        response = self.client.patch(
            f"/api/pharmacy/medications/{medication.id}/",
            {"clinic": str(self.other_clinic.id), "reorder_level": 20},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        medication.refresh_from_db()
        self.assertEqual(medication.clinic_id, self.clinic.id)
        self.assertEqual(medication.reorder_level, 20)

    def test_superuser_can_still_set_an_explicit_clinic(self):
        # Superusers remain the one established cross-clinic bypass (see
        # can_access_object / has_permission) — this must keep working.
        superuser = User.objects.create_superuser(
            email="root-fixture@example.com", password="secret123", clinic=self.clinic
        )
        self.client.force_authenticate(superuser)
        response = self.client.post(
            "/api/pharmacy/medications/",
            {
                "clinic": str(self.other_clinic.id),
                "name": "Ibuprofen",
                "strength": "200mg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        medication = Medication.objects.get(id=response.data["id"])
        self.assertEqual(medication.clinic_id, self.other_clinic.id)

    def test_cross_clinic_related_object_rejected_even_without_explicit_clinic(self):
        # Regression test for the underlying gap: before resolve_effective_clinic
        # was made to always resolve to the requester's own clinic, omitting
        # `clinic` from the payload made validate_clinic_match compare against
        # None and silently skip the check entirely, letting an Appointment
        # reference a patient from a completely different clinic.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "patient": str(self.other_patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": "2030-01-01T09:00:00Z",
                "encounter_type": "in_person",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertFalse(Appointment.objects.filter(patient=self.other_patient).exists())

    def test_cross_clinic_related_object_rejected_even_with_spoofed_clinic(self):
        # Same as above, but the client also tries pairing a foreign clinic id
        # with the foreign patient so the (client-supplied) values agree with
        # each other -- resolve_effective_clinic must still ignore attrs for a
        # non-superuser rather than letting this combination pass validation.
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.other_clinic.id),
                "patient": str(self.other_patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": "2030-01-01T09:00:00Z",
                "encounter_type": "in_person",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertFalse(Appointment.objects.filter(patient=self.other_patient).exists())
