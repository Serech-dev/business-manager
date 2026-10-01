from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction as db_transaction
from django.db.models import Q, Sum, Count, F, Prefetch
from django.utils import timezone
from rest_framework import exceptions, generics, status
from accounts.permissions import HasActiveSubscription, RequiresFeature
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (BankAccount, Category, Client, Employee, EmployeeAttendance,
                     EmployeeMovement, MasterCatalogProduct, Product,
                     Provider, Register, RegisterShift, StockMovement, StockNote,
                     StoreSettings, Transaction, TransactionOperation,
                     TransactionOperationAmount, TransactionOperationItem)
from .serializers import (BankAccountSerializer, CategorySerializer, ClientSerializer,
                          EmployeeAttendanceSerializer, EmployeeMovementSerializer,
                          EmployeeSerializer, MasterCatalogProductSerializer, ProductSerializer,
                          ProviderSerializer, RegisterListSerializer, RegisterSerializer,
                          RegisterShiftSerializer, StockAdjustmentSerializer,
                          StockBatchRestockSerializer, StockMovementSerializer,
                          StockNoteSerializer, StoreSettingsSerializer,
                          TransactionAmountReceivedSerializer,
                          TransactionSerializer)


class BankAccountListCreateView(generics.ListCreateAPIView):
    serializer_class = BankAccountSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        queryset = BankAccount.objects.filter(user=self.request.user)
        active_only = self.request.query_params.get("active")
        if active_only == "1" or active_only == "true":
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BankAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BankAccountSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class ClientListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ClientSerializer
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        return Client.objects.filter(
            user=self.request.user
        )


class TransactionListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = TransactionSerializer
    permission_classes = [HasActiveSubscription]

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

    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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

        # Automatically open initial shift with the register's initial cash
        RegisterShift.objects.create(
            register=register,
            employee=None,
            initial_cash=initial_cash,
        )

        return Response(
            RegisterSerializer(register).data,
            status=status.HTTP_201_CREATED,
        )


class CloseRegisterView(APIView):
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    serializer_class = RegisterListSerializer
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [RequiresFeature("provider_debts")]

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
    permission_classes = [RequiresFeature("provider_debts")]

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
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        from .analytics import calculate_analytics

        period = request.query_params.get("period", "today")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Period gating for advanced reporting
        if period in ["month", "custom"]:
            sub = getattr(request.user, "subscription", None)
            is_allowed = (
                request.user.is_superuser
                or request.user.is_staff
                or (sub and sub.has_feature("advanced_reports"))
            )
            if not is_allowed:
                raise exceptions.PermissionDenied(
                    detail={
                        "detail": "Los reportes mensuales y personalizados requieren Plan Premium.",
                        "code": "feature_requires_premium",
                        "feature": "advanced_reports",
                    }
                )

        data = calculate_analytics(
            user=request.user,
            period=period,
            start_date_str=start_date,
            end_date_str=end_date,
        )
        return Response(data, status=status.HTTP_200_OK)


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        queryset = (
            Product.objects
            .filter(user=self.request.user)
            .select_related("category", "provider")
            .prefetch_related("bundle_items__product")
            .order_by("name")
        )

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            from django.db.models import Case, When, Value, IntegerField, Q
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(barcode__iexact=search)
            ).annotate(
                search_priority=Case(
                    When(name__iexact=search, then=Value(1)),
                    When(barcode__iexact=search, then=Value(2)),
                    When(name__istartswith=search, then=Value(3)),
                    When(name__icontains=f" {search}", then=Value(4)),
                    default=Value(5),
                    output_field=IntegerField(),
                )
            ).order_by("search_priority", "name")

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
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        return (
            Product.objects
            .filter(user=self.request.user)
            .select_related("category", "provider")
            .prefetch_related("bundle_items__product")
        )


class ImportStarterCatalogView(APIView):
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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
    permission_classes = [HasActiveSubscription]

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


