# One Azure AD App Registration per environment, federated to that
# environment's GitHub Environment (not just a branch) — a workflow run only
# gets a token if it's actually running under that GitHub Environment, which
# is also where the required-reviewers approval gate lives for production.
# No client secret is ever created; azure/login@v2 in the workflow exchanges
# the GitHub-issued OIDC token for an Azure AD token directly.

resource "azuread_application" "this" {
  display_name = "avocent-${var.environment}-github-oidc"
}

resource "azuread_service_principal" "this" {
  client_id = azuread_application.this.client_id
}

resource "azuread_application_federated_identity_credential" "this" {
  application_id = azuread_application.this.id
  display_name   = "github-${var.environment}"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${var.github_repo}:environment:${var.environment}"
}

resource "azurerm_role_assignment" "acr_push" {
  scope                = var.acr_id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.this.object_id
}

# Lets `az aks get-credentials` succeed for this identity.
resource "azurerm_role_assignment" "aks_cluster_user" {
  scope                = var.aks_id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = azuread_service_principal.this.object_id
}

# Actual in-cluster permissions once kubectl/helm are authenticated (the AKS
# module enables azure_rbac_enabled, so this is enforced by Kubernetes RBAC
# via Azure AD, not a separate ClusterRoleBinding to manage).
resource "azurerm_role_assignment" "aks_rbac_admin" {
  scope                = var.aks_id
  role_definition_name = "Azure Kubernetes Service RBAC Admin"
  principal_id         = azuread_service_principal.this.object_id
}
