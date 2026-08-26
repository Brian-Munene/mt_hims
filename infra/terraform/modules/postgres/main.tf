resource "random_password" "admin" {
  length  = 32
  special = false # Postgres connection strings/URLs get built from this; keep it URL-safe
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  administrator_login    = var.administrator_login
  administrator_password = random_password.admin.result

  sku_name   = var.sku_name
  storage_mb = var.storage_mb
  version    = var.postgres_version

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = false

  dynamic "high_availability" {
    for_each = var.high_availability_enabled ? [1] : []
    content {
      mode = "ZoneRedundant"
    }
  }

  tags = var.tags

  lifecycle {
    # Azure doesn't allow changing the admin password back via this resource
    # once set out-of-band (e.g. rotated manually) — avoid Terraform fighting
    # a manual rotation.
    ignore_changes = [administrator_password]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# v1: public access + single-IP allowlist (the AKS cluster's static egress
# IP), not a private endpoint — see the plan's known-gaps section.
resource "azurerm_postgresql_flexible_server_firewall_rule" "aks_egress" {
  name             = "allow-aks-egress"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = var.allowed_ip
  end_ip_address   = var.allowed_ip
}
