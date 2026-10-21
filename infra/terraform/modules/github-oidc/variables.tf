variable "environment" {
  description = "GitHub Environment name this identity is federated to — \"staging\" or \"production\". Scoping the federated credential's subject to `environment:<name>` (not just a branch) means the credential only exchanges tokens for a workflow run that targets that GitHub Environment, tying this directly to the environment's required-reviewers gate."
  type        = string
}

variable "github_repo" {
  description = "owner/repo, e.g. Brian-Munene/mt_hims."
  type        = string
}

variable "acr_id" {
  description = "Shared ACR resource ID — grants AcrPush."
  type        = string
}

variable "aks_id" {
  description = "This environment's AKS cluster resource ID — grants cluster user + Azure RBAC cluster access."
  type        = string
}
