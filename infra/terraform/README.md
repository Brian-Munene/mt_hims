# Azure infrastructure (AKS staging + production)

Terraform for two fully separate AKS clusters (staging, production) in Azure's South Africa North
region, with managed Postgres (Flexible Server) and Redis (Azure Cache for Redis), a shared ACR,
per-environment Key Vaults, and GitHub Actions OIDC federation — no stored Azure credentials in
GitHub. See `.claude/plans/` history or ask for the full design rationale; this file is the
execution runbook.

## Prerequisites

- An Azure subscription (create this yourself — not something Terraform or CI can do).
- `az login` once, locally, as a user with rights to create resources and role assignments.
- Terraform >= 1.7, `kubectl`, `helm` installed locally for the first bootstrap pass.

## One-time: state backend

```bash
cd bootstrap
terraform init
terraform apply
```

Creates the resource group + storage account + blob container that `environments/staging` and
`environments/production` use as their remote state backend (Azure AD auth, no storage key).
Not part of CI/CD — only re-run if the backend itself needs to be recreated.

## Staging

```bash
cd environments/staging
terraform init
terraform apply -target=module.aks   # first apply only — see versions.tf for why
terraform apply                      # everything else
terraform output next_steps
```

Follow the printed `next_steps` output: get cluster credentials, apply the cert-manager
`ClusterIssuer` (`../../k8s/cluster-issuer-staging.yaml`), replace the `REPLACE-WITH-LB-IP`
placeholders in `deploy/helm/avocent/values-staging.yaml` with the printed egress IP, and set the
listed GitHub repo/environment variables. Then push to `main` — `.github/workflows/deploy-staging.yml`
handles the rest.

## Production

Same flow in `environments/production`, plus one manual step Terraform/the API can't do: add
required reviewers in GitHub repo **Settings → Environments → production**. Production deploys
trigger on pushing a `v*` tag, not on every `main` push.

```bash
cd environments/production
terraform init
terraform apply -target=module.aks
terraform apply
terraform output next_steps
```

## Known v1 gaps (deliberate, not oversights)

Key Vault CSI driver/External Secrets Operator (CI fetches secrets at deploy time instead);
Kubernetes NetworkPolicy; pod autoscaling; multi-region DR; WAF in front of ingress-nginx;
`verify-full` Postgres SSL (uses `sslmode=require`); private VNet/private-endpoint networking for
Postgres/Redis (public access + single-IP firewall rule instead); automated superuser bootstrap
(still a manual `kubectl exec ... createsuperuser` per the Helm chart's `NOTES.txt`).
