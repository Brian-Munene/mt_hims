ROLE_DOCTOR = "Doctor"
ROLE_NURSE = "Nurse"
ROLE_LAB_TECHNICIAN = "Lab Technician"
ROLE_PHARMACIST = "Pharmacist"
ROLE_RECEPTIONIST = "Receptionist"
ROLE_ADMIN = "Admin"
ROLE_ACCOUNTANT = "Accountant"

DEFAULT_ROLE_DEFINITIONS = (
    (ROLE_ADMIN, "Full clinic administration access."),
    (ROLE_DOCTOR, "Clinical consultation, diagnosis, treatment, and telemedicine access."),
    (ROLE_NURSE, "Patient intake, triage, care support, and encounter documentation access."),
    (ROLE_LAB_TECHNICIAN, "Laboratory order processing and lab result management access."),
    (ROLE_PHARMACIST, "Medication, dispensing, and pharmacy inventory access."),
    (ROLE_RECEPTIONIST, "Front desk, registration, scheduling, billing, and payment access."),
    (ROLE_ACCOUNTANT, "Full billing, payments, and financial reporting access."),
)

ALL_ROLE_NAMES = tuple(name for name, _ in DEFAULT_ROLE_DEFINITIONS)
