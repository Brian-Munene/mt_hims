output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "aks_cluster_name" {
  value = module.aks.name
}

output "postgres_fqdn" {
  description = "Set this as `postgres.host` in deploy/helm/avocent/values-prod.yaml."
  value       = module.postgres.fqdn
}

output "egress_ip" {
  description = "The cluster's static outbound/ingress IP — use this to derive the nip.io hostnames (api.<ip>.nip.io / app.<ip>.nip.io) once ingress-nginx is up, and to fill in the REPLACE-WITH-LB-IP placeholders in values-prod.yaml."
  value       = module.aks.egress_ip
}

output "key_vault_name" {
  description = "Set as the KEY_VAULT_NAME repo/environment variable for .github/workflows/deploy-production.yml."
  value       = module.keyvault.name
}

output "github_oidc_client_id" {
  description = "Set as the AZURE_CLIENT_ID repo/environment variable for .github/workflows/deploy-production.yml. Not a secret."
  value       = module.github_oidc.client_id
}

output "next_steps" {
  value = <<-EOT
    1. az aks get-credentials --resource-group ${azurerm_resource_group.this.name} --name ${module.aks.name}
    2. kubectl apply -f ../../../k8s/cluster-issuer-prod.yaml   (after cert-manager's CRDs are ready — check with `kubectl get crd | grep cert-manager`)
    3. Replace every REPLACE-WITH-LB-IP in deploy/helm/avocent/values-prod.yaml with: ${module.aks.egress_ip}
    4. Set these as GitHub repo/environment ("production") variables: AZURE_CLIENT_ID=${module.github_oidc.client_id}, KEY_VAULT_NAME=${module.keyvault.name}, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
    5. In GitHub repo Settings -> Environments -> production: add required reviewers (manual, no Terraform/API path for a personal-account repo).
    6. Push a v* tag — .github/workflows/deploy-production.yml takes it from here.
  EOT
}
