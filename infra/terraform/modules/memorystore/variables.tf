variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "network_id" {
  type = string
}

variable "tier" {
  description = "BASIC (single node, staging) or STANDARD_HA (replicated with automatic failover, production)."
  type        = string
}

variable "memory_size_gb" {
  type    = number
  default = 1
}

variable "redis_version" {
  type    = string
  default = "REDIS_7_2"
}

variable "labels" {
  type    = map(string)
  default = {}
}
