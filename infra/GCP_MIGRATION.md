# Azure → GCP migration plan

Moves Avocent's two Kubernetes environments (staging, production) from Azure (AKS, South Africa
North) to Google Cloud (GKE, `africa-south1` / Johannesburg). Same country, so the data-residency
position doesn't change.

**What changes:** `infra/terraform/` (fully rewritten), the three deploy workflows in
`.github/workflows/`, and the image/host values in `deploy/helm/avocent/values-{staging,prod}.yaml`.
**What doesn't change:** the Helm chart templates, cert-manager + `ClusterIssuer`s, ingress-nginx,
Dockerfiles, and the Django/Next.js code (apart from the optional media-storage fix in Step 6).

## Status (2026-10-22)

| Step | State |
|---|---|
| 0 Decisions | ✅ Recorded below |
| 2 GCP setup | ✅ Automated in `infra/terraform/bootstrap` (projects `avocent-hims-staging` / `avocent-hims-prod`, billing `0172CC-2CEBBF-97A92F`). Run it yourself. |
| 3 Terraform | ✅ Written and validated (`fmt` + `validate`, all three roots). **Not applied yet.** |
| 4 GitHub Actions | ✅ Switched to Workload Identity Federation (actionlint clean) |
| 5 Helm values | ✅ Artifact Registry images, ServiceAccount, Redis CA mount. IP placeholders are filled from `terraform output`. |
| 6 Media → GCS | ✅ `django-storages[google]`, signed URLs, no overwrites |
| 7 Data migration | ⏭️ Skipped (no data) |
| 8–9 Launch, decommission Azure | ⏳ After `terraform apply` |

**Runbook:** `infra/terraform/README.md`, which includes a rough cost table. Staging is about
$220/month and production about $900/month, so apply staging only until production is needed.

---

## 0. Decisions (recorded 2026-10-22)

| # | Decision | Outcome | What it means for this plan |
|---|---|---|---|
| 1 | Leave Azure for GCP | **Approved** by the client. `spec/plan.md` updated. | The JD's "Azure preferred" is overridden. `/direction` should no longer flag GCP. |
| 2 | Real patient data on Azure? | **No.** The Azure account had problems and never held production data. | **Skip Step 7.** Terraform generates fresh `SECRET_KEY` / `FIELD_ENCRYPTION_KEY` / `API_ENCRYPTION_KEY` with `random_*`, as it does today. No Key Vault copy, no rollback to Azure. |
| 3 | Real domain | **Later.** Launch on `*.<GCP-ingress-IP>.nip.io`. | Once the domain is registered, follow "Switching to the real domain" in Step 8. |
| 4 | GKE mode | **Standard** | Fixed node pools, sized as in Step 1. |
| 5 | Redis in-transit TLS | **On** | Mount the Memorystore CA in the pods (Step 5). |
| 6 | Uploaded files | **Move to GCS** (default, not objected to) | Do Step 6 as part of the migration. |

> ⚠️ **Once GCP holds real data, `FIELD_ENCRYPTION_KEY` can never be regenerated.** PHI columns
> (`core/fields.py`) are encrypted with it. Keep `random_id.field_encryption_key` out of any
> `terraform taint`/`-replace`, and back up the Secret Manager value somewhere offline.

---

## 1. Service mapping

