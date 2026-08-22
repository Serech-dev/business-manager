from django.urls import path

from .views import (
    TransactionListCreateView,
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
]