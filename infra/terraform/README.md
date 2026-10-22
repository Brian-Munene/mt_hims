# GCP infrastructure (GKE staging + production)

Terraform for two fully separate GKE clusters (staging, production), each in its own GCP project in
`africa-south1` (Johannesburg). Each environment gets private-IP Cloud SQL for PostgreSQL 16,
Memorystore for Redis (AUTH + TLS), a private media bucket, Secret Manager, and GitHub Actions
Workload Identity Federation, so no service account keys are ever stored in GitHub. A single
Artifact Registry repository in the staging project serves both environments.

This file is the runbook. For why we moved from Azure, see `../GCP_MIGRATION.md`. The previous Azure
code is under the git tag `azure-final`.

| Root | Creates |
|---|---|
| `bootstrap/` | The two projects (linked to billing account `0172CC-2CEBBF-97A92F`), every API they need, and the `avocent-hims-tfstate` state bucket. Uses local state. |
| `environments/staging/` | VPC + Cloud NAT, zonal GKE (2 × e2-standard-2), Artifact Registry, Cloud SQL `db-g1-small`, Memorystore BASIC, media bucket, secrets, WIF (deploy + build identities), ingress-nginx + cert-manager |
| `environments/production/` | Same shape: regional GKE (3 × n2-standard-4), Cloud SQL `db-custom-2-8192` HA with 35 backups, Memorystore STANDARD_HA, deletion protection on. Pulls images from staging's registry. |

## Prerequisites

- `gcloud auth application-default login`, signed in as an owner of billing account
  `0172CC-2CEBBF-97A92F`.
- Terraform >= 1.7, `kubectl`, `helm` installed locally for the first pass.
- Project IDs and bucket names are globally unique. If `avocent-hims-staging`,
  `avocent-hims-prod` or `avocent-hims-tfstate` are taken, override them in
  `bootstrap/variables.tf`. Update the matching `project_id` defaults, every `backend.tf`, the
  `terraform_remote_state` block in production, and the image/SA names in
  `deploy/helm/avocent/values-*.yaml`.

## Rough monthly cost (list prices, before free tier)

| | Staging | Production |
|---|---|---|
| GKE control plane | $0 (one zonal cluster is covered by the free tier) | ~$73 |
| Nodes | ~$100 | ~$450 |
| Cloud SQL | ~$30 | ~$250 (HA) |
| Memorystore 1 GB | ~$45 | ~$95 (HA) |
| Cloud NAT + LB + IP | ~$45 | ~$45 |
| **Total** | **~$220** | **~$900** |

This is a test project with no budget alert, so **only apply staging until production is actually
needed**. Run `terraform destroy` in `environments/staging` whenever staging isn't in use. It has
`deletion_protection = false` for that reason. `terraform plan` shows the exact resources before
anything is created.

## One-time: projects + state backend

```bash
cd bootstrap
terraform init
terraform apply
```

New billing accounts sometimes have a low project quota. If project creation fails with a quota
error, request more at <https://support.google.com/code/contact/billing_quota_increase>.

## Staging

```bash
cd environments/staging
terraform init
terraform apply -target=module.gke   # first apply only — see versions.tf for why
terraform apply                      # everything else
terraform output next_steps
```

Follow the printed `next_steps`:

1. Get cluster credentials.
2. Apply the cert-manager `ClusterIssuer` (`../../k8s/cluster-issuer-staging.yaml`).
3. Fill in the `REPLACE-WITH-*` placeholders in `deploy/helm/avocent/values-staging.yaml` with the
   printed ingress IP and Postgres IP.
4. Set the listed GitHub repo and environment variables.

Then push to `main`, and `.github/workflows/deploy-staging.yml` handles the rest.

Create the first superuser yourself:
`kubectl -n avocent-staging exec deploy/avocent-staging-web -- python manage.py createsuperuser`.

## Production

Same flow in `environments/production`. Staging must be applied first, because production reads
the registry from staging's state. One step can't be automated: add required reviewers in GitHub
repo **Settings → Environments → production**. Production deploys trigger on pushing a `v*` tag,
not on every `main` push.

```bash
cd environments/production
terraform init
terraform apply -target=module.gke
terraform apply
terraform output next_steps
```

> ⚠️ `FIELD_ENCRYPTION_KEY` encrypts PHI columns. Once production holds real data it can **never**
> be regenerated. `random_id.field_encryption_key` has `prevent_destroy`; also keep an offline copy
> (`next_steps` prints the command).

## Known v1 gaps (deliberate, not oversights)

- No Secret Manager CSI driver or External Secrets Operator. CI fetches secrets at deploy time
  instead.
- No Kubernetes NetworkPolicy, no pod autoscaling, no multi-region DR.
- No Cloud Armor/WAF in front of ingress-nginx.
- The GKE control-plane endpoint is public, protected by IAM. GitHub-hosted runners have no fixed
  IPs to allow-list.
- Postgres uses `sslmode=require` (encrypted, but the server cert isn't verified). `verify-full`
  would need the Cloud SQL server CA mounted.
- Redis TLS pins the instance CA but skips hostname checks, since clients connect by IP.
- Superuser bootstrap is still a manual `kubectl exec ... createsuperuser`.
