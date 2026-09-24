from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Subscription
from .models import (
    Client,
    StoreSettings,
    Register,
    BankAccount,
    Product,
    Provider,
    StockMovement,
    Transaction,
    TransactionOperation,
    TransactionOperationAmount,
)

User = get_user_model()


class StoreSettingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="kioscouser",
            email="kiosco@test.com",
            password="testpassword123",
        )
        Subscription.get_or_create_for_user(self.user)
        self.client.force_authenticate(user=self.user)

    def test_default_store_settings_creation(self):
        settings = StoreSettings.get_or_create_for_user(self.user)
        self.assertEqual(settings.store_name, "Mi Negocio")
        self.assertEqual(settings.exchange_fee_type, StoreSettings.FeeType.PERCENTAGE)
        self.assertEqual(settings.exchange_fee_value, Decimal("10.00"))
        self.assertEqual(settings.phone_fee_value, Decimal("10.00"))
        self.assertEqual(settings.sube_fee_value, Decimal("10.00"))
        self.assertFalse(settings.debt_surcharge_enabled)
        self.assertFalse(settings.card_surcharge_enabled)
        self.assertEqual(settings.card_surcharge_type, StoreSettings.FeeType.PERCENTAGE)
        self.assertEqual(settings.card_surcharge_value, Decimal("10.00"))
        self.assertFalse(settings.is_setup_completed)

    def test_fee_calculations(self):
        settings = StoreSettings.get_or_create_for_user(self.user)

        # Percentage exchange fee (10% of 10000 = 1000)
        fee = settings.calculate_exchange_fee(10000)
        self.assertEqual(fee, Decimal("1000"))

        # Disabled debt surcharge returns 0
        surcharge = settings.calculate_debt_surcharge(5000)
        self.assertEqual(surcharge, Decimal("0"))

        # Enabled percentage debt surcharge (10% of 5000 = 500)
        settings.debt_surcharge_enabled = True
        settings.debt_surcharge_value = Decimal("10.00")
        settings.save()
        surcharge = settings.calculate_debt_surcharge(5000)
        self.assertEqual(surcharge, Decimal("500"))

        # Fixed debt surcharge ($300 fixed)
        settings.debt_surcharge_type = StoreSettings.FeeType.FIXED
        settings.debt_surcharge_value = Decimal("300.00")
        settings.save()
        surcharge = settings.calculate_debt_surcharge(5000)
        self.assertEqual(surcharge, Decimal("300.00"))

        # Disabled card surcharge returns 0
        card_surcharge = settings.calculate_card_surcharge(8000)
        self.assertEqual(card_surcharge, Decimal("0"))

        # Enabled percentage card surcharge (10% of 8000 = 800)
        settings.card_surcharge_enabled = True
        settings.card_surcharge_type = StoreSettings.FeeType.PERCENTAGE
        settings.card_surcharge_value = Decimal("10.00")
        settings.save()
        card_surcharge = settings.calculate_card_surcharge(8000)
        self.assertEqual(card_surcharge, Decimal("800"))

        # Fixed card surcharge ($400 fixed)
        settings.card_surcharge_type = StoreSettings.FeeType.FIXED
        settings.card_surcharge_value = Decimal("400.00")
        settings.save()
        card_surcharge = settings.calculate_card_surcharge(8000)
        self.assertEqual(card_surcharge, Decimal("400.00"))

        # Rounding up to 50 checks: 10% of 1010 is 101 -> rounded up to nearest 50 is 150
        settings.card_surcharge_type = StoreSettings.FeeType.PERCENTAGE
        settings.card_surcharge_value = Decimal("10.00")
        settings.save()
        self.assertEqual(settings.calculate_card_surcharge(1010), Decimal("150"))
        self.assertEqual(settings.calculate_exchange_fee(1010), Decimal("150"))
        settings.debt_surcharge_type = StoreSettings.FeeType.PERCENTAGE
        settings.debt_surcharge_value = Decimal("10.00")
        settings.save()
        self.assertEqual(settings.calculate_debt_surcharge(1010), Decimal("150"))

    def test_get_and_patch_store_settings_api(self):
        # GET
        get_res = self.client.get("/api/business/settings/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["store_name"], "Mi Negocio")
        self.assertFalse(get_res.data["card_surcharge_enabled"])
        self.assertFalse(get_res.data["is_setup_completed"])

        # PATCH
        patch_res = self.client.patch(
            "/api/business/settings/",
            {
                "store_name": "Kiosco San Martín",
                "store_address": "Av. Libertador 1234",
                "store_phone": "11-4567-8900",
                "exchange_fee_value": "12.00",
                "debt_surcharge_enabled": True,
                "debt_surcharge_value": "15.00",
                "card_surcharge_enabled": True,
                "card_surcharge_type": "fixed",
                "card_surcharge_value": "250.00",
                "is_setup_completed": True,
            },
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["store_name"], "Kiosco San Martín")
        self.assertEqual(Decimal(str(patch_res.data["exchange_fee_value"])), Decimal("12.00"))
        self.assertTrue(patch_res.data["debt_surcharge_enabled"])
        self.assertTrue(patch_res.data["card_surcharge_enabled"])
        self.assertEqual(patch_res.data["card_surcharge_type"], "fixed")
        self.assertEqual(Decimal(str(patch_res.data["card_surcharge_value"])), Decimal("250.00"))
        self.assertTrue(patch_res.data["is_setup_completed"])

        # Verify persisted in DB
        settings = StoreSettings.objects.get(user=self.user)
        self.assertEqual(settings.store_name, "Kiosco San Martín")
        self.assertTrue(settings.card_surcharge_enabled)
        self.assertEqual(settings.card_surcharge_type, "fixed")
        self.assertEqual(settings.card_surcharge_value, Decimal("250.00"))
        self.assertTrue(settings.is_setup_completed)


class MasterCatalogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="masteruser",
            email="master@test.com",
            password="testpassword123",
        )
        Subscription.get_or_create_for_user(self.user)
        self.client.force_authenticate(user=self.user)

        from .models import MasterCatalogProduct, Product
        self.master_product = MasterCatalogProduct.objects.create(
            barcode="7790150330166",
            name="Té de Manzanilla La Virginia x 20u",
            brand="La Virginia",
            category_name="Almacén & Despensa",
            unit_type="unit",
            suggested_sale_price=Decimal("1400.00"),
            suggested_cost_price=Decimal("1000.00"),
            source="test",
        )

    def test_lookup_master_product_not_in_store(self):
        res = self.client.get("/api/business/master-catalog/lookup/?barcode=7790150330166")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["in_store"])
        self.assertTrue(res.data["found_in_master"])
        self.assertEqual(res.data["master_product"]["name"], "Té de Manzanilla La Virginia x 20u")
        self.assertEqual(res.data["master_product"]["brand"], "La Virginia")
        self.assertEqual(Decimal(str(res.data["master_product"]["suggested_sale_price"])), Decimal("1400.00"))

    def test_lookup_product_already_in_store(self):
        from .models import Product
        Product.objects.create(
            user=self.user,
            name="Té de Manzanilla La Virginia x 20u",
            barcode="7790150330166",
            sale_price=Decimal("1500.00"),
            cost_price=Decimal("1100.00"),
            is_active=True,
        )

        res = self.client.get("/api/business/master-catalog/lookup/?barcode=7790150330166")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["in_store"])
        self.assertEqual(res.data["product"]["barcode"], "7790150330166")
        self.assertEqual(Decimal(str(res.data["product"]["sale_price"])), Decimal("1500.00"))

    def test_lookup_similar_store_product_for_unlinked_item(self):
        from .models import Product
        # Merchant entered product manually without barcode
        Product.objects.create(
            user=self.user,
            name="Té de Manzanilla La Virginia x 20u",
            barcode=None,
            sale_price=Decimal("1350.00"),
            cost_price=Decimal("900.00"),
            is_active=True,
        )

        res = self.client.get("/api/business/master-catalog/lookup/?barcode=7790150330166")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["in_store"])
        self.assertTrue(res.data["found_in_master"])
        self.assertIsNotNone(res.data["similar_store_product"])
        self.assertEqual(res.data["similar_store_product"]["name"], "Té de Manzanilla La Virginia x 20u")

    def test_search_master_catalog(self):
        res = self.client.get("/api/business/master-catalog/search/?q=Manzanilla")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["barcode"], "7790150330166")


class SpecialSalesAndBundleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="promouser",
            email="promo@test.com",
            password="testpassword123",
        )
        Subscription.get_or_create_for_user(self.user)
        self.client.force_authenticate(user=self.user)

        from .models import Register
        self.register = Register.objects.create(
            user=self.user,
            initial_cash=Decimal("5000.00"),
        )

    def test_quantity_promo_product(self):
        from .models import Product
        res = self.client.post(
            "/api/business/products/",
            {
                "name": "Alfajor Guaymallén Triple",
                "sale_price": "600.00",
                "cost_price": "350.00",
                "promo_quantity": 3,
                "promo_price": "1500.00",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["promo_quantity"], 3)
        self.assertEqual(Decimal(str(res.data["promo_price"])), Decimal("1500.00"))
        self.assertTrue(res.data["has_quantity_promo"])

        prod = Product.objects.get(id=res.data["id"])
        self.assertTrue(prod.has_quantity_promo)

    def test_bundle_creation_and_stock_calculation(self):
        from .models import Product
        fernet = Product.objects.create(
            user=self.user,
            name="Fernet Branca 750ml",
            sale_price=Decimal("10000.00"),
            stock=Decimal("10.00"),
        )
        coca = Product.objects.create(
            user=self.user,
            name="Coca Cola 1.5L",
            sale_price=Decimal("2500.00"),
            stock=Decimal("20.00"),
        )

        res = self.client.post(
            "/api/business/products/",
            {
                "name": "Combo Previa (Fernet + 2 Coca)",
                "sale_price": "14000.00",
                "is_bundle": True,
                "bundle_items": [
                    {"product": fernet.id, "quantity": "1.00"},
                    {"product": coca.id, "quantity": "2.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["is_bundle"])
        self.assertEqual(len(res.data["bundle_items"]), 2)
        # 10 / 1 = 10, 20 / 2 = 10 => bundle_stock = 10
        self.assertEqual(res.data["bundle_stock"], 10)

        # If coca stock drops to 5, bundle stock should be 5 // 2 = 2
        coca.stock = Decimal("5.00")
        coca.save()

        get_res = self.client.get(f"/api/business/products/{res.data['id']}/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["bundle_stock"], 2)

    def test_selling_bundle_deducts_constituent_stocks(self):
        from .models import Product, StockMovement
        fernet = Product.objects.create(
            user=self.user,
            name="Fernet Branca 750ml",
            sale_price=Decimal("10000.00"),
            stock=Decimal("10.00"),
        )
        coca = Product.objects.create(
            user=self.user,
            name="Coca Cola 1.5L",
            sale_price=Decimal("2500.00"),
            stock=Decimal("20.00"),
        )

        create_combo = self.client.post(
            "/api/business/products/",
            {
                "name": "Combo Previa",
                "sale_price": "14000.00",
                "is_bundle": True,
                "bundle_items": [
                    {"product": fernet.id, "quantity": "1.00"},
                    {"product": coca.id, "quantity": "2.00"},
                ],
            },
            format="json",
        )
        combo_id = create_combo.data["id"]

        # Sell 2 Combos
        tx_res = self.client.post(
            "/api/business/transactions/",
            {
                "operations": [
                    {
                        "type": "sale",
                        "items": [
                            {
                                "product": combo_id,
                                "product_name": "Combo Previa",
                                "unit_type": "unit",
                                "quantity": "2.00",
                                "unit_price": "14000.00",
                                "subtotal": "28000.00",
                            }
                        ],
                        "amounts": [
                            {
                                "method": "cash",
                                "amount": 28000,
                            }
                        ],
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(tx_res.status_code, status.HTTP_201_CREATED, tx_res.data)

        # Refresh constituent stocks
        fernet.refresh_from_db()
        coca.refresh_from_db()

        # 2 combos * 1 fernet = -2 => 10 - 2 = 8
        self.assertEqual(fernet.stock, Decimal("8.00"))
        # 2 combos * 2 coca = -4 => 20 - 4 = 16
        self.assertEqual(coca.stock, Decimal("16.00"))

        # Verify stock movements created
        movements = StockMovement.objects.filter(user=self.user, movement_type=StockMovement.MovementType.SALE)
        self.assertEqual(movements.count(), 2)
        fernet_mov = movements.get(product=fernet)
        self.assertEqual(fernet_mov.quantity, Decimal("-2.00"))
        coca_mov = movements.get(product=coca)
        self.assertEqual(coca_mov.quantity, Decimal("-4.00"))


class BankAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="bankuser",
            email="bank@test.com",
            password="testpassword123",
        )
        Subscription.get_or_create_for_user(self.user)
        self.client.force_authenticate(user=self.user)

        self.register = Register.objects.create(
            user=self.user,
            initial_cash=Decimal("10000.00"),
            initial_bank=Decimal("5000.00"),
        )

    def test_bank_account_crud_and_default_singleton(self):
        # Create MP (default)
        res1 = self.client.post(
            "/api/business/bank-accounts/",
            {
                "name": "Mercado Pago",
                "account_type": "virtual_wallet",
                "is_default": True,
                "alias": "kiosco.mp",
            },
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED, res1.data)
        mp_id = res1.data["id"]
        self.assertTrue(res1.data["is_default"])

        # Create Cuenta DNI (also mark default -> should unset MP as default)
        res2 = self.client.post(
            "/api/business/bank-accounts/",
            {
                "name": "Cuenta DNI",
                "account_type": "virtual_wallet",
                "is_default": True,
                "alias": "kiosco.dni",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED, res2.data)
        dni_id = res2.data["id"]
        self.assertTrue(res2.data["is_default"])

        # Verify MP is no longer default
        get_mp = self.client.get(f"/api/business/bank-accounts/{mp_id}/")
        self.assertFalse(get_mp.data["is_default"])

        # List accounts
        list_res = self.client.get("/api/business/bank-accounts/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)

    def test_transaction_bank_account_fallback_and_register_summary(self):
        # 1. Create two accounts: MP (default) and Galicia
        mp_res = self.client.post(
            "/api/business/bank-accounts/",
            {
                "name": "Mercado Pago",
                "account_type": "virtual_wallet",
                "is_default": True,
            },
            format="json",
        )
        mp_id = mp_res.data["id"]

        galicia_res = self.client.post(
            "/api/business/bank-accounts/",
            {
                "name": "Banco Galicia",
                "account_type": "bank",
                "is_default": False,
            },
            format="json",
        )
        galicia_id = galicia_res.data["id"]

        # 2. Sale 1: Transfer with no bank_account specified -> should auto-link to MP (default)
        tx1 = self.client.post(
            "/api/business/transactions/",
            {
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {
                                "method": "transfer",
                                "amount": 3500,
                                "received": True,
                            }
                        ],
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(tx1.status_code, status.HTTP_201_CREATED, tx1.data)
        op1_amt = tx1.data["operations"][0]["amounts"][0]
        self.assertEqual(op1_amt["bank_account"], mp_id)
        self.assertEqual(op1_amt["bank_account_name"], "Mercado Pago")

        # 3. Sale 2: Card payment explicitly to Galicia
        tx2 = self.client.post(
            "/api/business/transactions/",
            {
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {
                                "method": "card",
                                "amount": 8000,
                                "bank_account": galicia_id,
                                "received": True,
                            }
                        ],
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(tx2.status_code, status.HTTP_201_CREATED, tx2.data)
        op2_amt = tx2.data["operations"][0]["amounts"][0]
        self.assertEqual(op2_amt["bank_account"], galicia_id)
        self.assertEqual(op2_amt["bank_account_name"], "Banco Galicia")

        # 4. Provider expense paid via Transfer from MP ($1200)
        provider = Provider.objects.create(user=self.user, name="Distribuidora Sur")
        tx3 = self.client.post(
            "/api/business/transactions/",
            {
                "operations": [
                    {
                        "type": "provider",
                        "provider": provider.id,
                        "amounts": [
                            {
                                "method": "transfer",
                                "amount": 1200,
                                "bank_account": mp_id,
                                "received": True,
                            }
                        ],
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(tx3.status_code, status.HTTP_201_CREATED, tx3.data)

        # 5. Check Current Register bank_accounts_summary while open
        curr_res = self.client.get("/api/business/register/")
        self.assertEqual(curr_res.status_code, status.HTTP_200_OK, curr_res.data)
        summary = curr_res.data["bank_accounts_summary"]
        self.assertEqual(len(summary), 2)

        mp_summary = next(s for s in summary if s["id"] == mp_id)
        self.assertEqual(Decimal(str(mp_summary["money_in"])), Decimal("3500.00"))
        self.assertEqual(Decimal(str(mp_summary["money_out"])), Decimal("1200.00"))
        self.assertEqual(Decimal(str(mp_summary["net_movement"])), Decimal("2300.00"))
        self.assertEqual(mp_summary["transaction_count"], 2)

        galicia_summary = next(s for s in summary if s["id"] == galicia_id)
        self.assertEqual(Decimal(str(galicia_summary["money_in"])), Decimal("8000.00"))
        self.assertEqual(Decimal(str(galicia_summary["money_out"])), Decimal("0.00"))
        self.assertEqual(Decimal(str(galicia_summary["net_movement"])), Decimal("8000.00"))
        self.assertEqual(galicia_summary["transaction_count"], 1)

        # 6. Close register and check RegisterDetailView
        close_res = self.client.post("/api/business/register/close/")
        self.assertEqual(close_res.status_code, status.HTTP_200_OK, close_res.data)

        reg_res = self.client.get(f"/api/business/registers/{self.register.id}/")
        self.assertEqual(reg_res.status_code, status.HTTP_200_OK, reg_res.data)
        closed_summary = reg_res.data["bank_accounts_summary"]
        self.assertEqual(len(closed_summary), 2)


class ProviderDebtAndCreditLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="limituser",
            email="limit@test.com",
            password="testpassword123",
        )
        Subscription.get_or_create_for_user(self.user)
        self.client.force_authenticate(user=self.user)
        self.register = Register.objects.create(user=self.user)

    def test_provider_debt_transaction_success(self):
        provider = Provider.objects.create(user=self.user, name="Distribuidora Sur")

        # 1. Purchase by debt (should NOT 400 even though client is None)
        res = self.client.post(
            "/api/business/transactions/",
            {
                "description": "Compra de mercadería a cuenta",
                "operations": [
                    {
                        "type": "provider",
                        "provider": provider.id,
                        "amounts": [
                            {"method": "debt", "amount": 5000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        # 2. Verify provider outstanding debt is updated
        prov_res = self.client.get(f"/api/business/providers/{provider.id}/")
        self.assertEqual(prov_res.status_code, status.HTTP_200_OK)
        self.assertEqual(prov_res.data["outstanding_debt"], Decimal("5000"))

        # 3. Pay partial provider debt with cash
        pay_res = self.client.post(
            "/api/business/transactions/",
            {
                "description": "Pago parcial a proveedor",
                "operations": [
                    {
                        "type": "provider_payment",
                        "provider": provider.id,
                        "amounts": [
                            {"method": "cash", "amount": 2000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED, pay_res.data)

        # 4. Verify remaining debt
        prov_res2 = self.client.get(f"/api/business/providers/{provider.id}/")
        self.assertEqual(prov_res2.data["outstanding_debt"], Decimal("3000"))

    def test_fiado_credit_limit_validation(self):
        client_obj = Client.objects.create(
            user=self.user,
            name="Carlos Fiado",
            debt_limit=Decimal("10000.00"),
        )

        # 1. Sale within credit limit ($8000 <= $10000)
        res1 = self.client.post(
            "/api/business/transactions/",
            {
                "client": client_obj.id,
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {"method": "debt", "amount": 8000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED, res1.data)

        # 2. Sale exceeding credit limit ($8000 + $3000 = $11000 > $10000) without allow_over_limit
        res2 = self.client.post(
            "/api/business/transactions/",
            {
                "client": client_obj.id,
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {"method": "debt", "amount": 3000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("debt_limit", res2.data)

        # 3. Sale exceeding credit limit with allow_over_limit=True -> Allowed
        res3 = self.client.post(
            "/api/business/transactions/",
            {
                "client": client_obj.id,
                "allow_over_limit": True,
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {"method": "debt", "amount": 3000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED, res3.data)

    def test_global_debt_limit_fallback(self):
        settings = StoreSettings.get_or_create_for_user(self.user)
        settings.global_debt_limit = Decimal("15000.00")
        settings.save()

        # Client with no custom limit (inherits global limit of $15000)
        client_obj = Client.objects.create(
            user=self.user,
            name="Roberto Gomez",
            debt_limit=None,
        )

        # 1. Attempt sale exceeding global limit ($16000 > $15000)
        res1 = self.client.post(
            "/api/business/transactions/",
            {
                "client": client_obj.id,
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {"method": "debt", "amount": 16000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("debt_limit", res1.data)

        # 2. Authorized override
        res2 = self.client.post(
            "/api/business/transactions/",
            {
                "client": client_obj.id,
                "allow_over_limit": True,
                "operations": [
                    {
                        "type": "sale",
                        "amounts": [
                            {"method": "debt", "amount": 16000}
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED, res2.data)



