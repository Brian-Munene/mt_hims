variable "name" {
  description = "Globally-unique Flexible Server name."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "administrator_login" {
  type    = string
  default = "avocent"
}

variable "database_name" {
  type    = string
  default = "avocent_healthcare"
}

variable "sku_name" {
  description = "e.g. B_Standard_B1ms for staging, GP_Standard_D2s_v3 for production."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "storage_mb" {
  type    = number
  default = 32768
}

variable "postgres_version" {
  type    = string
  default = "16"
}

variable "allowed_ip" {
  description = "Single IP allowed through the firewall — the AKS module's egress_ip output."
  type        = string
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "high_availability_enabled" {
  description = "Zone-redundant standby — recommended for production, unnecessary cost for staging."
  type        = bool
  default     = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
