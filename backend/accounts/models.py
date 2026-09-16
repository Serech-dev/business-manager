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

    class Tier(models.TextChoices):
        TRIAL = "trial", "Prueba (Acceso Total)"
        BASIC = "basic", "Plan Básico"
        PREMIUM = "premium", "Plan Premium"

    class Plan(models.TextChoices):
        TRIAL = "trial", "Prueba (14 días)"
        BASIC_MONTHLY = "basic_monthly", "Plan Básico Mensual ($9.900/mes)"
        BASIC_YEARLY = "basic_yearly", "Plan Básico Anual ($99.000/año)"
        PREMIUM_MONTHLY = "premium_monthly", "Plan Premium Mensual ($19.900/mes)"
        PREMIUM_YEARLY = "premium_yearly", "Plan Premium Anual ($199.000/año)"
        LIFETIME = "lifetime", "Licencia Vitalicia Premium"
        # Backwards compatibility
        MONTHLY = "monthly", "Plan Mensual ($9.900/mes)"
        YEARLY = "yearly", "Plan Anual ($99.000/año)"

    PREMIUM_FEATURES = {
        "employees",
        "advanced_reports",
        "export_excel",
        "provider_debts",
        "ticket_branding",
        "audit_logs",
    }

    BASIC_FEATURES = {
        "pos_checkout",
        "catalog_management",
        "combos_promos",
        "daily_register",
        "client_debts",
        "basic_stock",
        "basic_metrics",
    }

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )

    tier = models.CharField(
        max_length=20,
        choices=Tier.choices,
        default=Tier.TRIAL,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
    )

    plan = models.CharField(
        max_length=30,
        choices=Plan.choices,
        default=Plan.TRIAL,
    )

    start_date = models.DateTimeField(
        default=timezone.now,
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de vencimiento general del servicio",
    )

    premium_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de vencimiento de funciones Premium",
    )

    basic_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de vencimiento de funciones Básicas",
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
    def active_tier(self):
        """Calculates dynamic tier (trial, premium, basic, none)."""
        if self.status == self.Status.SUSPENDED:
            return "none"

        if self.user.is_superuser or self.plan == self.Plan.LIFETIME:
            return self.Tier.PREMIUM

        now = timezone.now()

        # 1. Trial period active (grants full Premium access)
        if self.status == self.Status.TRIAL:
            if self.trial_ends_at and now <= self.trial_ends_at:
                return self.Tier.TRIAL
            if self.expires_at and now <= self.expires_at:
                return self.Tier.TRIAL

        # 2. Premium time active
        if self.premium_expires_at and now <= self.premium_expires_at:
            return self.Tier.PREMIUM

        # 3. Basic time active
        if self.basic_expires_at and now <= self.basic_expires_at:
            return self.Tier.BASIC

        # 4. Fallback check on expires_at for backwards compatibility
        if self.expires_at and now <= self.expires_at:
            if self.tier == self.Tier.PREMIUM or self.plan in [self.Plan.PREMIUM_MONTHLY, self.Plan.PREMIUM_YEARLY]:
                return self.Tier.PREMIUM
            return self.Tier.BASIC

        return "none"

    @property
    def is_valid(self):
        """Returns True if the subscription allows using the application."""
        if self.status == self.Status.SUSPENDED:
            return False

        if self.user.is_superuser or self.user.is_staff or self.plan == self.Plan.LIFETIME:
            return True

        return self.active_tier in [self.Tier.TRIAL, self.Tier.BASIC, self.Tier.PREMIUM]

    @property
    def is_premium(self):
        """Returns True if the account currently has access to Premium features."""
        if self.user.is_superuser or self.user.is_staff or self.plan == self.Plan.LIFETIME:
            return True
        return self.active_tier in [self.Tier.TRIAL, self.Tier.PREMIUM]

    @property
    def effective_status(self):
        """Calculates dynamic status taking expiration into account."""
        if self.status == self.Status.SUSPENDED:
            return self.Status.SUSPENDED

        if self.user.is_superuser or self.plan == self.Plan.LIFETIME:
            return self.Status.ACTIVE

        if not self.is_valid:
            return self.Status.EXPIRED

        return self.status

    @property
    def days_remaining(self):
        """Returns total remaining days across active tiers, or None for lifetime / superuser."""
        if self.status == self.Status.SUSPENDED or not self.is_valid:
            return 0

        if self.plan == self.Plan.LIFETIME or self.user.is_superuser:
            return None

        now = timezone.now()
        valid_dates = [dt for dt in [self.expires_at, self.premium_expires_at, self.basic_expires_at, self.trial_ends_at] if dt]
        if not valid_dates:
            return 0

        furthest = max(valid_dates)
        if now >= furthest:
            return 0

        diff = furthest - now
        return diff.days + (1 if diff.seconds > 0 else 0)

    @property
    def premium_days_remaining(self):
        if self.plan == self.Plan.LIFETIME or self.user.is_superuser:
            return None
        now = timezone.now()
        target = self.trial_ends_at if self.is_trial else self.premium_expires_at
        if not target or now >= target:
            return 0
        diff = target - now
        return diff.days + (1 if diff.seconds > 0 else 0)

    @property
    def basic_days_remaining(self):
        if self.plan == self.Plan.LIFETIME or self.user.is_superuser:
            return None
        now = timezone.now()
        if not self.basic_expires_at or now >= self.basic_expires_at:
            return 0
        diff = self.basic_expires_at - now
        return diff.days + (1 if diff.seconds > 0 else 0)

    @property
    def is_trial(self):
        return self.effective_status == self.Status.TRIAL

    def has_feature(self, feature_key: str) -> bool:
        """Determines if the current subscription tier permits using a specific feature."""
        if self.user.is_superuser or self.user.is_staff or self.plan == self.Plan.LIFETIME:
            return True

        active = self.active_tier
        if active in [self.Tier.TRIAL, self.Tier.PREMIUM]:
            return True

        if active == self.Tier.BASIC:
            return feature_key in self.BASIC_FEATURES

        return False

    def extend(self, days=30, tier="basic", plan=None, amount=None, reference=""):
        """Extends subscription by N days for the specified tier."""
        now = timezone.now()
        tier_str = str(tier).lower()

        if tier_str == "premium" or plan in [self.Plan.PREMIUM_MONTHLY, self.Plan.PREMIUM_YEARLY]:
            base_date = self.premium_expires_at if (self.premium_expires_at and self.premium_expires_at > now) else now
            self.premium_expires_at = base_date + timedelta(days=days)
            self.tier = self.Tier.PREMIUM
            if not plan:
                self.plan = self.Plan.PREMIUM_MONTHLY if days <= 60 else self.Plan.PREMIUM_YEARLY
            else:
                self.plan = plan
        else:
            base_date = self.basic_expires_at if (self.basic_expires_at and self.basic_expires_at > now) else now
            self.basic_expires_at = base_date + timedelta(days=days)
            if not self.premium_expires_at or self.premium_expires_at <= now:
                self.tier = self.Tier.BASIC
            if not plan:
                self.plan = self.Plan.BASIC_MONTHLY if days <= 60 else self.Plan.BASIC_YEARLY
            else:
                self.plan = plan

        self.status = self.Status.ACTIVE
        valid_dates = [dt for dt in [self.premium_expires_at, self.basic_expires_at] if dt]
        self.expires_at = max(valid_dates) if valid_dates else (now + timedelta(days=days))

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
        self.tier = self.Tier.PREMIUM
        self.status = self.Status.ACTIVE
        self.expires_at = None
        self.premium_expires_at = None
        self.basic_expires_at = None
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
            self.basic_expires_at = now + timedelta(days=30)
            self.expires_at = self.basic_expires_at
        self.status = self.Status.ACTIVE
        self.save()
        return self

    def activate_trial(self, days=14):
        """Activates or resets 14-day trial period with full Premium access."""
        now = timezone.now()
        self.status = self.Status.TRIAL
        self.tier = self.Tier.TRIAL
        self.plan = self.Plan.TRIAL
        self.start_date = now
        self.expires_at = now + timedelta(days=days)
        self.trial_ends_at = self.expires_at
        self.premium_expires_at = self.expires_at
        self.is_trial_used = True
        self.save()
        return self

    def get_summary(self):
        is_admin_user = bool(self.user.is_superuser or self.user.is_staff)
        is_suspended = self.status == self.Status.SUSPENDED
        active_tier = self.active_tier

        return {
            "status": self.effective_status,
            "status_display": dict(self.Status.choices).get(self.effective_status, self.effective_status),
            "tier": active_tier,
            "tier_display": dict(self.Tier.choices).get(active_tier, active_tier),
            "is_premium": self.is_premium,
            "plan": self.plan,
            "plan_display": self.get_plan_display(),
            "is_valid": self.is_valid,
            "days_remaining": self.days_remaining,
            "premium_days_remaining": self.premium_days_remaining,
            "basic_days_remaining": self.basic_days_remaining,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "premium_expires_at": self.premium_expires_at.isoformat() if self.premium_expires_at else None,
            "basic_expires_at": self.basic_expires_at.isoformat() if self.basic_expires_at else None,
            "is_trial": self.is_trial,
            "is_superuser": bool(is_admin_user and not is_suspended),
            "features": {
                "pos_checkout": True,
                "catalog_management": True,
                "combos_promos": True,
                "daily_register": True,
                "client_debts": True,
                "basic_stock": True,
                "basic_metrics": True,
                "employees": self.has_feature("employees"),
                "advanced_reports": self.has_feature("advanced_reports"),
                "export_excel": self.has_feature("export_excel"),
                "provider_debts": self.has_feature("provider_debts"),
                "ticket_branding": self.has_feature("ticket_branding"),
                "audit_logs": self.has_feature("audit_logs"),
            },
            "payment_info": {
                "alias": "gestor.negocios.mp",
                "cbu": "0000003100010000000000",
                "holder": "Business Manager Payments",
                "email_contact": "soporte.businessmanager@gmail.com",
                "basic_monthly_price": 9900,
                "basic_yearly_price": 99000,
                "premium_monthly_price": 19900,
                "premium_yearly_price": 199000,
            },
        }

    @classmethod
    def get_or_create_for_user(cls, user):
        """Retrieves or creates initial 14-day trial subscription for a user."""
        sub, created = cls.objects.get_or_create(
            user=user,
            defaults={
                "status": cls.Status.TRIAL,
                "tier": cls.Tier.TRIAL,
                "plan": cls.Plan.TRIAL,
                "start_date": timezone.now(),
                "expires_at": timezone.now() + timedelta(days=14),
                "premium_expires_at": timezone.now() + timedelta(days=14),
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

    class PaymentMethod(models.TextChoices):
        MERCADOPAGO = "mercadopago", "Mercado Pago (Automático)"
        MANUAL_TRANSFER = "manual_transfer", "Transferencia Bancaria Manual"

    class PlanRequested(models.TextChoices):
        BASIC_MONTHLY = "basic_monthly", "Plan Básico Mensual ($9.900/mes)"
        BASIC_YEARLY = "basic_yearly", "Plan Básico Anual ($99.000/año)"
        PREMIUM_MONTHLY = "premium_monthly", "Plan Premium Mensual ($19.900/mes)"
        PREMIUM_YEARLY = "premium_yearly", "Plan Premium Anual ($199.000/año)"
        MONTHLY = "monthly", "Plan Básico Mensual ($9.900/mes)"
        YEARLY = "yearly", "Plan Básico Anual ($99.000/año)"

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
        max_length=30,
        choices=PlanRequested.choices,
        default=PlanRequested.BASIC_MONTHLY,
    )

    payment_method = models.CharField(
        max_length=50,
        choices=PaymentMethod.choices,
        default=PaymentMethod.MERCADOPAGO,
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

    mp_preference_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="ID de Preferencia de Checkout de Mercado Pago",
    )

    mp_payment_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="ID de Pago de Mercado Pago",
    )

    mp_status = models.CharField(
        max_length=50,
        blank=True,
        help_text="Estado de la transacción en Mercado Pago",
    )

    raw_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Datos crudos del Webhook / Respuesta de MP",
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
        return f"Pago #{self.id} ({self.get_payment_method_display()}) de {self.user.email} - ${self.amount} ({self.get_status_display()})"

