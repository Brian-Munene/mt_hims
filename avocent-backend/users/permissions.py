from users.constants import (
    ROLE_ACCOUNTANT,
    ROLE_ADMIN,
    ROLE_DOCTOR,
    ROLE_LAB_TECHNICIAN,
    ROLE_NURSE,
    ROLE_PHARMACIST,
    ROLE_RECEPTIONIST,
)

PERM_ALL = "*"

PERMISSION_MATRIX = {
    ROLE_ADMIN: {PERM_ALL},
    ROLE_DOCTOR: {
        "patients.read",
        "patients.write",
        "appointments.read",
        "appointments.write",
        "booking.read",
        "booking.write",
        "encounters.read",
        "encounters.write",
        "clinical.read",
        "clinical.write",
        "laboratory.read",
        "laboratory.write",
        "pharmacy.read",
        "pharmacy.write",
        "telemedicine.read",
        "telemedicine.write",
        "audit.read",
        "users.read",
        "notifications.read",
    },
    ROLE_NURSE: {
        "patients.read",
        "patients.write",
        "appointments.read",
        "appointments.write",
        "booking.read",
        "booking.write",
        "encounters.read",
        "encounters.write",
        "clinical.read",
        "clinical.write",
        "telemedicine.read",
        "users.read",
        "notifications.read",
    },
    ROLE_LAB_TECHNICIAN: {
        "patients.read",
        "encounters.read",
        "booking.read",
        "booking.write",
        "laboratory.read",
        "laboratory.write",
        "users.read",
        "notifications.read",
    },
    ROLE_PHARMACIST: {
        "patients.read",
        "encounters.read",
        "booking.read",
        "booking.write",
        "pharmacy.read",
        "pharmacy.write",
        "billing.read",
        "users.read",
        "notifications.read",
    },
    ROLE_RECEPTIONIST: {
        "patients.read",
        "patients.write",
        "appointments.read",
        "appointments.write",
        "booking.read",
        "booking.write",
        "billing.read",
        "billing.write",
        "payments.read",
        "payments.write",
        "users.read",
        "notifications.read",
    },
    ROLE_ACCOUNTANT: {
        "billing.read",
        "billing.write",
        "payments.read",
        "payments.write",
        "users.read",
        "notifications.read",
    },
}

MODEL_PERMISSION_MAP = {
    "organization.clinic": {"read": "clinic.read", "write": "clinic.manage"},
    "users.user": {"read": "users.read", "write": "users.manage"},
    "users.role": {"read": "roles.read", "write": "roles.manage"},
    "users.userrole": {"read": "roles.read", "write": "roles.manage"},
    "users.department": {"read": "users.read", "write": "users.manage"},
    "users.practitionerprofile": {"read": "users.read", "write": "users.manage"},
    "patients.patient": {"read": "patients.read", "write": "patients.write"},
    "patients.patientidentifier": {"read": "patients.read", "write": "patients.write"},
    "patients.allergy": {"read": "patients.read", "write": "patients.write"},
    "patients.chroniccondition": {"read": "patients.read", "write": "patients.write"},
    "patients.patientdocument": {"read": "patients.read", "write": "patients.write"},
    "patients.patientalert": {"read": "patients.read", "write": "patients.write"},
    "booking.booking": {"read": "booking.read", "write": "booking.write"},
    "booking.bookingevent": {"read": "booking.read", "write": "booking.write"},
    "booking.bookingqueue": {"read": "booking.read", "write": "booking.write"},
    "encounters.appointment": {"read": "appointments.read", "write": "appointments.write"},
    "encounters.availabilityslot": {"read": "appointments.read", "write": "appointments.write"},
    "encounters.encounter": {"read": "encounters.read", "write": "encounters.write"},
    "clinical.clinicalnote": {"read": "clinical.read", "write": "clinical.write"},
    "clinical.diagnosis": {"read": "clinical.read", "write": "clinical.write"},
    "clinical.observation": {"read": "clinical.read", "write": "clinical.write"},
    "billing.servicecatalogue": {"read": "billing.read", "write": "billing.write"},
    "billing.invoice": {"read": "billing.read", "write": "billing.write"},
    "billing.invoiceline": {"read": "billing.read", "write": "billing.write"},
    "payments.payment": {"read": "payments.read", "write": "payments.write"},
    "pharmacy.medication": {"read": "pharmacy.read", "write": "pharmacy.write"},
    "pharmacy.stockbatch": {"read": "pharmacy.read", "write": "pharmacy.write"},
    "pharmacy.prescription": {"read": "pharmacy.read", "write": "pharmacy.write"},
    "pharmacy.prescriptionitem": {"read": "pharmacy.read", "write": "pharmacy.write"},
    "laboratory.labtestcatalogue": {"read": "laboratory.read", "write": "laboratory.write"},
    "laboratory.laborder": {"read": "laboratory.read", "write": "laboratory.write"},
    "laboratory.laborderitem": {"read": "laboratory.read", "write": "laboratory.write"},
    "laboratory.labresult": {"read": "laboratory.read", "write": "laboratory.write"},
    "telemedicine.telemedicinesession": {"read": "telemedicine.read", "write": "telemedicine.write"},
    "telemedicine.chatsessionstate": {"read": "telemedicine.read", "write": "telemedicine.write"},
    "audit.auditlog": {"read": "audit.read", "write": None},
    "notifications.notification": {"read": "notifications.read", "write": "notifications.read"},
    "notifications.notificationtemplate": {"read": "notifications.read", "write": "users.manage"},
    "notifications.emaillog": {"read": "users.manage", "write": None},
    "compliance.compliancerecord": {"read": "compliance.read", "write": "compliance.write"},
    "compliance.policy": {"read": "compliance.read", "write": "compliance.write"},
    "compliance.policyversion": {"read": "compliance.read", "write": None},
}


def role_permissions(role_names):
    allowed = set()
    for role_name in role_names:
        allowed.update(PERMISSION_MATRIX.get(role_name, set()))
    return allowed


def has_permission(user, permission, clinic=None):
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True

    role_names = user.role_names(clinic=clinic)
    allowed = role_permissions(role_names)
    return PERM_ALL in allowed or permission in allowed
