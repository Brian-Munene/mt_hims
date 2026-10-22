terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8"
    }
  }

  # Deliberately local state — this config creates the GCS bucket that every
  # other Terraform root (environments/staging, environments/production) uses
  # as its *remote* backend. Bootstrapping the backend from the backend it
  # creates is the chicken-and-egg problem this root exists to avoid.
}

provider "google" {
  region = var.region
}
