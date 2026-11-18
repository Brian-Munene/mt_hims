output "gke_cluster_name" {
  value = module.gke.name
}

output "gke_location" {
  value = module.gke.location
}

output "postgres_private_ip" {
  description = "Set this as `postgres.host` in deploy/helm/avocent/values-prod.yaml."
  value       = module.cloudsql.private_ip
}

output "cloudsql_connection_name" {
  value = module.cloudsql.connection_name
}

output "ingress_ip" {
  description = "Replaces REPLACE-WITH-LB-IP in values-prod.yaml (api.<ip>.nip.io / app.<ip>.nip.io)."
  value       = module.ingress.ip_address
}

output "media_bucket" {
  value = google_storage_bucket.media.name
}

output "app_service_account" {
  value = google_service_account.app.email
}

output "next_steps" {
  value = <<-EOT
    1. gcloud container clusters get-credentials ${module.gke.name} --location ${module.gke.location} --project ${var.project_id}
    2. kubectl apply -f ../../../k8s/cluster-issuer-prod.yaml   (after cert-manager's CRDs are ready — check with `kubectl get crd | grep cert-manager`)
    3. In deploy/helm/avocent/values-prod.yaml, set:
         REPLACE-WITH-LB-IP          -> ${module.ingress.ip_address}
         postgres.host               -> ${module.cloudsql.private_ip}
         storage.gcsBucket           -> ${google_storage_bucket.media.name}
         serviceAccount annotation   -> ${google_service_account.app.email}
    4. GitHub Environment "production" variables:
         GCP_PROJECT_ID   = ${var.project_id}
         GCP_WIF_PROVIDER = ${module.github_oidc.workload_identity_provider}
         GCP_DEPLOY_SA    = ${module.github_oidc.deploy_service_account}
         GKE_CLUSTER_NAME = ${module.gke.name}
         GKE_LOCATION     = ${module.gke.location}
    5. Back up FIELD_ENCRYPTION_KEY offline:
         gcloud secrets versions access latest --secret FIELD_ENCRYPTION_KEY --project ${var.project_id}
    6. In GitHub repo Settings -> Environments -> production: add required reviewers.
    7. Push a v* tag — .github/workflows/deploy-production.yml takes it from here.
  EOT
}
