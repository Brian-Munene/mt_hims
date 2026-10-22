# One-time bootstrap: creates one GCP project per environment, links billing,
# enables the APIs every environment needs, and creates the GCS bucket that
# infra/terraform/environments/{staging,production} use as their remote state
# backend. Apply this once, manually, with local state:
#
#   cd infra/terraform/bootstrap
#   terraform init
#   terraform apply
#
# This is NOT part of the regular CI/CD loop — it only needs to run again if
# a project or the state backend itself is being torn down/recreated.

locals {
  services = [
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ]

  project_services = {
    for pair in setproduct(keys(var.projects), local.services) :
    "${pair[0]}/${pair[1]}" => { env = pair[0], service = pair[1] }
  }
}

# No org_id/folder_id: this is a personal (no-organization) account. If the
# projects ever move under an organization, set org_id here and re-apply.
resource "google_project" "env" {
  for_each        = var.projects
  project_id      = each.value
  name            = "Avocent ${title(each.key)}"
  billing_account = var.billing_account
  deletion_policy = "PREVENT"

  labels = {
    environment = each.key
    project     = "avocent-health-centre"
    managed_by  = "terraform"
  }
}

resource "google_project_service" "env" {
  for_each = local.project_services
  project  = google_project.env[each.value.env].project_id
  service  = each.value.service

  # Disabling an API on destroy deletes the resources behind it — never do
  # that implicitly.
  disable_on_destroy = false
}

# State lives in the staging project. Uniform access + no public access; object
# versioning means an accidental state overwrite is recoverable.
resource "google_storage_bucket" "tfstate" {
  name     = var.state_bucket_name
  project  = google_project.env["staging"].project_id
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.env]
}
