variable "name" {
  description = "Globally-unique Redis cache name."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "sku_name" {
  type    = string
  default = "Basic"
}

variable "family" {
  description = "C for Basic/Standard, P for Premium."
  type        = string
  default     = "C"
}

variable "capacity" {
  description = "0-6 for Basic/Standard (C family), 1-5 for Premium (P family)."
  type        = number
  default     = 0
}

variable "allowed_ip" {
  description = "Single IP allowed through the firewall — the AKS module's egress_ip output."
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
