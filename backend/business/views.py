from django.db import transaction as db_transaction
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Register, Transaction
from .serializers import (
    RegisterSerializer,
    TransactionSerializer,
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
            .prefetch_related("amounts")
            .select_related("register")
            .order_by("-created_at")
        )


class TransactionDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user)
            .prefetch_related("amounts")
            .select_related("register")
        )


class CurrentRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        register = (
            Register.objects
            .filter(
                user=request.user,
                closed_at__isnull=True,
            )
            .prefetch_related(
                "transactions__amounts"
            )
            .first()
        )

        if register is None:
            return Response(
                None,
                status=status.HTTP_200_OK,
            )

        return Response(
            RegisterSerializer(register).data
        )


class OpenRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        existing_register = (
            Register.objects
            .filter(
                user=request.user,
                closed_at__isnull=True,
            )
            .first()
        )

        if existing_register:
            return Response(
                {
                    "detail":
                        "Ya hay una caja abierta."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        register = Register.objects.create(
            user=request.user,
        )

        return Response(
            RegisterSerializer(register).data,
            status=status.HTTP_201_CREATED,
        )


class CloseRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        register = (
            Register.objects
            .filter(
                user=request.user,
                closed_at__isnull=True,
            )
            .first()
        )

        if register is None:
            return Response(
                {
                    "detail":
                        "No hay una caja abierta."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        register.closed_at = timezone.now()
        register.save(
            update_fields=["closed_at"]
        )

        return Response(
            RegisterSerializer(register).data,
            status=status.HTTP_200_OK,
        )