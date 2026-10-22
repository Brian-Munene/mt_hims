output "connection_name" {
  description = "project:region:instance — for cloud-sql-proxy."
  value       = google_sql_database_instance.this.connection_name
}

output "private_ip" {
  description = "Set as postgres.host in the Helm values overlay."
  value       = google_sql_database_instance.this.private_ip_address
}

output "password" {
  value     = random_password.app.result
  sensitive = true
}
