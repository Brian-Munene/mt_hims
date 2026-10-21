# Avocent Health Centre — Master Plan

Synthesized from: HIMS Database & Permissions Blueprint, Lead Health Informatics Engineer JD, and project roadmap.

---

## Vision

A Kenya-focused clinic-first HIMS and telemedicine platform targeting DHA certification and eventual multi-tenant SaaS deployment. Stack: Django + Next.js on Azure AKS (Africa East / af-south-1).

---

## Required Modules

Each module must exist as a Django app with RBAC-controlled REST endpoints and a corresponding frontend section.

| Module | Django app | Status |
|---|---|---|
| Patient Management | `patients` | Done |
| Appointments & Booking | `booking`, `encounters` | Done |
| Clinical Records (EMR) | `clinical` | Done |
| Billing & Payments | `billing`, `payments` | Done |
| Pharmacy | `pharmacy` | Done |
| Laboratory | `laboratory` | Done |
| Telemedicine | `telemedicine` | Done — sessions/chatbot; video (Whereby) not started |
| Staff & Roles | `users`, `organization` | Done |
| Audit & Compliance | `audit`, `compliance` | Done — auto-flagging done; DHA package not started |
| Notifications | `notifications` | Done — email; SMS/WhatsApp not started |

---

## Role & Permission Requirements

Seven roles defined. Admin has full access (`*`). All others are scoped:

| Role | Core clinical | Billing | Lab | Pharmacy | Telemedicine | Admin |
|---|---|---|---|---|---|---|
| Doctor | read/write | read only | read/write | read/write | read/write | — |
| Nurse | read/write | — | — | — | read | — |
| Lab Technician | patients read, encounters read | — | read/write | — | — | — |
| Pharmacist | patients read, encounters read | read | — | read/write | — | — |
| Receptionist | patients read/write, booking full | billing read/write | — | — | — | — |
| Accountant | — | full | — | — | — | — |
| Admin | full | full | full | full | full | full |

Enforced via `users/permissions.py::PERMISSION_MATRIX` + `ClinicScopedModelViewSet`.

---

## Data Architecture Requirements

- Every domain model extends `CoreModel`: UUID pk, `clinic` FK, `created_at/updated_at/created_by`, `is_active`, `metadata`.
- Clinic scoping enforced server-side on every create and update — non-superusers cannot write to a foreign clinic.
- PHI encrypted at field level (AES-256-GCM) via `core/fields.py` using `FIELD_ENCRYPTION_KEY`.
- Optional API-layer payload encryption (`core/middleware.py`) on top of TLS.
- Immutable audit log (`audit` app) for all system actions.
- Future: PostgreSQL Row-Level Security (RLS) for hard multi-tenant isolation — not yet implemented.

---

## Deployment Architecture Requirements

- **Docker Compose** (local/staging/prod overrides): Done — Caddy TLS, whitenoise, gunicorn, Celery worker + beat.
- **Kubernetes (Helm)**: In progress — Helm chart at `deploy/helm/avocent/`; Azure AKS Terraform at `infra/terraform/`.
- **Azure AKS** (Africa East region): Terraform scaffolded; actual `.tf` source on `feature/azure-aks-deployment` branch.
- **CI/CD**: GitHub Actions pipeline — Django tests + Next.js typecheck/lint/build on every PR.
- **Disaster recovery / backups**: Not started.
- **Error monitoring (Sentry)**: Not started.

---

## Integration Requirements (from JD)

| Integration | Spec requirement | Status |
|---|---|---|
| M-Pesa Daraja API | Live inbound webhook for payment callbacks | Partial — processes stored callbacks; no live endpoint |
| WhatsApp Business API | Digital front door + chatbot triage | Not started |
| SHA/HIE | Integration with Social Health Authority HIE | Not started |
| FHIR/HL7 | Standards-compliant data export | Not started |
| ICD-10 / LOINC | Coding standards on diagnoses and lab results | Not started |
| Whereby | Video consultations in telemedicine module | Not started |
| DHA Certification | Regulatory package + data flow diagrams | Not started |

---

## Roadmap Phases (from Blueprint)

| Phase | Scope | Status |
|---|---|---|
| 1 — Validation | DB structure review, permission sign-off | Done |
| 2 — Backend Foundation | Django project, core models, auth, RBAC | Done |
| 3 — Core Modules | Patients → Booking → EMR → Billing → Telemedicine | Done |
| 4 — Security & Compliance | Encryption, audit logging, compliance auto-flagging | Mostly done — DHA package and RLS pending |
| 5 — Internal Pilot | Deploy, staff training, feedback | In progress — Docker done; K8s in progress |
| 6 — Multi-Tenancy & Optimization | Multi-clinic isolation, advanced analytics, external integrations | Not started |

---

## Active Deferred Items

These were explicitly deferred by the project owner — do not re-open without instruction:
- Doctor compliance documents upload
- Public booking / patient self-service portal

## Known Open Gaps (not deferred)

- Celery worker + beat not kept running persistently in any live environment
- PostgreSQL RLS for hard multi-tenant isolation
- FHIR, ICD-10/LOINC, SHA/HIE integrations
- WhatsApp Business API and M-Pesa live webhook
- Whereby video in telemedicine
- DHA certification package and data flow diagrams
- Error monitoring (Sentry) and automated DB backups
- Multi-clinic / multi-tenancy platform enablement
- Manual cross-role QA walkthrough (owner task)
