output "project_ids" {
  value = { for env, p in google_project.env : env => p.project_id }
}

output "state_bucket" {
  description = "Must match `bucket` in environments/*/backend.tf."
  value       = google_storage_bucket.tfstate.name
}
