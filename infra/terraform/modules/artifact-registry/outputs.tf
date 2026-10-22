output "name" {
  value = google_artifact_registry_repository.this.name
}

output "location" {
  value = google_artifact_registry_repository.this.location
}

output "project_id" {
  value = var.project_id
}

output "url" {
  description = "Image prefix, e.g. africa-south1-docker.pkg.dev/<project>/avocent — the IMAGE_REPO GitHub variable."
  value       = "${google_artifact_registry_repository.this.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}
