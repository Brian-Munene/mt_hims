variable "project_id" {
  type = string
}

variable "repository_id" {
  type    = string
  default = "avocent"
}

variable "location" {
  type = string
}

variable "keep_count" {
  description = "Most recent versions of each image always kept, regardless of age."
  type        = number
  default     = 20
}

variable "reader_members" {
  description = "IAM members (e.g. serviceAccount:...) granted roles/artifactregistry.reader."
  type        = list(string)
  default     = []
}

variable "labels" {
  type    = map(string)
  default = {}
}
