from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentNotification, Subscription
from .permissions import IsSuperUserOrStaff
from .serializers import (AdminStoreOverviewSerializer, LoginSerializer,
                          PaymentNotificationSerializer, RegisterSerializer,
                          SubscriptionSerializer)

User = get_user_model()


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        subscription = Subscription.get_or_create_for_user(user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "is_superuser": bool(user.is_superuser or user.is_staff),
            },
            "subscription": subscription.get_summary(),
        })


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, "auth_token") and request.user.auth_token:
            request.user.auth_token.delete()

        return Response(
            {"detail": "Sesión cerrada correctamente."},
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        subscription = Subscription.get_or_create_for_user(user)

        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_superuser": bool(user.is_superuser or user.is_staff),
                },
                "subscription": subscription.get_summary(),
            },
            status=status.HTTP_201_CREATED,
        )


class SubscriptionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = Subscription.get_or_create_for_user(request.user)
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)


class NotifyPaymentView(generics.CreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentNotificationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class MyPaymentNotificationsView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentNotificationSerializer

    def get_queryset(self):
        return PaymentNotification.objects.filter(user=self.request.user)


# ==========================================
# SUPERADMIN / OWNER CONTROL PANEL ENDPOINTS
# ==========================================

class AdminStoresListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        users = (
            User.objects.all()
            .select_related("subscription")
            .prefetch_related(
                "products",
                "business_transactions",
                "business_clients",
                "payment_notifications",
            )
            .order_by("-date_joined")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            users = users.filter(Q(email__icontains=search) | Q(username__icontains=search))

        status_filter = request.query_params.get("status", "").strip()
        if status_filter:
            users = users.filter(subscription__status=status_filter)

        serialized_stores = AdminStoreOverviewSerializer(users, many=True).data

        # Calculate high level system stats
        all_subs = [Subscription.get_or_create_for_user(u) for u in User.objects.all()]
        total_stores = len(all_subs)
        active_count = sum(1 for s in all_subs if s.effective_status == Subscription.Status.ACTIVE)
        trial_count = sum(1 for s in all_subs if s.effective_status == Subscription.Status.TRIAL)
        expired_count = sum(1 for s in all_subs if s.effective_status == Subscription.Status.EXPIRED)
        suspended_count = sum(1 for s in all_subs if s.effective_status == Subscription.Status.SUSPENDED)
        pending_payments = PaymentNotification.objects.filter(status=PaymentNotification.Status.PENDING).count()

        return Response({
            "stores": serialized_stores,
            "summary": {
                "total_stores": total_stores,
                "active_count": active_count,
                "trial_count": trial_count,
                "expired_count": expired_count,
                "suspended_count": suspended_count,
                "pending_payments_count": pending_payments,
            },
        })


class AdminManageSubscriptionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def post(self, request, user_id):
        target_user = generics.get_object_or_404(User, pk=user_id)
        subscription = Subscription.get_or_create_for_user(target_user)

        action = request.data.get("action")
        notes = request.data.get("notes", "").strip()
        amount = request.data.get("amount")
        reference = request.data.get("reference", "").strip()

        if action == "extend_30":
            subscription.extend(
                days=30,
                plan=Subscription.Plan.MONTHLY,
                amount=amount or Decimal("10000.00"),
                reference=reference or "Renovación manual 30 días",
            )
        elif action == "extend_365":
            subscription.extend(
                days=365,
                plan=Subscription.Plan.YEARLY,
                amount=amount or Decimal("100000.00"),
                reference=reference or "Renovación manual 1 año",
            )
        elif action == "activate_trial":
            days = int(request.data.get("days", 14))
            subscription.activate_trial(days=days)
        elif action == "lifetime":
            subscription.activate_lifetime(notes=notes or "Licencia vitalicia otorgada por admin")
        elif action == "suspend":
            subscription.suspend(reason=notes or "Suspendido por administrador")
        elif action == "reactivate":
            subscription.reactivate()
        elif action == "custom_extend":
            days = int(request.data.get("days", 30))
            plan = request.data.get("plan")
            subscription.extend(days=days, plan=plan, amount=amount, reference=reference)
        elif action == "set_expiration":
            expires_at_str = request.data.get("expires_at")
            if expires_at_str:
                subscription.expires_at = expires_at_str
                subscription.status = Subscription.Status.ACTIVE
                subscription.save()
        else:
            return Response(
                {"error": f"Acción '{action}' no reconocida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if notes and action not in ["lifetime", "suspend"]:
            subscription.notes = f"{subscription.notes}\n[{timezone.now().strftime('%Y-%m-%d')}]: {notes}".strip()
            subscription.save()

        return Response({
            "message": "Licencia actualizada con éxito.",
            "subscription": subscription.get_summary(),
        })


class AdminPaymentNotificationsListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSuperUserOrStaff]
    serializer_class = PaymentNotificationSerializer

    def get_queryset(self):
        qs = PaymentNotification.objects.select_related("user", "subscription").order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminReviewPaymentNotificationView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def post(self, request, pk):
        payment = generics.get_object_or_404(PaymentNotification, pk=pk)
        decision = request.data.get("decision")  # "approve" or "reject"
        admin_notes = request.data.get("admin_notes", "").strip()

        if decision == "approve":
            days = 365 if payment.plan == PaymentNotification.PlanRequested.YEARLY else 30
            target_plan = Subscription.Plan.YEARLY if payment.plan == PaymentNotification.PlanRequested.YEARLY else Subscription.Plan.MONTHLY

            payment.subscription.extend(
                days=days,
                plan=target_plan,
                amount=payment.amount,
                reference=payment.reference_code or f"Pago #{payment.id} aprobado por panel",
            )
            payment.status = PaymentNotification.Status.APPROVED
            payment.reviewed_at = timezone.now()
            payment.reviewed_by = request.user
            payment.admin_notes = admin_notes
            payment.save()

            return Response({
                "message": f"Pago #{payment.id} aprobado. Licencia de {payment.user.email} extendida por {days} días.",
                "payment": PaymentNotificationSerializer(payment).data,
            })

        elif decision == "reject":
            payment.status = PaymentNotification.Status.REJECTED
            payment.reviewed_at = timezone.now()
            payment.reviewed_by = request.user
            payment.admin_notes = admin_notes
            payment.save()

            return Response({
                "message": f"Pago #{payment.id} rechazado.",
                "payment": PaymentNotificationSerializer(payment).data,
            })

        return Response(
            {"error": "Decisión inválida. Debe ser 'approve' o 'reject'."},
            status=status.HTTP_400_BAD_REQUEST,
        )