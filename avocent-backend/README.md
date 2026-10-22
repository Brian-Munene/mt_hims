# Avocent Backend

Django 5.2 backend for the Avocent Health Centre clinic-first HIMS and telemedicine system. Pairs with the Next.js frontend in [`../avocent-frontend`](../avocent-frontend); the Docker setup below runs both.

## Quick Start

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.local.example .env.local
python manage.py generate_keys --path .env.local
# edit .env.local for your local Postgres/Redis, then load it into the shell:
set -a && source .env.local && set +a
python manage.py migrate
python manage.py createsuperuser   # needed to sign in to the frontend/admin
python manage.py runserver
```

The API is served at `http://localhost:8000`, with interactive docs at `/api/docs/swagger/`. Full variable list/defaults: [.env.local.example](.env.local.example).

## Tests & coverage

```bash
pip install -r requirements-dev.txt   # adds coverage on top of requirements.txt
coverage run manage.py test
coverage report                       # per-file table in the terminal
coverage html && open htmlcov/index.html   # browsable line-by-line report
```

`.coveragerc` excludes migrations, `tests/` modules, and management/deploy scaffolding (`manage.py`, `asgi.py`, `wsgi.py`, `celery.py`), so the percentage reflects application code, not boilerplate. As of the last coverage run: **81.5% overall** (151 tests at the time; the suite is now 177). The weakest spots are `compliance/tasks.py` and `core/management/commands/encrypt_phi_data.py` (both 0% — no test exercises them), and `patients/views.py`/`billing/views.py` in the 50-60% range.

## Docker

Assets live under [`docker/`](docker/). Each environment has its own env file and compose override:

| Environment | Prepare | Run |
|---|---|---|
| Local | `cp .env.local.example .env.local && python manage.py generate_keys --path .env.local` | `docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --build` |
| Staging | `cp .env.staging.example .env.staging && python manage.py generate_keys --path .env.staging` | `docker compose --env-file .env.staging -f docker/compose.yml -f docker/compose.staging.yml up --build -d` |
| Prod | `cp .env.prod.example .env.prod && python manage.py generate_keys --path .env.prod` | `docker compose --env-file .env.prod -f docker/compose.yml -f docker/compose.prod.yml up --build -d` |

