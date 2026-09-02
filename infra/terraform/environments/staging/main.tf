resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

data "azurerm_client_config" "current" {}

# --- App secrets, generated once and stored only in Key Vault below --------
# Mirrors avocent-backend/core/management/commands/generate_keys.py: Django's
# SECRET_KEY just needs high entropy, while FIELD_ENCRYPTION_KEY/
# API_ENCRYPTION_KEY must be exactly 32 raw bytes, base64-encoded — random_id
# with byte_length = 32 produces exactly that via its b64_std output.

resource "random_password" "django_secret_key" {
  length  = 64
  special = true
}

resource "random_id" "field_encryption_key" {
  byte_length = 32
}

resource "random_id" "api_encryption_key" {
  byte_length = 32
}

# --- Networking + cluster ----------------------------------------------

module "network" {
  source              = "../../modules/network"
  name_prefix         = "avocent-staging"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = var.tags
}

module "aks" {
  source              = "../../modules/aks"
  name                = "aks-avocent-staging"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  dns_prefix          = "avocent-staging"
  tenant_id           = data.azurerm_client_config.current.tenant_id
  subnet_id           = module.network.aks_subnet_id
  node_vm_size        = var.aks_node_vm_size
  node_count          = var.aks_node_count
  sku_tier            = "Free" # Standard recommended for production, not staging
  tags                = var.tags
}

# --- Shared container registry (staging root only — production reads this
# via terraform_remote_state rather than creating a second registry) -------

module "acr" {
  source              = "../../modules/acr"
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = var.tags
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = module.acr.id
  role_definition_name = "AcrPull"
  principal_id         = module.aks.kubelet_identity_object_id
}

# --- Data tier -----------------------------------------------------------

module "postgres" {
  source                    = "../../modules/postgres"
  name                      = "psql-avocent-staging"
  resource_group_name       = azurerm_resource_group.this.name
  location                  = azurerm_resource_group.this.location
  sku_name                  = var.postgres_sku_name
  allowed_ip                = module.aks.egress_ip
  high_availability_enabled = false
  tags                      = var.tags
}

module "redis" {
  source              = "../../modules/redis"
  name                = "redis-avocent-staging"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku_name            = var.redis_sku_name
  allowed_ip          = module.aks.egress_ip
  tags                = var.tags
}

# --- GitHub Actions OIDC identity ----------------------------------------

module "github_oidc" {
  source      = "../../modules/github-oidc"
  environment = "staging"
  github_repo = var.github_repo
  acr_id      = module.acr.id
  aks_id      = module.aks.id
}

# --- Secrets -> Key Vault (never written to a values-*.yaml file) --------

module "keyvault" {
  source               = "../../modules/keyvault"
  name                 = "kv-avocent-staging"
  resource_group_name  = azurerm_resource_group.this.name
  location             = azurerm_resource_group.this.location
  tenant_id            = data.azurerm_client_config.current.tenant_id
  reader_principal_ids = [module.github_oidc.object_id]
  tags                 = var.tags

  secrets = {
    SECRET_KEY           = random_password.django_secret_key.result
    FIELD_ENCRYPTION_KEY = random_id.field_encryption_key.b64_std
    API_ENCRYPTION_KEY   = random_id.api_encryption_key.b64_std
    DB_PASSWORD          = module.postgres.administrator_password
    REDIS_URL            = module.redis.url
    EMAIL_HOST_PASSWORD  = "" # fill in manually via `az keyvault secret set` once an SMTP provider is chosen
  }
}

# --- Ingress + TLS ---------------------------------------------------------
# See versions.tf for the two-step first-apply note (module.aks must exist
# before the kubernetes/helm providers can authenticate).

module "ingress" {
  source                   = "../../modules/ingress"
  static_ip_address        = module.aks.egress_ip
  static_ip_resource_group = azurerm_resource_group.this.name
  cert_manager_email       = var.cert_manager_email
}
