import io

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException, ParseError
from rest_framework.parsers import JSONParser


class PayloadTooLarge(APIException):
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    default_detail = "Request body is too large."
    default_code = "payload_too_large"


def exceeds_depth(data, max_depth):
    """Iterative, so measuring a hostile payload can't itself recurse too deep."""
    stack = [(data, 1)]
    while stack:
        node, depth = stack.pop()
        if isinstance(node, dict):
            children = node.values()
        elif isinstance(node, list):
            children = node
        else:
            continue
        if depth > max_depth:
            return True
        stack.extend((child, depth + 1) for child in children)
    return False


class SafeJSONParser(JSONParser):
    """JSONParser with a body-size cap and a nesting-depth cap (#37).

    DRF reads the request stream directly, so Django's DATA_UPLOAD_MAX_MEMORY_SIZE
    never applies to JSON bodies, and a few KB of deeply nested brackets raised
    RecursionError -> 500. Both limits now fail as client errors before the data
    reaches serializers, the ORM or the JSON encoder.
    """

    def parse(self, stream, media_type=None, parser_context=None):
        max_bytes = settings.API_JSON_MAX_BYTES
        raw = stream.read(max_bytes + 1)
        if len(raw) > max_bytes:
            raise PayloadTooLarge()

        try:
            data = super().parse(io.BytesIO(raw), media_type, parser_context)
        except RecursionError:
            raise ParseError("JSON parse error - nesting is too deep.")

        if exceeds_depth(data, settings.API_JSON_MAX_DEPTH):
            raise ParseError(f"JSON parse error - nesting exceeds {settings.API_JSON_MAX_DEPTH} levels.")
        return data
