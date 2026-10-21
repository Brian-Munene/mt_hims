terraform {
  backend "azurerm" {
    # Values here must match infra/terraform/bootstrap's outputs. Terraform
    # backend blocks can't interpolate variables, so these are literal —
    # update them if the bootstrap defaults (variables.tf) were changed.
    resource_group_name  = "rg-avocent-tfstate"
    storage_account_name = "avocenttfstate"
    container_name       = "tfstate"
    key                  = "staging.tfstate"
    use_azuread_auth     = true
  }
}
