variable "project_id" {
  description = "Created by infra/terraform/bootstrap."
  type        = string
  default     = "avocent-hims-prod"
}

variable "region" {
  type    = string
  default = "africa-south1"
}

variable "gke_location" {
  description = "A region = regional cluster: control plane and nodes spread across 3 zones."
  type        = string
  default     = "africa-south1"
}

variable "github_repo" {
  type    = string
  default = "Brian-Munene/mt_hims"
}

variable "namespace" {
  description = "Kubernetes namespace of the Helm release (must match deploy-production.yml)."
  type        = string
  default     = "avocent-prod"
}

variable "backend_service_account" {
  description = "Kubernetes ServiceAccount the Django pods run as (serviceAccount.name in values-prod.yaml)."
  type        = string
  default     = "avocent-backend"
}

variable "gke_machine_type" {
  type    = string
  default = "n2-standard-4"
}

variable "gke_node_count" {
  description = "Per zone — 1 x 3 zones = 3 nodes."
  type        = number
  default     = 1
}

variable "cloudsql_tier" {
  type    = string
  default = "db-custom-2-8192" # 2 vCPU / 8 GB, dedicated core — production workload
}

variable "redis_tier" {
  type    = string
  default = "STANDARD_HA" # replicated, unlike staging's BASIC
}

variable "labels" {
  type = map(string)
  default = {
    environment = "production"
    project     = "avocent-health-centre"
    managed_by  = "terraform"
  }
}
