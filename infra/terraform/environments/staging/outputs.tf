output "gke_cluster_name" {
  value = module.gke.name
}

output "gke_location" {
  value = module.gke.location
}

output "image_repo" {
  value = module.artifact_registry.url
}

output "artifact_registry" {
  description = "Read by environments/production via terraform_remote_state — the registry is shared, provisioned only here."
  value = {
    project_id = module.artifact_registry.project_id
    location   = module.artifact_registry.location
    name       = module.artifact_registry.name
    url        = module.artifact_registry.url
  }
}

output "postgres_private_ip" {
  description = "Set this as `postgres.host` in deploy/helm/avocent/values-staging.yaml."
  value       = module.cloudsql.private_ip
}

output "cloudsql_connection_name" {
  value = module.cloudsql.connection_name
}

output "ingress_ip" {
  description = "Replaces REPLACE-WITH-LB-IP in values-staging.yaml (api.<ip>.nip.io / app.<ip>.nip.io)."
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
    2. kubectl apply -f ../../../k8s/cluster-issuer-staging.yaml   (after cert-manager's CRDs are ready — check with `kubectl get crd | grep cert-manager`)
    3. In deploy/helm/avocent/values-staging.yaml, set:
         REPLACE-WITH-LB-IP          -> ${module.ingress.ip_address}
         postgres.host               -> ${module.cloudsql.private_ip}
         storage.gcsBucket           -> ${google_storage_bucket.media.name}
         serviceAccount annotation   -> ${google_service_account.app.email}
    4. GitHub repo variables (Settings -> Secrets and variables -> Actions -> Variables):
         GCP_BUILD_WIF_PROVIDER = ${module.github_oidc.workload_identity_provider}
         GCP_BUILD_SA           = ${module.github_oidc.build_service_account}
         IMAGE_REPO             = ${module.artifact_registry.url}
       GitHub Environment "staging" variables:
         GCP_PROJECT_ID   = ${var.project_id}
         GCP_WIF_PROVIDER = ${module.github_oidc.workload_identity_provider}
         GCP_DEPLOY_SA    = ${module.github_oidc.deploy_service_account}
         GKE_CLUSTER_NAME = ${module.gke.name}
         GKE_LOCATION     = ${module.gke.location}
    5. (When an SMTP provider is chosen) printf '%s' "<password>" | gcloud secrets versions add EMAIL_HOST_PASSWORD --project ${var.project_id} --data-file=-
    6. Push to main — .github/workflows/deploy-staging.yml takes it from here.
  EOT
}
