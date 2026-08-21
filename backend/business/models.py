from django.conf import settings
from django.db import models


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
        decimal_places=2,
    )

    def __str__(self):
        return f"{self.method}: {self.amount}"