from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Product, Transaction
from .serializers import (
    ProductSerializer,
    TransactionSerializer,
)


class ProductListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(
            user=self.request.user,
        )


class ProductDetailView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(
            user=self.request.user,
        )


class TransactionListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user)
            .prefetch_related("items__product")
        )