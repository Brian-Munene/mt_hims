resource "azurerm_redis_cache" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  sku_name = var.sku_name
  family   = var.family
  capacity = var.capacity

  # TLS only — Azure disables the plaintext 6379 port by default; redis-py's
  # rediss:// scheme (already how the app builds REDIS_URL/CELERY_BROKER_URL)
  # talks to the TLS port (6380) without any application code change.
  non_ssl_port_enabled = false
  minimum_tls_version  = "1.2"

  tags = var.tags
}

# v1: public access + single-IP allowlist (the AKS cluster's static egress
# IP), not a private endpoint — see the plan's known-gaps section.
resource "azurerm_redis_firewall_rule" "aks_egress" {
  name                = "allow_aks_egress" # alphanumeric + underscore only, no hyphens
  redis_cache_name    = azurerm_redis_cache.this.name
  resource_group_name = var.resource_group_name
  start_ip            = var.allowed_ip
  end_ip              = var.allowed_ip
}
