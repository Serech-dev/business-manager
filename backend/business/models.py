from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


class Client(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_clients",
    )

    name = models.CharField(
        max_length=150,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user",
                name="unique_client_name_per_user_ci",
            )
        ]

    def __str__(self):
        return self.name

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

class Provider(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_providers",
    )

    name = models.CharField(
        max_length=150,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user",
                name="unique_provider_name_per_user_ci",
            )
        ]

    def __str__(self):
        return self.name

class Transaction(models.Model):
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

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    def __str__(self):
        return f"Operación #{self.id}"


class TransactionOperation(models.Model):
    class Type(models.TextChoices):
        SALE = "sale", "Venta"
        SUBE = "sube", "Carga SUBE"
        PHONE = "phone", "Carga de celular"
        EXCHANGE = "exchange", "Cambio"
        PAYMENT = "payment", "Pago de fiado"
        PROVIDER = "provider", "Proveedor"
        PROVIDER_PAYMENT = "provider_payment", "Pago a proveedor"
        EXPENSE = "expense", "Gasto"
        LOSS = "loss", "Pérdida"

    class ServiceType(models.TextChoices):
        SUBE = "sube", "SUBE"
        PHONE = "phone", "Carga de celular"
        VIRTUAL_CASH = "virtual_cash", "Cambio virtual/cash"

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="operations",
    )

    type = models.CharField(
        max_length=30,
        choices=Type.choices,
    )

    service_type = models.CharField(
        max_length=30,
        choices=ServiceType.choices,
        null=True,
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

    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_operations",
    )

    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_operations",
    )

    def get_display_description(self):
        if self.type == self.Type.SALE:
            if self.client:
                description = f"Venta a {self.client.name}"
            else:
                description = "Venta"

        elif self.type == self.Type.SUBE:
            if self.client:
                description = f"Carga SUBE a {self.client.name}"
            else:
                description = "Carga SUBE"

        elif self.type == self.Type.PHONE:
            if self.client:
                description = f"Carga de celular a {self.client.name}"
            else:
                description = "Carga de celular"

        elif self.type == self.Type.EXCHANGE:
            if self.client:
                description = f"Cambio para {self.client.name}"
            else:
                description = "Cambio"

        elif self.type == self.Type.PAYMENT:
            if self.client:
                description = f"A cuenta de {self.client.name}"
            else:
                description = "A cuenta"

        elif self.type == self.Type.PROVIDER:
            if self.provider:
                description = f"Pago a proveedor {self.provider.name}"
            else:
                description = "Pago a proveedor"

        elif self.type == self.Type.PROVIDER_PAYMENT:
            if self.provider:
                description = f"Pago a proveedor {self.provider.name}"
            else:
                description = "Pago a proveedor"

        elif self.type == self.Type.EXPENSE:
            description = "Gasto"

        elif self.type == self.Type.LOSS:
            description = "Pérdida"

        else:
            description = self.get_type_display()

        if self.transaction.description:
            return f"{description} - {self.transaction.description}"

        return description


class TransactionOperationAmount(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Efectivo"
        TRANSFER = "transfer", "Transferencia"
        CARD = "card", "Tarjeta"
        DEBT = "debt", "Fiado"

    operation = models.ForeignKey(
        TransactionOperation,
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



