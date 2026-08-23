from django.conf import settings
from django.db import models


class Register(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="registers",
    )

    opened_at = models.DateTimeField(
        auto_now_add=True,
    )

    closed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(
                    closed_at__isnull=True
                ),
                name="one_open_register_per_user",
            ),
        ]

    @property
    def is_open(self):
        return self.closed_at is None

    def __str__(self):
        return f"Caja #{self.id}"


class Transaction(models.Model):
    class Type(models.TextChoices):
        SALE = "sale", "Venta"
        SERVICE = "service", "Servicio"
        EXCHANGE = "exchange", "Cambio"
        SALE_EXCHANGE = "sale_exchange", "Venta + Cambio"
        PROVIDER = "provider", "Proveedor"
        EXPENSE = "expense", "Gasto"
        LOSS = "loss", "Pérdida"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_transactions",
    )

    register = models.ForeignKey(
        Register,
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    type = models.CharField(
        max_length=30,
        choices=Type.choices,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    exchange_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
    )

    exchange_fee = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.get_type_display()} #{self.id}"


class TransactionAmount(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Efectivo"
        TRANSFER = "transfer", "Transferencia"
        CARD = "card", "Tarjeta"
        DEBT = "debt", "Fiado"

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="amounts",
    )

    method = models.CharField(
        max_length=20,
        choices=Method.choices,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
    )

    received = models.BooleanField(
        default=False,
    )

    def __str__(self):
        return f"{self.method}: {self.amount}"