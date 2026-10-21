# Non-secret, environment-specific values. Commit this file — nothing here
# is a credential (all real secrets are generated/fetched inside main.tf and
# land only in the staging Key Vault, never in tfvars).

cert_manager_email = "REPLACE-WITH-YOUR-EMAIL"

# Defaults in variables.tf are already sized for staging (cheapest viable
# tiers) — override here only if they need to change.
