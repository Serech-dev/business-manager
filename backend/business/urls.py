from django.urls import path

from .views import (
    ProductListCreateView,
    ProductDetailView,
    TransactionListCreateView,
)


urlpatterns = [
    path(
        "products/",
        ProductListCreateView.as_view(),
        name="product-list-create",
    ),
    path(
        "products/<int:pk>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
    path(
        "transactions/",
        TransactionListCreateView.as_view(),
        name="transaction-list-create",
    ),
]