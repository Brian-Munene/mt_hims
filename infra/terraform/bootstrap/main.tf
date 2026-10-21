# One-time bootstrap: creates the resource group + storage account + blob
# container that infra/terraform/environments/{staging,production} use as
# their remote state backend. Apply this once, manually, with local state:
#
#   cd infra/terraform/bootstrap
#   terraform init
#   terraform apply
#
# This is NOT part of the regular CI/CD loop — it only needs to run again if
# the state backend itself is being torn down/recreated.

resource "azurerm_resource_group" "tfstate" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_storage_account" "tfstate" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  # No shared-key access — environments/*/backend.tf authenticates via Azure
  # AD (use_azuread_auth = true), so no storage account key needs to exist or
  # be distributed to CI.
  shared_access_key_enabled = false

  blob_properties {
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = var.container_name
  storage_account_id    = azurerm_storage_account.tfstate.id
  container_access_type = "private"
}

# Grant the identity running this apply (you, via `az login`) permission to
# read/write blobs via Azure AD auth. Environment-specific identities (the
# GitHub OIDC app registrations created in environments/*) get the same role
# assigned in their own module so `terraform init` works from CI too.
data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "tfstate_current_user" {
  scope                = azurerm_storage_account.tfstate.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}
