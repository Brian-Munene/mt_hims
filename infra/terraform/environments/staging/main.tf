# --- App secrets, generated once and stored only in Secret Manager below ---
# Mirrors avocent-backend/core/management/commands/generate_keys.py: Django's
# SECRET_KEY just needs high entropy, while FIELD_ENCRYPTION_KEY/
# API_ENCRYPTION_KEY must be exactly 32 raw bytes, base64-encoded — random_id
# with byte_length = 32 produces exactly that via its b64_std output.

resource "random_password" "django_secret_key" {
  length  = 64
  special = true
}

resource "random_id" "field_encryption_key" {
  byte_length = 32
}

resource "random_id" "api_encryption_key" {
  byte_length = 32
}

# --- Networking + cluster ----------------------------------------------

module "network" {
  source      = "../../modules/network"
  name_prefix = "avocent-staging"
  region      = var.region
}

module "gke" {
  source              = "../../modules/gke"
  name                = "gke-avocent-staging"
  project_id          = var.project_id
  location            = var.gke_location
  network_id          = module.network.network_id
  subnet_name         = module.network.subnet_name
  pods_range_name     = module.network.pods_range_name
  services_range_name = module.network.services_range_name
  machine_type        = var.gke_machine_type
  node_count          = var.gke_node_count
  deletion_protection = false # staging is disposable
  labels              = var.labels
}

# --- Shared image repository (staging root only — production reads this via
# terraform_remote_state rather than creating a second registry) -----------

module "artifact_registry" {
  source         = "../../modules/artifact-registry"
  project_id     = var.project_id
  location       = var.region
  reader_members = ["serviceAccount:${module.gke.node_service_account_email}"]
  labels         = var.labels
}

# --- Data tier -----------------------------------------------------------

module "cloudsql" {
  source              = "../../modules/cloudsql"
  name                = "psql-avocent-staging"
  region              = var.region
  network_id          = module.network.network_id
  tier                = var.cloudsql_tier
  deletion_protection = false
  labels              = var.labels

  depends_on = [module.network] # needs the Private Service Access peering
}

module "memorystore" {
  source     = "../../modules/memorystore"
  name       = "redis-avocent-staging"
  region     = var.region
  network_id = module.network.network_id
  tier       = var.redis_tier
  labels     = var.labels

  depends_on = [module.network]
}

# --- Media storage (patient documents, signatures, photos) ---------------
# Private bucket, accessed by the Django pods through Workload Identity (no
# key file). Files are served via short-lived signed URLs, which the app SA
# signs through the IAM signBlob API — hence tokenCreator on itself.

resource "google_storage_bucket" "media" {
  name     = "${var.project_id}-media"
  location = var.region
  labels   = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true # staging only

  versioning {
    enabled = true
  }
}

resource "google_service_account" "app" {
  account_id   = "avocent-app"
  display_name = "Avocent Django pods (staging)"
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

  depends_on = [module.gke] # the project's workload pool exists once the cluster does
}

# --- GitHub Actions identities -------------------------------------------

module "github_oidc" {
  source      = "../../modules/github-oidc"
  project_id  = var.project_id
  environment = "staging"
  github_repo = var.github_repo

  artifact_registry = {
    project_id = var.project_id
    location   = module.artifact_registry.location
    name       = module.artifact_registry.name
  }
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
# Pre-created so the deploy SA (roles/container.developer) never needs
# namespace-create rights. See versions.tf for the two-step first-apply note.

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
  }
}

module "ingress" {
  source       = "../../modules/ingress"
  address_name = "avocent-staging-ingress"
  region       = var.region
}
