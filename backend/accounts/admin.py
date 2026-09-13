from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import PaymentNotification, Subscription

User = get_user_model()


class SubscriptionInline(admin.StackedInline):
    model = Subscription
    can_delete = False
    verbose_name_plural = "Suscripción / Licencia"
    fk_name = "user"
    extra = 0


class CustomUserAdmin(BaseUserAdmin):
    inlines = (SubscriptionInline,)
    list_display = ("email", "username", "is_staff", "is_superuser", "get_subscription_status", "date_joined")

    def get_subscription_status(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub:
            return f"{sub.get_plan_display()} ({sub.get_status_display()})"
        return "Sin suscripción"
    get_subscription_status.short_description = "Licencia"


# Unregister default User admin and register customized one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user_email",
        "plan",
        "status",
        "days_left",
        "expires_at",
        "last_payment_date",
        "last_payment_amount",
        "created_at",
    )
    list_filter = ("status", "plan")
    search_fields = ("user__email", "user__username", "notes", "last_payment_reference")
    readonly_fields = ("created_at", "updated_at")

    actions = [
        "extend_30_days",
        "extend_365_days",
        "activate_trial_14_days",
        "grant_lifetime",
        "suspend_access",
        "reactivate_access",
    ]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Email Usuario"

    def days_left(self, obj):
        if obj.plan == Subscription.Plan.LIFETIME:
            return "Vitalicio"
        rem = obj.days_remaining
        return f"{rem} días" if rem is not None else "0 días"
    days_left.short_description = "Días Restantes"

    @admin.action(description="🟢 Renovar +30 días (Plan Mensual)")
    def extend_30_days(self, request, queryset):
        for sub in queryset:
            sub.extend(days=30, plan=Subscription.Plan.MONTHLY, amount=10000, reference="Renovado desde Django Admin")
        self.message_user(request, f"{queryset.count()} suscripciones extendidas por 30 días.")

    @admin.action(description="🚀 Renovar +1 año (Plan Anual)")
    def extend_365_days(self, request, queryset):
        for sub in queryset:
            sub.extend(days=365, plan=Subscription.Plan.YEARLY, amount=100000, reference="Renovado desde Django Admin")
        self.message_user(request, f"{queryset.count()} suscripciones extendidas por 1 año.")

    @admin.action(description="⏳ Activar / Reiniciar Prueba (14 días)")
    def activate_trial_14_days(self, request, queryset):
        for sub in queryset:
            sub.activate_trial(days=14)
        self.message_user(request, f"{queryset.count()} pruebas activadas por 14 días.")

    @admin.action(description="👑 Otorgar Licencia Vitalicia")
    def grant_lifetime(self, request, queryset):
        for sub in queryset:
            sub.activate_lifetime(notes="Licencia vitalicia otorgada desde Django Admin")
        self.message_user(request, f"{queryset.count()} licencias vitalicias otorgadas.")

    @admin.action(description="⛔ Suspender Acceso")
    def suspend_access(self, request, queryset):
        for sub in queryset:
            sub.suspend(reason="Suspendido desde Django Admin")
        self.message_user(request, f"{queryset.count()} cuentas suspendidas.")

    @admin.action(description="✅ Reactivar Acceso")
    def reactivate_access(self, request, queryset):
        for sub in queryset:
            sub.reactivate()
        self.message_user(request, f"{queryset.count()} cuentas reactivadas.")


@admin.register(PaymentNotification)
class PaymentNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_email",
        "plan",
        "amount",
        "reference_code",
        "status",
        "created_at",
        "reviewed_at",
    )
    list_filter = ("status", "plan", "created_at")
    search_fields = ("user__email", "reference_code", "payer_notes", "admin_notes")
    readonly_fields = ("created_at", "updated_at")

    actions = ["approve_payments", "reject_payments"]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Email Usuario"

    @admin.action(description="✅ Aprobar pagos seleccionados y extender licencias")
    def approve_payments(self, request, queryset):
        count = 0
        for payment in queryset.filter(status=PaymentNotification.Status.PENDING):
            days = 365 if payment.plan == PaymentNotification.PlanRequested.YEARLY else 30
            target_plan = Subscription.Plan.YEARLY if payment.plan == PaymentNotification.PlanRequested.YEARLY else Subscription.Plan.MONTHLY
            payment.subscription.extend(
                days=days,
                plan=target_plan,
                amount=payment.amount,
                reference=payment.reference_code or f"Pago #{payment.id} aprobado",
            )
            payment.status = PaymentNotification.Status.APPROVED
            payment.reviewed_at = timezone.now()
            payment.reviewed_by = request.user
            payment.save()
            count += 1
        self.message_user(request, f"{count} pagos aprobados y licencias extendidas.")

    @admin.action(description="❌ Rechazar pagos seleccionados")
    def reject_payments(self, request, queryset):
        count = queryset.filter(status=PaymentNotification.Status.PENDING).update(
            status=PaymentNotification.Status.REJECTED,
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(request, f"{count} pagos rechazados.")
