from rest_framework import exceptions, permissions
from .models import Subscription


class HasActiveSubscription(permissions.BasePermission):
    """
    Allows access only to authenticated users with an active trial or valid subscription.
    Superusers and staff members bypass subscription restrictions.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.is_staff:
            return True

        subscription = Subscription.get_or_create_for_user(request.user)

        if not subscription.is_valid:
            raise exceptions.PermissionDenied(
                detail={
                    "detail": "Tu suscripción o período de prueba ha expirado.",
                    "code": "subscription_expired",
                    "subscription": subscription.get_summary(),
                }
            )

        return True


class IsSuperUserOrStaff(permissions.BasePermission):
    """
    Allows access only to superusers and staff members (Owner panel).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.is_staff)
        )

