variable "project_id" {
  type = string
}

variable "environment" {
  description = "GitHub Environment name the deploy job declares (staging / production)."
  type        = string
}

variable "github_repo" {
  description = "owner/repo — the only repository whose tokens the provider accepts."
  type        = string
}

variable "pool_id" {
  type    = string
  default = "github"
}

variable "artifact_registry" {
  description = "When set, also creates the push-only build identity for this repository. Only the root that owns the registry (staging) sets it."
  type = object({
    project_id = string
    location   = string
    name       = string
  })
  default = null
}
