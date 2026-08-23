from django.db import transaction as db_transaction
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Register, Transaction, TransactionAmount
from .serializers import (
    RegisterSerializer,
    TransactionAmountReceivedSerializer,
    TransactionSerializer,
)

from .models import Client
from .serializers import ClientSerializer


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Client.objects
            .filter(user=self.request.user)
            .order_by("name")
        )

        search = self.request.query_params.get(
            "search"
        )

        if search:
            queryset = queryset.filter(
                name__icontains=search
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class ClientDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Client.objects.filter(
            user=self.request.user
        )
    
class TransactionListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Transaction.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related("amounts")
            .select_related("register")
            .order_by("-created_at")
        )

        if self.request.query_params.get(
            "current"
        ) == "1":
            queryset = queryset.filter(
                register__user=self.request.user,
                register__closed_at__isnull=True,
            )

        return queryset


class TransactionAmountReceivedView(
    generics.UpdateAPIView
):
    serializer_class = TransactionAmountReceivedSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            TransactionAmount.objects
            .filter(
                transaction__user=self.request.user
            )
            .select_related(
                "transaction",
                "transaction__register",
            )
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.transaction.register.is_open:
            return Response(
                {
                    "detail":
                        "No se puede modificar una operación de una caja cerrada."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )
    

class TransactionDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related("amounts")
            .select_related("register")
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.register.is_open:
            return Response(
                {
                    "detail":
                        "No se puede modificar una operación de una caja cerrada."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.register.is_open:
            return Response(
                {
                    "detail":
                        "No se puede eliminar una operación de una caja cerrada."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(
            request,
            *args,
            **kwargs,
        )

class CurrentTransactionListView(
    generics.ListAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(
                user=self.request.user,
                register__closed_at__isnull=True,
            )
            .prefetch_related("amounts")
            .select_related("register")
            .order_by("-created_at")
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

class RegisterListView(
    generics.ListAPIView
):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Register.objects
            .filter(
                user=self.request.user,
                closed_at__isnull=False,
            )
            .prefetch_related(
                "transactions__amounts"
            )
            .order_by("-closed_at")
        )


class RegisterDetailView(
    generics.RetrieveAPIView
):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Register.objects
            .filter(
                user=self.request.user,
                closed_at__isnull=False,
            )
            .prefetch_related(
                "transactions__amounts"
            )
        )

