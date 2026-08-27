from decimal import Decimal

from django.db import transaction as db_transaction
from rest_framework import serializers

from .models import (Client, Provider, Register, Transaction,
                     TransactionOperation, TransactionOperationAmount)


class ClientSerializer(serializers.ModelSerializer):
    debt = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = [
            "id",
            "name",
            "phone",
            "notes",
            "created_at",
            "debt",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "debt",
        ]

    def get_debt(self, obj):
        debt = Decimal("0")

        for operation in obj.transaction_operations.prefetch_related(
            "amounts"
        ):
            if operation.type == TransactionOperation.Type.PAYMENT:
                debt -= sum(
                    amount.amount
                    for amount in operation.amounts.all()
                )

            else:
                debt += sum(
                    amount.amount
                    for amount in operation.amounts.all()
                    if amount.method
                    == TransactionOperationAmount.Method.DEBT
                )

        return max(debt, Decimal("0"))


class TransactionOperationAmountSerializer(
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
        ]


class TransactionOperationSerializer(
    serializers.ModelSerializer
):
    amounts = TransactionOperationAmountSerializer(
        many=True
    )

    total = serializers.SerializerMethodField()

    class Meta:
        model = TransactionOperation

        fields = [
            "id",
            "type",
            "service_type",
            "client",
            "provider",
            "exchange_amount",
            "exchange_fee",
            "amounts",
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

        client = attrs.get(
            "client",
            getattr(
                self.instance,
                "client",
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
            if client is None:
                raise serializers.ValidationError({
                    "client":
                        "El pago de fiado requiere un cliente."
                })

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

            if client is not None:
                raise serializers.ValidationError({
                    "client":
                        "Una operación de proveedor no puede tener un cliente."
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

        for operation in instance.operations.all():
            # Force the operation serializer to expose
            # the generated title/description.
            pass

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

    totals_by_method = serializers.SerializerMethodField()
    totals_by_type = serializers.SerializerMethodField()

    exchange_income = serializers.SerializerMethodField()

    pending_transfers = serializers.SerializerMethodField()

    provider = serializers.SerializerMethodField()

    fiado = serializers.SerializerMethodField()

    class Meta:
        model = Register

        fields = [
            "id",
            "opened_at",
            "closed_at",
            "is_open",

            "transaction_count",

            "total",
            "money_in",
            "money_out",
            "net_movement",

            "totals_by_method",
            "totals_by_type",

            "exchange_income",

            "pending_transfers",

            "fiado",
            "provider",
        ]

        read_only_fields = fields

    def _get_transactions(self, obj):
        return (
            obj.transactions
            .prefetch_related(
                "operations__amounts",
                "operations__client",
                "operations__provider",
            )
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
                            "amount_id": amount.id,
                            "amount": amount.amount,
                            "description": (
                                transaction.description
                            ),
                            "client_name": (
                                operation.client.name
                                if operation.client
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

                    if operation.client:

                        client_id = operation.client.id

                        if client_id not in clients:
                            clients[client_id] = {
                                "client_id": client_id,
                                "client_name": (
                                    operation.client.name
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

                if operation.client:

                    client_id = operation.client.id

                    if client_id not in clients:
                        clients[client_id] = {
                            "client_id": client_id,
                            "client_name": (
                                operation.client.name
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

    def get_provider_transactions(self, obj):
        register = self._get_current_register()

        if register is None:
            return obj.transactions.none()

        return (
            obj.transactions
            .filter(register=register)
            .prefetch_related(
                "operations__amounts"
            )
        )

    def get_current_register_total(self, obj):
        return sum(
            amount.amount
            for transaction
            in self.get_provider_transactions(obj)
            for operation
            in transaction.operations.all()
            for amount
            in operation.amounts.all()
            if (
                amount.method
                != TransactionOperationAmount.Method.DEBT
            )
        )

    def get_current_register_transactions(self, obj):
        return self.get_provider_transactions(obj).count()

    def get_outstanding_debt(self, obj):
        debt_created = sum(
            amount.amount
            for transaction
            in obj.transactions
            .prefetch_related(
                "operations__amounts"
            )
            .all()
            for operation
            in transaction.operations.all()
            if (
                operation.type
                == TransactionOperation.Type.PROVIDER
            )
            for amount
            in operation.amounts.all()
            if (
                amount.method
                == TransactionOperationAmount.Method.DEBT
            )
        )

        debt_paid = sum(
            amount.amount
            for transaction
            in obj.transactions
            .prefetch_related(
                "operations__amounts"
            )
            .all()
            for operation
            in transaction.operations.all()
            if (
                operation.type
                == TransactionOperation.Type.PROVIDER_PAYMENT
            )
            for amount
            in operation.amounts.all()
            if (
                amount.method
                != TransactionOperationAmount.Method.DEBT
            )
        )

        return max(
            debt_created - debt_paid,
            Decimal("0"),
        )