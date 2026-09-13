from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Subscription
from .models import StoreSettings

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

    def test_get_and_patch_store_settings_api(self):
        # GET
        get_res = self.client.get("/api/business/settings/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["store_name"], "Mi Negocio")
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
                "is_setup_completed": True,
            },
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["store_name"], "Kiosco San Martín")
        self.assertEqual(Decimal(str(patch_res.data["exchange_fee_value"])), Decimal("12.00"))
        self.assertTrue(patch_res.data["debt_surcharge_enabled"])
        self.assertTrue(patch_res.data["is_setup_completed"])

        # Verify persisted in DB
        settings = StoreSettings.objects.get(user=self.user)
        self.assertEqual(settings.store_name, "Kiosco San Martín")
        self.assertTrue(settings.is_setup_completed)
