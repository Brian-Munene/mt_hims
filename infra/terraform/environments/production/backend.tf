terraform {
  backend "gcs" {
    # Must match infra/terraform/bootstrap's state_bucket_name. Backend blocks
    # can't interpolate variables, so this is literal — update it if the
    # bootstrap default was changed.
    bucket = "avocent-hims-tfstate"
    prefix = "production"
  }
}
