from rest_framework import exceptions, permissions
from .models import Subscription


class HasActiveSubscription(permissions.BasePermission):
    """
    Allows access only to authenticated users with an active trial or valid subscription.
    Superusers and staff members bypass subscription restrictions unless suspended.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        subscription = Subscription.get_or_create_for_user(request.user)

        if subscription.status == Subscription.Status.SUSPENDED:
            raise exceptions.PermissionDenied(
                detail={
                    "detail": "Esta cuenta se encuentra suspendida por el administrador.",
                    "code": "subscription_suspended",
                    "subscription": subscription.get_summary(),
                }
            )

        if request.user.is_superuser or request.user.is_staff:
            return True

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
        if not (request.user and request.user.is_authenticated and (request.user.is_superuser or request.user.is_staff)):
            return False

        subscription = getattr(request.user, "subscription", None)
        if subscription and subscription.status == Subscription.Status.SUSPENDED:
            return False

        return True


def RequiresFeature(feature_key: str):
    """
    Permission factory that checks whether the user's subscription tier
    grants access to a specific feature key.
    """
    class FeaturePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False

            subscription = Subscription.get_or_create_for_user(request.user)

            if subscription.status == Subscription.Status.SUSPENDED:
                raise exceptions.PermissionDenied(
                    detail={
                        "detail": "Esta cuenta se encuentra suspendida por el administrador.",
                        "code": "subscription_suspended",
                        "subscription": subscription.get_summary(),
                    }
                )

            if request.user.is_superuser or request.user.is_staff:
                return True

            if not subscription.is_valid:
                raise exceptions.PermissionDenied(
                    detail={
                        "detail": "Tu suscripción o período de prueba ha expirado.",
                        "code": "subscription_expired",
                        "subscription": subscription.get_summary(),
                    }
                )

            if not subscription.has_feature(feature_key):
                raise exceptions.PermissionDenied(
                    detail={
                        "detail": f"Esta funcionalidad requiere una suscripción activa a Plan Premium.",
                        "code": "feature_requires_premium",
                        "feature": feature_key,
                        "subscription": subscription.get_summary(),
                    }
                )

            return True

    return FeaturePermission

