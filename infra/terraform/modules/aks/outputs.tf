output "id" {
  value = azurerm_kubernetes_cluster.this.id
}

output "name" {
  value = azurerm_kubernetes_cluster.this.name
}

output "kubelet_identity_object_id" {
  description = "Used to grant AcrPull on the shared ACR."
  value       = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}

output "oidc_issuer_url" {
  description = "Used by modules/github-oidc if pod-level workload identity is added later."
  value       = azurerm_kubernetes_cluster.this.oidc_issuer_url
}

output "egress_ip" {
  description = "Stable outbound IP — whitelist this on Postgres/Redis firewalls and use it to derive the nip.io hostnames once ingress-nginx is installed and its LoadBalancer Service is assigned this IP."
  value       = azurerm_public_ip.egress.ip_address
}

output "node_resource_group" {
  value = azurerm_kubernetes_cluster.this.node_resource_group
}

# Used to configure the `kubernetes`/`helm` providers in the environment root
# (modules/ingress installs ingress-nginx + cert-manager right after this
# module runs) — local_account_disabled = false above keeps this populated.
output "kube_admin_config" {
  value     = azurerm_kubernetes_cluster.this.kube_admin_config
  sensitive = true
}

