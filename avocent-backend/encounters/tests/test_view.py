from datetime import time, timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from core.tests.utils import ClinicAPIFixtureMixin
from encounters.models import AvailabilitySlot
from encounters.serializers import AvailabilitySlotSerializer
from encounters.views import AvailabilitySlotViewSet


class EncounterViewTests(ClinicAPIFixtureMixin, APITestCase):
    @patch("encounters.views.schedule_appointment_reminder")
    def test_appointment_creation_enqueues_reminder_workflow(self, schedule_mock):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": (timezone.now() + timedelta(days=1)).isoformat(),
                "encounter_type": "video",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        schedule_mock.assert_called_once()

    def test_appointment_list_returns_current_clinic_records(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.get("/api/encounters/appointments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.appointment.id))


    def test_appointment_creation_rejects_past_time(self):
        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            "/api/encounters/appointments/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "scheduled_time": (timezone.now() - timedelta(hours=1)).isoformat(),
                "encounter_type": "in_person",
                "status": "scheduled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_encounter_creation_rejects_end_before_start(self):
        self.client.force_authenticate(self.doctor)
        start_time = timezone.now()
        response = self.client.post(
            "/api/encounters/encounters/",
            {
                "clinic": str(self.clinic.id),
                "patient": str(self.patient.id),
                "practitioner": str(self.practitioner.id),
                "encounter_type": "video",
                "status": "active",
                "start_time": start_time.isoformat(),
                "end_time": (start_time - timedelta(minutes=15)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AvailabilitySlotOverlapTests(ClinicAPIFixtureMixin, APITestCase):
    def _post_slot(self, start, end, day_of_week=2):
        return self.client.post(
            "/api/encounters/availability-slots/",
            {
                "clinic": str(self.clinic.id),
                "practitioner": str(self.practitioner.id),
                "day_of_week": day_of_week,
                "start_time": start,
                "end_time": end,
            },
            format="json",
        )

    def test_non_overlapping_slot_is_created(self):
        self.client.force_authenticate(self.admin)
        response = self._post_slot("09:00", "11:00")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_adjacent_slots_do_not_overlap(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self._post_slot("09:00", "10:00").status_code, status.HTTP_201_CREATED)
        # Touching at the boundary (10:00 end -> 10:00 start) is not an overlap.
        self.assertEqual(self._post_slot("10:00", "11:00").status_code, status.HTTP_201_CREATED)

    def test_overlapping_slot_is_rejected(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self._post_slot("09:00", "11:00").status_code, status.HTTP_201_CREATED)
        response = self._post_slot("10:00", "12:00")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            AvailabilitySlot.objects.filter(practitioner=self.practitioner, day_of_week=2).count(),
            1,
        )

    def test_overlapping_monday_slot_is_rejected(self):
        # Monday is day_of_week=0, which a falsy-value fallback would skip.
        self.client.force_authenticate(self.admin)
        self.assertEqual(self._post_slot("09:00", "11:00", day_of_week=0).status_code, status.HTTP_201_CREATED)

        self.assertEqual(self._post_slot("10:00", "12:00", day_of_week=0).status_code, status.HTTP_400_BAD_REQUEST)

    def test_perform_create_rejects_overlap_committed_after_validation(self):
        """The viewset's lock-guarded re-check catches an overlap that the
        serializer's up-front validation did not see — the TOCTOU window a
        concurrent request opens. We simulate that window deterministically:
        validate() runs against an empty table and passes, then a competing
        slot commits, then perform_create runs and must still reject.
        """
        factory = APIRequestFactory()
        request = factory.post("/api/encounters/availability-slots/")
        request.user = self.admin

        serializer = AvailabilitySlotSerializer(
            data={
                "clinic": str(self.clinic.id),
                "practitioner": str(self.practitioner.id),
                "day_of_week": 2,
                "start_time": "09:00",
                "end_time": "11:00",
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        # Competing request commits an overlapping slot inside the TOCTOU window.
        AvailabilitySlot.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            practitioner=self.practitioner,
            day_of_week=2,
            start_time=time(10, 0),
            end_time=time(12, 0),
        )

        view = AvailabilitySlotViewSet()
        view.request = request
        view.format_kwarg = None

        with self.assertRaises(drf_serializers.ValidationError):
            view.perform_create(serializer)

        # The losing write never lands: only the competing slot exists.
        self.assertEqual(
            AvailabilitySlot.objects.filter(practitioner=self.practitioner, day_of_week=2).count(),
            1,
        )
