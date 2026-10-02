from rest_framework.views import exception_handler
from rest_framework.exceptions import ErrorDetail


def unwrap_error_detail(data, key=None):
    """
    Recursively unwrap DRF ErrorDetail instances back to native Python types
    (bool, int, str) so that nested JSON responses for custom permission denials
    (such as subscription status) don't serialize booleans as string 'False'/'True'.
    """
    if isinstance(data, dict):
        return {k: unwrap_error_detail(v, key=k) for k, v in data.items()}
    elif isinstance(data, (list, tuple)):
        return [unwrap_error_detail(item, key=key) for item in data]
    elif isinstance(data, ErrorDetail):
        val = str(data)
        if val == "True":
            return True
        elif val == "False":
            return False
        elif val == "None":
            return None
        if key and any(k in key for k in ("days", "price", "count", "remaining", "amount", "id", "num")):
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
        return val
    return data


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that unwraps ErrorDetail wrapper objects
    into native primitive types.
    """
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, (dict, list)):
        response.data = unwrap_error_detail(response.data)
    return response

