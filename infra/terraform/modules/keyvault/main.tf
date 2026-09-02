# One vault per environment — a compromised staging pipeline should never be
# able to read production secrets, so staging and production each get their
# own vault with their own scoped role assignments (never a shared vault).

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
  tags                       = var.tags
}

# The identity running `terraform apply` needs write access to seed secrets
# below — grant it here rather than assuming a pre-existing role assignment.
resource "azurerm_role_assignment" "terraform_writer" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "readers" {
  for_each             = toset(var.reader_principal_ids)
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value
}

# Azure RBAC role assignments are eventually consistent — creating a secret
# immediately after the role assignment above intermittently 403s. A short
# wait is the standard workaround.
resource "time_sleep" "rbac_propagation" {
  create_duration = "30s"
  depends_on      = [azurerm_role_assignment.terraform_writer]
}

resource "azurerm_key_vault_secret" "this" {
  # Secret *names* aren't sensitive, only their values — but var.secrets is
  # sensitive as a whole map, and Terraform refuses a sensitive value as a
  # for_each key (it could leak into resource addresses/state instance keys).
  # nonsensitive() here only strips the flag from the key set, not the
  # `value` argument below, which stays sensitive.
  for_each     = nonsensitive(toset(keys(var.secrets)))
  name         = each.key
  value        = var.secrets[each.key]
  key_vault_id = azurerm_key_vault.this.id

  depends_on = [time_sleep.rbac_propagation]
}
