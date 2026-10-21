variable "location" {
  type    = string
  default = "South Africa North"
}

variable "resource_group_name" {
  type    = string
  default = "rg-avocent-staging"
}

variable "github_repo" {
  description = "owner/repo — used to scope the GitHub OIDC federated credential's subject."
  type        = string
  default     = "Brian-Munene/mt_hims"
}

variable "cert_manager_email" {
  description = "Email registered with Let's Encrypt for certificate expiry notices."
  type        = string
}

variable "acr_name" {
  description = "Shared ACR — created here (staging root), read by production via terraform_remote_state."
  type        = string
  default     = "acravocent"
}

variable "postgres_sku_name" {
  type    = string
  default = "B_Standard_B1ms" # burstable, cheapest tier — fine for staging
}

variable "redis_sku_name" {
  type    = string
  default = "Basic"
}

variable "aks_node_vm_size" {
  type    = string
  default = "Standard_D2s_v5"
}

variable "aks_node_count" {
  type    = number
  default = 2
}

variable "tags" {
  type = map(string)
  default = {
    environment = "staging"
    project     = "avocent-health-centre"
    managed_by  = "terraform"
  }
}
