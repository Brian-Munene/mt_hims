variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "dns_prefix" {
  type = string
}

variable "tenant_id" {
  description = "Azure AD tenant ID — required by azure_active_directory_role_based_access_control."
  type        = string
}

variable "subnet_id" {
  type = string
}

variable "node_vm_size" {
  type    = string
  default = "Standard_D2s_v5"
}

variable "node_count" {
  type    = number
  default = 2
}

variable "sku_tier" {
  description = "Free or Standard (Standard adds an SLA + more control-plane throughput; recommended for production)."
  type        = string
  default     = "Free"
}

variable "tags" {
  type    = map(string)
  default = {}
}
