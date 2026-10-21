output "fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "administrator_login" {
  value = var.administrator_login
}

output "administrator_password" {
  value     = random_password.admin.result
  sensitive = true
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.app.name
}
