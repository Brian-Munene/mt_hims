
# Avocent Backend

Backend for the Avocent Health Centre clinic-first HIMS and telemedicine system, built with Django 5.2.

## Quick Start

For a minimal local setup:

```bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.local.example .env.local
python manage.py generate_keys --path .env.local
export DB_NAME=avocent_healthcare
export DB_USER=avocent
export DB_PASSWORD=
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_URL=redis://127.0.0.1:6379/0
export CELERY_BROKER_URL=$REDIS_URL
export CELERY_RESULT_BACKEND=$REDIS_URL
python manage.py migrate
python manage.py runserver
```

## Current Status

The project currently provides:

- A custom `User` model using email as the login identifier.
- A modular Django app structure split by business domain.
- A shared abstract base model for common multi-tenant and audit-friendly fields.
- Initial database schema and migrations for clinic operations, patient care, bookings, billing, pharmacy, laboratory, telemedicine, and audit logging.
- Field-level encryption for sensitive PHI stored at rest.
- Django admin registration across the major domain apps.
- A DRF API with clinic-scoped RBAC enforcement.
- An operational Booking workflow that carries patients from arrival and triage through consultation, downstream routing, billing, payment, and checkout.
- JWT, DRF token, session, and basic authentication support.
- OpenAPI documentation via Swagger and ReDoc.
- Optional AES-256-GCM API payload encryption for `/api/` JSON traffic.
- Redis-ready cache configuration for telemedicine chat state.
- Celery-ready async workflow hooks for appointment reminders, M-PESA callback processing, and lab result notifications.
- Focused API test coverage for auth, nested workflows, and module routes.

## Project Structure

The backend is organized into the following apps:

- `organization`: Clinic and tenancy foundation.
- `users`: Custom user model, roles, role assignments, and practitioner profiles.
- `patients`: Patient demographics, identifiers, allergies, and chronic conditions.
- `booking`: Patient journey orchestration, queue state, workflow events, and operational reports.
- `encounters`: Appointments and encounters.
- `clinical`: Clinical notes, diagnoses, and observations.
- `billing`: Service catalogue, invoices, and invoice lines.
- `payments`: Payment records including M-PESA-ready fields.
- `pharmacy`: Medications, stock batches, prescriptions, and prescription items.
- `laboratory`: Lab catalogue, lab orders, order items, and results.
- `telemedicine`: Telemedicine sessions and chatbot session state.
- `audit`: Immutable audit log entries.
- `core`: Shared abstract base model with common fields.

## Shared Model Rules

Most domain models inherit from `core.CoreModel`, which provides:

- `id` as a UUID primary key
- `clinic` foreign key for future multi-tenancy
- `created_at`
- `updated_at`
- `created_by`
- `is_active`
- `metadata`

## Key Implementation Details

- Django version: `5.2.12`
- Python version currently in use: `3.12.2`
- Default time zone: `Africa/Nairobi`
- Custom auth model: `users.User`
- Audit log entries are append-only at the model layer and reject updates and deletes.
- DRF schema generation is powered by `drf-spectacular`.
- JWT authentication is powered by `djangorestframework-simplejwt`.
- API filtering uses `django-filter`.
- API payload encryption uses AES-256-GCM via `cryptography`.
- PHI field encryption is handled with custom encrypted model fields.
- Bookings can auto-generate draft billing from consultation, laboratory, and medication activity while keeping invoice lines editable.
- Redis-backed cache support is environment-driven via `REDIS_URL`.
- Celery worker/bootstrap files are included and use Redis when broker/backend URLs are configured.
- Gunicorn is used for containerized app serving.

## Database Configuration

