def require_permission(permission):
    def decorator(view):
        setattr(view, "required_permission", permission)
        return view

    return decorator
