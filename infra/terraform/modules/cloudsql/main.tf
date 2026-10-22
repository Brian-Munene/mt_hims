resource "random_password" "app" {
  length  = 32
  special = false # Postgres connection strings/URLs get built from this; keep it URL-safe
}

resource "google_sql_database_instance" "this" {
  name                = var.name
  region              = var.region
  database_version    = var.database_version
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    edition           = "ENTERPRISE"
    availability_type = var.high_availability_enabled ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.disk_size_gb
    disk_autoresize   = true
    user_labels       = var.labels

    # Private IP only — reachable from the GKE VPC through Private Service
    # Access, never from the internet. TLS is still enforced in transit
    # (Django connects with DB_SSLMODE=require).
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "01:00" # UTC — 04:00 EAT, outside clinic hours
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7 # Enterprise edition maximum

      backup_retention_settings {
        retained_backups = var.backup_retention_count
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 2 # UTC
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled = true
    }
  }
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.this.name
}

resource "google_sql_user" "app" {
  name     = var.user_name
  instance = google_sql_database_instance.this.name
  password = random_password.app.result
}
