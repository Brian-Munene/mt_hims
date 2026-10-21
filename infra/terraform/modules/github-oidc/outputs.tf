output "client_id" {
  description = "Set as the AZURE_CLIENT_ID repo/environment variable (not secret) that azure/login@v2 uses in the GitHub Actions workflow."
  value       = azuread_application.this.client_id
}

output "object_id" {
  description = "Service principal object ID — pass into the keyvault module's reader_principal_ids."
  value       = azuread_service_principal.this.object_id
}
