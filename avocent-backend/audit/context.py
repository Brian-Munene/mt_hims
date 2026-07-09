from contextvars import ContextVar


_current_audit_actor = ContextVar("current_audit_actor", default=None)
_current_audit_ip = ContextVar("current_audit_ip", default=None)


def set_audit_actor(user=None, ip_address=None):
    token_user = _current_audit_actor.set(user)
    token_ip = _current_audit_ip.set(ip_address)
    return token_user, token_ip


def reset_audit_actor(token_user, token_ip):
    _current_audit_actor.reset(token_user)
    _current_audit_ip.reset(token_ip)


def get_audit_actor():
    return _current_audit_actor.get()


def get_audit_ip_address():
    return _current_audit_ip.get()
