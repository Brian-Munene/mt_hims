variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "network_id" {
  type = string
}

variable "tier" {
  description = "e.g. db-g1-small (shared core, staging) or db-custom-2-8192 (2 vCPU / 8 GB, production)."
  type        = string
}

variable "database_version" {
  type    = string
  default = "POSTGRES_16"
}

variable "disk_size_gb" {
  type    = number
  default = 20
}

variable "high_availability_enabled" {
  type    = bool
  default = false
}

variable "backup_retention_count" {
  description = "Number of daily automated backups kept."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

# Match the Helm chart's postgres.database / postgres.user defaults.
variable "database_name" {
  type    = string
  default = "avocent_healthcare"
}

variable "user_name" {
  type    = string
  default = "avocent"
}

variable "labels" {
  type    = map(string)
  default = {}
}
