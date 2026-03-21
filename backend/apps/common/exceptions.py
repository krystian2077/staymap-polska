from rest_framework.exceptions import APIException, ValidationError as DRFValidationError
from rest_framework.views import exception_handler


class StayMapException(APIException):
    status_code = 400
    default_code = "staymap_error"
    default_detail = "Wystąpił błąd."


class BookingUnavailableError(StayMapException):
    status_code = 409
    default_code = "BOOKING_UNAVAILABLE"
    default_detail = "Wybrane daty są niedostępne."


class PricingError(StayMapException):
    status_code = 422
    default_code = "PRICING_ERROR"
    default_detail = "Nie udało się obliczyć ceny."


class BookingNotCancellableError(StayMapException):
    status_code = 400
    default_code = "BOOKING_NOT_CANCELLABLE"
    default_detail = "Tej rezerwacji nie można już anulować."


class AIServiceError(StayMapException):
    status_code = 503
    default_code = "AI_SERVICE_UNAVAILABLE"
    default_detail = "Usługa AI jest chwilowo niedostępna."


class CompareLimitError(StayMapException):
    status_code = 400
    default_code = "COMPARE_LIMIT"
    default_detail = "Osiągnięto limit ofert w porównaniu."


class CompareSessionRequiredError(StayMapException):
    status_code = 400
    default_code = "COMPARE_SESSION_REQUIRED"
    default_detail = "Brak sesji porównania — wywołaj POST /compare/bootstrap/."


def _validation_message_and_field(data):
    """Z dict błędów DRF zwraca (message, first_field_name)."""
    if not isinstance(data, dict):
        return str(data), None

    if "detail" in data and len(data) == 1:
        d = data["detail"]
        if isinstance(d, list):
            return (str(d[0]) if d else "Błąd walidacji."), None
        return str(d), None

    first_field = None
    parts = []
    for key, val in data.items():
        if key == "detail":
            continue
        if first_field is None:
            first_field = key
        if isinstance(val, list):
            for item in val:
                parts.append(f"{key}: {item}")
        elif isinstance(val, dict):
            sub_msg, sub_field = _validation_message_and_field(val)
            parts.append(sub_msg)
            if first_field is None and sub_field:
                first_field = sub_field
        else:
            parts.append(f"{key}: {val}")
    msg = "; ".join(parts) if parts else "Błąd walidacji."
    return msg, first_field


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, DRFValidationError):
        code = "validation_error"
        message, field = _validation_message_and_field(response.data)
    else:
        code = getattr(exc, "default_code", None) or getattr(exc, "code", "error")
        if not isinstance(code, str):
            code = "error"
        field = None
        message = ""
        if isinstance(response.data, dict):
            detail = response.data.get("detail")
            if isinstance(detail, list):
                message = str(detail[0]) if detail else str(exc)
            else:
                message = str(detail) if detail is not None else str(exc)
            field = response.data.get("field")
        else:
            message = str(response.data)
        if not message:
            message = str(exc)

    response.data = {
        "error": {
            "code": code.upper() if isinstance(code, str) else "ERROR",
            "message": message,
            "field": field,
            "status": response.status_code,
        }
    }
    return response
