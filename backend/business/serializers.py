from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import F
from rest_framework import serializers

from .models import (Category, Client, Product, Provider, Register,
                     StockMovement, StockNote, Transaction,
                     TransactionOperation, TransactionOperationAmount,
                     TransactionOperationItem)


class ClientSerializer(serializers.ModelSerializer):
    debt = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = [
            "id",
            "name",
            "phone",
            "notes",
            "initial_debt",
            "created_at",
            "debt",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "debt",
        ]

    def get_debt(self, obj):
        debt = obj.initial_debt or Decimal("0")

        transactions = (
            obj.transactions
            .prefetch_related(
                "operations__amounts"
            )
            .all()
        )

        for transaction in transactions:
            for operation in transaction.operations.all():
                if (
                    operation.type
                    == TransactionOperation.Type.PAYMENT
                ):
                    debt -= sum(
                        amount.amount
                        for amount in operation.amounts.all()
                    )

                else:
                    debt += sum(
                        amount.amount
                        for amount in operation.amounts.all()
                        if (
                            amount.method
                            == TransactionOperationAmount.Method.DEBT
                        )
                    )

        return debt


class TransactionOperationAmountSerializer(
    serializers.ModelSerializer
):
    received = serializers.BooleanField(
        default=False,
        required=False,
    )

    class Meta:
        model = TransactionOperationAmount

        fields = [
            "id",
            "method",
            "amount",
            "received",
        ]

        read_only_fields = [
            "id",
        ]


class TransactionOperationItemSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = TransactionOperationItem
        fields = [
            "id",
            "product",
            "product_name",
            "unit_type",
            "quantity",
            "unit_price",
            "subtotal",
        ]
        read_only_fields = [
            "id",
        ]


