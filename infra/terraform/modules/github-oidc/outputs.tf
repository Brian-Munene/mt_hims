output "workload_identity_provider" {
  description = "GCP_WIF_PROVIDER GitHub variable (full resource name). Not a secret."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_service_account" {
  description = "GCP_DEPLOY_SA GitHub variable."
  value       = google_service_account.deploy.email
}

output "build_service_account" {
  description = "GCP_BUILD_SA GitHub variable (null where no build identity is created)."
  value       = try(google_service_account.build[0].email, null)
}
