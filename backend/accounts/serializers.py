from decimal import Decimal
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from .models import PaymentNotification, Subscription

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        identifier = attrs["email"].strip()
        password = attrs["password"]

        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).first()

        if user is None:
            raise serializers.ValidationError(
                "Correo o contraseña incorrectos."
            )

        authenticated_user = authenticate(
            username=user.username,
            password=password,
        )

        if authenticated_user is None:
            raise serializers.ValidationError(
                "Correo o contraseña incorrectos."
            )

        if not authenticated_user.is_active:
            raise serializers.ValidationError(
                "Esta cuenta está desactivada."
            )

        attrs["user"] = authenticated_user

        return attrs


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este email."
            )

        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Las contraseñas no coinciden."
            })

        validate_password(attrs["password"])

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        email = validated_data["email"]
        base_username = email.split("@")[0]

        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data["password"],
        )

        # Initialize automatic 14-day trial
        Subscription.get_or_create_for_user(user)

        return user


class SubscriptionSerializer(serializers.ModelSerializer):
    tier = serializers.CharField(source="active_tier", read_only=True)
    tier_display = serializers.SerializerMethodField()
    status = serializers.CharField(source="effective_status", read_only=True)
    status_display = serializers.SerializerMethodField()
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    is_premium = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    premium_days_remaining = serializers.IntegerField(read_only=True)
    basic_days_remaining = serializers.IntegerField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "tier",
            "tier_display",
            "status",
            "status_display",
            "plan",
            "plan_display",
            "start_date",
            "expires_at",
            "premium_expires_at",
            "basic_expires_at",
            "trial_ends_at",
            "is_trial_used",
            "is_valid",
            "is_premium",
            "days_remaining",
            "premium_days_remaining",
            "basic_days_remaining",
            "is_trial",
            "notes",
            "last_payment_date",
            "last_payment_amount",
            "last_payment_reference",
            "summary",
        ]

    def get_tier_display(self, obj):
        return dict(Subscription.Tier.choices).get(obj.active_tier, obj.active_tier)

    def get_status_display(self, obj):
        return dict(Subscription.Status.choices).get(obj.effective_status, obj.effective_status)

    def get_summary(self, obj):
        return obj.get_summary()


class PaymentNotificationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = PaymentNotification
        fields = [
            "id",
            "user",
            "user_email",
            "plan",
            "plan_display",
            "payment_method",
            "payment_method_display",
            "amount",
            "reference_code",
            "mp_preference_id",
            "mp_payment_id",
            "mp_status",
            "payer_notes",
            "status",
            "status_display",
            "admin_notes",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_email",
            "status",
            "status_display",
            "payment_method_display",
            "mp_status",
            "admin_notes",
            "created_at",
            "reviewed_at",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        subscription = Subscription.get_or_create_for_user(user)
        validated_data["user"] = user
        validated_data["subscription"] = subscription
        return super().create(validated_data)


class AdminStoreOverviewSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(source="id")
    username = serializers.CharField()
    email = serializers.CharField(allow_blank=True)
    store_name = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField()
    is_active = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    subscription = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()
    pending_payments_count = serializers.SerializerMethodField()

    def get_store_name(self, user):
        store_settings = getattr(user, "store_settings", None)
        if store_settings and store_settings.store_name:
            return store_settings.store_name
        return "Mi Negocio"

    def get_subscription(self, user):
        sub = getattr(user, "subscription", None)
        if not sub:
            sub = Subscription.get_or_create_for_user(user)
        return {
            "id": sub.id,
            "status": sub.effective_status,
            "status_display": dict(Subscription.Status.choices).get(sub.effective_status, sub.effective_status),
            "tier": sub.active_tier,
            "tier_display": dict(Subscription.Tier.choices).get(sub.active_tier, sub.active_tier),
            "is_premium": sub.is_premium,
            "plan": sub.plan,
            "plan_display": sub.get_plan_display(),
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "premium_expires_at": sub.premium_expires_at.isoformat() if sub.premium_expires_at else None,
            "basic_expires_at": sub.basic_expires_at.isoformat() if sub.basic_expires_at else None,
            "days_remaining": sub.days_remaining,
            "premium_days_remaining": sub.premium_days_remaining,
            "basic_days_remaining": sub.basic_days_remaining,
            "is_valid": sub.is_valid,
            "notes": sub.notes,
            "last_payment_date": sub.last_payment_date.isoformat() if sub.last_payment_date else None,
            "last_payment_amount": str(sub.last_payment_amount),
            "last_payment_reference": sub.last_payment_reference,
        }

    def get_metrics(self, user):
        products_count = getattr(user, "products_count", None)
        if products_count is None:
            products_count = user.products.count()

        transactions_count = getattr(user, "transactions_count", None)
        if transactions_count is None:
            transactions_count = user.business_transactions.count()

        clients_count = getattr(user, "clients_count", None)
        if clients_count is None:
            clients_count = user.business_clients.count()

        latest_tx = user.business_transactions.order_by("-created_at").first()
        last_activity = latest_tx.created_at.isoformat() if latest_tx else user.date_joined.isoformat()

        return {
            "products_count": products_count,
            "transactions_count": transactions_count,
            "clients_count": clients_count,
            "last_activity": last_activity,
        }

    def get_pending_payments_count(self, user):
        return user.payment_notifications.filter(status=PaymentNotification.Status.PENDING).count()