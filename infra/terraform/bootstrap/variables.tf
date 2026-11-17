variable "billing_account" {
  description = "Billing account the projects are charged to (`gcloud billing accounts list`). Not a secret."
  type        = string
  default     = "0172CC-2CEBBF-97A92F"
}

variable "region" {
  description = "Region for the Terraform state bucket (and, by convention, everything else)."
  type        = string
  default     = "africa-south1"
}

variable "projects" {
  description = "Environment -> globally-unique GCP project ID. One project per environment = hard isolation, like the separate resource groups/clusters on Azure."
  type        = map(string)
  default = {
    staging    = "avocent-hims-staging"
    production = "avocent-hims-prod"
  }
}

variable "state_bucket_name" {
  description = "Globally-unique GCS bucket holding every environment's .tfstate. Must be changed if the default is taken."
  type        = string
  default     = "avocent-hims-tfstate"
}
