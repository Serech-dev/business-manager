from django.urls import path

from .views import (
    TransactionListCreateView,
    TransactionDetailView,
    CurrentRegisterView,
    OpenRegisterView,
    CloseRegisterView,
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
]