class BulkAssignProductProviderView(APIView):
    permission_classes = [RequiresFeature("provider_debts")]

    @db_transaction.atomic
    def post(self, request):
        product_ids = request.data.get("product_ids", [])
        provider_id = request.data.get("provider_id")

        if not isinstance(product_ids, list) or len(product_ids) == 0:
            return Response(
                {"error": "No se proporcionaron productos para asignar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider = None
        if provider_id is not None:
            try:
                provider = Provider.objects.get(user=request.user, id=provider_id)
            except Provider.DoesNotExist:
                return Response(
                    {"error": "El proveedor especificado no existe."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        updated_count = Product.objects.filter(
            user=request.user,
            id__in=product_ids,
        ).update(provider=provider)

        msg = (
            f"Se asignaron {updated_count} productos a {provider.name}."
            if provider
            else f"Se desvincularon {updated_count} productos del proveedor."
        )

        return Response(
            {
                "updated_count": updated_count,
                "message": msg,
            },
            status=status.HTTP_200_OK,
        )


class StockMovementListCreateView(APIView):
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        queryset = StockMovement.objects.filter(user=user).select_related("product", "provider")

        product_id = request.query_params.get("product_id")
        provider_id = request.query_params.get("provider_id")
        movement_type = request.query_params.get("movement_type")
        tag = request.query_params.get("tag", "").strip()
        search = request.query_params.get("search", "").strip()
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        if tag:
            queryset = queryset.filter(notes__icontains=tag)
        if search:
            queryset = queryset.filter(Q(product__name__icontains=search) | Q(notes__icontains=search))
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        serializer = StockMovementSerializer(queryset[:300], many=True)
        return Response(serializer.data)

    def post(self, request):
        if "items" in request.data:
            serializer = StockBatchRestockSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            movements = serializer.save()
            return Response(
                StockMovementSerializer(movements, many=True).data,
                status=status.HTTP_201_CREATED,
            )
        else:
            item = {
                "product": request.data.get("product"),
                "quantity": request.data.get("quantity"),
                "unit_cost": request.data.get("unit_cost"),
                "total_cost": request.data.get("total_cost"),
                "update_product_cost": request.data.get("update_product_cost", True),
            }
            batch_data = {
                "provider": request.data.get("provider"),
                "notes": request.data.get("notes", ""),
                "items": [item],
            }
            serializer = StockBatchRestockSerializer(data=batch_data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            movements = serializer.save()
            return Response(
                StockMovementSerializer(movements[0]).data if movements else {},
                status=status.HTTP_201_CREATED,
            )


class StockAdjustmentView(APIView):
    permission_classes = [HasActiveSubscription]

    def post(self, request):
        serializer = StockAdjustmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        movement = serializer.save()
        return Response(
            StockMovementSerializer(movement).data,
            status=status.HTTP_200_OK,
        )


class StockInsightsView(APIView):
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        tag = request.query_params.get("tag", "").strip()
        product_id = request.query_params.get("product_id")
        search = request.query_params.get("search", "").strip()
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        movements = StockMovement.objects.filter(user=user)
        if tag:
            movements = movements.filter(notes__icontains=tag)
        if product_id:
            movements = movements.filter(product_id=product_id)
        if search:
            movements = movements.filter(Q(product__name__icontains=search) | Q(notes__icontains=search))
        if start_date:
            movements = movements.filter(created_at__date__gte=start_date)
        if end_date:
            movements = movements.filter(created_at__date__lte=end_date)

        product_stats = {}
        for m in movements.select_related("product", "provider"):
            pid = m.product_id
            if pid not in product_stats:
                product_stats[pid] = {
                    "product_id": pid,
                    "product_name": m.product.name,
                    "unit_type": m.product.unit_type,
                    "current_stock": m.product.stock,
                    "min_stock": m.product.min_stock,
                    "sale_price": m.product.sale_price,
                    "cost_price": m.product.cost_price,
                    "total_restocked_qty": Decimal("0.00"),
                    "total_restocked_cost": Decimal("0.00"),
                    "total_sold_qty": Decimal("0.00"),
                    "total_sales_revenue": Decimal("0.00"),
                    "total_losses_qty": Decimal("0.00"),
                    "tags": set(),
                }
            if m.notes:
                product_stats[pid]["tags"].add(m.notes)

            if m.movement_type == StockMovement.MovementType.RESTOCK:
                product_stats[pid]["total_restocked_qty"] += m.quantity
                if m.total_cost is not None and m.total_cost > Decimal("0"):
                    product_stats[pid]["total_restocked_cost"] += m.total_cost
                elif m.unit_cost is not None:
                    product_stats[pid]["total_restocked_cost"] += m.unit_cost * m.quantity
            elif m.movement_type == StockMovement.MovementType.SALE:
                qty_sold = abs(m.quantity)
                product_stats[pid]["total_sold_qty"] += qty_sold
                product_stats[pid]["total_sales_revenue"] += qty_sold * m.product.sale_price
            elif m.movement_type == StockMovement.MovementType.LOSS:
                product_stats[pid]["total_losses_qty"] += abs(m.quantity)

        items_list = []
        grand_restocked_qty = Decimal("0.00")
        grand_restocked_cost = Decimal("0.00")
        grand_sold_qty = Decimal("0.00")
        grand_sales_revenue = Decimal("0.00")

        for stat in product_stats.values():
            stat["tags"] = sorted(list(stat["tags"]))
            restocked = stat["total_restocked_qty"]
            sold = stat["total_sold_qty"]
            stat["surplus_qty"] = max(Decimal("0.00"), restocked - sold)
            if restocked > 0:
                stat["sell_through_rate"] = round(float((sold / restocked) * Decimal("100")), 1)
            else:
                stat["sell_through_rate"] = 100.0 if sold > 0 else 0.0

            stat["estimated_profit"] = stat["total_sales_revenue"] - stat["total_restocked_cost"]

            grand_restocked_qty += restocked
            grand_restocked_cost += stat["total_restocked_cost"]
            grand_sold_qty += sold
            grand_sales_revenue += stat["total_sales_revenue"]

            items_list.append(stat)

        items_list.sort(key=lambda x: x["total_restocked_qty"], reverse=True)

        overall_sell_through = 0.0
        if grand_restocked_qty > 0:
            overall_sell_through = round(float((grand_sold_qty / grand_restocked_qty) * Decimal("100")), 1)

        available_tags = (
            StockMovement.objects.filter(user=user)
            .exclude(notes="")
            .values_list("notes", flat=True)
            .distinct()[:50]
        )

        return Response({
            "summary": {
                "total_restocked_units": grand_restocked_qty,
                "total_restocked_cost": grand_restocked_cost,
                "total_sold_units": grand_sold_qty,
                "total_sales_revenue": grand_sales_revenue,
                "overall_sell_through_rate": overall_sell_through,
                "net_margin": grand_sales_revenue - grand_restocked_cost,
            },
            "products": items_list,
            "available_tags": list(available_tags),
        })


class StockAlertsSummaryView(APIView):
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        products = Product.objects.filter(user=user, is_active=True)

        tracked_count = 0
        low_stock_count = 0
        out_of_stock_count = 0
        total_inventory_cost = Decimal("0.00")

        for p in products:
            if p.stock is not None:
                tracked_count += 1
                if p.stock <= Decimal("0"):
                    out_of_stock_count += 1
                elif p.min_stock and p.stock <= Decimal(str(p.min_stock)):
                    low_stock_count += 1

                if p.stock > 0 and p.cost_price and p.cost_price > Decimal("0"):
                    total_inventory_cost += p.stock * p.cost_price

        pending_notes = StockNote.objects.filter(user=user, status="pending").count()

        return Response({
            "tracked_count": tracked_count,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "total_alerts": low_stock_count + out_of_stock_count,
            "total_inventory_cost": total_inventory_cost,
            "pending_notes_count": pending_notes,
        })


class OverdueDebtsAlertView(APIView):
    """
    Returns a summary and list of clients who have outstanding unpaid debts
    that have exceeded the overdue threshold (default 7 days) without recent payments.
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        days_param = request.query_params.get("days", "7")
        try:
            overdue_threshold_days = max(1, int(days_param))
        except (ValueError, TypeError):
            overdue_threshold_days = 7

        now = timezone.now()

        clients = (
            Client.objects.filter(user=user)
            .prefetch_related(
                Prefetch(
                    "transactions",
                    queryset=Transaction.objects.order_by("created_at").prefetch_related("operations__amounts"),
                )
            )
        )

        overdue_clients = []
        total_overdue = Decimal("0")

        for client in clients:
            balance = client.initial_debt or Decimal("0")
            cycle_start = client.created_at if balance > Decimal("0") else None
            last_payment_date = None

            for tx in client.transactions.all():
                tx_time = tx.created_at
                for op in tx.operations.all():
                    if op.type == TransactionOperation.Type.PAYMENT:
                        pmt_total = sum(a.amount for a in op.amounts.all())
                        balance -= pmt_total
                        if balance > Decimal("0"):
                            last_payment_date = tx_time
                        else:
                            cycle_start = None
                            last_payment_date = None
                    else:
                        debt_addition = sum(
                            a.amount for a in op.amounts.all()
                            if a.method == TransactionOperationAmount.Method.DEBT
                        )
                        if debt_addition > Decimal("0"):
                            if balance <= Decimal("0"):
                                cycle_start = tx_time
                                last_payment_date = None
                            balance += debt_addition

            if balance > Decimal("0"):
                ref_date = last_payment_date or cycle_start or client.created_at
                days_inactive = (now - ref_date).days
                if days_inactive >= overdue_threshold_days:
                    total_overdue += balance
                    overdue_clients.append({
                        "id": client.id,
                        "name": client.name,
                        "phone": client.phone or "",
                        "debt": balance,
                        "days_overdue": days_inactive,
                        "last_activity_date": ref_date.isoformat(),
                    })

        # Sort: most days overdue first, then largest debt amount
        overdue_clients.sort(key=lambda c: (-c["days_overdue"], -c["debt"]))

        return Response({
            "count": len(overdue_clients),
            "total_overdue_debt": total_overdue,
            "threshold_days": overdue_threshold_days,
            "clients": overdue_clients,
        })


class StockNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = StockNoteSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        user = self.request.user
        queryset = StockNote.objects.filter(user=user).select_related("product")

        status_filter = self.request.query_params.get("status")
        note_type = self.request.query_params.get("note_type")
        search = self.request.query_params.get("search", "").strip()

        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        if search:
            queryset = queryset.filter(
                Q(item_name__icontains=search)
                | Q(notes__icontains=search)
                | Q(customer_name__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StockNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StockNoteSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        return StockNote.objects.filter(user=self.request.user).select_related("product")


class StoreSettingsView(APIView):
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        settings_obj = StoreSettings.get_or_create_for_user(request.user)
        serializer = StoreSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = StoreSettings.get_or_create_for_user(request.user)
        serializer = StoreSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MasterCatalogLookupView(APIView):
    """
    Looks up a product by barcode.
    Order of lookup:
    1. User's store inventory (Product table) -> returns in_store: true
    2. Master national catalog (MasterCatalogProduct table) -> returns found_in_master: true
    3. External lookup (OpenFoodFacts API) -> caches into MasterCatalogProduct
    4. Suggested matching store product if name matches (for unlinked products)
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        import urllib.request
        import json
        import logging

        barcode = request.query_params.get("barcode", "").strip()
        if not barcode:
            return Response({"error": "Barcode is required"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # 1. Check user's store products
        store_product = (
            Product.objects.filter(user=user, is_active=True, barcode=barcode)
            .select_related("category", "provider")
            .first()
        )
        if store_product:
            return Response({
                "in_store": True,
                "found_in_master": False,
                "product": ProductSerializer(store_product).data,
            })

        # 2. Check MasterCatalogProduct table
        master_item = MasterCatalogProduct.objects.filter(barcode=barcode).first()
        if master_item:
            # Check if user has an existing store product with matching name that lacks barcode
            similar_store_product = Product.objects.filter(
                user=user,
                is_active=True,
                name__iexact=master_item.name
            ).first()

            return Response({
                "in_store": False,
                "found_in_master": True,
                "master_product": MasterCatalogProductSerializer(master_item).data,
                "similar_store_product": ProductSerializer(similar_store_product).data if similar_store_product else None,
            })

        # 3. Fallback online lookup (OpenFoodFacts API) with fast 2.5s timeout
        online_data = self._lookup_online(barcode)
        if online_data:
            try:
                master_item, _ = MasterCatalogProduct.objects.get_or_create(
                    barcode=barcode,
                    defaults={
                        "name": online_data["name"],
                        "brand": online_data.get("brand", ""),
                        "category_name": online_data.get("category_name", "Almacén & Despensa"),
                        "unit_type": Product.UnitType.UNIT,
                        "source": "openfoodfacts",
                    }
                )
                return Response({
                    "in_store": False,
                    "found_in_master": True,
                    "master_product": MasterCatalogProductSerializer(master_item).data,
                    "similar_store_product": None,
                })
            except Exception:
                pass

        # 4. Not found in master or online
        return Response({
            "in_store": False,
            "found_in_master": False,
            "master_product": None,
            "similar_store_product": None,
        })

    def _lookup_online(self, barcode: str):
        import urllib.request
        import json
        try:
            url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "BusinessManager - Retail POS App"}
            )
            with urllib.request.urlopen(req, timeout=2.5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data.get("status") == 1 and "product" in data:
                        p = data["product"]
                        name = p.get("product_name_es") or p.get("product_name") or ""
                        brand = p.get("brands") or ""
                        if name:
                            return {
                                "name": f"{name} {brand}".strip() if brand and brand.lower() not in name.lower() else name,
                                "brand": brand,
                                "category_name": "Almacén & Despensa",
                            }
        except Exception:
            pass
        return None


class MasterCatalogSearchView(APIView):
    """
    Search master catalog products by query string (name, brand, or barcode).
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response([])

        results = MasterCatalogProduct.objects.filter(
            Q(name__icontains=query) | Q(brand__icontains=query) | Q(barcode__icontains=query)
        )[:30]

        return Response(MasterCatalogProductSerializer(results, many=True).data)


class EmployeeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [RequiresFeature("employees")]

    def get_queryset(self):
        queryset = Employee.objects.filter(user=self.request.user)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(phone__icontains=search))
        active = self.request.query_params.get("active")
        if active == "1" or active == "true":
            queryset = queryset.filter(is_active=True)
        elif active == "0" or active == "false":
            queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [RequiresFeature("employees")]

    def get_queryset(self):
        return Employee.objects.filter(user=self.request.user)


class EmployeeSummaryView(APIView):
    permission_classes = [RequiresFeature("employees")]

    def get(self, request, employee_id=None, pk=None):
        target_id = employee_id or pk
        try:
            employee = Employee.objects.get(pk=target_id, user=request.user)
        except Employee.DoesNotExist:
            return Response({"detail": "Empleado no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Unsettled movements
        unsettled_movements = employee.movements.filter(is_settled=False)
        advances = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.ADVANCE), Decimal("0"))
        consumptions = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.CONSUMPTION), Decimal("0"))
        deductions = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.DEDUCTION), Decimal("0"))
        bonuses = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.BONUS), Decimal("0"))

        # Unsettled Attendances for active payroll cycle
        attendances = employee.attendances.filter(is_settled=False)
        present_count = attendances.filter(status=EmployeeAttendance.Status.PRESENT).count()
        absent_count = attendances.filter(status=EmployeeAttendance.Status.ABSENT).count()
        late_count = attendances.filter(status=EmployeeAttendance.Status.LATE).count()
        justified_count = attendances.filter(status=EmployeeAttendance.Status.JUSTIFIED).count()
        total_hours = sum((a.hours_worked or Decimal("0") for a in attendances.filter(status__in=[EmployeeAttendance.Status.PRESENT, EmployeeAttendance.Status.LATE])), Decimal("0"))

        # Estimated Gross Salary calculation based on salary_type
        base = employee.base_salary
        if employee.salary_type == Employee.SalaryType.MONTHLY:
            gross = base
        elif employee.salary_type == Employee.SalaryType.DAILY:
            gross = base * Decimal(str(present_count + late_count))
        elif employee.salary_type == Employee.SalaryType.HOURLY:
            gross = base * total_hours
        else:  # FIXED
            gross = base

        net_estimated = gross + bonuses - advances - consumptions - deductions

        shifts_count = employee.shifts.count()

        return Response({
            "employee": EmployeeSerializer(employee).data,
            "shifts_count": shifts_count,
            "days_present": present_count,
            "base_earnings": gross,
            "bonuses_total": bonuses,
            "consumptions_total": consumptions,
            "advances_total": advances,
            "deductions_total": deductions,
            "net_payable": net_estimated,
            "attendances_summary": {
                "present_count": present_count,
                "absent_count": absent_count,
                "late_count": late_count,
                "justified_count": justified_count,
                "total_hours": total_hours,
            },
            "movements_summary": {
                "advances": advances,
                "consumptions": consumptions,
                "deductions": deductions,
                "bonuses": bonuses,
                "total_deductions": advances + consumptions + deductions,
            },
            "payroll_estimate": {
                "gross_salary": gross,
                "net_salary": net_estimated,
            }
        })


class CurrentRegisterShiftView(APIView):
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        open_register = Register.objects.filter(user=request.user, closed_at__isnull=True).first()
        if not open_register:
            return Response({"active_shift": None, "register_open": False})

        active_shift = RegisterShift.objects.filter(register=open_register, closed_at__isnull=True).first()
        if not active_shift:
            active_shift = RegisterShift.objects.create(
                register=open_register,
                employee=None,
                initial_cash=open_register.initial_cash,
            )

        # Attach any orphan transactions in this open register to the active shift
        Transaction.objects.filter(register=open_register, shift__isnull=True).update(shift=active_shift)

        return Response({
            "active_shift": RegisterShiftSerializer(active_shift).data,
            "register_open": True,
            "register_id": open_register.id,
        })


class ShiftHandoverView(APIView):
    permission_classes = [HasActiveSubscription]

    @db_transaction.atomic
    def post(self, request):
        open_register = Register.objects.filter(user=request.user, closed_at__isnull=True).first()
        if not open_register:
            return Response({"detail": "No hay una caja abierta actualmente."}, status=status.HTTP_400_BAD_REQUEST)

        active_shift = RegisterShift.objects.filter(register=open_register, closed_at__isnull=True).first()
        declared_cash_raw = request.data.get("declared_cash")
        if active_shift and declared_cash_raw is None:
            return Response({"declared_cash": "El monto declarado es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        declared_cash = Decimal(str(declared_cash_raw)) if declared_cash_raw is not None else Decimal("0.00")
        notes = request.data.get("notes", "").strip()
        next_employee_id = request.data.get("next_employee_id")
        next_initial_cash_raw = request.data.get("next_initial_cash")
        next_initial_cash = Decimal(str(next_initial_cash_raw)) if next_initial_cash_raw is not None else declared_cash

        closed_shift_data = None

        if active_shift:
            # Ensure all current transactions for this register are linked to active_shift before closing
            Transaction.objects.filter(register=open_register, shift__isnull=True).update(shift=active_shift)
            expected_cash = RegisterShiftSerializer().get_expected_cash(active_shift)
            active_shift.closed_at = timezone.now()
            active_shift.declared_cash = declared_cash
            active_shift.expected_cash = expected_cash
            active_shift.difference = declared_cash - expected_cash
            if notes:
                active_shift.notes = (active_shift.notes + "\n" + notes).strip() if active_shift.notes else notes
            active_shift.save()
            closed_shift_data = RegisterShiftSerializer(active_shift).data

        next_employee = None
        if next_employee_id:
            try:
                next_employee = Employee.objects.get(id=next_employee_id, user=request.user, is_active=True)
            except Employee.DoesNotExist:
                return Response({"next_employee_id": "El siguiente empleado no existe o no está activo."}, status=status.HTTP_400_BAD_REQUEST)

        next_shift = RegisterShift.objects.create(
            register=open_register,
            employee=next_employee,
            initial_cash=next_initial_cash,
        )
        next_shift_data = RegisterShiftSerializer(next_shift).data

        return Response({
            "closed_shift": closed_shift_data,
            "next_shift": next_shift_data,
            "active_shift": next_shift_data,
        })


class RegisterShiftsListView(generics.ListAPIView):
    serializer_class = RegisterShiftSerializer
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        queryset = RegisterShift.objects.filter(register__user=self.request.user)
        register_id = self.request.query_params.get("register_id")
        if register_id:
            queryset = queryset.filter(register_id=register_id)
        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by("-opened_at")


class EmployeeMovementListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeMovementSerializer
    permission_classes = [RequiresFeature("employees")]

    def get_queryset(self):
        queryset = EmployeeMovement.objects.filter(employee__user=self.request.user)
        employee_id = self.kwargs.get("employee_id") or self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        is_settled = self.request.query_params.get("is_settled")
        if is_settled == "1" or is_settled == "true":
            queryset = queryset.filter(is_settled=True)
        elif is_settled == "0" or is_settled == "false":
            queryset = queryset.filter(is_settled=False)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        employee_id = self.kwargs.get("employee_id")
        if employee_id and "employee" not in data:
            data["employee"] = employee_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        employee = serializer.validated_data.get("employee")
        if not employee and "employee_id" in self.kwargs:
            try:
                employee = Employee.objects.get(id=self.kwargs["employee_id"], user=self.request.user)
            except Employee.DoesNotExist:
                raise exceptions.NotFound("Empleado no encontrado.")
            serializer.save(employee=employee)
            return
        if not employee or employee.user != self.request.user:
            raise exceptions.PermissionDenied("No tienes permiso para registrar movimientos para este empleado.")
        serializer.save()


class EmployeeAttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeAttendanceSerializer
    permission_classes = [RequiresFeature("employees")]

    def get_queryset(self):
        queryset = EmployeeAttendance.objects.filter(employee__user=self.request.user)
        employee_id = self.kwargs.get("employee_id") or self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        month = self.request.query_params.get("month")
        if month:
            parts = month.split("-")
            if len(parts) == 2:
                queryset = queryset.filter(date__year=int(parts[0]), date__month=int(parts[1]))
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        employee_id = self.kwargs.get("employee_id")
        if employee_id and "employee" not in data:
            data["employee"] = employee_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        employee = serializer.validated_data.get("employee")
        if not employee and "employee_id" in self.kwargs:
            try:
                employee = Employee.objects.get(id=self.kwargs["employee_id"], user=self.request.user)
            except Employee.DoesNotExist:
                raise exceptions.NotFound("Empleado no encontrado.")
            serializer.save(employee=employee)
            return
        if not employee or employee.user != self.request.user:
            raise exceptions.PermissionDenied("No tienes permiso para registrar asistencia para este empleado.")
        serializer.save()


class EmployeeSalarySettlementView(APIView):
    permission_classes = [RequiresFeature("employees")]

    @db_transaction.atomic
    def post(self, request, employee_id=None, pk=None):
        target_id = employee_id or pk
        try:
            employee = Employee.objects.get(pk=target_id, user=request.user)
        except Employee.DoesNotExist:
            return Response({"detail": "Empleado no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Unsettled movements
        unsettled_movements = employee.movements.filter(is_settled=False)
        advances = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.ADVANCE), Decimal("0"))
        consumptions = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.CONSUMPTION), Decimal("0"))
        deductions = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.DEDUCTION), Decimal("0"))
        bonuses = sum((m.amount for m in unsettled_movements if m.type == EmployeeMovement.Type.BONUS), Decimal("0"))

        # 2. Unsettled attendances
        unsettled_attendances = employee.attendances.filter(is_settled=False)
        present_count = unsettled_attendances.filter(status=EmployeeAttendance.Status.PRESENT).count()
        late_count = unsettled_attendances.filter(status=EmployeeAttendance.Status.LATE).count()
        total_hours = sum((a.hours_worked or Decimal("0") for a in unsettled_attendances.filter(status__in=[EmployeeAttendance.Status.PRESENT, EmployeeAttendance.Status.LATE])), Decimal("0"))

        # Gross calculation
        base = employee.base_salary
        if employee.salary_type == Employee.SalaryType.MONTHLY:
            gross = base
        elif employee.salary_type == Employee.SalaryType.DAILY:
            gross = base * Decimal(str(present_count + late_count))
        elif employee.salary_type == Employee.SalaryType.HOURLY:
            gross = base * total_hours
        else:
            gross = base

        calculated_net = gross + bonuses - advances - consumptions - deductions

        # Payment options from request
        payment_method = request.data.get("payment_method", "cash")
        pay_from_register = request.data.get("pay_from_register", True)
        custom_amount_raw = request.data.get("amount")
        notes = request.data.get("notes", "").strip()
        period_label = request.data.get("period_label", "").strip()

        if custom_amount_raw is not None:
            try:
                payout_amount = Decimal(str(custom_amount_raw))
            except Exception:
                payout_amount = calculated_net
        else:
            payout_amount = calculated_net

        # 3. Create cash register expense transaction if pay_from_register is true and method is cash
        tx = None
        if pay_from_register and payment_method == "cash" and payout_amount > Decimal("0"):
            open_register = Register.objects.filter(user=request.user, closed_at__isnull=True).first()
            if open_register:
                active_shift = RegisterShift.objects.filter(register=open_register, closed_at__isnull=True).first()
                desc = f"Pago de sueldo - {employee.name}"
                if period_label:
                    desc += f" ({period_label})"
                tx = Transaction.objects.create(
                    user=request.user,
                    register=open_register,
                    shift=active_shift,
                    employee=employee,
                    description=desc[:255],
                )
                op = TransactionOperation.objects.create(
                    transaction=tx,
                    type=TransactionOperation.Type.EXPENSE,
                )
                TransactionOperationAmount.objects.create(
                    operation=op,
                    method=TransactionOperationAmount.Method.CASH,
                    amount=payout_amount,
                    received=False,
                )

        # 4. Mark all current movements and attendances as settled
        unsettled_movements.update(is_settled=True)
        unsettled_attendances.update(is_settled=True)

        # 5. Create salary_payment movement
        concept = "Liquidación de sueldo"
        if period_label:
            concept += f" - {period_label}"
        if notes:
            concept += f" ({notes})"

        breakdown_note = f"Base: ${gross:.2f} | Bonos: +${bonuses:.2f} | Adelantos: -${advances:.2f} | Consumos: -${consumptions:.2f} | Descuentos: -${deductions:.2f}"
        full_notes = f"{concept}. Detalle: {breakdown_note}"

        payment_movement = EmployeeMovement.objects.create(
            employee=employee,
            transaction=tx,
            type=EmployeeMovement.Type.SALARY_PAYMENT,
            amount=payout_amount,
            is_settled=True,
            notes=full_notes[:255],
        )

        return Response({
            "success": True,
            "movement": EmployeeMovementSerializer(payment_movement).data,
            "settled_details": {
                "base_salary": gross,
                "bonuses": bonuses,
                "advances": advances,
                "consumptions": consumptions,
                "deductions": deductions,
                "net_paid": payout_amount,
                "period_label": period_label,
            }
        }, status=status.HTTP_201_CREATED)







