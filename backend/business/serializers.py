from decimal import Decimal

from django.db import transaction as db_transaction
from rest_framework import serializers

from .models import (
    Provider,
    Register,
    Transaction,
    TransactionAmount,
)
from .models import Client


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

        for transaction in obj.transactions.prefetch_related(
            "amounts"
        ):
            if transaction.type == Transaction.Type.PAYMENT:
                debt -= sum(
                    amount.amount
                    for amount in transaction.amounts.all()
                )

            else:
                debt += sum(
                    amount.amount
                    for amount in transaction.amounts.all()
                    if amount.method
                    == TransactionAmount.Method.DEBT
                )

        return max(debt, Decimal("0"))

class TransactionAmountSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = TransactionAmount
        fields = [
            "id",
            "method",
            "amount",
            "received",
        ]
        read_only_fields = [
            "id",
        ]


class TransactionSerializer(
    serializers.ModelSerializer
):
    amounts = TransactionAmountSerializer(
        many=True
    )

    total = serializers.SerializerMethodField()

    register = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = Transaction

        fields = [
            "id",
            "register",
            "type",
            "client",
            "provider",
            "created_at",
            "description",
            "exchange_amount",
            "exchange_fee",
            "amounts",
            "total",
        ]

        read_only_fields = [
            "id",
            "register",
            "created_at",
            "exchange_fee",
            "total",
        ]

    def get_total(self, obj):
        return sum(
            amount.amount
            for amount in obj.amounts.all()
        )

    def validate(self, attrs):
        if (
            self.instance
            and not self.instance.register.is_open
        ):
            raise serializers.ValidationError({
                "register":
                    "No se puede modificar una operación de una caja cerrada."
            })

        transaction_type = attrs.get(
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

        if transaction_type == Transaction.Type.PAYMENT:
            if client is None:
                raise serializers.ValidationError({
                    "client":
                        "El pago de fiado requiere un cliente."
                })

        if transaction_type in [
            Transaction.Type.EXCHANGE,
            Transaction.Type.SALE_EXCHANGE,
        ]:
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

        if transaction_type == Transaction.Type.PAYMENT:
            client = attrs.get(
                "client",
                getattr(self.instance, "client", None),
            )

            if client is None:
                raise serializers.ValidationError({
                    "client":
                        "El pago de fiado requiere un cliente."
                })

        if transaction_type == Transaction.Type.PAYMENT:
            amounts = attrs.get("amounts")

            if amounts and any(
                amount["method"]
                == TransactionAmount.Method.DEBT
                for amount in amounts
            ):
                raise serializers.ValidationError({
                    "amounts":
                        "Un pago de fiado no puede registrarse como fiado."
                })
            
        if transaction_type == Transaction.Type.PROVIDER:
            provider = attrs.get(
                "provider",
                getattr(
                    self.instance,
                    "provider",
                    None,
                ),
            )

            if provider is None:
                raise serializers.ValidationError({
                    "provider":
                        "Una operación de proveedor requiere un proveedor."
                })

            client = attrs.get(
                "client",
                getattr(
                    self.instance,
                    "client",
                    None,
                ),
            )

            if client is not None:
                raise serializers.ValidationError({
                    "client":
                        "Una operación de proveedor no puede tener un cliente."
                })

        return attrs

    def _calculate_exchange_fee(
        self,
        transaction,
        amounts,
    ):
        if transaction.type not in [
            Transaction.Type.EXCHANGE,
            Transaction.Type.SALE_EXCHANGE,
        ]:
            return None

        if not transaction.exchange_amount:
            return None

        paid_amount = sum(
            amount["amount"]
            for amount in amounts
            if amount["method"]
            != TransactionAmount.Method.DEBT
        )

        fee = (
            paid_amount
            - transaction.exchange_amount
        )

        return max(
            fee,
            Decimal("0")
        )
    
    def _get_open_register(self):
        return Register.objects.filter(
            user=self.context["request"].user,
            closed_at__isnull=True,
        ).first()

    @db_transaction.atomic
    def create(self, validated_data):
        amounts = validated_data.pop(
            "amounts"
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

        transaction.exchange_fee = (
            self._calculate_exchange_fee(
                transaction,
                amounts,
            )
        )

        transaction.save(
            update_fields=["exchange_fee"]
        )

        TransactionAmount.objects.bulk_create([
            TransactionAmount(
                transaction=transaction,
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

            TransactionAmount.objects.bulk_create([
                TransactionAmount(
                    transaction=instance,
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
        ]

        read_only_fields = fields


    def _get_transactions(self, obj):
        return (
            obj.transactions
            .select_related(
                "client",
                "provider",
            )
            .prefetch_related(
                "amounts"
            )
            .all()
        )


    def _is_money_movement(self, amount):
        """
        Determines whether a transaction amount
        represents money that actually moved through
        the register.
        """

        # Fiado is debt, not money.
        if (
            amount.method
            == TransactionAmount.Method.DEBT
        ):
            return False

        # A transfer is not money received until
        # explicitly confirmed.
        if (
            amount.method
            == TransactionAmount.Method.TRANSFER
            and not amount.received
        ):
            return False

        return True


    def _get_money_amount(self, transaction):
        money_amount = sum(
            amount.amount
            for amount in transaction.amounts.all()
            if self._is_money_movement(amount)
        )

        if transaction.type in [
            Transaction.Type.EXCHANGE,
            Transaction.Type.SALE_EXCHANGE,
        ]:
            money_amount -= transaction.exchange_amount or Decimal("0")

        return money_amount


    def _is_outgoing(self, transaction):
        return transaction.type in [
            Transaction.Type.PROVIDER,
            Transaction.Type.EXPENSE,
            Transaction.Type.LOSS,
        ]


    def get_transaction_count(self, obj):
        return obj.transactions.count()


    def get_total(self, obj):
        total = Decimal("0")

        for transaction in self._get_transactions(obj):

            # Exchange income is only the commission.
            if transaction.type in [
                Transaction.Type.EXCHANGE,
                Transaction.Type.SALE_EXCHANGE,
            ]:
                total += transaction.exchange_fee or Decimal("0")
                continue

            for amount in transaction.amounts.all():
                total += amount.amount

        return total


    def get_money_in(self, obj):
        total = 0

        for transaction in self._get_transactions(obj):

            if self._is_outgoing(transaction):
                continue

            total += self._get_money_amount(
                transaction
            )

        return total


    def get_money_out(self, obj):
        total = 0

        for transaction in self._get_transactions(obj):

            if not self._is_outgoing(transaction):
                continue

            total += self._get_money_amount(
                transaction
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

            if transaction.type in [
                Transaction.Type.EXCHANGE,
                Transaction.Type.SALE_EXCHANGE,
            ]:
                money_amount = self._get_money_amount(
                    transaction
                )

                if money_amount <= 0:
                    continue

                # For now, the exchange payment method
                # receives the net movement.
                for amount in transaction.amounts.all():
                    if not self._is_money_movement(amount):
                        continue

                    totals[amount.method] = (
                        totals.get(amount.method, 0)
                        + money_amount
                    )

                    break

                continue

            for amount in transaction.amounts.all():

                if not self._is_money_movement(amount):
                    continue

                totals[amount.method] = (
                    totals.get(
                        amount.method,
                        0
                    )
                    + amount.amount
                )

        return totals


    def get_totals_by_type(self, obj):
        totals = {}

        for transaction in self._get_transactions(obj):

            transaction_total = (
                self._get_money_amount(
                    transaction
                )
            )

            if transaction_total <= 0:
                continue

            totals[transaction.type] = (
                totals.get(
                    transaction.type,
                    0
                )
                + transaction_total
            )

        return totals


    def get_exchange_income(self, obj):
        return sum(
            transaction.exchange_fee or 0
            for transaction in self._get_transactions(obj)
            if transaction.type in [
                Transaction.Type.EXCHANGE,
                Transaction.Type.SALE_EXCHANGE,
            ]
        )


    def get_pending_transfers(self, obj):
        transfers = []

        for transaction in self._get_transactions(obj):

            for amount in transaction.amounts.all():

                if (
                    amount.method
                    == TransactionAmount.Method.TRANSFER
                    and not amount.received
                ):
                    transfers.append({
                        "transaction_id": transaction.id,
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
        new_debt = 0
        payments = 0
        clients = {}

        for transaction in self._get_transactions(obj):

            # Payment against existing debt.
            if (
                transaction.type
                == Transaction.Type.PAYMENT
            ):
                amount = sum(
                    item.amount
                    for item in transaction.amounts.all()
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
                            "debt": 0,
                            "payments": 0,
                            "net": 0,
                        }

                    clients[client_id]["payments"] += (
                        amount
                    )

                    clients[client_id]["net"] -= (
                        amount
                    )

                continue


            # New debt.
            debt_amount = sum(
                item.amount
                for item in transaction.amounts.all()
                if (
                    item.method
                    == TransactionAmount.Method.DEBT
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
                        "debt": 0,
                        "payments": 0,
                        "net": 0,
                    }

                clients[client_id]["debt"] += (
                    debt_amount
                )

                clients[client_id]["net"] += (
                    debt_amount
                )

        return {
            "new_debt": new_debt,
            "payments": payments,
            "net": new_debt - payments,
            "clients": list(
                clients.values()
            ),
        }


class TransactionAmountReceivedSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = TransactionAmount
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
    total_amount = serializers.SerializerMethodField()
    cash = serializers.SerializerMethodField()
    transfer = serializers.SerializerMethodField()
    owed = serializers.SerializerMethodField()

    class Meta:
        model = Provider

        fields = [
            "id",
            "name",
            "phone",
            "notes",
            "created_at",
            "total_amount",
            "cash",
            "transfer",
            "owed",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "total_amount",
            "cash",
            "transfer",
            "owed",
        ]

    def get_provider_transactions(self, obj):
        return obj.transactions.prefetch_related("amounts").all()

    def get_total_amount(self, obj):
        return sum(
            amount.amount
            for transaction in self.get_provider_transactions(obj)
            for amount in transaction.amounts.all()
        )

    def get_cash(self, obj):
        return sum(
            amount.amount
            for transaction in self.get_provider_transactions(obj)
            for amount in transaction.amounts.all()
            if amount.method == TransactionAmount.Method.CASH
        )

    def get_transfer(self, obj):
        return sum(
            amount.amount
            for transaction in self.get_provider_transactions(obj)
            for amount in transaction.amounts.all()
            if amount.method == TransactionAmount.Method.TRANSFER
        )

    def get_owed(self, obj):
        return sum(
            amount.amount
            for transaction in self.get_provider_transactions(obj)
            for amount in transaction.amounts.all()
            if amount.method == TransactionAmount.Method.DEBT
        )