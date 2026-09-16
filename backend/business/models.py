from decimal import Decimal
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

    initial_debt = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
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

    initial_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    initial_bank = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
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

    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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

    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_operations",
    )

    def get_display_description(self, client=None):
        if client is None and hasattr(self, "transaction") and self.transaction:
            client = getattr(self.transaction, "client", None)

        if self.type == self.Type.SALE:
            if client:
                description = f"Venta a {client.name}"
            else:
                description = "Venta"

        elif self.type == self.Type.SUBE:
            if client:
                description = f"Carga SUBE a {client.name}"
            else:
                description = "Carga SUBE"

        elif self.type == self.Type.PHONE:
            if client:
                description = f"Carga de celular a {client.name}"
            else:
                description = "Carga de celular"

        elif self.type == self.Type.EXCHANGE:
            if client:
                description = f"Cambio para {client.name}"
            else:
                description = "Cambio"

        elif self.type == self.Type.PAYMENT:
            if client:
                description = f"A cuenta de {client.name}"
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

        if hasattr(self, "transaction") and self.transaction and self.transaction.description:
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


class Category(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_categories",
    )

    name = models.CharField(
        max_length=100,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user",
                name="unique_category_name_per_user_ci",
            )
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    class UnitType(models.TextChoices):
        UNIT = "unit", "Unidad"
        KG = "kg", "Kilogramo (kg)"
        HUNDRED_GRAMS = "100g", "100 Gramos (100g)"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
    )

    name = models.CharField(
        max_length=150,
    )

    unit_type = models.CharField(
        max_length=10,
        choices=UnitType.choices,
        default=UnitType.UNIT,
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        blank=True,
    )

    barcode = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    stock = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    min_stock = models.IntegerField(
        default=1,
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    promo_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    promo_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    is_bundle = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user",
                name="unique_product_name_per_user_ci",
            )
        ]
        ordering = ["name"]

    @property
    def has_quantity_promo(self):
        return bool(
            self.promo_quantity
            and self.promo_quantity >= 2
            and self.promo_price
            and self.promo_price > Decimal("0.00")
        )

    @property
    def bundle_stock(self):
        if not self.is_bundle:
            return self.stock
        items = list(self.bundle_items.select_related("product").all())
        if not items:
            return None
        min_possible = None
        has_tracked_item = False
        for bi in items:
            if bi.product and bi.product.stock is not None:
                has_tracked_item = True
                if bi.quantity > Decimal("0"):
                    possible = int(bi.product.stock // bi.quantity)
                    if min_possible is None or possible < min_possible:
                        min_possible = max(0, possible)
        return min_possible if has_tracked_item else None

    def __str__(self):
        return self.name


class BundleItem(models.Model):
    bundle = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="bundle_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="included_in_bundles",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["bundle", "product"],
                name="unique_bundle_item_product",
            )
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in {self.bundle.name}"


class TransactionOperationItem(models.Model):
    operation = models.ForeignKey(
        TransactionOperation,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operation_items",
    )
    product_name = models.CharField(
        max_length=150,
    )
    unit_type = models.CharField(
        max_length=10,
        default=Product.UnitType.UNIT,
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    def __str__(self):
        return f"{self.quantity} x {self.product_name} (${self.subtotal})"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RESTOCK = "restock", "Reabastecimiento / Compra"
        SALE = "sale", "Venta"
        ADJUSTMENT = "adjustment", "Ajuste manual"
        LOSS = "loss", "Pérdida / Rotura / Vencido"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stock_movements",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
        default=MovementType.RESTOCK,
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positivo para ingresos/ganancias, negativo para ventas/pérdidas",
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Etiqueta de temporada, factura o motivo (ej: 'Navidad 2025', 'Pan diario')",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.get_movement_type_display()}: {self.quantity} {self.product.name}"


class StockNote(models.Model):
    class NoteType(models.TextChoices):
        MISSING = "missing", "Faltante / Para comprar"
        CUSTOMER_REQUEST = "customer_request", "Pedido de cliente"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        BOUGHT = "bought", "Comprado / Resuelto"
        DISMISSED = "dismissed", "Descartado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stock_notes",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_notes",
    )
    item_name = models.CharField(
        max_length=200,
    )
    note_type = models.CharField(
        max_length=30,
        choices=NoteType.choices,
        default=NoteType.MISSING,
    )
    customer_name = models.CharField(
        max_length=150,
        blank=True,
    )
    notes = models.TextField(
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.item_name}"


