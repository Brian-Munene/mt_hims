# A dedicated, stable public IP for the cluster's outbound (egress) traffic.
# Postgres/Redis firewall rules (v1: public access + IP allowlist, no private
# endpoints — see the plan's known-gaps section) whitelist this single IP
# rather than whatever ephemeral IP the AKS-managed load balancer would
# otherwise pick.
resource "azurerm_public_ip" "egress" {
  name                = "${var.name}-egress-ip"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_kubernetes_cluster" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  dns_prefix          = var.dns_prefix
  tags                = var.tags
  sku_tier            = var.sku_tier

  # Enables federated-credential auth (GitHub Actions OIDC -> AKS) without a
  # stored client secret, and lets pods themselves use workload identity in
  # the future if needed.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  default_node_pool {
    name           = "system"
    vm_size        = var.node_vm_size
    node_count     = var.node_count
    vnet_subnet_id = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
    load_balancer_profile {
      outbound_ip_address_ids = [azurerm_public_ip.egress.id]
    }
  }

  # Azure RBAC for Kubernetes authorization: lets the GitHub OIDC identity
  # (see modules/github-oidc) get scoped kubectl access via an Azure role
  # assignment on the cluster, instead of a long-lived admin kubeconfig.
  azure_active_directory_role_based_access_control {
    tenant_id          = var.tenant_id
    azure_rbac_enabled = true
  }

  local_account_disabled = false # keep `az aks get-credentials --admin` available as a break-glass path
}
