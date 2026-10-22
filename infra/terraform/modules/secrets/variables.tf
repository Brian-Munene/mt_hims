variable "region" {
  type = string
}

variable "secrets" {
  description = "Secret ID -> value, written as the latest version. IDs match the names CI reads (SECRET_KEY, DB_PASSWORD, ...)."
  type        = map(string)
  sensitive   = true
}

variable "manual_secret_ids" {
  description = "Secret IDs created empty — the value is added by hand with `gcloud secrets versions add`."
  type        = list(string)
  default     = []
}

variable "labels" {
  type    = map(string)
  default = {}
}
