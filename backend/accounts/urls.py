from django.urls import path

from .views import (ActiveSystemAnnouncementView,
                    AdminManageSubscriptionView,
                    AdminPaymentNotificationsListView,
                    AdminReviewPaymentNotificationView,
                    AdminStoresListView,
                    AdminSystemAnnouncementDetailView,
                    AdminSystemAnnouncementListView,
                    CreateCheckoutPreferenceView, LoginView, LogoutView,
                    MercadoPagoWebhookView, MyPaymentNotificationsView,
                    NotifyPaymentView, RegisterView, SubscriptionView,
                    VerifyPaymentStatusView)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("register/", RegisterView.as_view(), name="register"),
    path("subscription/", SubscriptionView.as_view(), name="subscription"),
    path("subscription/create-checkout/", CreateCheckoutPreferenceView.as_view(), name="create-checkout-preference"),
    path("subscription/webhook/", MercadoPagoWebhookView.as_view(), name="mercadopago-webhook"),
    path("subscription/verify-payment/", VerifyPaymentStatusView.as_view(), name="verify-payment-status"),
    path("subscription/notify-payment/", NotifyPaymentView.as_view(), name="notify-payment"),
    path("subscription/my-payments/", MyPaymentNotificationsView.as_view(), name="my-payments"),

    # System Announcements & Broadcasts
    path("announcements/active/", ActiveSystemAnnouncementView.as_view(), name="active-announcement"),
    path("admin/announcements/", AdminSystemAnnouncementListView.as_view(), name="admin-announcements-list"),
    path("admin/announcements/<int:pk>/", AdminSystemAnnouncementDetailView.as_view(), name="admin-announcement-detail"),

    # Superuser / Owner Panel
    path("admin/stores/", AdminStoresListView.as_view(), name="admin-stores"),
    path("admin/subscriptions/<int:user_id>/action/", AdminManageSubscriptionView.as_view(), name="admin-manage-subscription"),
    path("admin/payments/", AdminPaymentNotificationsListView.as_view(), name="admin-payments-list"),
    path("admin/payments/<int:pk>/review/", AdminReviewPaymentNotificationView.as_view(), name="admin-review-payment"),
]