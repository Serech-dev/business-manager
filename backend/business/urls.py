from django.urls import path

from .views import (ClientDetailView, ClientListCreateView, CloseRegisterView,
                    CurrentRegisterView, CurrentTransactionListView,
                    OpenRegisterView, ProviderDetailView,
                    ProviderListCreateView, RegisterDetailView,
                    RegisterListView, TransactionAmountReceivedView,
                    ResolveTransferView, TransactionDetailView,
                    TransactionListCreateView)

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
        "transfers/<int:pk>/resolve/",
        ResolveTransferView.as_view(),
        name="transfer-resolve",
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
    
    path(
        "providers/",
        ProviderListCreateView.as_view(),
    ),

    path(
        "providers/<int:pk>/",
        ProviderDetailView.as_view(),
    ),
]