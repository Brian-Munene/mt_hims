terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Deliberately local state — this config creates the storage account that
  # every other Terraform root (environments/staging, environments/production)
  # uses as its *remote* backend. Bootstrapping the backend from the backend
  # it creates is the chicken-and-egg problem this root exists to avoid.
}

provider "azurerm" {
  features {}
}
