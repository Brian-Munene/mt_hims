from audit.context import reset_audit_actor, set_audit_actor


class AuditActorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        ip_address = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
        token_user, token_ip = set_audit_actor(user=user, ip_address=ip_address)
        try:
            return self.get_response(request)
        finally:
            reset_audit_actor(token_user, token_ip)
