# Avocent Health Centre — Requirements & Research Consolidation

**Date:** June 2026
**Sources:** Medicare UK Limited client proposal (EHR, Compliance & Verification, Policy/Knowledge Hub) + comparator HIMS user research (doctor interview)

---

## 1. Current Build Status

### Backend (Django 5.2 + DRF)
- Fully built: organization, users, patients, encounters, billing, payments, pharmacy, laboratory, audit, core
- Partially built: clinical (notes/diagnoses/observations — backend done, no triage sub-model yet), telemedicine (skeleton only)
- Not built: public booking, notifications (real SMS/Email/WhatsApp), Celery Beat schedules, compliance tracking, policy hub

### Frontend (Next.js 16 + React 19)
- Fully built: Authentication, Dashboard Shell, Patient Management, Encounters & Appointments, typed API client layer (all endpoints)
- Scaffolded only (UI pending): Clinical, Billing & Payments, Pharmacy, Laboratory, Telemedicine, Admin Settings

---

## 2. Gap Analysis vs. Medicare UK Proposal

### Module 1: EHR — Partial Coverage

| Feature Area | Backend | Frontend |
|---|---|---|
| Auth & RBAC | ✅ | ✅ |
| Patients | ✅ | ✅ |
| Appointments/Encounters | ✅ | ✅ |
| Medical Records / Clinical Notes | ✅ | ❌ |
| Prescriptions & Lab | ✅ | ❌ |
| Billing & Payments | ✅ | ❌ |
| Notifications | ⚠️ stubs only | ❌ |
| Public Booking | ❌ | ❌ |
| Doctor Profiles/Departments/Services | ⚠️ partial | ❌ |
| Telemedicine | ⚠️ skeleton | ❌ |
| Settings & Config | ❌ | ❌ |
| Stripe / Payment Gateway | ❌ (M-PESA only) | ❌ |
| Whereby Integration | ❌ | ❌ |
| Audit Trail | ✅ | ❌ |
| Admin Dashboards & Reports | ❌ | ❌ |

### Module 2: Compliance & Verification — Not Started
- Doctor compliance documents (GMC, DBS, indemnity, right to work)
- Expiry tracking & alerts
- Business compliance certificates
- Admin verification workflows
- Professional references
- Compliance dashboards & reports

### Module 3: Policy / Knowledge Hub — Not Started
- Policy library (admin-authored)
- Staff/doctor viewing
- Search & category filtering
- Version history
- PDF/Word/rich text support

### Open Decisions
- **Payment gateway:** M-PESA (current build) vs. Stripe (proposal spec) — needs resolution
- **Telemedicine provider:** generic skeleton vs. Whereby (proposal spec) — needs resolution

---

## 3. Research Findings — Comparator HIMS (Doctor Interview)

### Process Flow Observed
1. Reception registration + initial/consultation payment
2. Triage — nurse records vitals + freetext notes
3. Doctor consultation — diagnosis, freetext notes (no voice input)
4. Lab tests if necessary
5. Lab results returned to doctor (typically within minutes, no SLA tracking needed)
6. Prescription — linked to pharmacy with drug-interaction checking + stock-based suggestions
7. Final payment (settling remaining balance)

### Key Details Confirmed
- Doctor sees nurse's triage vitals/notes **automatically** — no separate lookup
- Doctor's billing access is **read-only** (view bill only, no management)
- **No compliance/expiry tracking** exists in this comparator system at all
- **No notification system** alerts staff when compliance checks are due
- **Notes do not autosave** — page refresh loses all unsaved doctor input
- Queue ordering is **FIFO by arrival/check-in time**
- Booking is **phone-call or doctor-scheduled only** — no patient self-service booking
- Pharmacy "suggestions" = drug-interaction checking + stock-based availability (not formulary restriction)

### Comparator Systems Referenced
- Med360, Medicentrev3, Pharmaco *(unverified via public search — likely regional/low web-presence systems; treat as anecdotal, not independently confirmed)*

---

## 4. Actionable Items Derived from Research

### Backend
- [ ] Add triage/vitals data model linked to encounters (nurse-authored, distinct from doctor's clinical note)
- [ ] Support staged/partial payments on a single invoice (registration fee + final settlement, running balance)
- [ ] Build drug-interaction checking against patient's active medications + allergies (clinical + pharmacy + patients integration)
- [ ] Build stock-based prescription suggestions (pharmacy stock batches)
- [ ] Lab result notification: simple "notify on result entry" — no SLA/escalation logic needed for v1
- [ ] Enforce read-only billing permissions for doctor role at the API level

### Frontend
- [ ] Autosave for all clinical freetext fields (triage notes + doctor notes) — debounced save, saved/unsaved indicator, reload recovery
- [ ] Encounter view must display triage vitals/notes inline automatically (no extra navigation for the doctor)
- [ ] Prescription UI: real-time interaction warnings + stock availability as the doctor types (not just on submit)
- [ ] Reception queue view: merged walk-in + scheduled patients, ordered by arrival/check-in time
- [ ] Doctor-facing billing: lightweight read-only bill summary on encounter view

### Confirmed Strategic Positioning
- Public booking system remains a genuine differentiator — comparator has no patient self-service booking
- Compliance & Verification (Module 2) is a real market gap, not just a proposal checkbox — comparator has zero compliance tracking

---

## 5. Suggested Priority Order

1. **Autosave** — cheapest now, most expensive if deferred; informs clinical UI build directly
2. **Triage data model + encounter view composition** — must be settled before building clinical UI
3. **Prescription interaction/stock checks** — scope into pharmacy UI build, not a retrofit
4. **Partial/staged payment model** — confirm against Medicare UK proposal before building billing UI
5. **Reception queue view** — lower complexity, can slot in alongside or after the above

### Still Open / Needs Resolution Before Further Build
- M-PESA vs. Stripe decision
- Telemedicine provider (generic vs. Whereby)
- Further interviews: pharmacy suggestion depth, additional comparator systems (ideally UK-based, given Medicare UK is the client)