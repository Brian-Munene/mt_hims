variable "project_id" {
  description = "Created by infra/terraform/bootstrap."
  type        = string
  default     = "avocent-hims-staging"
}

variable "region" {
  type    = string
  default = "africa-south1"
}

variable "gke_location" {
  description = "A zone = zonal cluster: one free-tier-eligible control plane, cheapest option for staging."
  type        = string
  default     = "africa-south1-a"
}

variable "github_repo" {
  description = "owner/repo — the only repository allowed to federate into this project."
  type        = string
  default     = "Brian-Munene/mt_hims"
}

variable "namespace" {
  description = "Kubernetes namespace of the Helm release (must match deploy-staging.yml)."
  type        = string
  default     = "avocent-staging"
}

variable "backend_service_account" {
  description = "Kubernetes ServiceAccount the Django pods run as (serviceAccount.name in values-staging.yaml)."
  type        = string
  default     = "avocent-backend"
}

variable "gke_machine_type" {
  type    = string
  default = "e2-standard-2"
}

variable "gke_node_count" {
  type    = number
  default = 2
}

variable "cloudsql_tier" {
  type    = string
  default = "db-g1-small" # shared core, cheapest tier — fine for staging
}

variable "redis_tier" {
  type    = string
  default = "BASIC"
}

variable "labels" {
  type = map(string)
  default = {
    environment = "staging"
    project     = "avocent-health-centre"
    managed_by  = "terraform"
  }
}
