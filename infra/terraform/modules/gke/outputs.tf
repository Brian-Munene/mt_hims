output "name" {
  value = google_container_cluster.this.name
}

output "location" {
  value = google_container_cluster.this.location
}

output "endpoint" {
  value = google_container_cluster.this.endpoint
}

output "ca_certificate" {
  value = google_container_cluster.this.master_auth[0].cluster_ca_certificate
}

output "node_service_account_email" {
  description = "Granted artifactregistry.reader on the shared image repository."
  value       = google_service_account.nodes.email
}
