output "network_id" {
  value = google_compute_network.this.id
}

output "network_name" {
  value = google_compute_network.this.name
}

output "subnet_name" {
  value = google_compute_subnetwork.gke.name
}

output "pods_range_name" {
  value = "pods"
}

output "services_range_name" {
  value = "services"
}

output "private_services_connection" {
  description = "Depend on this before creating Cloud SQL/Memorystore — they need the peering in place."
  value       = google_service_networking_connection.private_services.id
}