class TransactionOperationSerializer(
    serializers.ModelSerializer
):
    amounts = TransactionOperationAmountSerializer(
        many=True
    )
    items = TransactionOperationItemSerializer(
        many=True,
        required=False,
        default=list,
    )

    total = serializers.SerializerMethodField()

    class Meta:
        model = TransactionOperation

        fields = [
            "id",
            "type",
            "service_type",
            "provider",
            "exchange_amount",
            "exchange_fee",
            "amounts",
            "items",
            "total",
        ]

        read_only_fields = [
            "id",
            "exchange_fee",
            "total",
        ]

    def get_total(self, obj):
        return sum(
            amount.amount
            for amount in obj.amounts.all()
        )

    def validate(self, attrs):
        operation_type = attrs.get(
            "type",
            getattr(
                self.instance,
                "type",
                None,
            ),
        )

        provider = attrs.get(
            "provider",
            getattr(
                self.instance,
                "provider",
                None,
            ),
        )

        amounts = attrs.get("amounts")

        # CLIENT PAYMENTS

        if operation_type == TransactionOperation.Type.PAYMENT:
            if amounts and any(
                amount["method"]
                == TransactionOperationAmount.Method.DEBT
                for amount in amounts
            ):
                raise serializers.ValidationError({
                    "amounts":
                        "Un pago de fiado no puede registrarse como fiado."
                })

        # EXCHANGE

        if operation_type == TransactionOperation.Type.EXCHANGE:
            exchange_amount = attrs.get(
                "exchange_amount",
                getattr(
                    self.instance,
                    "exchange_amount",
                    None,
                ),
            )

            if (
                exchange_amount is None
                or exchange_amount <= 0
            ):
                raise serializers.ValidationError({
                    "exchange_amount":
                        "El monto de cambio es obligatorio."
                })

        # PROVIDER OPERATIONS

        if operation_type in [
            TransactionOperation.Type.PROVIDER,
            TransactionOperation.Type.PROVIDER_PAYMENT,
        ]:
            if provider is None:
                raise serializers.ValidationError({
                    "provider":
                        "Esta operación requiere un proveedor."
                })

        # PROVIDER PAYMENTS

        if operation_type == TransactionOperation.Type.PROVIDER_PAYMENT:
            if amounts and any(
                amount["method"]
                == TransactionOperationAmount.Method.DEBT
                for amount in amounts
            ):
                raise serializers.ValidationError({
                    "amounts":
                        "Un pago a proveedor no puede registrarse como fiado."
                })

        return attrs

    def _calculate_exchange_fee(
        self,
        operation,
        amounts,
    ):
        if operation.type != TransactionOperation.Type.EXCHANGE:
            return None

        if not operation.exchange_amount:
            return None

        paid_amount = sum(
            amount["amount"]
            for amount in amounts
            if amount["method"]
            != TransactionOperationAmount.Method.DEBT
        )

        fee = (
            paid_amount
            - operation.exchange_amount
        )

        return max(
            fee,
            Decimal("0")
        )

    @db_transaction.atomic
    def create(self, validated_data):
        amounts = validated_data.pop(
            "amounts"
        )

        operation = TransactionOperation.objects.create(
            **validated_data
        )

        operation.exchange_fee = (
            self._calculate_exchange_fee(
                operation,
                amounts,
            )
        )

        operation.save(
            update_fields=["exchange_fee"]
        )

        TransactionOperationAmount.objects.bulk_create([
            TransactionOperationAmount(
                operation=operation,
                **amount,
            )
            for amount in amounts
        ])

        return operation

    @db_transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        amounts = validated_data.pop(
            "amounts",
            None,
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        if amounts is not None:
            instance.exchange_fee = (
                self._calculate_exchange_fee(
                    instance,
                    amounts,
                )
            )

            instance.amounts.all().delete()

            TransactionOperationAmount.objects.bulk_create([
                TransactionOperationAmount(
                    operation=instance,
                    **amount,
                )
                for amount in amounts
            ])

        else:
            instance.exchange_fee = (
                self._calculate_exchange_fee(
                    instance,
                    [
                        {
                            "amount": amount.amount,
                            "method": amount.method,
                        }
                        for amount in instance.amounts.all()
                    ],
                )
            )

        instance.save()

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.provider:
            representation["provider"] = {
                "id": instance.provider.id,
                "name": instance.provider.name,
                "phone": instance.provider.phone,
            }
        representation["display_description"] = instance.get_display_description()
        return representation


class TransactionSerializer(
    serializers.ModelSerializer
):
    operations = TransactionOperationSerializer(
        many=True
    )

    class Meta:
        model = Transaction

        fields = [
            "id",
            "register",
            "client",
            "created_at",
            "description",
            "operations",
        ]

        read_only_fields = [
            "id",
            "register",
            "created_at",
        ]

    def validate(self, attrs):
        if (
            self.instance
            and not self.instance.register.is_open
        ):
            raise serializers.ValidationError({
                "register":
                    "No se puede modificar una operación de una caja cerrada."
            })

        client = attrs.get(
            "client",
            getattr(
                self.instance,
                "client",
                None,
            ),
        )

        operations = attrs.get("operations", [])
        for op in operations:
            is_payment = (
                op.get("type") == TransactionOperation.Type.PAYMENT
            )
            has_debt = any(
                amt.get("method") == TransactionOperationAmount.Method.DEBT
                for amt in op.get("amounts", [])
            )
            if (is_payment or has_debt) and client is None:
                raise serializers.ValidationError({
                    "client":
                        "El fiado requiere seleccionar un cliente para la transacción."
                })

        return attrs

    def _get_open_register(self):
        return Register.objects.filter(
            user=self.context["request"].user,
            closed_at__isnull=True,
        ).first()

    @db_transaction.atomic
    def create(self, validated_data):
        operations = validated_data.pop(
            "operations"
        )

        register = self._get_open_register()

        if register is None:
            raise serializers.ValidationError({
                "register":
                    "No hay una caja abierta."
            })

        transaction = Transaction.objects.create(
            user=self.context["request"].user,
            register=register,
            **validated_data,
        )

        for operation_data in operations:
            amounts = operation_data.pop(
                "amounts"
            )
            items = operation_data.pop(
                "items",
                [],
            )

            operation = TransactionOperation.objects.create(
                transaction=transaction,
                **operation_data,
            )

            operation.exchange_fee = (
                TransactionOperationSerializer()
                ._calculate_exchange_fee(
                    operation,
                    amounts,
                )
            )

            operation.save(
                update_fields=["exchange_fee"]
            )

            TransactionOperationAmount.objects.bulk_create([
                TransactionOperationAmount(
                    operation=operation,
                    **amount,
                )
                for amount in amounts
            ])

            for item_data in items:
                prod = item_data.get("product")
                p_name = item_data.get("product_name") or (prod.name if prod else "Producto")
                u_type = item_data.get("unit_type") or (prod.unit_type if prod else Product.UnitType.UNIT)
                qty = item_data.get("quantity", Decimal("1.00"))
                u_price = item_data.get("unit_price", Decimal("0.00"))
                subtotal = item_data.get("subtotal", Decimal("0.00"))

                TransactionOperationItem.objects.create(
                    operation=operation,
                    product=prod,
                    product_name=p_name,
                    unit_type=u_type,
                    quantity=qty,
                    unit_price=u_price,
                    subtotal=subtotal,
                )

                if prod and prod.stock is not None:
                    Product.objects.filter(id=prod.id).update(stock=F("stock") - qty)
                    StockMovement.objects.create(
                        user=self.context["request"].user,
                        product=prod,
                        movement_type=StockMovement.MovementType.SALE,
                        quantity=-Decimal(str(qty)),
                        notes=f"Venta #{transaction.id}",
                    )

        return transaction

    @db_transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        operations = validated_data.pop(
            "operations",
            None,
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        if operations is not None:
            instance.operations.all().delete()

            for operation_data in operations:
                amounts = operation_data.pop(
                    "amounts"
                )

                operation = TransactionOperation.objects.create(
                    transaction=instance,
                    **operation_data,
                )

                operation.exchange_fee = (
                    TransactionOperationSerializer()
                    ._calculate_exchange_fee(
                        operation,
                        amounts,
                    )
                )

                operation.save(
                    update_fields=["exchange_fee"]
                )

                TransactionOperationAmount.objects.bulk_create([
                    TransactionOperationAmount(
                        operation=operation,
                        **amount,
                    )
                    for amount in amounts
                ])

        instance.save()

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(
            instance
        )

        if instance.client:
            representation["client"] = {
                "id": instance.client.id,
                "name": instance.client.name,
                "phone": instance.client.phone,
            }
            for op_rep, op in zip(
                representation.get("operations", []),
                instance.operations.all(),
            ):
                op_rep["display_description"] = (
                    op.get_display_description(
                        client=instance.client
                    )
                )

        total = sum(
            amount.amount
            for operation in instance.operations.all()
            for amount in operation.amounts.all()
        )
        representation["total"] = total

        return representation


class RegisterSerializer(
    serializers.ModelSerializer
):
    is_open = serializers.BooleanField(
        read_only=True
    )

    transaction_count = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    money_in = serializers.SerializerMethodField()
    money_out = serializers.SerializerMethodField()
    net_movement = serializers.SerializerMethodField()

    cash_in = serializers.SerializerMethodField()
    cash_out = serializers.SerializerMethodField()
    expected_cash = serializers.SerializerMethodField()

    bank_in = serializers.SerializerMethodField()
    bank_out = serializers.SerializerMethodField()
    expected_bank = serializers.SerializerMethodField()

    totals_by_method = serializers.SerializerMethodField()
    totals_by_type = serializers.SerializerMethodField()

    exchange_income = serializers.SerializerMethodField()

    pending_transfers = serializers.SerializerMethodField()

    provider = serializers.SerializerMethodField()

    fiado = serializers.SerializerMethodField()

    shift_stock_summary = serializers.SerializerMethodField()

    transactions = TransactionSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Register

        fields = [
            "id",
            "opened_at",
            "closed_at",
            "is_open",

            "initial_cash",
            "initial_bank",

            "transaction_count",

            "total",
            "money_in",
            "money_out",
            "net_movement",

            "cash_in",
            "cash_out",
            "expected_cash",

            "bank_in",
            "bank_out",
            "expected_bank",

            "totals_by_method",
            "totals_by_type",

            "exchange_income",

            "pending_transfers",

            "fiado",
            "provider",
            "shift_stock_summary",
            "transactions",
        ]

        read_only_fields = fields

    def _get_transactions(self, obj):
        return (
            obj.transactions
            .select_related(
                "client"
            )
            .prefetch_related(
                "operations__amounts",
                "operations__provider",
            )
            .order_by("-created_at", "-id")
            .all()
        )

    def _is_money_movement(self, amount):
        """
        Determines whether an operation amount
        represents money that actually moved through
        the register.
        """

        # Fiado is debt, not money.
        if (
            amount.method
            == TransactionOperationAmount.Method.DEBT
        ):
            return False

        # A transfer is not money received until
        # explicitly confirmed.
        if (
            amount.method
            == TransactionOperationAmount.Method.TRANSFER
            and not amount.received
        ):
            return False

        return True

    def _get_operation_money_amount(self, operation):
        """
        Returns the actual money movement represented
        by an operation.

        For exchanges, the amount being exchanged is
        removed from the register movement, leaving
        only the exchange fee.
        """

        money_amount = sum(
            amount.amount
            for amount in operation.amounts.all()
            if self._is_money_movement(amount)
        )

        if operation.type == TransactionOperation.Type.EXCHANGE:
            money_amount -= (
                operation.exchange_amount
                or Decimal("0")
            )

        return money_amount

    def _is_outgoing(self, operation):
        return operation.type in [
            TransactionOperation.Type.PROVIDER,
            TransactionOperation.Type.EXPENSE,
            TransactionOperation.Type.LOSS,
        ]

    def get_transaction_count(self, obj):
        return obj.transactions.count()

    def get_total(self, obj):
        total = Decimal("0")

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                # Exchange income is only the commission.
                if (
                    operation.type
                    == TransactionOperation.Type.EXCHANGE
                ):
                    total += (
                        operation.exchange_fee
                        or Decimal("0")
                    )
                    continue

                for amount in operation.amounts.all():
                    total += amount.amount

        return total

    def get_money_in(self, obj):
        total = Decimal("0")

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                if self._is_outgoing(operation):
                    continue

                total += self._get_operation_money_amount(
                    operation
                )

        return total

    def get_money_out(self, obj):
        total = Decimal("0")

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                if not self._is_outgoing(operation):
                    continue

                total += self._get_operation_money_amount(
                    operation
                )

        return total

    def get_net_movement(self, obj):
        return (
            self.get_money_in(obj)
            - self.get_money_out(obj)
        )

    def _calculate_funds(self, obj):
        if hasattr(obj, "_cached_funds"):
            return obj._cached_funds

        cash_in = Decimal("0")
        cash_out = Decimal("0")
        bank_in = Decimal("0")
        bank_out = Decimal("0")

        for transaction in self._get_transactions(obj):
            for operation in transaction.operations.all():
                is_out = self._is_outgoing(operation)

                if operation.type == TransactionOperation.Type.EXCHANGE:
                    fee = operation.exchange_fee or Decimal("0")
                    for amount in operation.amounts.all():
                        if not self._is_money_movement(amount):
                            continue
                        if amount.method == TransactionOperationAmount.Method.CASH:
                            cash_in += fee
                        elif amount.method in [
                            TransactionOperationAmount.Method.TRANSFER,
                            TransactionOperationAmount.Method.CARD,
                        ]:
                            bank_in += fee
                        break
                    continue

                for amount in operation.amounts.all():
                    if not self._is_money_movement(amount):
                        continue

                    if amount.method == TransactionOperationAmount.Method.CASH:
                        if is_out:
                            cash_out += amount.amount
                        else:
                            cash_in += amount.amount
                    elif amount.method in [
                        TransactionOperationAmount.Method.TRANSFER,
                        TransactionOperationAmount.Method.CARD,
                    ]:
                        if is_out:
                            bank_out += amount.amount
                        else:
                            bank_in += amount.amount

        obj._cached_funds = {
            "cash_in": cash_in,
            "cash_out": cash_out,
            "bank_in": bank_in,
            "bank_out": bank_out,
            "expected_cash": (obj.initial_cash or Decimal("0")) + cash_in - cash_out,
            "expected_bank": (obj.initial_bank or Decimal("0")) + bank_in - bank_out,
        }
        return obj._cached_funds

    def get_cash_in(self, obj):
        return self._calculate_funds(obj)["cash_in"]

    def get_cash_out(self, obj):
        return self._calculate_funds(obj)["cash_out"]

    def get_expected_cash(self, obj):
        return self._calculate_funds(obj)["expected_cash"]

    def get_bank_in(self, obj):
        return self._calculate_funds(obj)["bank_in"]

    def get_bank_out(self, obj):
        return self._calculate_funds(obj)["bank_out"]

    def get_expected_bank(self, obj):
        return self._calculate_funds(obj)["expected_bank"]

    def get_totals_by_method(self, obj):
        totals = {}

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                if (
                    operation.type
                    == TransactionOperation.Type.EXCHANGE
                ):
                    money_amount = (
                        self._get_operation_money_amount(
                            operation
                        )
                    )

                    if money_amount <= 0:
                        continue

                    # Assign the exchange's net movement
                    # to the first actual payment method.
                    for amount in operation.amounts.all():

                        if not self._is_money_movement(
                            amount
                        ):
                            continue

                        totals[amount.method] = (
                            totals.get(
                                amount.method,
                                Decimal("0")
                            )
                            + money_amount
                        )

                        break

                    continue

                for amount in operation.amounts.all():

                    if not self._is_money_movement(
                        amount
                    ):
                        continue

                    totals[amount.method] = (
                        totals.get(
                            amount.method,
                            Decimal("0")
                        )
                        + amount.amount
                    )

        return totals

    def get_totals_by_type(self, obj):
        totals = {}

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                operation_total = (
                    self._get_operation_money_amount(
                        operation
                    )
                )

                if operation_total <= 0:
                    continue

                totals[operation.type] = (
                    totals.get(
                        operation.type,
                        Decimal("0")
                    )
                    + operation_total
                )

        return totals

    def get_exchange_income(self, obj):
        return sum(
            operation.exchange_fee or Decimal("0")
            for transaction in self._get_transactions(obj)
            for operation in transaction.operations.all()
            if (
                operation.type
                == TransactionOperation.Type.EXCHANGE
            )
        )

    def get_pending_transfers(self, obj):
        transfers = []

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                for amount in operation.amounts.all():

                    if (
                        amount.method
                        == TransactionOperationAmount.Method.TRANSFER
                        and not amount.received
                    ):
                        transfers.append({
                            "transaction_id": transaction.id,
                            "operation_id": operation.id,
                            "operation_type": operation.type,
                            "display_description": (
                                operation.get_display_description(
                                    client=transaction.client
                                )
                            ),
                            "amount_id": amount.id,
                            "amount": amount.amount,
                            "description": (
                                transaction.description
                            ),
                            "client_name": (
                                transaction.client.name
                                if transaction.client
                                else None
                            ),
                            "created_at": (
                                transaction.created_at
                            ),
                        })

        return transfers

    def get_fiado(self, obj):
        new_debt = Decimal("0")
        payments = Decimal("0")
        clients = {}

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                # Client payment against existing debt.
                if (
                    operation.type
                    == TransactionOperation.Type.PAYMENT
                ):
                    amount = sum(
                        item.amount
                        for item in operation.amounts.all()
                    )

                    payments += amount

                    if transaction.client:

                        client_id = transaction.client.id

                        if client_id not in clients:
                            clients[client_id] = {
                                "client_id": client_id,
                                "client_name": (
                                    transaction.client.name
                                ),
                                "debt": Decimal("0"),
                                "payments": Decimal("0"),
                                "net": Decimal("0"),
                            }

                        clients[client_id]["payments"] += amount
                        clients[client_id]["net"] -= amount

                    continue

                # Provider operations cannot generate
                # client fiado.
                if operation.type in [
                    TransactionOperation.Type.PROVIDER,
                    TransactionOperation.Type.PROVIDER_PAYMENT,
                ]:
                    continue

                debt_amount = sum(
                    item.amount
                    for item in operation.amounts.all()
                    if (
                        item.method
                        == TransactionOperationAmount.Method.DEBT
                    )
                )

                if debt_amount <= 0:
                    continue

                new_debt += debt_amount

                if transaction.client:

                    client_id = transaction.client.id

                    if client_id not in clients:
                        clients[client_id] = {
                            "client_id": client_id,
                            "client_name": (
                                transaction.client.name
                            ),
                            "debt": Decimal("0"),
                            "payments": Decimal("0"),
                            "net": Decimal("0"),
                        }

                    clients[client_id]["debt"] += debt_amount
                    clients[client_id]["net"] += debt_amount

        return {
            "new_debt": new_debt,
            "payments": payments,
            "net": new_debt - payments,
            "clients": list(clients.values()),
        }

    def get_provider(self, obj):
        new_debt = Decimal("0")
        payments = Decimal("0")
        providers = {}

        for transaction in self._get_transactions(obj):

            for operation in transaction.operations.all():

                if (
                    operation.type
                    != TransactionOperation.Type.PROVIDER
                    or not operation.provider
                ):
                    continue

                provider_id = operation.provider.id

                if provider_id not in providers:
                    providers[provider_id] = {
                        "provider_id": provider_id,
                        "provider_name": (
                            operation.provider.name
                        ),
                        "debt": Decimal("0"),
                        "payments": Decimal("0"),
                        "net": Decimal("0"),
                    }

                provider_debt = sum(
                    item.amount
                    for item in operation.amounts.all()
                    if (
                        item.method
                        == TransactionOperationAmount.Method.DEBT
                    )
                )

                provider_payment = sum(
                    item.amount
                    for item in operation.amounts.all()
                    if (
                        self._is_money_movement(item)
                        and item.method
                        != TransactionOperationAmount.Method.DEBT
                    )
                )

                new_debt += provider_debt
                payments += provider_payment

                providers[provider_id]["debt"] += provider_debt
                providers[provider_id]["payments"] += provider_payment

                providers[provider_id]["net"] += (
                    provider_debt
                    - provider_payment
                )

        return {
            "new_debt": new_debt,
            "payments": payments,
            "net": new_debt - payments,
            "providers": list(
                providers.values()
            ),
        }

    def get_shift_stock_summary(self, obj):
        tx_ids = obj.transactions.values_list("id", flat=True)
        items = (
            TransactionOperationItem.objects
            .filter(operation__transaction_id__in=tx_ids)
            .select_related("product")
        )

        sold_by_product = {}
        for it in items:
            p_id = str(it.product_id) if it.product_id else f"custom_{it.product_name}"
            if p_id not in sold_by_product:
                sold_by_product[p_id] = {
                    "product_id": it.product_id,
                    "product_name": it.product_name,
                    "unit_type": it.unit_type,
                    "quantity": Decimal("0.00"),
                    "total_amount": Decimal("0.00"),
                    "current_stock": it.product.stock if it.product else None,
                    "min_stock": it.product.min_stock if it.product else 0,
                }
            sold_by_product[p_id]["quantity"] += it.quantity
            sold_by_product[p_id]["total_amount"] += it.subtotal

        low_or_out = []
        user = obj.user
        tracked_prods = Product.objects.filter(user=user, is_active=True, stock__isnull=False)
        for p in tracked_prods:
            if p.stock <= Decimal("0"):
                low_or_out.append({
                    "id": p.id,
                    "name": p.name,
                    "stock": p.stock,
                    "min_stock": p.min_stock or 0,
                    "status": "out_of_stock",
                })
            elif p.min_stock and p.stock <= Decimal(str(p.min_stock)):
                low_or_out.append({
                    "id": p.id,
                    "name": p.name,
                    "stock": p.stock,
                    "min_stock": p.min_stock,
                    "status": "low_stock",
                })

        return {
            "products_sold": list(sold_by_product.values()),
            "total_items_sold": sum(it["quantity"] for it in sold_by_product.values()),
            "critical_stock_alerts": low_or_out,
        }


class TransactionAmountReceivedSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = TransactionOperationAmount

        fields = [
            "id",
            "method",
            "amount",
            "received",
        ]

        read_only_fields = [
            "id",
            "method",
            "amount",
        ]


class ProviderSerializer(
    serializers.ModelSerializer
):
    current_register_total = serializers.SerializerMethodField()
    current_register_transactions = serializers.SerializerMethodField()
    outstanding_debt = serializers.SerializerMethodField()

    class Meta:
        model = Provider

        fields = [
            "id",
            "name",
            "phone",
            "notes",
            "created_at",
            "current_register_total",
            "current_register_transactions",
            "outstanding_debt",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "current_register_total",
            "current_register_transactions",
            "outstanding_debt",
        ]

    def _get_current_register(self):
        request = self.context["request"]

        return Register.objects.filter(
            user=request.user,
            closed_at__isnull=True,
        ).first()

    def get_provider_operations(self, obj):
        register = self._get_current_register()

        if register is None:
            return obj.transaction_operations.none()

        return (
            obj.transaction_operations
            .filter(
                transaction__register=register
            )
            .prefetch_related(
                "amounts"
            )
        )

    def get_current_register_total(self, obj):
        return sum(
            amount.amount
            for operation in self.get_provider_operations(obj)
            for amount in operation.amounts.all()
            if (
                amount.method
                != TransactionOperationAmount.Method.DEBT
            )
        )

    def get_current_register_transactions(self, obj):
        return (
            self.get_provider_operations(obj)
            .values("transaction")
            .distinct()
            .count()
        )

    def get_outstanding_debt(self, obj):
        operations = (
            obj.transaction_operations
            .prefetch_related(
                "amounts"
            )
            .all()
        )

        debt_created = sum(
            amount.amount
            for operation in operations
            if (
                operation.type
                == TransactionOperation.Type.PROVIDER
            )
            for amount in operation.amounts.all()
            if (
                amount.method
                == TransactionOperationAmount.Method.DEBT
            )
        )

        debt_paid = sum(
            amount.amount
            for operation in operations
            if (
                operation.type
                == TransactionOperation.Type.PROVIDER_PAYMENT
            )
            for amount in operation.amounts.all()
            if (
                amount.method
                != TransactionOperationAmount.Method.DEBT
            )
        )

        return max(
            debt_created - debt_paid,
            Decimal("0"),
        )


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "created_at",
            "products_count",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "products_count",
        ]

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
        default=None,
    )
    provider_name = serializers.CharField(
        source="provider.name",
        read_only=True,
        default=None,
    )
    markup_percentage = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "unit_type",
            "category",
            "category_name",
            "provider",
            "provider_name",
            "sale_price",
            "cost_price",
            "barcode",
            "stock",
            "min_stock",
            "is_active",
            "markup_percentage",
            "stock_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "markup_percentage",
            "stock_status",
            "category_name",
            "provider_name",
        ]

    def get_markup_percentage(self, obj):
        if obj.cost_price and obj.cost_price > Decimal("0") and obj.sale_price:
            markup = ((obj.sale_price - obj.cost_price) / obj.cost_price) * Decimal("100")
            return round(float(markup), 1)
        return None

    def get_stock_status(self, obj):
        if obj.stock is None:
            return "untracked"
        if obj.stock <= Decimal("0"):
            return "out_of_stock"
        if obj.min_stock is not None and obj.stock <= Decimal(str(obj.min_stock)):
            return "low_stock"
        return "normal"


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_unit_type = serializers.CharField(source="product.unit_type", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True, default=None)
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_name",
            "product_unit_type",
            "movement_type",
            "movement_type_display",
            "quantity",
            "unit_cost",
            "total_cost",
            "provider",
            "provider_name",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "product_name",
            "product_unit_type",
            "provider_name",
            "movement_type_display",
        ]


class StockRestockItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    update_product_cost = serializers.BooleanField(default=True, required=False)


class StockBatchRestockSerializer(serializers.Serializer):
    provider = serializers.PrimaryKeyRelatedField(queryset=Provider.objects.all(), required=False, allow_null=True)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)
    items = StockRestockItemSerializer(many=True)

    @db_transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
        provider = validated_data.get("provider")
        notes = validated_data.get("notes", "").strip()
        items_data = validated_data.get("items", [])

        created_movements = []
        for item in items_data:
            product = item["product"]
            quantity = item["quantity"]
            unit_cost = item.get("unit_cost")
            total_cost = item.get("total_cost")
            if unit_cost is None and total_cost is not None and quantity > 0:
                unit_cost = total_cost / quantity
            elif total_cost is None and unit_cost is not None:
                total_cost = unit_cost * quantity

            update_cost = item.get("update_product_cost", True)

            # Update product stock
            if product.stock is None:
                product.stock = quantity
            else:
                product.stock = (product.stock or Decimal("0")) + quantity

            if update_cost and unit_cost is not None and unit_cost > Decimal("0"):
                product.cost_price = unit_cost

            product.save(update_fields=["stock", "cost_price", "updated_at"])

            movement = StockMovement.objects.create(
                user=user,
                product=product,
                movement_type=StockMovement.MovementType.RESTOCK,
                quantity=quantity,
                unit_cost=unit_cost,
                total_cost=total_cost,
                provider=provider or product.provider,
                notes=notes,
            )
            created_movements.append(movement)

        return created_movements


class StockAdjustmentSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    new_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    min_stock = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    movement_type = serializers.ChoiceField(
        choices=[
            ("adjustment", "Ajuste manual / Recuento"),
            ("loss", "Pérdida / Rotura / Vencido"),
            ("restock", "Ingreso directo"),
        ],
        default="adjustment",
    )
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)

    @db_transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
        product = validated_data["product"]
        new_stock = validated_data["new_stock"]
        movement_type = validated_data.get("movement_type", "adjustment")
        notes = validated_data.get("notes", "").strip()

        old_stock = product.stock if product.stock is not None else Decimal("0.00")
        delta = new_stock - old_stock

        product.stock = new_stock
        update_fields = ["stock", "updated_at"]

        if "min_stock" in validated_data:
            val = validated_data["min_stock"]
            product.min_stock = int(val) if val is not None else 0
            update_fields.append("min_stock")

        product.save(update_fields=update_fields)

        movement = StockMovement.objects.create(
            user=user,
            product=product,
            movement_type=movement_type,
            quantity=delta,
            notes=notes or ("Recuento de inventario" if movement_type == "adjustment" else "Ajuste"),
        )
        return movement


class StockNoteSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    note_type_display = serializers.CharField(source="get_note_type_display", read_only=True)

    class Meta:
        model = StockNote
        fields = [
            "id",
            "product",
            "product_name",
            "item_name",
            "note_type",
            "note_type_display",
            "customer_name",
            "notes",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "product_name",
            "status_display",
            "note_type_display",
        ]
