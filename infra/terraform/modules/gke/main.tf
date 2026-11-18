# Dedicated, least-privilege node identity instead of the Compute Engine
# default service account (which has project Editor).
resource "google_service_account" "nodes" {
  account_id   = "${var.name}-nodes"
  display_name = "GKE nodes (${var.name})"
}

resource "google_project_iam_member" "nodes" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.nodes.email}"
}

resource "google_container_cluster" "this" {
  name     = var.name
  location = var.location # a zone = zonal cluster (staging), a region = regional (production)

  network         = var.network_id
  subnetwork      = var.subnet_name
  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  # Node pools are managed separately below, so the default one is removed
  # right after creation.
  remove_default_node_pool = true
  initial_node_count       = 1

  deletion_protection = var.deletion_protection

  release_channel {
    channel = "REGULAR"
  }

  # Private nodes (no public IPs, egress via Cloud NAT) with a public control
  # plane endpoint — GitHub-hosted runners have no fixed IPs, so the API
  # server stays reachable and access is gated by IAM instead.
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.master_cidr
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  resource_labels = var.labels
}

resource "google_container_node_pool" "system" {
  name       = "system"
  cluster    = google_container_cluster.this.id
  location   = var.location
  node_count = var.node_count # per zone — a regional cluster spreads this across 3 zones

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type    = var.machine_type
    disk_type       = "pd-balanced"
    disk_size_gb    = 50
    service_account = google_service_account.nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    labels          = var.labels

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot = true
    }
  }
}
