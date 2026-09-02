terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.15"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azuread" {}

# See environments/staging/versions.tf for the two-step first-apply note —
# the same chicken-and-egg (provider config reading module.aks output)
# applies here.
provider "kubernetes" {
  host                   = module.aks.kube_admin_config[0].host
  client_certificate     = base64decode(module.aks.kube_admin_config[0].client_certificate)
  client_key             = base64decode(module.aks.kube_admin_config[0].client_key)
  cluster_ca_certificate = base64decode(module.aks.kube_admin_config[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = module.aks.kube_admin_config[0].host
    client_certificate     = base64decode(module.aks.kube_admin_config[0].client_certificate)
    client_key             = base64decode(module.aks.kube_admin_config[0].client_key)
    cluster_ca_certificate = base64decode(module.aks.kube_admin_config[0].cluster_ca_certificate)
  }
}
