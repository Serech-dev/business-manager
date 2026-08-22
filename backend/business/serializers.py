from decimal import Decimal

from django.db import transaction as db_transaction
from rest_framework import serializers

from .models import (
    Register,
    Transaction,
    TransactionAmount,
)


class TransactionAmountSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = TransactionAmount
        fields = [
            "id",
            "method",
            "amount",
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

        return attrs

    def _calculate_exchange_fee(
        self,
        transaction,
    ):
        if transaction.type in [
            Transaction.Type.EXCHANGE,
            Transaction.Type.SALE_EXCHANGE,
        ]:
            return (
                transaction.exchange_amount
                * Decimal("0.10")
            )

        return None

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
                transaction
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

        instance.exchange_fee = (
            self._calculate_exchange_fee(
                instance
            )
        )

        instance.save()

        if amounts is not None:
            instance.amounts.all().delete()

            TransactionAmount.objects.bulk_create([
                TransactionAmount(
                    transaction=instance,
                    **amount,
                )
                for amount in amounts
            ])

        return instance


class RegisterSerializer(
    serializers.ModelSerializer
):
    is_open = serializers.BooleanField(
        read_only=True
    )

    transaction_count = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    totals_by_method = serializers.SerializerMethodField()
    totals_by_type = serializers.SerializerMethodField()

    class Meta:
        model = Register

        fields = [
            "id",
            "opened_at",
            "closed_at",
            "is_open",
            "transaction_count",
            "total",
            "totals_by_method",
            "totals_by_type",
        ]

        read_only_fields = fields

    def _get_transactions(self, obj):
        return obj.transactions.prefetch_related(
            "amounts"
        ).all()

    def get_transaction_count(self, obj):
        return obj.transactions.count()

    def get_total(self, obj):
        return sum(
            amount.amount
            for transaction in self._get_transactions(obj)
            for amount in transaction.amounts.all()
        )

    def get_totals_by_method(self, obj):
        totals = {}

        for transaction in self._get_transactions(obj):
            for amount in transaction.amounts.all():
                totals[amount.method] = (
                    totals.get(amount.method, 0)
                    + amount.amount
                )

        return totals

    def get_totals_by_type(self, obj):
        totals = {}

        for transaction in self._get_transactions(obj):
            transaction_total = sum(
                amount.amount
                for amount in transaction.amounts.all()
            )

            totals[transaction.type] = (
                totals.get(transaction.type, 0)
                + transaction_total
            )

        return totals