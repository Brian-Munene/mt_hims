from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import Appointment, Encounter
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


class SuperuserClinicViewTests(ClinicAPIFixtureMixin, APITestCase):
    """Superusers list their own clinic by default, can switch with ?clinic=,
    and can act on another clinic's records by id. Non-superusers cannot use
    ?clinic= to see another clinic's data."""

    URL = "/api/pharmacy/medications/"

    def setUp(self):
        super().setUp()
        self.superuser = User.objects.create_superuser(
            email="root-view@example.com", password="secret123", clinic=self.clinic
        )
        self.foreign_med = Medication.objects.create(
            clinic=self.other_clinic, created_by=self.admin, name="ForeignMed", strength="1mg"
        )

    def _names(self, response):
        return {row["name"] for row in response.data["results"]}

    def test_superuser_lists_own_clinic_by_default(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("ForeignMed", self._names(response))

    def test_superuser_can_list_another_clinic(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.URL, {"clinic": str(self.other_clinic.id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._names(response), {"ForeignMed"})

    def test_superuser_invalid_clinic_param_is_rejected(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.URL, {"clinic": "not-a-uuid"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_superuser_can_update_and_delete_another_clinics_record(self):
        self.client.force_authenticate(self.superuser)
        detail = f"{self.URL}{self.foreign_med.id}/"

        patch = self.client.patch(detail, {"reorder_level": 7}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_200_OK, patch.data)
        self.foreign_med.refresh_from_db()
        self.assertEqual(self.foreign_med.reorder_level, 7)
        self.assertEqual(self.foreign_med.clinic_id, self.other_clinic.id)

        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_204_NO_CONTENT)

    def test_non_superuser_cannot_view_another_clinic(self):
        self.client.force_authenticate(self.pharmacist)
        listing = self.client.get(self.URL, {"clinic": str(self.other_clinic.id)})
        self.assertNotIn("ForeignMed", self._names(listing))

        detail = self.client.get(f"{self.URL}{self.foreign_med.id}/")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)


class ClinicInjectedIntoPayloadTests(ClinicAPIFixtureMixin, APITestCase):
    """Clients don't send `clinic`: ClinicScopedModelViewSet fills it in from
    the logged-in user before validation, for every clinic-scoped model."""

    def _encounter_payload(self, **extra):
        # Mirrors the frontend's encounter create payload (no clinic, blank appointment).
        return {
            "patient": str(self.patient.id),
            "practitioner": str(self.practitioner.id),
            "appointment": "",
            "encounter_type": "in_person",
            "triage_score": 2,
            "triage_level": "green",
            "physical_escalation_required": False,
            "status": "active",
            "start_time": "2026-11-10T04:06",
            "end_time": None,
            "metadata": {},
            **extra,
        }

    def test_doctor_encounter_without_clinic_saves_to_doctors_clinic(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post("/api/encounters/encounters/", self._encounter_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Encounter.objects.get(pk=response.data["id"]).clinic_id, self.clinic.id)

    def test_doctor_cannot_pick_another_clinic(self):
        self.client.force_authenticate(self.doctor)
        response = self.client.post(
            "/api/encounters/encounters/",
            self._encounter_payload(clinic=str(self.other_clinic.id)),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Encounter.objects.get(pk=response.data["id"]).clinic_id, self.clinic.id)

    def test_full_update_without_clinic_keeps_clinic(self):
        self.client.force_authenticate(self.pharmacist)
        response = self.client.put(
            f"/api/pharmacy/medications/{self.medication.id}/",
            {"name": "Amoxicillin", "strength": "250mg", "dosage_form": "tablet", "reorder_level": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.medication.refresh_from_db()
        self.assertEqual((self.medication.clinic_id, self.medication.strength), (self.clinic.id, "250mg"))
