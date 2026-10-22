# Terraform-generated secrets: secret + version, both managed here.
resource "google_secret_manager_secret" "managed" {
  for_each  = nonsensitive(toset(keys(var.secrets)))
  secret_id = each.key
  labels    = var.labels

  replication {
    user_managed {
      replicas {
        location = var.region # keep PHI-adjacent secrets in-region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "managed" {
  for_each    = nonsensitive(toset(keys(var.secrets)))
  secret      = google_secret_manager_secret.managed[each.key].id
  secret_data = var.secrets[each.key]
}

# Secrets whose value is set by hand (e.g. EMAIL_HOST_PASSWORD once an SMTP
# provider is chosen): Terraform owns the container, never the value —
#   printf '%s' "<value>" | gcloud secrets versions add <ID> --project <project> --data-file=-
resource "google_secret_manager_secret" "manual" {
  for_each  = toset(var.manual_secret_ids)
  secret_id = each.key
  labels    = var.labels

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}
