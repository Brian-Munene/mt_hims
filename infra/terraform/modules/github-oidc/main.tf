# GitHub Actions -> GCP via Workload Identity Federation: GitHub's OIDC token
# is exchanged for short-lived GCP credentials, so no service account key is
# ever created or stored in GitHub.
#
# Note: a deleted pool is soft-deleted for 30 days and its ID can't be reused
# in that window — `terraform destroy` + re-apply within 30 days needs a new
# pool_id.

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = var.pool_id
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"         = "assertion.sub"
    "attribute.repository"   = "assertion.repository"
    "attribute.environment"  = "assertion.environment"
    "attribute.workflow_ref" = "assertion.workflow_ref"
  }

  # Hard gate: tokens from any other repository are rejected outright,
  # before any IAM binding is even considered.
  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- Deploy identity: only jobs bound to this GitHub Environment -----------
# The subject (repo:<owner/repo>:environment:<env>) matches the GitHub
# Environment a deploy job declares, mirroring the Azure federated
# credential's subject.

resource "google_service_account" "deploy" {
  account_id   = "github-deploy"
  display_name = "GitHub Actions deploy (${var.environment})"
}

resource "google_service_account_iam_member" "deploy_wif" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/subject/repo:${var.github_repo}:environment:${var.environment}"
}

# One project per environment, so project-level roles are already scoped to
# this environment's cluster and secrets.
resource "google_project_iam_member" "deploy" {
  for_each = toset([
    "roles/container.developer",
    "roles/secretmanager.secretAccessor",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# --- Build identity: any workflow run in the repo (build-and-push.yml runs
# on every branch with no Environment), push-only on the image repository ---

resource "google_service_account" "build" {
  count        = var.artifact_registry == null ? 0 : 1
  account_id   = "github-build"
  display_name = "GitHub Actions image build"
}

resource "google_service_account_iam_member" "build_wif" {
  count              = var.artifact_registry == null ? 0 : 1
  service_account_id = google_service_account.build[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

resource "google_artifact_registry_repository_iam_member" "build_writer" {
  count      = var.artifact_registry == null ? 0 : 1
  project    = var.artifact_registry.project_id
  location   = var.artifact_registry.location
  repository = var.artifact_registry.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.build[0].email}"
}
