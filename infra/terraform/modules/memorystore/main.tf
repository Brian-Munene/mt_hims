resource "google_redis_instance" "this" {
  name           = var.name
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version
  labels         = var.labels

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  # AUTH + TLS. The server cert is signed by a per-instance Google-managed CA
  # (server_ca_certs below), which clients must trust explicitly — see
  # REDIS_SSL_CA_CERTS in avocent-backend/avocent_backend/settings.py and the
  # redis.caCert value in the Helm chart.
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }
}
