terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.3"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.4"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_client_config" "current" {}

# Configured against the cluster this same apply creates (module.gke).
#
# IMPORTANT — first apply only: Terraform configures providers before it
# knows whether module.gke exists yet, so a from-scratch `terraform apply`
# fails trying to reach a cluster that doesn't exist. Run the very first
# apply in two steps:
#   terraform apply -target=module.gke   # creates just the cluster (+ network)
#   terraform apply                       # everything else, including ingress-nginx/cert-manager
# Every subsequent apply (cluster already exists) works as a single command.
provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
}

provider "helm" {
  kubernetes = {
    host                   = "https://${module.gke.endpoint}"
    token                  = data.google_client_config.current.access_token
    cluster_ca_certificate = base64decode(module.gke.ca_certificate)
  }
}
