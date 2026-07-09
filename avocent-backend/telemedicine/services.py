from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from telemedicine.models import ChatSessionState


def _chat_state_cache_key(clinic_id, patient_phone):
    return f"telemedicine:chat_state:{clinic_id}:{patient_phone}"


def serialize_chat_state(chat_state):
    return {
        "id": str(chat_state.id),
        "clinic_id": str(chat_state.clinic_id),
        "patient_phone": chat_state.patient_phone,
        "current_state": chat_state.current_state,
        "last_interaction_at": chat_state.last_interaction_at.isoformat(),
        "encounter_id": str(chat_state.encounter_id) if chat_state.encounter_id else None,
    }


def cache_chat_session_state(chat_state):
    cache.set(
        _chat_state_cache_key(chat_state.clinic_id, chat_state.patient_phone),
        serialize_chat_state(chat_state),
        timeout=getattr(settings, "TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT", 43200),
    )


def get_chat_session_state(*, clinic_id, patient_phone):
    cache_key = _chat_state_cache_key(clinic_id, patient_phone)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    chat_state = (
        ChatSessionState.objects.filter(clinic_id=clinic_id, patient_phone=patient_phone)
        .order_by("-last_interaction_at", "-created_at")
        .first()
    )
    if chat_state is None:
        return None

    payload = serialize_chat_state(chat_state)
    cache.set(
        cache_key,
        payload,
        timeout=getattr(settings, "TELEMEDICINE_CHAT_STATE_CACHE_TIMEOUT", 43200),
    )
    return payload


def upsert_chat_session_state(
    *,
    clinic,
    patient_phone,
    current_state,
    encounter=None,
    created_by=None,
):
    chat_state, _ = ChatSessionState.objects.update_or_create(
        clinic=clinic,
        patient_phone=patient_phone,
        defaults={
            "current_state": current_state,
            "encounter": encounter,
            "last_interaction_at": timezone.now(),
            "created_by": created_by,
            "is_active": True,
        },
    )
    cache_chat_session_state(chat_state)
    return chat_state
