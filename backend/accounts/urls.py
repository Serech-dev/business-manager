from django.urls import path

from .views import (AdminManageSubscriptionView,
                    AdminPaymentNotificationsListView,
                    AdminReviewPaymentNotificationView, AdminStoresListView,
                    LoginView, LogoutView, MyPaymentNotificationsView,
                    NotifyPaymentView, RegisterView, SubscriptionView)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("register/", RegisterView.as_view(), name="register"),
    path("subscription/", SubscriptionView.as_view(), name="subscription"),
    path("subscription/notify-payment/", NotifyPaymentView.as_view(), name="notify-payment"),
    path("subscription/my-payments/", MyPaymentNotificationsView.as_view(), name="my-payments"),

    # Superuser / Owner Panel
    path("admin/stores/", AdminStoresListView.as_view(), name="admin-stores"),
    path("admin/subscriptions/<int:user_id>/action/", AdminManageSubscriptionView.as_view(), name="admin-manage-subscription"),
    path("admin/payments/", AdminPaymentNotificationsListView.as_view(), name="admin-payments-list"),
    path("admin/payments/<int:pk>/review/", AdminReviewPaymentNotificationView.as_view(), name="admin-review-payment"),
]