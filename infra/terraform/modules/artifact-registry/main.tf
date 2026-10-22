resource "google_artifact_registry_repository" "this" {
  repository_id = var.repository_id
  location      = var.location
  format        = "DOCKER"
  description   = "Avocent backend/frontend images, tagged by git SHA (shared by staging and production)."
  labels        = var.labels

  # Every branch push builds an image; without cleanup the repo grows forever.
  # Keeps the newest N versions of each image, deletes untagged layers (the
  # buildcache tag is always kept).
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.keep_count
    }
  }

  cleanup_policies {
    id     = "keep-buildcache"
    action = "KEEP"
    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["buildcache"]
    }
  }

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "2592000s" # 30 days
    }
  }
}

# Pull access for GKE node service accounts (this project's and, via the
# production root, production's).
resource "google_artifact_registry_repository_iam_member" "readers" {
  for_each   = toset(var.reader_members)
  repository = google_artifact_registry_repository.this.name
  location   = google_artifact_registry_repository.this.location
  role       = "roles/artifactregistry.reader"
  member     = each.value
}
