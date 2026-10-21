# Minimal VNet for v1: one subnet for the AKS node pool. Postgres/Redis use
# public access + firewall rules (not private endpoints) for the first pass —
# see the plan's "known gaps" section. This module exists mainly so AKS has a
# stable subnet to attach to rather than relying on Azure's fully-managed
# default networking, which is harder to extend with private endpoints later.

resource "azurerm_virtual_network" "this" {
  name                = "${var.name_prefix}-vnet"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [var.address_space]
  tags                = var.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "${var.name_prefix}-aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.aks_subnet_cidr]
}
