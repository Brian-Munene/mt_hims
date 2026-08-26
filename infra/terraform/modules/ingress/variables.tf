variable "static_ip_address" {
  description = "The AKS module's egress_ip output — reused as the ingress-nginx LoadBalancer IP so Postgres/Redis firewall rules and the public nip.io hostname are the same IP."
  type        = string
}

variable "static_ip_resource_group" {
  description = "Resource group the static IP actually lives in — the aks module creates the egress public IP directly in the environment's main resource group (not the AKS-managed node resource group), so pass that same resource group name here."
  type        = string
}

variable "cert_manager_email" {
  description = "Email registered with Let's Encrypt for expiry notices."
  type        = string
}
