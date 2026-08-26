output "ingress_ip" {
  description = "Same as the input static_ip_address — exposed here for convenience so the environment root can print it alongside the rest of the post-apply instructions (deriving nip.io hostnames, etc.)."
  value       = var.static_ip_address
}
