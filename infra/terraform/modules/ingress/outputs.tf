output "ip_address" {
  description = "Ingress IP — the nip.io hostnames are api.<ip>.nip.io / app.<ip>.nip.io; later, the real domain's A records point here."
  value       = google_compute_address.ingress.address
}
