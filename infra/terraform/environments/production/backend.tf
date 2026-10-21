terraform {
  backend "azurerm" {
    resource_group_name  = "rg-avocent-tfstate"
    storage_account_name = "avocenttfstate"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    use_azuread_auth     = true
  }
}
