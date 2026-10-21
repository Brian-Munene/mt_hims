# Shared across both environments (per the plan) — instantiate this module
# only from environments/staging; environments/production reads its outputs
# via a terraform_remote_state data source instead of creating a second
# registry. Image tags are scoped by git SHA so staging/prod images never
# collide in the same registry.

resource "azurerm_container_registry" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku
  admin_enabled       = false # pulls happen via AKS kubelet managed identity + AcrPull role, not the admin account
  tags                = var.tags
}
