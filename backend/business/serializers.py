from rest_framework import serializers

from .models import Transaction, TransactionAmount


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
        many=True,
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "type",
            "created_at",
            "description",
            "amounts",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]

    def validate(self, attrs):
        if not attrs.get("amounts"):
            raise serializers.ValidationError({
                "amounts": "La operación debe tener al menos un monto."
            })

        return attrs

    def create(self, validated_data):
        amounts = validated_data.pop("amounts")

        transaction = Transaction.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )

        TransactionAmount.objects.bulk_create([
            TransactionAmount(
                transaction=transaction,
                **amount,
            )
            for amount in amounts
        ])

        return transaction