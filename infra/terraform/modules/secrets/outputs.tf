output "secret_ids" {
  value = concat(keys(google_secret_manager_secret.managed), keys(google_secret_manager_secret.manual))
}
