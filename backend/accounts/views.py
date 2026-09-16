try:
    import mercadopago
except ImportError:
    mercadopago = None
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
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
                "is_superuser": bool((user.is_superuser or user.is_staff) and subscription.status != Subscription.Status.SUSPENDED),
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
                    "is_superuser": bool((user.is_superuser or user.is_staff) and subscription.status != Subscription.Status.SUSPENDED),
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


class CreateCheckoutPreferenceView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan", "basic_monthly")
        if plan not in settings.SUBSCRIPTION_PRICES:
            plan = "basic_monthly"

        plan_info = settings.SUBSCRIPTION_PRICES[plan]
        user = request.user
        subscription = Subscription.get_or_create_for_user(user)

        notification = PaymentNotification.objects.create(
            user=user,
            subscription=subscription,
            plan=plan,
            payment_method=PaymentNotification.PaymentMethod.MERCADOPAGO,
            amount=plan_info["amount"],
            status=PaymentNotification.Status.PENDING,
            payer_notes=f"Checkout iniciado por {user.email} para {plan_info['title']}",
        )

        access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "").strip()

        if access_token:
            try:
                sdk = mercadopago.SDK(access_token)
                frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
                backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")

                item_data = {
                    "id": f"sub_{plan}_{user.id}",
                    "title": plan_info["title"],
                    "description": plan_info.get("description", "Licencia de uso del sistema Business Manager."),
                    "category_id": plan_info.get("category_id", "services"),
                    "quantity": 1,
                    "currency_id": "ARS",
                    "unit_price": float(plan_info["amount"]),
                }
                if plan_info.get("picture_url") and plan_info["picture_url"].startswith("https://"):
                    item_data["picture_url"] = plan_info["picture_url"]

                preference_data = {
                    "items": [item_data],
                    "payer": {
                        "email": user.email,
                    },
                    "back_urls": {
                        "success": f"{frontend_url}/?payment_status=success&plan={plan}&notification_id={notification.id}",
                        "pending": f"{frontend_url}/?payment_status=pending&plan={plan}&notification_id={notification.id}",
                        "failure": f"{frontend_url}/?payment_status=failure&plan={plan}&notification_id={notification.id}",
                    },
                    "external_reference": f"bm_sub_{notification.id}_{user.id}_{plan}",
                    "metadata": {
                        "notification_id": notification.id,
                        "user_id": user.id,
                        "plan": plan,
                        "days": plan_info["days"],
                    },
                    "statement_descriptor": "BUSINESS MANAGER",
                }

                if frontend_url.startswith("https://"):
                    preference_data["auto_return"] = "approved"

                if backend_url and backend_url.startswith("https://") and "localhost" not in backend_url and "127.0.0.1" not in backend_url:
                    preference_data["notification_url"] = f"{backend_url}/api/auth/subscription/webhook/"

                preference_response = sdk.preference().create(preference_data)
                preference = preference_response.get("response", {})

                pref_id = preference.get("id")
                init_point = preference.get("init_point") or preference.get("sandbox_init_point")

                if init_point:
                    notification.mp_preference_id = pref_id or ""
                    notification.save(update_fields=["mp_preference_id"])

                    return Response({
                        "init_point": init_point,
                        "preference_id": pref_id,
                        "notification_id": notification.id,
                        "mode": "live",
                        "plan": plan,
                        "amount": float(plan_info["amount"]),
                    })
                else:
                    error_msg = preference.get("message") or preference_response.get("message") or "No se pudo generar el link de pago en Mercado Pago."
                    notification.payer_notes += f" (Error MP: {error_msg})"
                    notification.save(update_fields=["payer_notes"])
                    return Response(
                        {"error": f"Mercado Pago: {error_msg}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception as e:
                notification.payer_notes += f" (Excepción MP SDK: {str(e)})"
                notification.save(update_fields=["payer_notes"])
                return Response(
                    {"error": f"Error al conectar con Mercado Pago: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # Dev / Sandbox fallback ONLY when no access token is configured
        mock_pref_id = f"mock_pref_{notification.id}_{int(timezone.now().timestamp())}"
        notification.mp_preference_id = mock_pref_id
        notification.save(update_fields=["mp_preference_id"])

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        mock_init_point = f"{frontend_url}/?payment_status=mock_simulate&plan={plan}&notification_id={notification.id}"

        return Response({
            "init_point": mock_init_point,
            "preference_id": mock_pref_id,
            "notification_id": notification.id,
            "mode": "mock",
            "plan": plan,
            "amount": float(plan_info["amount"]),
            "message": "Modo de prueba local (sin token MP configurado). Redirigirá a la simulación de confirmación inmediata.",
        })


class MercadoPagoWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "Business Manager Mercado Pago Webhook"})

    def post(self, request):
        data = request.data
        payment_id = (
            request.query_params.get("data.id")
            or request.query_params.get("id")
            or data.get("data", {}).get("id")
            or data.get("id")
        )

        if not payment_id:
            return Response({"status": "ignored", "reason": "No payment ID found"}, status=status.HTTP_200_OK)

        access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "").strip()
        if not access_token:
            return Response({"status": "ignored", "reason": "No MP access token configured"}, status=status.HTTP_200_OK)

        try:
            sdk = mercadopago.SDK(access_token)
            payment_info = sdk.payment().get(str(payment_id))
            payment = payment_info.get("response", {})

            mp_status = payment.get("status")
            external_reference = payment.get("external_reference", "")
            metadata = payment.get("metadata", {})
            amount = payment.get("transaction_amount")

            user_id = metadata.get("user_id")
            plan = metadata.get("plan", "monthly")
            notification_id = metadata.get("notification_id")

            # Fallback user_id parse from external_reference: bm_sub_{notif_id}_{user_id}_{plan}
            if not user_id and external_reference and external_reference.startswith("bm_sub_"):
                parts = external_reference.split("_")
                if len(parts) >= 4:
                    try:
                        notification_id = int(parts[2]) if not notification_id else notification_id
                        user_id = int(parts[3])
                        plan = parts[4] if len(parts) > 4 else plan
                    except (ValueError, IndexError):
                        pass

            if not user_id:
                return Response({"status": "error", "reason": "User ID not identified"}, status=status.HTTP_200_OK)

            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"status": "error", "reason": f"User {user_id} not found"}, status=status.HTTP_200_OK)

            subscription = Subscription.get_or_create_for_user(user)

            # Find or update PaymentNotification
            notification = None
            if notification_id:
                notification = PaymentNotification.objects.filter(id=notification_id).first()
            if not notification:
                notification = PaymentNotification.objects.filter(mp_payment_id=str(payment_id)).first()
            if not notification:
                notification = PaymentNotification.objects.create(
                    user=user,
                    subscription=subscription,
                    plan=plan,
                    payment_method=PaymentNotification.PaymentMethod.MERCADOPAGO,
                    amount=Decimal(str(amount or "10000.00")),
                    mp_payment_id=str(payment_id),
                )

            notification.mp_payment_id = str(payment_id)
            notification.mp_status = mp_status or ""
            notification.raw_data = payment

            if mp_status == "approved":
                is_premium = "premium" in plan
                is_yearly = "yearly" in plan
                tier = Subscription.Tier.PREMIUM if is_premium else Subscription.Tier.BASIC
                days = 365 if is_yearly else 30
                if is_premium:
                    target_plan = Subscription.Plan.PREMIUM_YEARLY if is_yearly else Subscription.Plan.PREMIUM_MONTHLY
                else:
                    target_plan = Subscription.Plan.BASIC_YEARLY if is_yearly else Subscription.Plan.BASIC_MONTHLY

                subscription.extend(
                    days=days,
                    tier=tier,
                    plan=target_plan,
                    amount=amount,
                    reference=f"Mercado Pago #{payment_id}",
                )
                notification.status = PaymentNotification.Status.APPROVED
                notification.reviewed_at = timezone.now()
                notification.admin_notes = f"Aprobado automáticamente por Webhook de Mercado Pago (Payment ID: {payment_id})"
            elif mp_status in ["rejected", "cancelled"]:
                notification.status = PaymentNotification.Status.REJECTED
                notification.reviewed_at = timezone.now()
                notification.admin_notes = f"Rechazado por Mercado Pago: {payment.get('status_detail', mp_status)}"

            notification.save()
            return Response({"status": "success", "payment_status": mp_status}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status": "error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPaymentStatusView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        subscription = Subscription.get_or_create_for_user(user)
        payment_id = request.query_params.get("payment_id")
        plan = request.query_params.get("plan", "basic_monthly")
        notification_id = request.query_params.get("notification_id")
        is_mock_simulation = request.query_params.get("payment_status") == "mock_simulate"

        is_premium = "premium" in plan
        is_yearly = "yearly" in plan
        tier = Subscription.Tier.PREMIUM if is_premium else Subscription.Tier.BASIC
        days = 365 if is_yearly else 30
        if is_premium:
            target_plan = Subscription.Plan.PREMIUM_YEARLY if is_yearly else Subscription.Plan.PREMIUM_MONTHLY
        else:
            target_plan = Subscription.Plan.BASIC_YEARLY if is_yearly else Subscription.Plan.BASIC_MONTHLY

        # Mock simulation for development environment
        if is_mock_simulation:
            plan_info = settings.SUBSCRIPTION_PRICES.get(plan, settings.SUBSCRIPTION_PRICES.get("basic_monthly"))

            subscription.extend(
                days=days,
                tier=tier,
                plan=target_plan,
                amount=plan_info["amount"] if plan_info else Decimal("10000.00"),
                reference="Simulación de prueba (Local)",
            )

            if notification_id:
                notif = PaymentNotification.objects.filter(id=notification_id, user=user).first()
                if notif:
                    notif.status = PaymentNotification.Status.APPROVED
                    notif.mp_status = "approved"
                    notif.reviewed_at = timezone.now()
                    notif.admin_notes = "Aprobado en simulación de prueba local"
                    notif.save()

            return Response({
                "status": "approved",
                "simulated": True,
                "subscription": subscription.get_summary(),
                "detail": f"¡Licencia {subscription.get_plan_display()} activada con éxito en modo de prueba!",
            })

        # Live verification via Mercado Pago SDK
        access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "").strip()
        if payment_id and access_token:
            try:
                sdk = mercadopago.SDK(access_token)
                payment_res = sdk.payment().get(str(payment_id))
                payment = payment_res.get("response", {})
                mp_status = payment.get("status")

                if mp_status == "approved":
                    amount = payment.get("transaction_amount")
                    subscription.extend(
                        days=days,
                        tier=tier,
                        plan=target_plan,
                        amount=amount,
                        reference=f"Mercado Pago #{payment_id}",
                    )

                    if notification_id:
                        notif = PaymentNotification.objects.filter(id=notification_id, user=user).first()
                        if notif:
                            notif.status = PaymentNotification.Status.APPROVED
                            notif.mp_payment_id = str(payment_id)
                            notif.mp_status = "approved"
                            notif.raw_data = payment
                            notif.reviewed_at = timezone.now()
                            notif.admin_notes = f"Aprobado por verificación directa (Payment ID: {payment_id})"
                            notif.save()

                    return Response({
                        "status": "approved",
                        "subscription": subscription.get_summary(),
                        "detail": "¡Pago confirmado y licencia activada con éxito!",
                    })
            except Exception as e:
                pass

        return Response({
            "status": "pending",
            "subscription": subscription.get_summary(),
            "detail": "Verificando acreditación del pago...",
        })


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

        if action in ["extend_30", "extend_30_basic"]:
            subscription.extend(
                days=30,
                tier=Subscription.Tier.BASIC,
                plan=Subscription.Plan.BASIC_MONTHLY,
                amount=amount or Decimal("10000.00"),
                reference=reference or "Renovación manual Básico 30 días",
            )
        elif action in ["extend_365", "extend_365_basic"]:
            subscription.extend(
                days=365,
                tier=Subscription.Tier.BASIC,
                plan=Subscription.Plan.BASIC_YEARLY,
                amount=amount or Decimal("100000.00"),
                reference=reference or "Renovación manual Básico 1 año",
            )
        elif action == "extend_30_premium":
            subscription.extend(
                days=30,
                tier=Subscription.Tier.PREMIUM,
                plan=Subscription.Plan.PREMIUM_MONTHLY,
                amount=amount or Decimal("20000.00"),
                reference=reference or "Renovación manual Premium 30 días",
            )
        elif action == "extend_365_premium":
            subscription.extend(
                days=365,
                tier=Subscription.Tier.PREMIUM,
                plan=Subscription.Plan.PREMIUM_YEARLY,
                amount=amount or Decimal("200000.00"),
                reference=reference or "Renovación manual Premium 1 año",
            )
        elif action == "activate_trial":
            days = int(request.data.get("days", 14))
            subscription.activate_trial(days=days)
        elif action == "lifetime":
            subscription.activate_lifetime(notes=notes or "Licencia vitalicia premium otorgada por admin")
        elif action == "suspend":
            subscription.suspend(reason=notes or "Suspendido por administrador")
        elif action == "reactivate":
            subscription.reactivate()
        elif action == "expire_now":
            past = timezone.now() - timedelta(days=1)
            subscription.expires_at = past
            subscription.premium_expires_at = past
            subscription.basic_expires_at = past
            subscription.trial_ends_at = past
            subscription.status = Subscription.Status.EXPIRED
            subscription.save()
        elif action == "custom_extend":
            days = int(request.data.get("days", 30))
            tier = request.data.get("tier", Subscription.Tier.BASIC)
            plan = request.data.get("plan")
            subscription.extend(days=days, tier=tier, plan=plan, amount=amount, reference=reference)
        elif action == "set_expiration":
            expires_at_str = request.data.get("expires_at")
            premium_expires_at_str = request.data.get("premium_expires_at")
            basic_expires_at_str = request.data.get("basic_expires_at")
            if expires_at_str:
                subscription.expires_at = expires_at_str
            if premium_expires_at_str:
                subscription.premium_expires_at = premium_expires_at_str
            if basic_expires_at_str:
                subscription.basic_expires_at = basic_expires_at_str
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
            plan_str = payment.plan
            is_premium = "premium" in plan_str
            is_yearly = "yearly" in plan_str
            tier = Subscription.Tier.PREMIUM if is_premium else Subscription.Tier.BASIC
            days = 365 if is_yearly else 30
            if is_premium:
                target_plan = Subscription.Plan.PREMIUM_YEARLY if is_yearly else Subscription.Plan.PREMIUM_MONTHLY
            else:
                target_plan = Subscription.Plan.BASIC_YEARLY if is_yearly else Subscription.Plan.BASIC_MONTHLY

            payment.subscription.extend(
                days=days,
                tier=tier,
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
                "message": f"Pago #{payment.id} aprobado. Licencia de {payment.user.email} extendida por {days} días ({payment.subscription.get_tier_display()}).",
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