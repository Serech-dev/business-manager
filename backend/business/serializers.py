from django.db import transaction
from rest_framework import serializers

from .models import Product, Transaction, TransactionItem


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "active",
        ]
        read_only_fields = [
            "id",
        ]

    def validate_name(self, value):
        value = " ".join(value.strip().lower().split())

        if not value:
            raise serializers.ValidationError(
                "El nombre no puede estar vacío."
            )

        return value

    def validate(self, attrs):
        user = self.context["request"].user
        name = attrs.get("name")

        if Product.objects.filter(
            user=user,
            name=name,
        ).exists():
            raise serializers.ValidationError({
                "name": "El producto ya existe."
            })

        return attrs

    def create(self, validated_data):
        return Product.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )


class TransactionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = TransactionItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "total",
        ]
        read_only_fields = [
            "id",
            "total",
        ]


class TransactionSerializer(serializers.ModelSerializer):
    items = TransactionItemSerializer(
        many=True,
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "created_at",
            "items",
            "total",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "total",
        ]

    def validate(self, attrs):
        user = self.context["request"].user

        for item in attrs["items"]:
            product = item["product"]

            if product.user != user:
                raise serializers.ValidationError({
                    "items": (
                        f"El producto '{product.name}' "
                        "no pertenece a tu cuenta."
                    )
                })

            if not product.active:
                raise serializers.ValidationError({
                    "items": (
                        f"El producto '{product.name}' "
                        "no está activo."
                    )
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items")

        for item in items:
            product = item["product"]

            if (
                item.get("unit_price") is None
                and product.price is None
            ):
                raise serializers.ValidationError({
                    "items": (
                        f"El producto '{product.name}' "
                        "no tiene un precio."
                    )
                })

        transaction_obj = Transaction.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )

        TransactionItem.objects.bulk_create([
            TransactionItem(
                transaction=transaction_obj,
                product=item["product"],
                quantity=item["quantity"],
                unit_price=(
                    item.get("unit_price")
                    if item.get("unit_price") is not None
                    else item["product"].price
                ),
            )
            for item in items
        ])

        return transaction_obj