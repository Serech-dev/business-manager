from django.urls import path

from .views import (AnalyticsView, BulkDeleteProductsView,
                    BulkUpdateProductPricesView, CategoryDetailView,
                    CategoryListCreateView, ClientDetailView,
                    ClientListCreateView, CloseRegisterView,
                    CurrentRegisterView, CurrentTransactionListView,
                    ImportStarterCatalogView, OpenRegisterView,
                    ProductDetailView, ProductListCreateView,
                    ProviderDetailView, ProviderListCreateView,
                    RegisterDetailView, RegisterListView,
                    ReopenLastRegisterView, ResolveTransferView,
                    TransactionAmountReceivedView, TransactionDetailView,
                    TransactionListCreateView)

urlpatterns = [
    path(
        "analytics/",
        AnalyticsView.as_view(),
        name="analytics",
    ),

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
        "register/reopen/",
        ReopenLastRegisterView.as_view(),
        name="reopen-register",
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

    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="category-list-create",
    ),

    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),

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
        "products/import-starter/",
        ImportStarterCatalogView.as_view(),
        name="import-starter-catalog",
    ),

    path(
        "products/bulk-update-prices/",
        BulkUpdateProductPricesView.as_view(),
        name="bulk-update-product-prices",
    ),

    path(
        "products/bulk-delete/",
        BulkDeleteProductsView.as_view(),
        name="bulk-delete-products",
    ),
]