# Installs ingress-nginx (bound to the AKS module's static egress IP, so
# cluster egress and public ingress share one address) and cert-manager
# (CRDs + controller only — the ClusterIssuer itself is plain YAML applied
# separately via `kubectl apply -f infra/k8s/cluster-issuer-<env>.yaml`,
# since a Terraform-managed custom resource for a CRD installed in the same
# apply is a well-known footgun with the kubernetes provider).
#
# Requires the `helm` provider to be configured against the cluster this
# module targets — done in the environment root using the aks module's
# kube_admin_config output.

resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.loadBalancerIP"
    value = var.static_ip_address
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-resource-group"
    value = var.static_ip_resource_group
  }
}

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}
