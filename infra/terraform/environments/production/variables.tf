variable "location" {
  type    = string
  default = "South Africa North"
}

variable "resource_group_name" {
  type    = string
  default = "rg-avocent-production"
}

variable "github_repo" {
  type    = string
  default = "Brian-Munene/mt_hims"
}

variable "cert_manager_email" {
  description = "Email registered with Let's Encrypt for certificate expiry notices."
  type        = string
}

variable "postgres_sku_name" {
  type    = string
  default = "GP_Standard_D2s_v3" # general-purpose, not burstable — production workload
}

variable "redis_sku_name" {
  type    = string
  default = "Standard" # replicated, unlike staging's Basic
}

variable "aks_node_vm_size" {
  type    = string
  default = "Standard_D4s_v5"
}

variable "aks_node_count" {
  type    = number
  default = 3
}

variable "tags" {
  type = map(string)
  default = {
    environment = "production"
    project     = "avocent-health-centre"
    managed_by  = "terraform"
  }
}
