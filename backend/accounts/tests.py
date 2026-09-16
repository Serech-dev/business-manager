from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import PaymentNotification, Subscription

User = get_user_model()


class SubscriptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="client1",
            email="client1@test.com",
            password="testpassword123",
        )
        self.admin_user = User.objects.create_superuser(
            username="adminuser",
            email="admin@test.com",
            password="adminpassword123",
        )

    def test_registration_creates_trial_subscription(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "newuser@test.com",
                "password": "StrongPassword123",
                "password_confirm": "StrongPassword123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("subscription", response.data)
        self.assertEqual(response.data["subscription"]["plan"], Subscription.Plan.TRIAL)
        self.assertEqual(response.data["subscription"]["tier"], Subscription.Tier.TRIAL)
        self.assertEqual(response.data["subscription"]["status"], Subscription.Status.TRIAL)
        self.assertTrue(response.data["subscription"]["is_valid"])
        self.assertTrue(response.data["subscription"]["is_premium"])
        self.assertGreaterEqual(response.data["subscription"]["days_remaining"], 13)

    def test_subscription_expiration_logic(self):
        sub = Subscription.get_or_create_for_user(self.user)
        self.assertTrue(sub.is_valid)

        # Set all expiration dates in past
        past = timezone.now() - timedelta(days=1)
        sub.expires_at = past
        sub.trial_ends_at = past
        sub.premium_expires_at = past
        sub.basic_expires_at = past
        sub.save()

        self.assertFalse(sub.is_valid)
        self.assertEqual(sub.effective_status, Subscription.Status.EXPIRED)
        self.assertEqual(sub.days_remaining, 0)

    def test_business_api_blocked_when_subscription_expired(self):
        sub = Subscription.get_or_create_for_user(self.user)
        past = timezone.now() - timedelta(days=1)
        sub.expires_at = past
        sub.trial_ends_at = past
        sub.premium_expires_at = past
        sub.basic_expires_at = past
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/business/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("code", response.data)
        self.assertEqual(response.data["code"], "subscription_expired")

    def test_business_api_accessible_with_valid_trial_or_license(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.expires_at = timezone.now() + timedelta(days=10)
        sub.trial_ends_at = timezone.now() + timedelta(days=10)
        sub.premium_expires_at = timezone.now() + timedelta(days=10)
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/business/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subscription_view_accessible_even_if_expired(self):
        sub = Subscription.get_or_create_for_user(self.user)
        past = timezone.now() - timedelta(days=5)
        sub.expires_at = past
        sub.trial_ends_at = past
        sub.premium_expires_at = past
        sub.basic_expires_at = past
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/subscription/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Subscription.Status.EXPIRED)
        self.assertIn("payment_info", response.data["summary"])

    def test_multi_tier_time_consumption_and_feature_gating(self):
        sub = Subscription.get_or_create_for_user(self.user)
        now = timezone.now()

        # Extend 30 days Basic + 10 days Premium
        sub.extend(days=30, tier=Subscription.Tier.BASIC, plan=Subscription.Plan.BASIC_MONTHLY)
        sub.extend(days=10, tier=Subscription.Tier.PREMIUM, plan=Subscription.Plan.PREMIUM_MONTHLY)

        # Active tier should be PREMIUM while premium_expires_at is active
        self.assertEqual(sub.active_tier, Subscription.Tier.PREMIUM)
        self.assertTrue(sub.is_premium)
        self.assertTrue(sub.has_feature("employees"))
        self.assertTrue(sub.has_feature("pos_checkout"))

        # Fast forward time: simulate premium expired, basic still has 20 days left
        sub.premium_expires_at = now - timedelta(days=1)
        sub.trial_ends_at = now - timedelta(days=1)
        sub.basic_expires_at = now + timedelta(days=20)
        sub.expires_at = sub.basic_expires_at
        sub.save()

        # Now active tier should gracefully fall back to BASIC
        self.assertEqual(sub.active_tier, Subscription.Tier.BASIC)
        self.assertFalse(sub.is_premium)
        self.assertTrue(sub.is_valid)
        self.assertFalse(sub.has_feature("employees"))
        self.assertTrue(sub.has_feature("pos_checkout"))

    def test_notify_payment_and_admin_review(self):
        sub = Subscription.get_or_create_for_user(self.user)
        past = timezone.now() - timedelta(days=1)
        sub.expires_at = past
        sub.trial_ends_at = past
        sub.premium_expires_at = past
        sub.basic_expires_at = past
        sub.save()

        # Client reports premium yearly payment
        self.client.force_authenticate(user=self.user)
        notify_res = self.client.post(
            "/api/auth/subscription/notify-payment/",
            {
                "plan": "premium_yearly",
                "amount": 200000,
                "reference_code": "TRANSF-998877",
                "payer_notes": "Transferencia por Plan Premium Anual",
            },
            format="json",
        )
        self.assertEqual(notify_res.status_code, status.HTTP_201_CREATED)
        payment_id = notify_res.data["id"]

        # Admin checks store list & pending payments
        self.client.force_authenticate(user=self.admin_user)
        admin_stores_res = self.client.get("/api/auth/admin/stores/")
        self.assertEqual(admin_stores_res.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_stores_res.data["summary"]["pending_payments_count"], 1)

        # Admin approves payment
        approve_res = self.client.post(
            f"/api/auth/admin/payments/{payment_id}/review/",
            {
                "decision": "approve",
                "admin_notes": "Comprobante verificado en cuenta bancaria",
            },
            format="json",
        )
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # User's subscription should now be active for 365 days on PREMIUM
        sub.refresh_from_db()
        self.assertTrue(sub.is_valid)
        self.assertTrue(sub.is_premium)
        self.assertEqual(sub.active_tier, Subscription.Tier.PREMIUM)
        self.assertEqual(sub.plan, Subscription.Plan.PREMIUM_YEARLY)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreaterEqual(sub.days_remaining, 360)

    def test_admin_quick_actions(self):
        self.client.force_authenticate(user=self.admin_user)

        # Extend +30 Basic
        res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "extend_30_basic"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        sub = Subscription.objects.get(user=self.user)
        self.assertEqual(sub.plan, Subscription.Plan.BASIC_MONTHLY)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreaterEqual(sub.basic_days_remaining, 29)

        # Extend +30 Premium
        res_prem = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "extend_30_premium"},
            format="json",
        )
        self.assertEqual(res_prem.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.active_tier, Subscription.Tier.PREMIUM)
        self.assertGreaterEqual(sub.premium_days_remaining, 29)

        # Suspend
        res_susp = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "suspend", "notes": "Falta de pago reiterada"},
            format="json",
        )
        self.assertEqual(res_susp.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.SUSPENDED)
        self.assertFalse(sub.is_valid)

        # Non-admin cannot access admin panel
        self.client.force_authenticate(user=self.user)
        forbidden_res = self.client.get("/api/auth/admin/stores/")
        self.assertEqual(forbidden_res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(MERCADOPAGO_ACCESS_TOKEN="")
    def test_create_checkout_preference_mock_mode(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/auth/subscription/create-checkout/",
            {"plan": "premium_yearly"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("init_point", res.data)
        self.assertIn("notification_id", res.data)
        self.assertEqual(res.data["plan"], "premium_yearly")
        self.assertEqual(res.data["mode"], "mock")

        notif = PaymentNotification.objects.get(id=res.data["notification_id"])
        self.assertEqual(notif.payment_method, PaymentNotification.PaymentMethod.MERCADOPAGO)
        self.assertEqual(notif.plan, PaymentNotification.PlanRequested.PREMIUM_YEARLY)

    @override_settings(MERCADOPAGO_ACCESS_TOKEN="TEST-1234567890")
    @patch("mercadopago.SDK")
    def test_create_checkout_preference_live_mode(self, mock_sdk_class):
        mock_sdk_instance = MagicMock()
        mock_sdk_class.return_value = mock_sdk_instance
        mock_sdk_instance.preference().create.return_value = {
            "status": 201,
            "response": {
                "id": "mp_test_pref_12345",
                "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mp_test_pref_12345",
            },
        }

        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/auth/subscription/create-checkout/",
            {"plan": "premium_monthly"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["mode"], "live")
        self.assertIn("mercadopago.com.ar", res.data["init_point"])
        self.assertEqual(res.data["preference_id"], "mp_test_pref_12345")

    def test_verify_payment_status_mock_simulation(self):
        sub = Subscription.get_or_create_for_user(self.user)
        past = timezone.now() - timedelta(days=2)
        sub.expires_at = past
        sub.trial_ends_at = past
        sub.premium_expires_at = past
        sub.basic_expires_at = past
        sub.save()
        self.assertFalse(sub.is_valid)

        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            "/api/auth/subscription/verify-payment/?payment_status=mock_simulate&plan=premium_monthly",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "approved")

        sub.refresh_from_db()
        self.assertTrue(sub.is_valid)
        self.assertTrue(sub.is_premium)
        self.assertEqual(sub.active_tier, Subscription.Tier.PREMIUM)
        self.assertEqual(sub.plan, Subscription.Plan.PREMIUM_MONTHLY)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreaterEqual(sub.premium_days_remaining, 29)

    @override_settings(MERCADOPAGO_ACCESS_TOKEN="TEST-1234567890")
    @patch("mercadopago.SDK")
    def test_webhook_payment_approved(self, mock_sdk_class):
        mock_sdk_instance = MagicMock()
        mock_sdk_class.return_value = mock_sdk_instance
        mock_sdk_instance.payment().get.return_value = {
            "status": 200,
            "response": {
                "id": 9988776655,
                "status": "approved",
                "status_detail": "accredited",
                "payment_method_id": "account_money",
                "payment_type_id": "account_money",
                "transaction_amount": 20000.0,
                "metadata": {
                    "user_id": self.user.id,
                    "plan": "premium_monthly",
                    "days": 30,
                },
            },
        }

        webhook_res = self.client.post(
            "/api/auth/subscription/webhook/",
            {
                "type": "payment",
                "data": {"id": "9988776655"},
            },
            format="json",
        )
        self.assertEqual(webhook_res.status_code, status.HTTP_200_OK)
        self.assertEqual(webhook_res.data["status"], "success")

        sub = Subscription.objects.get(user=self.user)
        self.assertTrue(sub.is_valid)
        self.assertTrue(sub.is_premium)
        self.assertEqual(sub.plan, Subscription.Plan.PREMIUM_MONTHLY)
        self.assertGreaterEqual(sub.premium_days_remaining, 29)

    def test_suspended_account_is_not_valid_and_blocked(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.suspend(reason="Testing suspension")

        self.assertFalse(sub.is_valid)
        self.assertEqual(sub.effective_status, Subscription.Status.SUSPENDED)
        self.assertEqual(sub.days_remaining, 0)
        self.assertFalse(sub.get_summary()["is_valid"])
        self.assertFalse(sub.get_summary()["is_superuser"])

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/business/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "subscription_suspended")

    def test_suspended_lifetime_account_has_no_days_and_is_not_valid(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.activate_lifetime()
        self.assertTrue(sub.is_valid)
        self.assertIsNone(sub.days_remaining)

        # Now suspend the lifetime account
        sub.suspend(reason="Suspended lifetime")
        self.assertFalse(sub.is_valid)
        self.assertEqual(sub.effective_status, Subscription.Status.SUSPENDED)
        self.assertEqual(sub.days_remaining, 0)

        summary = sub.get_summary()
        self.assertFalse(summary["is_valid"])
        self.assertEqual(summary["status"], "suspended")
        self.assertEqual(summary["days_remaining"], 0)
        self.assertFalse(summary["is_superuser"])

    def test_admin_suspend_and_reactivate_action(self):
        self.client.force_authenticate(user=self.admin_user)

        # Admin suspends user
        suspend_res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "suspend", "notes": "Falta de pago"},
            format="json",
        )
        self.assertEqual(suspend_res.status_code, status.HTTP_200_OK)

        sub = Subscription.objects.get(user=self.user)
        self.assertEqual(sub.status, Subscription.Status.SUSPENDED)
        self.assertFalse(sub.is_valid)

        # Admin reactivates user
        reactivate_res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "reactivate"},
            format="json",
        )
        self.assertEqual(reactivate_res.status_code, status.HTTP_200_OK)

        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertTrue(sub.is_valid)
        self.assertGreaterEqual(sub.days_remaining, 13)