| Azure (today) | GCP (target) | Notes |
|---|---|---|
| AKS (`modules/aks`) | GKE Standard, regional, private nodes | Turn on Workload Identity. Use the `REGULAR` release channel. |
| VNet + subnet (`modules/network`) | VPC + subnet with secondary ranges for pods/services, plus Cloud Router + Cloud NAT | NAT gives private nodes outbound access (Let's Encrypt, SMTP, M-Pesa later). |
| AKS LB egress IP + DB/Redis firewall rules | **Private IP** via Private Service Access | An improvement: Postgres and Redis are no longer on the public internet. This closes a "known v1 gap" listed in the Terraform README. |
| PostgreSQL Flexible Server 16 (`modules/postgres`) | Cloud SQL for PostgreSQL 16 | Prod: `availability_type = REGIONAL`, PITR on, 35 backups kept. Staging: `db-g1-small`/`db-custom-1-3840`, zonal. |
| Azure Cache for Redis (`modules/redis`) | Memorystore for Redis | Prod: `STANDARD_HA`. Staging: `BASIC`. Turn on AUTH and in-transit encryption. |
| ACR (`modules/acr`) | Artifact Registry (Docker repo in `africa-south1`) | One shared repo, images tagged by git SHA (same as today). |
| Key Vault (`modules/keyvault`) | Secret Manager | Same secret names: `SECRET_KEY`, `DB_PASSWORD`, `FIELD_ENCRYPTION_KEY`, `API_ENCRYPTION_KEY`, `REDIS_URL`, `EMAIL_HOST_PASSWORD`. |
| Entra ID app + federated credential (`modules/github-oidc`) | Workload Identity Federation pool + provider, plus one service account per environment | Still no stored credentials in GitHub. |
| tfstate storage account (`bootstrap/`) | GCS bucket (versioning on, uniform access) | `backend "gcs"` |
| Static public IP for ingress (`modules/ingress`) | `google_compute_address` (regional, external) | Same ingress-nginx/cert-manager `helm_release`. Drop the `azure-load-balancer-resource-group` annotation. |
| Azure RBAC for AKS | IAM `roles/container.developer` + Kubernetes RBAC | |

**Sizing equivalents:** prod nodes `Standard_D4s_v5` ×3 → `n2-standard-4` ×3 (one per zone).
Staging `Standard_D2s_v5` ×2 → `e2-standard-2` ×2. Prod Postgres `GP_Standard_D2s_v3` →
`db-custom-2-8192`.

---

## 2. GCP account setup

Automated: `infra/terraform/bootstrap` creates both projects, links billing account
`0172CC-2CEBBF-97A92F`, turns on every API, and creates the state bucket. The only manual
prerequisite, `gcloud auth application-default login`, is done.

- **Budget alert:** not set (test project, no budget yet). Read the cost table in
  `infra/terraform/README.md` before applying, and destroy staging when it's not in use.
- Accept the Google Cloud **Data Processing Addendum** in the console, and record GCP as a
  processor in the compliance docs (Kenya DPA 2019 / ODPC registration).
- Confirm that Cloud SQL, Memorystore and GKE are all offered in `africa-south1` for the tiers you
  picked. If any isn't, fall back to `europe-west1` for that service and record the cross-border
  transfer.

---

## 3. Rewrite Terraform (`infra/terraform/`)

Keep the existing layout (`bootstrap/`, `environments/{staging,production}/`, `modules/*`) and
replace each module's contents:

| Module | New resources |
|---|---|
| `bootstrap/` | `google_storage_bucket` (`avocent-tfstate`, versioning, `uniform_bucket_level_access`) |
| `modules/network` | `google_compute_network`, `google_compute_subnetwork` (+ `secondary_ip_range` for pods/services), `google_compute_router`, `google_compute_router_nat`, `google_compute_global_address` + `google_service_networking_connection` (private service access for Cloud SQL/Memorystore) |
| `modules/aks` → `modules/gke` | `google_container_cluster` (`private_cluster_config.enable_private_nodes`, `workload_identity_config`, `remove_default_node_pool`), `google_container_node_pool`, a dedicated node service account with `roles/artifactregistry.reader` |
| `modules/acr` → `modules/artifact-registry` | `google_artifact_registry_repository` (`format = "DOCKER"`). Lives in the staging root like today, and prod reads it through `terraform_remote_state` (backend `gcs`). |
| `modules/postgres` → `modules/cloudsql` | `google_sql_database_instance` (`ipv4_enabled = false`, `private_network`, `ssl_mode = "ENCRYPTED_ONLY"`, `deletion_protection = true`), `google_sql_database`, `google_sql_user` |
| `modules/redis` → `modules/memorystore` | `google_redis_instance` (`connect_mode = "PRIVATE_SERVICE_ACCESS"`, `auth_enabled = true`, `transit_encryption_mode = "SERVER_AUTHENTICATION"`) |
| `modules/keyvault` → `modules/secrets` | `google_secret_manager_secret` + `google_secret_manager_secret_version` per key, `google_secret_manager_secret_iam_member` (`roles/secretmanager.secretAccessor`) for the deploy SA |
| `modules/github-oidc` | `google_iam_workload_identity_pool`, `google_iam_workload_identity_pool_provider` (issuer `https://token.actions.githubusercontent.com`, `attribute_condition = "assertion.repository == 'Brian-Munene/mt_hims'"`), `google_service_account`, and a `roles/iam.workloadIdentityUser` binding on `principal://…/subject/repo:Brian-Munene/mt_hims:environment:<env>`. Deploy SA roles: `container.developer`, `artifactregistry.writer`, `secretmanager.secretAccessor` (scoped to that env's secrets). |
| `modules/ingress` | Add `google_compute_address` (regional). Keep both `helm_release`s, set `controller.service.loadBalancerIP`, and remove the Azure annotation. |

Provider/backend changes in each `environments/*/versions.tf` + `backend.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket = "avocent-tfstate"
    prefix = "production"          # or "staging"
  }
  required_providers {
    google     = { source = "hashicorp/google",     version = "~> 6.0" } # pin to the current major
    random     = { source = "hashicorp/random",     version = "~> 3.6" }
    helm       = { source = "hashicorp/helm",       version = "~> 2.15" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.32" }
  }
}

provider "google" {
  project = var.project_id
  region  = "africa-south1"
}

data "google_client_config" "current" {}

provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
}
# helm provider: same three fields inside its kubernetes {} block
```

The two-step first apply (`-target=module.gke`, then a full apply) is still needed for the same
reason it is today: the kubernetes and helm providers read the cluster's outputs.

**Secrets:** no data is coming from Azure (Decision 2), so keep the current pattern:
`random_password`/`random_id` in each environment root, written into Secret Manager.
`EMAIL_HOST_PASSWORD` starts empty, and you fill it in by hand once an SMTP provider is chosen:

```bash
printf '%s' "<smtp-password>" | gcloud secrets versions add EMAIL_HOST_PASSWORD --project <prod-project> --data-file=-
```

**Apply order:** `bootstrap` → `environments/staging` → validate staging end-to-end →
`environments/production`.

---

## 4. Update GitHub Actions

Replace the Azure steps in all three workflows. Every other step stays the same.

| Azure step | GCP replacement |
|---|---|
| `azure/login@v2` | `google-github-actions/auth@v2` with `workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}`, `service_account: ${{ vars.GCP_DEPLOY_SA }}` |
| `azure/setup-kubectl` / `setup-helm` | `google-github-actions/setup-gcloud@v2` (+ `azure/setup-helm@v4` still works fine, or `gcloud components install kubectl`) |
| `az acr login` | `gcloud auth configure-docker africa-south1-docker.pkg.dev --quiet` |
| `az aks get-credentials` | `google-github-actions/get-gke-credentials@v2` with `cluster_name`, `location: africa-south1` |
| `az keyvault secret show --vault-name … --name X` | `gcloud secrets versions access latest --secret=X --project=${{ vars.GCP_PROJECT_ID }}` |
| `ACR_LOGIN_SERVER` | `IMAGE_REPO` = `africa-south1-docker.pkg.dev/<staging-project>/avocent` |

- **`build-and-push.yml`** runs on every branch with no environment, so it needs its own
  WIF binding (subject `attribute.repository/Brian-Munene/mt_hims`) to a build-only SA that has
  just `roles/artifactregistry.writer`.
- **New GitHub environment variables** (staging and production): `GCP_PROJECT_ID`,
  `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`, `GKE_CLUSTER_NAME`, `IMAGE_REPO`. Remove the `AZURE_*`,
  `AKS_*`, `KEY_VAULT_NAME` and `ACR_LOGIN_SERVER` variables after cutover.
- Keep the existing **required reviewers** on the `production` environment.

---

## 5. Update Helm values

Only `values-staging.yaml` and `values-prod.yaml` change:

```yaml
image:
  backend:
    repository: africa-south1-docker.pkg.dev/avocent-staging/avocent/avocent-backend
  frontend:
    repository: africa-south1-docker.pkg.dev/avocent-staging/avocent/avocent-frontend

postgres:
  host: "10.x.x.x"      # Cloud SQL private IP (terraform output)
  sslMode: require

# REDIS_URL from Secret Manager becomes:
#   rediss://:<AUTH>@<memorystore-ip>:6378/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/redis-ca/ca.pem
```

- **Memorystore TLS uses a Google-managed CA**, so the server CA cert
  (`google_redis_instance.server_ca_certs`) has to be mounted into web/worker/beat pods. That
  means a small chart addition: a ConfigMap plus a volumeMount at `/etc/redis-ca`. If you'd rather
  not do that in v1, turn transit encryption off and use `redis://` over the private network with
  AUTH. Write that down as a known gap if you go that way.
- Replace `REPLACE-WITH-LB-IP` / nip.io hosts with the new static IP, or better, the real domain
  (Step 0, item 3).
- `postgres.storageClassName` only matters for local/internal Postgres. GKE's default
  `standard-rwo` works.

---

## 6. Fix media storage (do it now, it's cheap)

`STORAGES["default"]` is `FileSystemStorage`. Patient documents, signatures and practitioner photos
are written to the **pod's local disk**, so they're lost on every redeploy and aren't shared
between the 2 web replicas. This is already broken on AKS, and the migration is a natural point to
fix it:

1. Add `django-storages[google]` to `requirements.txt`.
2. Terraform: create a private GCS bucket per environment (uniform access, versioning, no public
   access), a Kubernetes SA ↔ GCP SA Workload Identity binding, and `roles/storage.objectAdmin`
   on that bucket.
3. `settings.py`: when `GS_BUCKET_NAME` is set, use
   `storages.backends.gcloud.GoogleCloudStorage` with `querystring_auth = True` (signed URLs,
   since these are PHI). Otherwise keep using the filesystem for local dev and tests.
4. Helm: annotate the backend ServiceAccount with
   `iam.gke.io/gcp-service-account=<sa>@<project>.iam.gserviceaccount.com`.

If any files already exist on Azure pods, copy them out first with `kubectl cp` and upload them
with `gcloud storage cp -r`.

---

## 7. Data migration — **SKIPPED** (Decision 2: no data on Azure)

Kept for reference only, in case data ever has to move between Postgres instances.

Redis doesn't need migrating: it only holds the Celery broker and cache. Before cutover, wait for
the Celery queues to drain.

**Option A: dump and restore** (simplest; downtime ≈ dump + restore time, usually minutes at
clinic scale):

```bash
# 1. Maintenance window: scale writers to zero on AKS
kubectl -n avocent-prod scale deploy --all --replicas=0

# 2. Dump from Azure (run from a machine allowed through the Flexible Server firewall)
pg_dump "host=psql-avocent-production.postgres.database.azure.com dbname=avocent user=… sslmode=require" \
  -Fc --no-owner --no-acl -f avocent-prod.dump

# 3. Restore into Cloud SQL (through the Cloud SQL Auth Proxy, since the instance is private-IP only)
cloud-sql-proxy --private-ip avocent-prod:africa-south1:psql-avocent-production &
pg_restore -h 127.0.0.1 -U avocent -d avocent --no-owner --no-acl -j 4 avocent-prod.dump

# 4. Verify: row counts per table match, and decrypt a few known PHI fields through the Django shell
```

**Option B: Database Migration Service** (continuous replication from Azure PG Flexible → Cloud
SQL, so downtime is close to zero). Worth the extra setup only if the database is large or the
clinic can't accept a maintenance window.

Keep the `.dump` file in a locked-down GCS bucket as the final Azure backup. It's PHI, so encrypt
it and restrict who can access it.

---

## 8. Cutover

There are no users and no data on Azure, so this is a first launch rather than a cutover. You
don't need a maintenance window or a rollback plan.

1. Get **staging fully green on GKE**: deploy from CI, run migrations, `npm run test:e2e` with
   `E2E_BASE_URL` pointing at it, check the TLS cert issued, send a test email, and run a Celery
   task + Beat schedule.
2. Put the production ingress IP into the nip.io hosts in `values-prod.yaml`, then `git tag v*`
   to deploy.
3. Run `kubectl exec … createsuperuser` (per `NOTES.txt`), then smoke-test login, patient search,
   booking and document upload.

**Switching to the real domain (later):**

1. At the registrar, create `A` records for `app.<domain>` and `api.<domain>` pointing at each
   environment's ingress IP (the `google_compute_address`, which stays fixed).
2. In `values-{staging,prod}.yaml`, update `ingress.apiHost`/`appHost`, `ingress.tls.hosts`,
   `django.frontendUrl`, `frontend.publicApiUrl` and `django.security.csrfTrustedOrigins`.
3. Deploy. cert-manager issues new certs automatically. The nip.io URLs stop working, so tell
   any testers.

---

## 9. Decommission Azure

No data and no soak period, so this can happen as soon as GCP staging works. Because of the account
problems, `terraform destroy` may not be possible.

1. Tag the old code (`git tag azure-final`) before replacing `infra/terraform/`.
2. If the account is still usable: `terraform destroy` in `environments/production` →
   `environments/staging` → `bootstrap`. If it isn't: in the Azure portal, check that no resource
   groups are still billing (`rg-avocent-*`), then cancel the subscription.
3. Delete the Entra ID app registrations (`avocent-*-github-oidc`), and delete the GitHub
   `AZURE_*`, `AKS_*`, `KEY_VAULT_NAME` and `ACR_LOGIN_SERVER` variables.

---

## 10. Docs to update afterwards

- `CLAUDE.md`: Layout and Deployment sections (AKS → GKE, Azure AD → WIF).
- `infra/terraform/README.md`: rewrite the runbook for GCP and refresh the "Known v1 gaps" list
  (private networking is now done; Secret Manager CSI is still a gap).
- `spec/plan.md`: lines 9, 64, 65 (stack + Kubernetes status).
- The infra `.claude/agents/` prompts, if they mention Azure.

---

## Checklist

- [x] Client sign-off on leaving Azure; `spec/plan.md` updated
- [x] Decisions recorded (no data, domain later, GKE Standard, Redis TLS on, media → GCS)
- [x] `gcloud` ADC login; billing account and Let's Encrypt email provided
- [x] Terraform rewritten (bootstrap automates projects/billing/APIs)
- [x] Workflows switched to WIF
- [x] Media moved to GCS (code + Terraform)
- [ ] Accept the Google Cloud DPA in the console
- [ ] `bootstrap` + staging applied; GitHub variables set; staging deploys from `main`
- [ ] Staging e2e green on GKE
- [ ] Prod applied on nip.io; smoke tests pass; `FIELD_ENCRYPTION_KEY` backed up offline
- [ ] Azure resources removed / subscription cancelled; docs updated
- [ ] Later: domain registered and hosts switched (Step 8)
