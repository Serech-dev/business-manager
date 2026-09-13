from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class Subscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = "trial", "Prueba Gratuita"
        ACTIVE = "active", "Activa"
        EXPIRED = "expired", "Vencida"
        SUSPENDED = "suspended", "Suspendida"

    class Plan(models.TextChoices):
        TRIAL = "trial", "Prueba (14 días)"
        MONTHLY = "monthly", "Plan Mensual ($10.000/mes)"
        YEARLY = "yearly", "Plan Anual ($100.000/año)"
        LIFETIME = "lifetime", "Licencia Vitalicia"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
    )

    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.TRIAL,
    )

    start_date = models.DateTimeField(
        default=timezone.now,
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_trial_used = models.BooleanField(
        default=True,
    )

    notes = models.TextField(
        blank=True,
    )

    last_payment_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_payment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    last_payment_reference = models.CharField(
        max_length=255,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        ident = self.user.email or self.user.username
        return f"{ident} - {self.get_plan_display()} ({self.get_status_display()})"

    @property
    def is_valid(self):
        """Returns True if the subscription allows using the application."""
        if self.user.is_superuser or self.user.is_staff:
            return True

        if self.status == self.Status.SUSPENDED:
            return False

        if self.plan == self.Plan.LIFETIME and self.status == self.Status.ACTIVE:
            return True

        if self.expires_at is None:
            return False

        return timezone.now() <= self.expires_at

    @property
    def effective_status(self):
        """Calculates dynamic status taking expiration into account."""
        if self.user.is_superuser:
            return self.Status.ACTIVE

        if self.status == self.Status.SUSPENDED:
            return self.Status.SUSPENDED

        if self.plan == self.Plan.LIFETIME:
            return self.Status.ACTIVE

        if self.expires_at and timezone.now() > self.expires_at:
            return self.Status.EXPIRED

        return self.status

    @property
    def days_remaining(self):
        """Returns integer remaining days until expiration, or None for lifetime."""
        if self.plan == self.Plan.LIFETIME or self.user.is_superuser:
            return 9999

        if not self.expires_at:
            return 0

        now = timezone.now()
        if now >= self.expires_at:
            return 0

        diff = self.expires_at - now
        return diff.days + (1 if diff.seconds > 0 else 0)

    @property
    def is_trial(self):
        return self.effective_status == self.Status.TRIAL

    def extend(self, days=30, plan=None, amount=None, reference=""):
        """Extends current subscription by N days."""
        now = timezone.now()
        base_date = self.expires_at if (self.expires_at and self.expires_at > now) else now
        self.expires_at = base_date + timedelta(days=days)
        self.status = self.Status.ACTIVE

        if plan:
            self.plan = plan
        elif self.plan == self.Plan.TRIAL:
            self.plan = self.Plan.MONTHLY if days <= 60 else self.Plan.YEARLY

        if amount is not None:
            self.last_payment_amount = Decimal(str(amount))
            self.last_payment_date = now

        if reference:
            self.last_payment_reference = reference

        self.save()
        return self

    def activate_lifetime(self, notes=""):
        """Grants lifetime license."""
        self.plan = self.Plan.LIFETIME
        self.status = self.Status.ACTIVE
        self.expires_at = None
        if notes:
            self.notes = f"{self.notes}\n{notes}".strip()
        self.save()
        return self

    def suspend(self, reason=""):
        """Suspends access for the user."""
        self.status = self.Status.SUSPENDED
        if reason:
            self.notes = f"{self.notes}\n[Suspendido {timezone.now().strftime('%Y-%m-%d')}]: {reason}".strip()
        self.save()
        return self

    def reactivate(self):
        """Reactivates suspended subscription."""
        now = timezone.now()
        if not self.expires_at or self.expires_at <= now:
            self.expires_at = now + timedelta(days=30)
        self.status = self.Status.ACTIVE
        self.save()
        return self

    def activate_trial(self, days=14):
        """Activates or resets trial period."""
        now = timezone.now()
        self.status = self.Status.TRIAL
        self.plan = self.Plan.TRIAL
        self.start_date = now
        self.expires_at = now + timedelta(days=days)
        self.trial_ends_at = self.expires_at
        self.is_trial_used = True
        self.save()
        return self

    def get_summary(self):
        return {
            "status": self.effective_status,
            "status_display": dict(self.Status.choices).get(self.effective_status, self.effective_status),
            "plan": self.plan,
            "plan_display": self.get_plan_display(),
            "is_valid": self.is_valid,
            "days_remaining": self.days_remaining,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_trial": self.is_trial,
            "is_superuser": bool(self.user.is_superuser or self.user.is_staff),
            "payment_info": {
                "alias": "gestor.negocios.mp",
                "cbu": "0000003100010000000000",
                "holder": "Business Manager Payments",
                "email_contact": "soporte.businessmanager@gmail.com",
                "monthly_price": 10000,
                "yearly_price": 100000,
            },
        }

    @classmethod
    def get_or_create_for_user(cls, user):
        """Retrieves or creates initial 14-day trial subscription for a user."""
        sub, created = cls.objects.get_or_create(
            user=user,
            defaults={
                "status": cls.Status.TRIAL,
                "plan": cls.Plan.TRIAL,
                "start_date": timezone.now(),
                "expires_at": timezone.now() + timedelta(days=14),
                "trial_ends_at": timezone.now() + timedelta(days=14),
                "is_trial_used": True,
            },
        )
        return sub


class PaymentNotification(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente de revisión"
        APPROVED = "approved", "Aprobado"
        REJECTED = "rejected", "Rechazado"

    class PlanRequested(models.TextChoices):
        MONTHLY = "monthly", "Plan Mensual ($10.000/mes)"
        YEARLY = "yearly", "Plan Anual ($100.000/año)"

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payment_notifications",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_notifications",
    )

    plan = models.CharField(
        max_length=20,
        choices=PlanRequested.choices,
        default=PlanRequested.MONTHLY,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("10000.00"),
    )

    reference_code = models.CharField(
        max_length=255,
        blank=True,
        help_text="N° de comprobante / referencia de transferencia",
    )

    payer_notes = models.TextField(
        blank=True,
        help_text="Comentario o aclaración del cliente",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    admin_notes = models.TextField(
        blank=True,
        help_text="Notas internas del administrador",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_payments",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pago #{self.id} de {self.user.email} - ${self.amount} ({self.get_status_display()})"
