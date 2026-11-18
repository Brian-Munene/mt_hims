output "host" {
  value = google_redis_instance.this.host
}

output "port" {
  description = "6378 when transit encryption is on."
  value       = google_redis_instance.this.port
}

output "url" {
  description = "Full rediss:// URL, ready to drop straight into the Helm chart's redis.url value."
  value       = "rediss://:${google_redis_instance.this.auth_string}@${google_redis_instance.this.host}:${google_redis_instance.this.port}/0"
  sensitive   = true
}

output "server_ca_cert" {
  description = "PEM the clients must trust (not a secret, but stored alongside the URL for CI convenience)."
  value       = google_redis_instance.this.server_ca_certs[0].cert
}
