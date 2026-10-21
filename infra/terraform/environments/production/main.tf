resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

data "azurerm_client_config" "current" {}

# The shared ACR lives in the staging root's state — read its outputs
# instead of provisioning a second registry (per the plan: one shared ACR,
# images tagged by git SHA so staging/prod never collide).
data "terraform_remote_state" "staging" {
  backend = "azurerm"
  config = {
    resource_group_name  = "rg-avocent-tfstate"
    storage_account_name = "avocenttfstate"
    container_name       = "tfstate"
    key                  = "staging.tfstate"
    use_azuread_auth     = true
  }
}

# --- App secrets, generated once and stored only in Key Vault below --------

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
  name_prefix         = "avocent-production"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  # Deliberately a different range from staging's default (10.10.0.0/16) —
  # these VNets are never peered, but distinct ranges avoid confusion if
  # that ever changes.
  address_space   = "10.20.0.0/16"
  aks_subnet_cidr = "10.20.1.0/24"
  tags            = var.tags
}

module "aks" {
  source              = "../../modules/aks"
  name                = "aks-avocent-production"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  dns_prefix          = "avocent-production"
  tenant_id           = data.azurerm_client_config.current.tenant_id
  subnet_id           = module.network.aks_subnet_id
  node_vm_size        = var.aks_node_vm_size
  node_count          = var.aks_node_count
  sku_tier            = "Standard" # SLA-backed control plane — this is production
  tags                = var.tags
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = data.terraform_remote_state.staging.outputs.acr_id
  role_definition_name = "AcrPull"
  principal_id         = module.aks.kubelet_identity_object_id
}

# --- Data tier -----------------------------------------------------------

module "postgres" {
  source                    = "../../modules/postgres"
  name                      = "psql-avocent-production"
  resource_group_name       = azurerm_resource_group.this.name
  location                  = azurerm_resource_group.this.location
  sku_name                  = var.postgres_sku_name
  allowed_ip                = module.aks.egress_ip
  high_availability_enabled = true
  backup_retention_days     = 35
  tags                      = var.tags
}

module "redis" {
  source              = "../../modules/redis"
  name                = "redis-avocent-production"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku_name            = var.redis_sku_name
  family              = "C"
  capacity            = 1
  allowed_ip          = module.aks.egress_ip
  tags                = var.tags
}

# --- GitHub Actions OIDC identity ----------------------------------------

module "github_oidc" {
  source      = "../../modules/github-oidc"
  environment = "production"
  github_repo = var.github_repo
  acr_id      = data.terraform_remote_state.staging.outputs.acr_id
  aks_id      = module.aks.id
}

# --- Secrets -> Key Vault (never written to a values-*.yaml file) --------

module "keyvault" {
  source               = "../../modules/keyvault"
  name                 = "kv-avocent-production"
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
