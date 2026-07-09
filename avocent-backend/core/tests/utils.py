from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import Invoice, InvoiceLine, ServiceCatalogue
from booking.models import Booking
from clinical.models import ClinicalNote, Diagnosis, Observation
from encounters.models import Appointment, Encounter
from laboratory.models import LabOrder, LabOrderItem, LabResult, LabTestCatalogue
from organization.models import Clinic
from patients.models import Patient
from pharmacy.models import Medication, Prescription, PrescriptionItem
from telemedicine.models import ChatSessionState, TelemedicineSession
from users.constants import (
    ROLE_ADMIN,
    ROLE_DOCTOR,
    ROLE_LAB_TECHNICIAN,
    ROLE_NURSE,
    ROLE_PHARMACIST,
    ROLE_RECEPTIONIST,
)
from users.models import PractitionerProfile, User
from users.services import assign_role, ensure_clinic_roles


class ClinicAPIFixtureMixin:
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(name="Avocent", registration_number="FIX-001")
        self.other_clinic = Clinic.objects.create(name="Other", registration_number="FIX-002")
        ensure_clinic_roles(self.clinic)
        ensure_clinic_roles(self.other_clinic)

        self.admin = User.objects.create_user(
            email="admin-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
            is_staff=True,
        )
        self.doctor = User.objects.create_user(
            email="doctor-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.nurse = User.objects.create_user(
            email="nurse-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.receptionist = User.objects.create_user(
            email="reception-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.pharmacist = User.objects.create_user(
            email="pharmacist-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.lab_technician = User.objects.create_user(
            email="labtech-fixture@example.com",
            password="secret123",
            clinic=self.clinic,
        )
        self.other_doctor = User.objects.create_user(
            email="doctor-other@example.com",
            password="secret123",
            clinic=self.other_clinic,
        )

        clinic_roles = {role.name: role for role in self.clinic.roles.all()}
        assign_role(user=self.admin, role=clinic_roles[ROLE_ADMIN], assigned_by=self.admin)
        assign_role(user=self.doctor, role=clinic_roles[ROLE_DOCTOR], assigned_by=self.admin)
        assign_role(user=self.nurse, role=clinic_roles[ROLE_NURSE], assigned_by=self.admin)
        assign_role(user=self.receptionist, role=clinic_roles[ROLE_RECEPTIONIST], assigned_by=self.admin)
        assign_role(user=self.pharmacist, role=clinic_roles[ROLE_PHARMACIST], assigned_by=self.admin)
        assign_role(user=self.lab_technician, role=clinic_roles[ROLE_LAB_TECHNICIAN], assigned_by=self.admin)

        self.practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            user=self.doctor,
            license_number="FIX-LIC-001",
            specialty="General Medicine",
        )
        self.nurse_practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            user=self.nurse,
            license_number="FIX-LIC-002",
            specialty="Nursing",
        )
        self.lab_practitioner = PractitionerProfile.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            user=self.lab_technician,
            license_number="FIX-LIC-003",
            specialty="Laboratory",
        )
        self.other_practitioner = PractitionerProfile.objects.create(
            clinic=self.other_clinic,
            user=self.other_doctor,
            license_number="FIX-LIC-004",
            specialty="General Medicine",
        )

        self.patient = Patient.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            first_name="Amina",
            last_name="Otieno",
            phone="+254711111111",
        )
        self.other_patient = Patient.objects.create(
            clinic=self.other_clinic,
            created_by=self.other_doctor,
            first_name="Bob",
            last_name="Foreign",
        )
        self.appointment = Appointment.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            practitioner=self.practitioner,
            scheduled_time=timezone.now() + timedelta(days=2),
            encounter_type="video",
            status="scheduled",
        )
        self.booking = Booking.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            appointment=self.appointment,
            assigned_practitioner=self.practitioner,
            booking_type="scheduled",
            encounter_type="video",
            status="confirmed",
        )
        self.encounter = Encounter.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            practitioner=self.practitioner,
            appointment=self.appointment,
            booking=self.booking,
            encounter_type="video",
            status="active",
            start_time=timezone.now(),
        )
        self.clinical_note = ClinicalNote.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            subjective="Headache",
        )
        self.diagnosis = Diagnosis.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            icd10_code="A01",
            description="Typhoid fever",
            is_primary=True,
        )
        self.observation = Observation.objects.create(
            clinic=self.clinic,
            created_by=self.nurse,
            encounter=self.encounter,
            name="Blood Pressure",
            value="120/80",
            unit="mmHg",
        )

        self.service = ServiceCatalogue.objects.create(
            clinic=self.clinic,
            created_by=self.admin,
            name="Consultation",
            code="CONSULT-001",
            price="2500.00",
            category="consultation",
        )
        self.invoice = Invoice.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            patient=self.patient,
            encounter=self.encounter,
            booking=self.booking,
            total_amount="2500.00",
            status="unpaid",
        )
        self.invoice_line = InvoiceLine.objects.create(
            clinic=self.clinic,
            created_by=self.receptionist,
            invoice=self.invoice,
            service_name="Consultation",
            quantity="1.00",
            unit_price="2500.00",
            total_price="2500.00",
        )

        self.medication = Medication.objects.create(
            clinic=self.clinic,
            created_by=self.pharmacist,
            name="Amoxicillin",
            strength="500mg",
            unit_price="50.00",
        )
        self.prescription = Prescription.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            prescribed_by=self.practitioner,
            status="active",
        )
        self.prescription_item = PrescriptionItem.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            prescription=self.prescription,
            medication=self.medication,
            dosage="500mg",
            frequency="TDS",
            duration="5 days",
            quantity=15,
        )

        self.lab_test = LabTestCatalogue.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            name="Full Hemogram",
            loinc_code="57021-8",
            price="1200.00",
            sample_type="Blood",
        )
        self.lab_order = LabOrder.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            encounter=self.encounter,
            ordered_by=self.practitioner,
            status="ordered",
            priority="routine",
        )
        self.lab_order_item = LabOrderItem.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            lab_order=self.lab_order,
            lab_test=self.lab_test,
        )
        self.lab_result = LabResult.objects.create(
            clinic=self.clinic,
            created_by=self.lab_technician,
            lab_order_item=self.lab_order_item,
            result_value="Normal",
            verified_by=self.lab_practitioner,
        )

        self.telemedicine_session = TelemedicineSession.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient=self.patient,
            encounter=self.encounter,
            session_type="video",
            session_link="https://meet.example.com/session-1",
        )
        self.chat_state = ChatSessionState.objects.create(
            clinic=self.clinic,
            created_by=self.doctor,
            patient_phone=self.patient.phone,
            current_state="awaiting_followup",
            encounter=self.encounter,
        )