- Local Postgres runs passwordless (`POSTGRES_HOST_AUTH_METHOD=trust`); staging/prod require a real password.
- Staging/prod also run a `caddy` service in front of `web`/`frontend` for automatic TLS (Let's Encrypt via `API_DOMAIN`/`APP_DOMAIN`).
- `entrypoint-web.sh` runs migrations + `collectstatic` (served by whitenoise) before starting gunicorn, so the Django admin and Swagger/ReDoc UI have working static assets with `DEBUG=false`.
- Add `--watch` instead of `--build` for local file-sync dev mode.
- `ALLOWED_HOSTS` must include the internal service name `web` (not just public domains) — the frontend container reaches Django as `http://web:8000`, and Django rejects the request otherwise.

## Kubernetes (Helm)

A Helm chart for the full stack (web, frontend, worker, beat, optional in-cluster Postgres/Redis, optional ingress) lives at [`../deploy/helm/avocent`](../deploy/helm/avocent). One release = one clinic stack; per-environment/per-clinic knobs go in a values file (see [`../deploy/helm/values-local.yaml`](../deploy/helm/values-local.yaml) for a local smoke-test example — dev credentials only).

```bash
# Build images, load them into the local (kind-based) Docker Desktop cluster, install:
docker build -f avocent-backend/docker/Dockerfile -t avocent-backend:helm avocent-backend
docker build -t avocent-frontend:helm avocent-frontend
docker save avocent-backend:helm | docker exec -i desktop-control-plane ctr --namespace k8s.io images import -
docker save avocent-frontend:helm | docker exec -i desktop-control-plane ctr --namespace k8s.io images import -
helm install avocent-local deploy/helm/avocent -n avocent --create-namespace -f deploy/helm/values-local.yaml
```

The release's NOTES print port-forward commands and the `createsuperuser` bootstrap step. `beat` is pinned to 1 replica (Recreate strategy) so scheduled tasks never double-fire. Migrations run in a Helm hook Job (`post-install,pre-upgrade`) so they never race across web replicas. For real deployments, prefer an external/managed Postgres (`postgres.internal: false` + `postgres.host`) and enable `ingress` with cert-manager.

Values for managed clouds:

| Value | Purpose |
|---|---|
| `serviceAccount.create` / `.name` / `.annotations` | ServiceAccount the Django pods run as. On GKE, annotate it with `iam.gke.io/gcp-service-account` for Workload Identity (no key files). |
| `redis.caCert` | PEM of the external Redis server's CA. It's mounted at `/etc/redis-ca/ca.pem` and sets `REDIS_SSL_CA_CERTS`. |
| `storage.gcsBucket` | GCS bucket for uploaded media. It sets `GS_BUCKET_NAME`. |

### GCP (GKE) staging and production

Staging and production target GKE in `africa-south1`. Each environment has its own GCP project, private-IP Cloud SQL Postgres 16 and Memorystore Redis (AUTH + TLS), and a private media bucket. The infrastructure is defined in Terraform at [`../infra/terraform`](../infra/terraform). Its README is the runbook, with apply order, cost estimates and the GitHub variables to set. The overlays are [`values-staging.yaml`](../deploy/helm/avocent/values-staging.yaml) and [`values-prod.yaml`](../deploy/helm/avocent/values-prod.yaml).

CI/CD (`.github/workflows/`):
- `build-and-push.yml`: every push builds both images and tags them with the git SHA in Artifact Registry.
- `deploy-staging.yml`: deploys staging after a successful build on `main`.
- `deploy-production.yml`: deploys production on a `v*` tag, after a reviewer approves.
- All three authenticate with Workload Identity Federation, so GitHub stores no keys.
- Secrets come from Secret Manager at deploy time and are never committed.

The project moved from Azure AKS in October 2026 ([`../infra/GCP_MIGRATION.md`](../infra/GCP_MIGRATION.md)). The Azure code is preserved at the git tag `azure-final`.

## Stack & Structure

- Django 5.2.12, Python 3.12, PostgreSQL only (no SQLite fallback), Redis for cache + Celery broker.
- Custom `users.User` (email login) with roles: Admin, Doctor, Nurse, Lab Technician, Pharmacist, Receptionist, Accountant.
- Most models inherit `core.CoreModel`: UUID pk, `clinic` FK, `created_at`/`updated_at`/`created_by`, `is_active`, `metadata`.
- Auth: JWT (`djangorestframework-simplejwt`), DRF token, session, self-service email password reset, and optional TOTP two-factor authentication (`pyotp`). When 2FA is on, login returns a challenge that `jwt/token/2fa/` completes.
- API docs via `drf-spectacular` (Swagger/ReDoc); filtering via `django-filter`.
- Optional AES-256-GCM payload encryption for `/api/` traffic (below) plus field-level PHI encryption at rest.
- Celery + Redis power appointment reminders, M-PESA callback processing, lab result notifications, and hourly compliance auto-flagging (Beat) — all require `REDIS_URL` to actually fire; without it, scheduling is skipped rather than silently dropped.
- Email notifications via SMTP (reminders, lab results, password reset) with a delivery log in the admin — inert until `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` are set.
- Uploaded media (patient documents, signatures, practitioner photos):
  - With `GS_BUCKET_NAME` set, files go to a private GCS bucket through `django-storages`. They're served as signed URLs that expire after 15 minutes, signed via IAM signBlob under Workload Identity. Same-named uploads get unique names and never overwrite each other.
  - Without it, files use local `FileSystemStorage`. That's fine for dev and tests, but files are lost on a pod restart.
- Redis TLS against a server with a private CA (e.g. Memorystore): `REDIS_SSL_CA_CERTS` configures the Django cache, the Celery broker and the result backend together. The CA is pinned and hostname checks are off, because clients connect by IP.

Apps:

| App | Purpose |
|---|---|
| `organization` | Clinic/tenancy foundation |
| `users` | Auth, roles, practitioner profiles, departments |
| `patients` | Demographics, identifiers, allergies, chronic conditions |
| `booking` | Patient journey orchestration, queue, workflow events |
| `encounters` | Appointments & encounters |
| `clinical` | Notes, diagnoses, observations |
| `billing` | Services, invoices, invoice lines |
| `payments` | Payment records (M-PESA-ready) |
| `pharmacy` | Medications, stock, prescriptions |
| `laboratory` | Lab catalogue, orders, results |
| `telemedicine` | Sessions, chatbot state |
| `compliance` | Auto-flagging, policies, policy versions |
| `notifications` | In-app notifications, email templates, email log |
| `audit` | Immutable audit log |
| `core` | Shared base model |

## Environment Variables

| Category | Variables |
|---|---|
| Django core | `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` |
| Database | `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_SSLMODE` (`require` for Cloud SQL) |
| Media storage | `GS_BUCKET_NAME` (unset = local filesystem) |
| Redis/Celery | `REDIS_URL`, `REDIS_SSL_CA_CERTS`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CELERY_TASK_ALWAYS_EAGER`, `CELERY_TASK_EAGER_PROPAGATES`, `TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT`, `APPOINTMENT_REMINDER_LEAD_MINUTES` |
| Email | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, `FRONTEND_URL`, `PASSWORD_RESET_TIMEOUT` |
| API/field encryption | `API_ENCRYPTION_ENABLED`, `API_ENCRYPTION_ENFORCE`, `API_ENCRYPTION_KEY`, `FIELD_ENCRYPTION_KEY` |
| TLS/reverse proxy (staging/prod) | `API_DOMAIN`, `APP_DOMAIN`, `ACME_EMAIL`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`, `CSRF_TRUSTED_ORIGINS` |

Full defaults: [.env.local.example](.env.local.example).

## Testing

```bash
python manage.py test                                 # full suite
python manage.py test users.tests                      # one app
python manage.py test users.tests.test_serializers     # one module
```

## API Surface

- Auth — `/api/auth/`: login, logout, JWT (+ `jwt/token/2fa/` verify step), password reset, 2FA `2fa/setup|enable|disable/`, users/roles/departments/practitioners (`POST /api/auth/practitioners/` supports unified onboarding: user + profile + role in one request)
- `/api/patients/` (+ `export-csv`/`import-csv`), `/api/booking/`, `/api/encounters/`, `/api/clinical/`
- `/api/billing/` (+ `/report/` for revenue breakdowns), `/api/pharmacy/`, `/api/laboratory/`, `/api/telemedicine/`
- `/api/organization/`, `/api/compliance/`, `/api/notifications/` (+ email log), `/api/audit/`
- Docs — `/api/schema/`, `/api/docs/swagger/`, `/api/docs/redoc/`
- Nested flows — `patient -> encounters/notes`, `encounter -> diagnoses/observations/prescriptions/lab-orders`
- Booking lifecycle — check-in → triage → consultation → route-to-lab/pharmacy/billing → generate-invoice → checkout, plus `queue-board`/`reports/summary` for ops monitoring

## Encrypted API Payloads (optional)

AES-256-GCM encryption for `/api/` JSON, on top of (not instead of) TLS. Disabled by default.

- Enable with `API_ENCRYPTION_ENABLED=true` + a base64, 32-byte `API_ENCRYPTION_KEY`; enforce with `API_ENCRYPTION_ENFORCE=true` (rejects plaintext writes).
- Client sends header `X-Encrypted-Payload: 1` and body `{"alg": "AES-256-GCM", "nonce": "...", "ciphertext": "..."}`; the response comes back in the same envelope.
- Associated data: request decryption uses the request path, response encryption uses the literal string `"response"` — clients must mirror this.
- Docs/schema endpoints are always excluded.

Implementation: [core/middleware.py](core/middleware.py), [core/encryption.py](core/encryption.py).

## Open Gaps

- Public/mobile SDKs for the encrypted API transport
- A real M-PESA webhook (currently processes stored callback payloads, not a live inbound endpoint)
- Richer per-practitioner pricing rules for auto-generated invoices
- SMS/WhatsApp notifications (email is implemented; these are still stubs)
- Doctor compliance documents, video consultations (Whereby), public booking portal
- Multi-clinic/multi-tenancy (schema supports it via `clinic` FK; platform is single-tenant today)
- GKE staging/production: the Terraform, Helm and CI code is written but not yet applied (see [`../infra/terraform`](../infra/terraform))
- Error monitoring (e.g. Sentry). Cloud SQL automated backups and PITR are configured in Terraform, and will be active once it's applied.
- Full end-to-end workflow test coverage; deeper service-layer orchestration