class StoreSettings(models.Model):
    class FeeType(models.TextChoices):
        PERCENTAGE = "percentage", "Porcentaje (%)"
        FIXED = "fixed", "Monto Fijo ($)"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="store_settings",
    )

    store_name = models.CharField(
        max_length=150,
        default="Mi Negocio",
        help_text="Nombre del comercio o local",
    )

    store_address = models.CharField(
        max_length=255,
        blank=True,
        help_text="Dirección física del local (para tickets)",
    )

    store_phone = models.CharField(
        max_length=50,
        blank=True,
        help_text="Teléfono de contacto (para tickets)",
    )

    ticket_footer = models.CharField(
        max_length=255,
        default="¡Gracias por su compra!",
        blank=True,
        help_text="Mensaje al pie del ticket térmico",
    )

    # Virtual / Cash Exchange Fee
    exchange_fee_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.PERCENTAGE,
    )

    exchange_fee_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
    )

    # Phone Recharge Fee
    phone_fee_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.PERCENTAGE,
    )

    phone_fee_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
    )

    # SUBE Recharge Fee
    sube_fee_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.PERCENTAGE,
    )

    sube_fee_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
    )

    # Debt / Tab (Fiado) Surcharge
    debt_surcharge_enabled = models.BooleanField(
        default=False,
        help_text="Indica si se aplica recargo al vender fiado / en libreta",
    )

    debt_surcharge_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.PERCENTAGE,
    )

    debt_surcharge_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
    )

    # Card (Debit / Credit) Surcharge
    card_surcharge_enabled = models.BooleanField(
        default=False,
        help_text="Indica si se aplica recargo al cobrar con tarjeta (débito/crédito)",
    )

    card_surcharge_type = models.CharField(
        max_length=20,
        choices=FeeType.choices,
        default=FeeType.PERCENTAGE,
    )

    card_surcharge_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
    )

    is_setup_completed = models.BooleanField(
        default=False,
        help_text="True si el usuario ya completó el asistente inicial de configuración",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Configuración del Comercio"
        verbose_name_plural = "Configuraciones de Comercios"

    def __str__(self):
        return f"Configuración de {self.store_name} ({self.user.email})"

    def calculate_exchange_fee(self, amount):
        if not amount:
            return Decimal("0")
        amount = Decimal(str(amount))
        if self.exchange_fee_type == self.FeeType.PERCENTAGE:
            return (amount * (self.exchange_fee_value / Decimal("100"))).quantize(Decimal("1"))
        return self.exchange_fee_value

    def calculate_debt_surcharge(self, amount):
        if not self.debt_surcharge_enabled or not amount:
            return Decimal("0")
        amount = Decimal(str(amount))
        if self.debt_surcharge_type == self.FeeType.PERCENTAGE:
            return (amount * (self.debt_surcharge_value / Decimal("100"))).quantize(Decimal("1"))
        return self.debt_surcharge_value

    def calculate_card_surcharge(self, amount):
        if not self.card_surcharge_enabled or not amount:
            return Decimal("0")
        amount = Decimal(str(amount))
        if self.card_surcharge_type == self.FeeType.PERCENTAGE:
            return (amount * (self.card_surcharge_value / Decimal("100"))).quantize(Decimal("1"))
        return self.card_surcharge_value

    @classmethod
    def get_or_create_for_user(cls, user):
        settings_obj, _ = cls.objects.get_or_create(
            user=user,
            defaults={
                "store_name": "Mi Negocio",
                "exchange_fee_type": cls.FeeType.PERCENTAGE,
                "exchange_fee_value": Decimal("10.00"),
                "phone_fee_type": cls.FeeType.PERCENTAGE,
                "phone_fee_value": Decimal("10.00"),
                "sube_fee_type": cls.FeeType.PERCENTAGE,
                "sube_fee_value": Decimal("10.00"),
                "debt_surcharge_enabled": False,
                "debt_surcharge_type": cls.FeeType.PERCENTAGE,
                "debt_surcharge_value": Decimal("10.00"),
                "card_surcharge_enabled": False,
                "card_surcharge_type": cls.FeeType.PERCENTAGE,
                "card_surcharge_value": Decimal("10.00"),
                "is_setup_completed": False,
            },
        )
        return settings_obj


class MasterCatalogProduct(models.Model):
    barcode = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )
    name = models.CharField(
        max_length=255,
        db_index=True,
    )
    brand = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        db_index=True,
    )
    category_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    unit_type = models.CharField(
        max_length=10,
        choices=Product.UnitType.choices,
        default=Product.UnitType.UNIT,
    )
    suggested_sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    suggested_cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    source = models.CharField(
        max_length=50,
        default="sepa",
        help_text="Data source: sepa, gs1, openfoodfacts, manual, etc.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Producto del Catálogo Maestro"
        verbose_name_plural = "Catálogo Maestro de Productos Nacionales"
        indexes = [
            models.Index(fields=["barcode"]),
            models.Index(fields=["name"]),
            models.Index(fields=["brand"]),
        ]

    def __str__(self):
        return f"[{self.barcode}] {self.name} ({self.brand or 'Genérico'})"






