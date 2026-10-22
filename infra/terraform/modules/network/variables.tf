variable "name_prefix" {
  type = string
}

variable "region" {
  type = string
}

variable "nodes_cidr" {
  description = "Primary range of the GKE subnet (node IPs)."
  type        = string
  default     = "10.10.0.0/20"
}

variable "pods_cidr" {
  description = "Secondary range for pod IPs."
  type        = string
  default     = "10.11.0.0/16"
}

variable "services_cidr" {
  description = "Secondary range for Kubernetes Service ClusterIPs."
  type        = string
  default     = "10.12.0.0/20"
}
