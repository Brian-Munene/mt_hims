# Fixed public IP for the ingress-nginx LoadBalancer Service. It survives
# controller reinstalls, so the nip.io hostnames (and later the real domain's
# A records) never move.
resource "google_compute_address" "ingress" {
  name         = var.address_name
  region       = var.region
  address_type = "EXTERNAL"
  network_tier = "PREMIUM"
}

resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true

  set = [
    {
      name  = "controller.service.loadBalancerIP"
      value = google_compute_address.ingress.address
    },
    {
      # Preserve client source IPs (Django logging/rate limiting see the real
      # caller instead of a node IP).
      name  = "controller.service.externalTrafficPolicy"
      value = "Local"
    },
  ]
}

# The ClusterIssuer itself is NOT Terraform-managed (a custom resource for a
# CRD installed in the same apply is unreliable with the kubernetes provider)
# — apply infra/k8s/cluster-issuer-*.yaml once cert-manager's CRDs exist.
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true

  set = [
    {
      name  = "crds.enabled"
      value = "true"
    },
  ]
}
