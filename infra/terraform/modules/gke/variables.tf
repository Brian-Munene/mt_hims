variable "name" {
  type = string
}

variable "project_id" {
  type = string
}

variable "location" {
  description = "Zone (e.g. africa-south1-a) for a zonal cluster, or region (africa-south1) for a regional one."
  type        = string
}

variable "network_id" {
  type = string
}

variable "subnet_name" {
  type = string
}

variable "pods_range_name" {
  type = string
}

variable "services_range_name" {
  type = string
}

variable "master_cidr" {
  description = "/28 for the control plane's private peering — must not overlap the VPC's ranges."
  type        = string
  default     = "172.16.0.0/28"
}

variable "machine_type" {
  type = string
}

variable "node_count" {
  description = "Nodes per zone."
  type        = number
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "labels" {
  type    = map(string)
  default = {}
}