Database configuration is environment-driven in [`avocent_backend/settings.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/avocent_backend/settings.py).

Current behavior:

- Default database engine: PostgreSQL
- Default database name: `avocent_healthcare`
- SQLite fallback is no longer supported

Supported environment variables:

- `DB_ENGINE`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

Additional API/auth environment variables:

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `API_ENCRYPTION_ENABLED`
- `API_ENCRYPTION_ENFORCE`
- `API_ENCRYPTION_KEY`
- `FIELD_ENCRYPTION_KEY`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `CELERY_TASK_ALWAYS_EAGER`
- `CELERY_TASK_EAGER_PROPAGATES`
- `TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT`
- `APPOINTMENT_REMINDER_LEAD_MINUTES`
- `BOOKING_AUTO_INVOICE_ON_ROUTE_TO_BILLING` (currently implemented as the default workflow behavior)

## Local Environment Example

Example development configuration:

```bash
export SECRET_KEY=django-insecure-change-me
export DEBUG=true
export ALLOWED_HOSTS=localhost,127.0.0.1
export DB_NAME=avocent_healthcare
export DB_USER=brianmunene
export DB_PASSWORD=""
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_URL=redis://127.0.0.1:6379/0
export CELERY_BROKER_URL=$REDIS_URL
export CELERY_RESULT_BACKEND=$REDIS_URL
export CELERY_TASK_ALWAYS_EAGER=true
export CELERY_TASK_EAGER_PROPAGATES=true
export TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT=43200
export APPOINTMENT_REMINDER_LEAD_MINUTES=1440
export API_ENCRYPTION_ENABLED=false
export API_ENCRYPTION_ENFORCE=false
export API_ENCRYPTION_KEY=
export FIELD_ENCRYPTION_KEY=
```

## Redis And Celery

The backend now includes production-oriented Redis and Celery foundations:

- `telemedicine.services` caches chat session state in Django cache, which becomes Redis-backed when `REDIS_URL` is set.
- `encounters.services.schedule_appointment_reminder` queues appointment reminder tasks.
- `payments.tasks.process_mpesa_callback` processes stored M-PESA callback payloads asynchronously.
- `laboratory.services.queue_lab_result_notification` queues lab result notification work.

Runtime behavior:

- If `REDIS_URL` is not set, Django falls back to local in-memory cache.
- PostgreSQL remains the only supported relational database backend.
- Install the dependencies from [requirements.txt](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/requirements.txt) before running Django, Celery, or Docker builds.
- For production, run a real Celery worker and beat process against Redis.

Example environment:

```bash
export REDIS_URL=redis://127.0.0.1:6379/0
export CELERY_BROKER_URL=$REDIS_URL
export CELERY_RESULT_BACKEND=$REDIS_URL
export TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT=43200
export APPOINTMENT_REMINDER_LEAD_MINUTES=1440
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run a Celery worker:

```bash
celery -A avocent_backend worker -l info
```

For local synchronous task execution during development or tests:

```bash
export CELERY_TASK_ALWAYS_EAGER=true
```

## Local Setup

Create and use the existing virtual environment:

```bash
source .venv/bin/activate
```

Create a local env file from the template:

```bash
cp .env.local.example .env.local
python manage.py generate_keys --path .env.local
```

Set your PostgreSQL and Redis environment before running the app, or place the same values in `.env.local`:

```bash
export DB_NAME=avocent_healthcare
export DB_USER=brianmunene
export DB_PASSWORD=""
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_URL=redis://127.0.0.1:6379/0
export CELERY_BROKER_URL=$REDIS_URL
export CELERY_RESULT_BACKEND=$REDIS_URL
```

Rotate existing key values explicitly if needed:

```bash
python manage.py generate_keys --force
```

Run the development server:

```bash
python manage.py runserver
```

Run migrations:

```bash
python manage.py migrate
```

Run Django system checks:

```bash
python manage.py check
```

Run targeted async/cache tests:

```bash
python manage.py test encounters.tests.test_services payments.tests.test_services laboratory.tests.test_services telemedicine.tests.test_services
```

## Runtime Processes

Run the Django API:

```bash
python manage.py runserver
```

Run a Celery worker:

```bash
celery -A avocent_backend worker -l info
```

Run Celery Beat for scheduled work:

```bash
celery -A avocent_backend beat -l info
```

Redis is required for production broker/result-backend usage. For local development, cache and task execution can still fall back to non-Redis behavior when Redis is not configured.

## Docker

Docker assets now live under [`docker/`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker).

Files:

- [docker/Dockerfile](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/Dockerfile)
- [docker/compose.yml](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/compose.yml)
- [docker/compose.local.yml](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/compose.local.yml)
- [docker/compose.staging.yml](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/compose.staging.yml)
- [docker/compose.prod.yml](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/compose.prod.yml)
- [docker/entrypoint-web.sh](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/entrypoint-web.sh)
- [docker/entrypoint-worker.sh](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/entrypoint-worker.sh)
- [docker/entrypoint-beat.sh](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/docker/entrypoint-beat.sh)
- [.env.local.example](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/.env.local.example)
- [.env.staging.example](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/.env.staging.example)
- [.env.prod.example](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/.env.prod.example)

Local setup uses passwordless Postgres inside Docker via `POSTGRES_HOST_AUTH_METHOD=trust`.
Staging uses a normal password-protected PostgreSQL container.
Production uses a normal password-protected PostgreSQL container.

Prepare your local env file:

```bash
cp .env.local.example .env.local
python manage.py generate_keys --path .env.local
```

Start the local stack:

```bash
docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --build
```

Start the local stack in watch mode:

```bash
docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --watch
```

Run in the background:

```bash
docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --build -d
```

Prepare your staging env file:

```bash
cp .env.staging.example .env.staging
python manage.py generate_keys --path .env.staging
```

Start staging:

```bash
docker compose --env-file .env.staging -f docker/compose.yml -f docker/compose.staging.yml up --build -d
```

Prepare your production env file:

```bash
cp .env.prod.example .env.prod
python manage.py generate_keys --path .env.prod
```

Start production-style Compose:

```bash
docker compose --env-file .env.prod -f docker/compose.yml -f docker/compose.prod.yml up --build -d
```

## Testing

Run the full suite:

```bash
python manage.py test
```

Run tests by layer:

```bash
python manage.py test users.tests
python manage.py test patients.tests
python manage.py test encounters.tests
python manage.py test clinical.tests
python manage.py test billing.tests
python manage.py test pharmacy.tests
python manage.py test laboratory.tests
python manage.py test telemedicine.tests
```

Run focused suites:

```bash
python manage.py test users.tests.test_serializers
python manage.py test encounters.tests.test_services
python manage.py test billing.tests.test_view
python manage.py test core.tests.test_management_commands
```

## API Surface

Current API capabilities include:

- User, role, practitioner, and current-user endpoints
  - `POST /api/auth/practitioners/` supports unified onboarding, accepting nested `user_data` and `assign_roles` to create the User, Profile, and Role assignment in a single transactional request.
- Patient registration and patient support records
- Booking lifecycle, queue board, workflow events, and booking reports
- Appointments and encounters
- Clinical notes, diagnoses, and observations
- Billing, invoice lines, and payments
- Pharmacy, laboratory, and telemedicine modules
- Nested flows such as:
  - `patient -> encounters`
  - `patient -> notes`
  - `encounter -> diagnoses`
  - `encounter -> observations`
  - `encounter -> prescriptions`
  - `encounter -> lab orders`

Authentication endpoints:

- DRF token auth: `/api/auth/login/`, `/api/auth/logout/`
- JWT auth: `/api/auth/jwt/token/`, `/api/auth/jwt/refresh/`, `/api/auth/jwt/verify/`
- Current user: `/api/auth/me/`

API documentation endpoints:

- OpenAPI schema: `/api/schema/`
- Swagger UI: `/api/docs/swagger/`
- ReDoc: `/api/docs/redoc/`

API module prefixes:

- `/api/auth/`
- `/api/patients/`
- `/api/booking/`
- `/api/encounters/`
- `/api/clinical/`
- `/api/billing/`
- `/api/pharmacy/`
- `/api/laboratory/`
- `/api/telemedicine/`

Booking workflow highlights:

- `POST /api/booking/bookings/` creates walk-in, scheduled, or telemedicine bookings
- `POST /api/booking/bookings/{id}/check-in/` starts the front-desk workflow
- `POST /api/booking/bookings/{id}/start-triage/` and `complete-triage/` move patients through triage
- `POST /api/booking/bookings/{id}/start-consultation/` opens the clinical encounter
- `POST /api/booking/bookings/{id}/route-to-lab/`, `route-to-pharmacy/`, and `route-to-billing/` move the patient between stations
- `POST /api/booking/bookings/{id}/generate-invoice/` generates or refreshes editable invoice lines from consultation, lab, and medication activity
- `POST /api/booking/bookings/{id}/checkout/` only succeeds once payment state is `paid`
- `GET /api/booking/bookings/queue-board/` and `GET /api/booking/bookings/reports/summary/` support operations monitoring

## Encrypted API Usage

The backend supports optional AES-256-GCM encryption for `/api/` JSON requests and responses.

Notes:

- This is application-layer payload encryption. It complements HTTPS and does not replace TLS.
- Encryption is disabled by default.
- When enabled, clients can send encrypted JSON by setting `X-Encrypted-Payload: 1`.
- If `API_ENCRYPTION_ENFORCE=true`, plaintext JSON write requests to `/api/` are rejected.
- Docs and schema endpoints are excluded from encryption so Swagger/ReDoc remain usable.

### 1. Generate an encryption key

`API_ENCRYPTION_KEY` must be base64-encoded and decode to exactly 32 bytes.

Example:

```bash
python - <<'PY'
import base64, os
print(base64.b64encode(os.urandom(32)).decode())
PY
```

Then export:

```bash
export API_ENCRYPTION_ENABLED=true
export API_ENCRYPTION_KEY="<base64-32-byte-key>"
```

Optional strict mode:

```bash
export API_ENCRYPTION_ENFORCE=true
```

### 2. Encrypted request format

Clients encrypt the raw JSON request body with AES-256-GCM and send this envelope:

```json
{
  "alg": "AES-256-GCM",
  "nonce": "<base64-nonce>",
  "ciphertext": "<base64-ciphertext-and-tag>"
}
```

Required request header:

```http
X-Encrypted-Payload: 1
Content-Type: application/json
```

Example encrypted login request envelope:

```json
{
  "alg": "AES-256-GCM",
  "nonce": "7SJ4g1l3v0vC8iQp",
  "ciphertext": "R7VQxg2pWmM0lJx6Jf8mJ1zQh6o5nYl3u7n+u0jG5IYc1k4="
}
```

The plaintext before encryption would be:

```json
{
  "username": "doctor@example.com",
  "password": "secret123"
}
```

### 3. Encrypted response format

When the request includes `X-Encrypted-Payload: 1`, JSON API responses are returned in the same encrypted envelope format:

```json
{
  "alg": "AES-256-GCM",
  "nonce": "<base64-nonce>",
  "ciphertext": "<base64-ciphertext-and-tag>"
}
```

Response headers:

```http
X-Encrypted-Payload: 1
X-Encryption-Alg: AES-256-GCM
```

After decryption, a login response might look like:

```json
{
  "token": "0d7c...",
  "user": {
    "id": "user-uuid",
    "clinic": "clinic-uuid",
    "email": "doctor@example.com",
    "phone": "+254700000000",
    "is_staff": true,
    "is_active": true,
    "is_superuser": false,
    "role_names": ["Doctor"]
  }
}
```

### 4. Associated data

Current middleware behavior:

- Request decryption uses the request path as AES-GCM associated data.
- Response encryption uses `response` as associated data.

Clients must mirror that behavior exactly when encrypting/decrypting payloads.

## Schema Coverage

The current schema includes:

- Clinic and tenancy setup
- Users and RBAC
- Patient management
- Appointments and encounters
- Clinical documentation
- Billing and invoicing
- Payments
- Pharmacy and inventory
- Laboratory workflows
- Telemedicine session tracking
- Audit and compliance logging

## Open Gaps

The project still has meaningful work remaining in these areas:

- Public or mobile client SDKs for the encrypted API transport
- A real M-PESA webhook endpoint that feeds payment callback processing automatically
- Richer pricing rules for practitioner-specific consultation fees and service bundles during automatic invoice generation
- External notification adapters for SMS, email, or WhatsApp instead of task payload stubs
- Container deployment hardening beyond the current Compose-based setup
- Celery Beat schedules for recurring reminders and follow-up workflows
- Full end-to-end workflow coverage across all API modules
- Stronger service-layer orchestration beyond serializer and viewset validation

## Entry Points

- Django settings: [`avocent_backend/settings.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/avocent_backend/settings.py)
- URL configuration: [`avocent_backend/urls.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/avocent_backend/urls.py)
- Management script: [`manage.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/manage.py)
- API encryption middleware: [`core/middleware.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/core/middleware.py)
- API encryption helpers: [`core/encryption.py`](/Users/brianmunene/Desktop/Avocent%20Health%20Centre/avocent-backend/core/encryption.py)

