variable "name_prefix" {
  description = "Prefix for resource names, e.g. avocent-staging."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "address_space" {
  description = "VNet CIDR."
  type        = string
  default     = "10.10.0.0/16"
}

variable "aks_subnet_cidr" {
  description = "Subnet CIDR for the AKS node pool."
  type        = string
  default     = "10.10.1.0/24"
}

variable "tags" {
  type    = map(string)
  default = {}
}
