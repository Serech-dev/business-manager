from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import (PaymentNotification, Subscription,
                    SystemAnnouncement, UserFeedback)

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
        self.assertIn("subscription", response.data)
        sub_data = response.data["subscription"]
        self.assertIs(sub_data["is_valid"], False)
        self.assertIs(sub_data["is_superuser"], False)
        self.assertIs(sub_data["is_premium"], False)
        self.assertEqual(sub_data["days_remaining"], 0)
        self.assertIsInstance(sub_data["days_remaining"], int)

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

    def test_admin_set_expiration_custom_dates_action(self):
        self.client.force_authenticate(user=self.admin_user)

        target_date = (timezone.now() + timedelta(days=45)).isoformat()
        res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {
                "action": "set_expiration",
                "expires_at": target_date,
                "premium_expires_at": target_date,
                "basic_expires_at": None,
                "notes": "Modificación manual de prueba",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("subscription", res.data)
        self.assertEqual(res.data["subscription"]["tier"], "premium")
        self.assertGreaterEqual(res.data["subscription"]["days_remaining"], 44)

        sub = Subscription.objects.get(user=self.user)
        self.assertEqual(sub.notes, "Modificación manual de prueba")
        self.assertTrue(sub.is_premium)


class SystemAnnouncementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="merchant_user",
            email="merchant@test.com",
            password="testpass123",
        )
        self.admin_user = User.objects.create_superuser(
            username="admin_boss",
            email="admin_boss@test.com",
            password="adminpass123",
        )

    def test_active_announcement_empty(self):
        res = self.client.get("/api/auth/announcements/active/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data["announcement"])

    def test_active_announcement_returns_latest_active(self):
        SystemAnnouncement.objects.create(
            title="Aviso Viejo",
            message="Mensaje viejo",
            announcement_type="info",
            is_active=False,
        )
        active = SystemAnnouncement.objects.create(
            title="Mantenimiento en curso",
            message="Estaremos en mantenimiento 2 minutos. Presione Ctrl + F5.",
            announcement_type="maintenance",
            is_active=True,
            show_reload_button=True,
            eta_minutes="2 a 5 min",
        )

        res = self.client.get("/api/auth/announcements/active/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["announcement"])
        self.assertEqual(res.data["announcement"]["id"], active.id)
        self.assertEqual(res.data["announcement"]["title"], "Mantenimiento en curso")
        self.assertEqual(res.data["announcement"]["announcement_type"], "maintenance")
        self.assertTrue(res.data["announcement"]["show_reload_button"])
        self.assertEqual(res.data["announcement"]["eta_minutes"], "2 a 5 min")

    def test_admin_create_announcement_auto_deactivates_previous(self):
        old_active = SystemAnnouncement.objects.create(
            title="Aviso Anterior",
            message="Mensaje",
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "title": "Nueva Actualización Disponible",
            "message": "Nuevas mejoras en envíos y combos. Presione Ctrl + F5.",
            "announcement_type": "update",
            "is_active": True,
            "show_reload_button": True,
            "allow_dismiss": True,
        }
        res = self.client.post("/api/auth/admin/announcements/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Nueva Actualización Disponible")

        # Verify old active was deactivated
        old_active.refresh_from_db()
        self.assertFalse(old_active.is_active)

    def test_non_admin_cannot_manage_announcements(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/auth/admin/announcements/",
            {"title": "Hacker Announcement", "message": "Test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class UserFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="kiosk_owner",
            email="kiosk@test.com",
            password="testpass123",
        )
        self.admin_user = User.objects.create_superuser(
            username="sysadmin",
            email="sysadmin@test.com",
            password="adminpass123",
        )

    def test_user_can_submit_feedback(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "feedback_type": "bug",
            "subject": "Fallo en lector de barras",
            "message": "Al escanear un código nuevo no abre el modal en mobile.",
            "page_url": "/sales/new",
            "device_info": "Mobile Touchscreen (768x1024)",
        }
        res = self.client.post("/api/auth/feedback/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["feedback_type"], "bug")

        fb = UserFeedback.objects.get(id=res.data["id"])
        self.assertEqual(fb.user, self.user)
        self.assertEqual(fb.status, UserFeedback.Status.PENDING)

    def test_admin_can_list_and_update_feedback(self):
        fb = UserFeedback.objects.create(
            user=self.user,
            feedback_type="suggestion",
            subject="Agregar delivery",
            message="Estaría bueno que los tickets tengan la dirección del delivery.",
            status="pending",
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/auth/admin/feedback/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

        patch_res = self.client.patch(
            f"/api/auth/admin/feedback/{fb.id}/",
            {"status": "resolved", "admin_notes": "Implementado en versión 1.7.4"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        fb.refresh_from_db()
        self.assertEqual(fb.status, UserFeedback.Status.RESOLVED)
        self.assertIsNotNone(fb.resolved_at)
        self.assertEqual(fb.admin_notes, "Implementado en versión 1.7.4")

    def test_unauthenticated_cannot_submit_feedback(self):
        res = self.client.post("/api/auth/feedback/", {"message": "Test"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)





