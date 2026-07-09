from functools import wraps


def _fallback_task(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    def delay(*args, **kwargs):
        return func(*args, **kwargs)

    def apply_async(args=None, kwargs=None, **options):
        return func(*(args or ()), **(kwargs or {}))

    wrapper.delay = delay
    wrapper.apply_async = apply_async
    return wrapper


try:
    from celery import shared_task as celery_shared_task
except ImportError:  # pragma: no cover - optional dependency before install
    CELERY_AVAILABLE = False

    def shared_task(*task_args, **task_kwargs):
        if task_args and callable(task_args[0]) and len(task_args) == 1 and not task_kwargs:
            return _fallback_task(task_args[0])

        def decorator(func):
            return _fallback_task(func)

        return decorator
else:
    CELERY_AVAILABLE = True
    shared_task = celery_shared_task
