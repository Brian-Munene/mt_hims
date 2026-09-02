variable "name" {
  description = "Globally-unique ACR name (alphanumeric only, no hyphens, 5-50 chars)."
  type        = string
  default     = "acravocent"
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "sku" {
  type    = string
  default = "Basic"
}

variable "tags" {
  type    = map(string)
  default = {}
}
