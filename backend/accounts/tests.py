from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
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
        self.assertEqual(response.data["subscription"]["status"], Subscription.Status.TRIAL)
        self.assertTrue(response.data["subscription"]["is_valid"])
        self.assertGreaterEqual(response.data["subscription"]["days_remaining"], 13)

    def test_subscription_expiration_logic(self):
        sub = Subscription.get_or_create_for_user(self.user)
        self.assertTrue(sub.is_valid)

        # Set expiration in past
        sub.expires_at = timezone.now() - timedelta(days=1)
        sub.save()

        self.assertFalse(sub.is_valid)
        self.assertEqual(sub.effective_status, Subscription.Status.EXPIRED)
        self.assertEqual(sub.days_remaining, 0)

    def test_business_api_blocked_when_subscription_expired(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.expires_at = timezone.now() - timedelta(days=1)
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/business/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("code", response.data)
        self.assertEqual(response.data["code"], "subscription_expired")

    def test_business_api_accessible_with_valid_trial_or_license(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.expires_at = timezone.now() + timedelta(days=10)
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/business/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subscription_view_accessible_even_if_expired(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.expires_at = timezone.now() - timedelta(days=5)
        sub.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/subscription/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Subscription.Status.EXPIRED)
        self.assertIn("payment_info", response.data["summary"])

    def test_notify_payment_and_admin_review(self):
        sub = Subscription.get_or_create_for_user(self.user)
        sub.expires_at = timezone.now() - timedelta(days=1)
        sub.save()

        # Client reports payment
        self.client.force_authenticate(user=self.user)
        notify_res = self.client.post(
            "/api/auth/subscription/notify-payment/",
            {
                "plan": "yearly",
                "amount": 100000,
                "reference_code": "TRANSF-998877",
                "payer_notes": "Transferencia de Banco Galicia",
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

        # User's subscription should now be active for 365 days
        sub.refresh_from_db()
        self.assertTrue(sub.is_valid)
        self.assertEqual(sub.plan, Subscription.Plan.YEARLY)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreaterEqual(sub.days_remaining, 360)

    def test_admin_quick_action_extend_and_suspend(self):
        self.client.force_authenticate(user=self.admin_user)

        # Extend +30
        res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "extend_30"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        sub = Subscription.objects.get(user=self.user)
        self.assertEqual(sub.plan, Subscription.Plan.MONTHLY)
        self.assertEqual(sub.status, Subscription.Status.ACTIVE)
        self.assertGreaterEqual(sub.days_remaining, 29)

        # Suspend
        res = self.client.post(
            f"/api/auth/admin/subscriptions/{self.user.id}/action/",
            {"action": "suspend", "notes": "Falta de pago reiterada"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, Subscription.Status.SUSPENDED)
        self.assertFalse(sub.is_valid)

        # Non-admin cannot access admin panel
        self.client.force_authenticate(user=self.user)
        forbidden_res = self.client.get("/api/auth/admin/stores/")
        self.assertEqual(forbidden_res.status_code, status.HTTP_403_FORBIDDEN)
