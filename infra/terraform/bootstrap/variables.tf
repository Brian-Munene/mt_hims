variable "location" {
  description = "Azure region for the Terraform state storage account."
  type        = string
  default     = "South Africa North"
}

variable "resource_group_name" {
  description = "Resource group that holds the Terraform state storage account."
  type        = string
  default     = "rg-avocent-tfstate"
}

variable "storage_account_name" {
  description = "Globally-unique storage account name (lowercase, 3-24 chars, no hyphens). Must be changed if the default is taken."
  type        = string
  default     = "avocenttfstate"
}

variable "container_name" {
  description = "Blob container that holds the .tfstate files for each environment."
  type        = string
  default     = "tfstate"
}
