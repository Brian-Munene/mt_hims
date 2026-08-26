variable "name" {
  description = "Globally-unique Key Vault name (3-24 chars)."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "tenant_id" {
  type = string
}

variable "secrets" {
  description = "Map of secret name -> value to seed into the vault (SECRET_KEY, DB_PASSWORD, FIELD_ENCRYPTION_KEY, API_ENCRYPTION_KEY, REDIS_URL, EMAIL_HOST_PASSWORD)."
  type        = map(string)
  sensitive   = true
}

variable "reader_principal_ids" {
  description = "Object IDs granted 'Key Vault Secrets User' (read-only) — the GitHub OIDC app registration for this environment."
  type        = list(string)
  default     = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
