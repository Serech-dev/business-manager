from django.urls import path

from .views import (
    ClientDetailView,
    ClientListCreateView,
    TransactionAmountReceivedView,
    TransactionListCreateView,
    CurrentTransactionListView,
    TransactionDetailView,
    CurrentRegisterView,
    OpenRegisterView,
    CloseRegisterView,
    RegisterListView,
    RegisterDetailView,
)


urlpatterns = [
    path(
        "transactions/",
        TransactionListCreateView.as_view(),
        name="transaction-list-create",
    ),

    path(
        "transactions/current/",
        CurrentTransactionListView.as_view(),
        name="current-transaction-list",
    ),

    path(
        "transactions/<int:pk>/",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),

    path(
        "register/",
        CurrentRegisterView.as_view(),
        name="current-register",
    ),

    path(
        "register/open/",
        OpenRegisterView.as_view(),
        name="open-register",
    ),

    path(
        "register/close/",
        CloseRegisterView.as_view(),
        name="close-register",
    ),

    path(
        "registers/",
        RegisterListView.as_view(),
        name="register-list",
    ),

    path(
        "registers/<int:pk>/",
        RegisterDetailView.as_view(),
        name="register-detail",
    ),
    path(
        "transaction-amounts/<int:pk>/received/",
        TransactionAmountReceivedView.as_view(),
    ),
    path(
        "clients/",
        ClientListCreateView.as_view(),
        name="client-list",
    ),

    path(
        "clients/<int:pk>/",
        ClientDetailView.as_view(),
        name="client-detail",
    ),
]