from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (Category, Client, Product, Provider, Register,
                     Transaction, TransactionOperationAmount)
from .serializers import (CategorySerializer, ClientSerializer,
                          ProductSerializer, ProviderSerializer,
                          RegisterSerializer,
                          TransactionAmountReceivedSerializer,
                          TransactionSerializer)


class ClientListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Client.objects
            .filter(
                user=self.request.user
            )
            .order_by("name")
        )

        search = self.request.query_params.get(
            "search"
        )

        if search:
            queryset = queryset.filter(
                name__istartswith=search
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
            .prefetch_related(
                "operations__amounts",
                "operations__provider",
            )
            .select_related(
                "register",
                "client",
            )
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
    serializer_class = (
        TransactionAmountReceivedSerializer
    )

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            TransactionOperationAmount.objects
            .filter(
                operation__transaction__user=self.request.user
            )
            .select_related(
                "operation",
                "operation__transaction",
                "operation__transaction__register",
            )
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if (
            instance.method
            != TransactionOperationAmount.Method.TRANSFER
        ):
            return Response(
                {
                    "detail":
                        "Solo se puede confirmar una transferencia."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )


class ResolveTransferView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request, pk):
        amount = (
            TransactionOperationAmount.objects
            .filter(
                id=pk,
                operation__transaction__user=request.user,
                method=TransactionOperationAmount.Method.TRANSFER,
            )
            .select_related(
                "operation__transaction__client",
                "operation__transaction",
            )
            .first()
        )

        if not amount:
            return Response(
                {"detail": "Transferencia no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")
        client_id = request.data.get("client_id")
        transaction = amount.operation.transaction

        if action == "confirm":
            amount.received = True
            amount.save(update_fields=["received"])
            return Response({
                "status": "confirmed",
                "detail": "Transferencia confirmada como recibida.",
            })

        elif action == "convert_to_debt":
            if client_id:
                client = Client.objects.filter(id=client_id, user=request.user).first()
                if not client:
                    return Response(
                        {"detail": "Cliente no encontrado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                transaction.client = client
                transaction.save(update_fields=["client"])

            if not transaction.client:
                return Response(
                    {"detail": "Se requiere asociar un cliente para pasar la transferencia a fiado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            amount.method = TransactionOperationAmount.Method.DEBT
            amount.received = True
            amount.save(update_fields=["method", "received"])

            return Response({
                "status": "converted_to_debt",
                "client_name": transaction.client.name,
                "detail": f"Monto pasado a la cuenta de {transaction.client.name}.",
            })

        elif action == "void":
            operation = amount.operation
            if operation.amounts.count() > 1:
                amount.delete()
            else:
                if transaction.operations.count() > 1:
                    operation.delete()
                else:
                    transaction.delete()

            return Response({
                "status": "voided",
                "detail": "Transferencia anulada.",
            })

        return Response(
            {"detail": "Acción no válida. Usá confirm, convert_to_debt o void."},
            status=status.HTTP_400_BAD_REQUEST,
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
            .prefetch_related(
                "operations__amounts",
                "operations__provider",
            )
            .select_related(
                "register",
                "client",
            )
        )

    def update(
        self,
        request,
        *args,
        **kwargs
    ):
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

    def destroy(
        self,
        request,
        *args,
        **kwargs
    ):
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
            .prefetch_related(
                "operations__amounts",
                "operations__provider",
            )
            .select_related(
                "register",
                "client",
            )
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
                "transactions__operations__amounts"
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

        initial_cash = request.data.get("initial_cash", Decimal("0.00")) or Decimal("0.00")
        initial_bank = request.data.get("initial_bank", Decimal("0.00")) or Decimal("0.00")

        register = Register.objects.create(
            user=request.user,
            initial_cash=initial_cash,
            initial_bank=initial_bank,
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


class ReopenLastRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        current_open = (
            Register.objects
            .filter(
                user=request.user,
                closed_at__isnull=True,
            )
            .first()
        )

        if current_open:
            return Response(
                {
                    "detail": "Ya hay una caja abierta actualmente."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        last_closed = (
            Register.objects
            .filter(
                user=request.user,
                closed_at__isnull=False,
            )
            .order_by("-closed_at")
            .first()
        )

        if last_closed is None:
            return Response(
                {
                    "detail": "No hay cajas cerradas para reabrir."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        last_closed.closed_at = None
        last_closed.save(update_fields=["closed_at"])

        return Response(
            RegisterSerializer(last_closed).data,
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
                "transactions__operations__amounts"
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
                "transactions__operations__amounts"
            )
        )


class ProviderListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Provider.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related(
                "transaction_operations__amounts"
            )
            .order_by("name")
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )


class ProviderDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Provider.objects
            .filter(
                user=self.request.user
            )
            .prefetch_related(
                "transaction_operations__amounts"
            )
        )


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import calculate_analytics

        period = request.query_params.get("period", "today")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        data = calculate_analytics(
            user=request.user,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
        )
        return Response(data, status=status.HTTP_200_OK)


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Category.objects
            .filter(user=self.request.user)
            .prefetch_related("products")
            .order_by("name")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Product.objects
            .filter(user=self.request.user)
            .select_related("category", "provider")
            .order_by("name")
        )

        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(barcode__iexact=search)
            )

        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        provider_id = self.request.query_params.get("provider")
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            active_bool = is_active.lower() in ["true", "1"]
            queryset = queryset.filter(is_active=active_bool)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Product.objects
            .filter(user=self.request.user)
            .select_related("category", "provider")
        )


class ImportStarterCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .starter_catalog import import_starter_catalog_for_user

        preset_keys = request.data.get("presets", [])
        if not isinstance(preset_keys, list) or len(preset_keys) == 0:
            preset_keys = None

        result = import_starter_catalog_for_user(request.user, preset_keys=preset_keys)
        return Response(result, status=status.HTTP_200_OK)


def calculate_adjusted_price(current_val, adjustment_type, adjustment_value, rounding="none"):
    if current_val is None:
        return Decimal("0.00")
    val = Decimal(str(current_val))
    adj = Decimal(str(adjustment_value))

    if adjustment_type == "percentage":
        new_val = val * (Decimal("1") + (adj / Decimal("100")))
    else:  # fixed
        new_val = val + adj

    if new_val < Decimal("0"):
        new_val = Decimal("0")

    if rounding == "10":
        new_val = (new_val / Decimal("10")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("10")
    elif rounding == "50":
        new_val = (new_val / Decimal("50")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("50")
    elif rounding == "100":
        new_val = (new_val / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("100")
    else:
        new_val = new_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return new_val


class BulkUpdateProductPricesView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        scope = request.data.get("scope", "all")
        selected_ids = request.data.get("selected_ids", [])
        category_id = request.data.get("category_id")
        provider_id = request.data.get("provider_id")
        adjustment_type = request.data.get("adjustment_type", "percentage")
        adjustment_value = request.data.get("adjustment_value", 0)
        target_field = request.data.get("target_field", "sale")
        rounding = request.data.get("rounding", "none")

        try:
            adj_val_decimal = Decimal(str(adjustment_value))
        except (ValueError, TypeError):
            return Response(
                {"error": "El valor del ajuste debe ser un número válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = Product.objects.filter(user=request.user)

        if scope == "selected":
            if not selected_ids:
                return Response(
                    {"error": "No se especificaron productos seleccionados."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(id__in=selected_ids)
        elif scope == "category":
            if not category_id:
                return Response(
                    {"error": "Debés seleccionar una categoría."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(category_id=category_id)
        elif scope == "provider":
            if not provider_id:
                return Response(
                    {"error": "Debés seleccionar un proveedor."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(provider_id=provider_id)
        elif scope == "all":
            pass
        else:
            return Response(
                {"error": "Alcance inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        products = list(queryset)
        if not products:
            return Response(
                {"updated_count": 0, "message": "No se encontraron productos para actualizar."},
                status=status.HTTP_200_OK,
            )

        fields_to_update = []
        if target_field in ["sale", "both"]:
            fields_to_update.append("sale_price")
        if target_field in ["cost", "both"]:
            fields_to_update.append("cost_price")

        for product in products:
            if target_field in ["sale", "both"]:
                product.sale_price = calculate_adjusted_price(
                    product.sale_price,
                    adjustment_type,
                    adj_val_decimal,
                    rounding,
                )
            if target_field in ["cost", "both"]:
                if product.cost_price and product.cost_price > Decimal("0"):
                    product.cost_price = calculate_adjusted_price(
                        product.cost_price,
                        adjustment_type,
                        adj_val_decimal,
                        rounding,
                    )

        Product.objects.bulk_update(products, fields_to_update)

        return Response(
            {
                "updated_count": len(products),
                "message": f"Se actualizaron los precios de {len(products)} productos correctamente.",
            },
            status=status.HTTP_200_OK,
        )


class BulkDeleteProductsView(APIView):
    permission_classes = [IsAuthenticated]

    @db_transaction.atomic
    def post(self, request):
        product_ids = request.data.get("product_ids", [])
        if not product_ids:
            return Response(
                {"error": "No se seleccionaron productos para eliminar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = Product.objects.filter(
            user=request.user,
            id__in=product_ids,
        ).delete()

        return Response(
            {
                "deleted_count": deleted_count,
                "message": f"Se eliminaron {deleted_count} productos correctamente.",
            },
            status=status.HTTP_200_OK,
        )


