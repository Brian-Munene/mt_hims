# The shared image repository lives in the staging root's state — read its
# outputs instead of provisioning a second registry (one shared repo, images
# tagged by git SHA so staging/prod never collide).
data "terraform_remote_state" "staging" {
  backend = "gcs"
  config = {
    bucket = "avocent-hims-tfstate"
    prefix = "staging"
  }
}

locals {
  artifact_registry = data.terraform_remote_state.staging.outputs.artifact_registry
}

# --- App secrets, generated once and stored only in Secret Manager below ---
# Once production holds real data, FIELD_ENCRYPTION_KEY must NEVER be
# regenerated (every PHI column becomes unreadable) — never taint/-replace
# random_id.field_encryption_key, and keep an offline copy of the value.

resource "random_password" "django_secret_key" {
  length  = 64
  special = true
}

resource "random_id" "field_encryption_key" {
  byte_length = 32

  lifecycle {
    prevent_destroy = true
  }
}

resource "random_id" "api_encryption_key" {
  byte_length = 32
}

# --- Networking + cluster ----------------------------------------------

module "network" {
  source      = "../../modules/network"
  name_prefix = "avocent-production"
  region      = var.region
  # Deliberately a different range from staging's defaults (10.10-10.12) —
  # these VPCs are never peered, but distinct ranges avoid confusion if that
  # ever changes.
  nodes_cidr    = "10.20.0.0/20"
  pods_cidr     = "10.21.0.0/16"
  services_cidr = "10.22.0.0/20"
}

module "gke" {
  source              = "../../modules/gke"
  name                = "gke-avocent-production"
  project_id          = var.project_id
  location            = var.gke_location
  network_id          = module.network.network_id
  subnet_name         = module.network.subnet_name
  pods_range_name     = module.network.pods_range_name
  services_range_name = module.network.services_range_name
  master_cidr         = "172.16.1.0/28"
  machine_type        = var.gke_machine_type
  node_count          = var.gke_node_count
  deletion_protection = true
  labels              = var.labels
}

# Cross-project pull: production nodes read images from the staging project's
# repository.
resource "google_artifact_registry_repository_iam_member" "nodes_pull" {
  project    = local.artifact_registry.project_id
  location   = local.artifact_registry.location
  repository = local.artifact_registry.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${module.gke.node_service_account_email}"
}

# --- Data tier -----------------------------------------------------------

module "cloudsql" {
  source                    = "../../modules/cloudsql"
  name                      = "psql-avocent-production"
  region                    = var.region
  network_id                = module.network.network_id
  tier                      = var.cloudsql_tier
  disk_size_gb              = 32
  high_availability_enabled = true
  backup_retention_count    = 35
  deletion_protection       = true
  labels                    = var.labels

  depends_on = [module.network]
}

module "memorystore" {
  source     = "../../modules/memorystore"
  name       = "redis-avocent-production"
  region     = var.region
  network_id = module.network.network_id
  tier       = var.redis_tier
  labels     = var.labels

  depends_on = [module.network]
}

# --- Media storage (patient documents, signatures, photos) — PHI -----------
# See environments/staging/main.tf for the access model.

resource "google_storage_bucket" "media" {
  name     = "${var.project_id}-media"
  location = var.region
  labels   = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  # Deleted/overwritten files stay recoverable for 30 days.
  soft_delete_policy {
    retention_duration_seconds = 2592000
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account" "app" {
  account_id   = "avocent-app"
  display_name = "Avocent Django pods (production)"
}

resource "google_storage_bucket_iam_member" "app_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}

resource "google_service_account_iam_member" "app_sign_blob" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.app.email}"
}

resource "google_service_account_iam_member" "app_workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.backend_service_account}]"

  depends_on = [module.gke]
}

# --- GitHub Actions deploy identity (no build identity — images are built
# once, in the staging project's registry) ----------------------------------

module "github_oidc" {
  source      = "../../modules/github-oidc"
  project_id  = var.project_id
  environment = "production"
  github_repo = var.github_repo
}

# --- Secrets -> Secret Manager (never written to a values-*.yaml file) ---

module "secrets" {
  source = "../../modules/secrets"
  region = var.region
  labels = var.labels

  secrets = {
    SECRET_KEY           = random_password.django_secret_key.result
    FIELD_ENCRYPTION_KEY = random_id.field_encryption_key.b64_std
    API_ENCRYPTION_KEY   = random_id.api_encryption_key.b64_std
    DB_PASSWORD          = module.cloudsql.password
    REDIS_URL            = module.memorystore.url
    REDIS_CA_CERT        = module.memorystore.server_ca_cert
  }

  manual_secret_ids = ["EMAIL_HOST_PASSWORD"]
}

# --- Kubernetes: app namespace, ingress + TLS ------------------------------

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
  }
}

module "ingress" {
  source       = "../../modules/ingress"
  address_name = "avocent-production-ingress"
  region       = var.region
}
