from django.urls import path

from .views import (AnalyticsView, BankAccountDetailView, BankAccountListCreateView,
                     BulkAssignProductProviderView,
                     BulkDeleteProductsView, BulkUpdateProductPricesView,
                     CategoryDetailView, CategoryListCreateView,
                     ClientDetailView, ClientListCreateView, CloseRegisterView,
                     CurrentRegisterShiftView, CurrentRegisterView,
                     CurrentTransactionListView, EmployeeAttendanceListCreateView,
                     EmployeeDetailView, EmployeeListCreateView,
                     EmployeeMovementListCreateView, EmployeeSalarySettlementView, EmployeeSummaryView,
                     ImportStarterCatalogView, MasterCatalogLookupView,
                     MasterCatalogSearchView, OpenRegisterView,
                     OverdueDebtsAlertView,
                     ProductDetailView, ProductListCreateView,
                     ProviderDetailView, ProviderListCreateView,
                     RegisterDetailView, RegisterListView,
                     RegisterShiftsListView,
                     ReopenLastRegisterView, ResolveTransferView,
                     ShiftHandoverView,
                     StockAdjustmentView, StockAlertsSummaryView,
                     StockInsightsView, StockMovementListCreateView,
                     StockNoteDetailView, StockNoteListCreateView,
                     StoreSettingsView,
                     TransactionAmountReceivedView, TransactionDetailView,
                     TransactionListCreateView)

urlpatterns = [
    path(
        "bank-accounts/",
        BankAccountListCreateView.as_view(),
        name="bank-account-list-create",
    ),
    path(
        "bank-accounts/<int:pk>/",
        BankAccountDetailView.as_view(),
        name="bank-account-detail",
    ),
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
        "registers/<int:register_id>/shifts/",
        RegisterShiftsListView.as_view(),
        name="register-shifts-list",
    ),

    path(
        "shifts/",
        RegisterShiftsListView.as_view(),
        name="shifts-list",
    ),

    path(
        "shifts/current/",
        CurrentRegisterShiftView.as_view(),
        name="current-shift",
    ),

    path(
        "shifts/handover/",
        ShiftHandoverView.as_view(),
        name="shift-handover",
    ),

    path(
        "employees/",
        EmployeeListCreateView.as_view(),
        name="employee-list-create",
    ),

    path(
        "employees/<int:pk>/",
        EmployeeDetailView.as_view(),
        name="employee-detail",
    ),

    path(
        "employees/<int:employee_id>/summary/",
        EmployeeSummaryView.as_view(),
        name="employee-summary",
    ),

    path(
        "employees/<int:employee_id>/settle/",
        EmployeeSalarySettlementView.as_view(),
        name="employee-settle-salary",
    ),

    path(
        "employees/movements/",
        EmployeeMovementListCreateView.as_view(),
        name="employee-movements-general",
    ),

    path(
        "employees/<int:employee_id>/movements/",
        EmployeeMovementListCreateView.as_view(),
        name="employee-movements",
    ),

    path(
        "employees/attendance/",
        EmployeeAttendanceListCreateView.as_view(),
        name="employee-attendance-general",
    ),

    path(
        "employees/<int:employee_id>/attendance/",
        EmployeeAttendanceListCreateView.as_view(),
        name="employee-attendance",
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
        "debts/overdue/",
        OverdueDebtsAlertView.as_view(),
        name="overdue-debts-alert",
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

    path(
        "products/bulk-assign-provider/",
        BulkAssignProductProviderView.as_view(),
        name="bulk-assign-product-provider",
    ),

    path(
        "stock-movements/",
        StockMovementListCreateView.as_view(),
        name="stock-movement-list-create",
    ),

    path(
        "stock-adjust/",
        StockAdjustmentView.as_view(),
        name="stock-adjustment",
    ),

    path(
        "stock-insights/",
        StockInsightsView.as_view(),
        name="stock-insights",
    ),

    path(
        "stock-notes/",
        StockNoteListCreateView.as_view(),
        name="stock-note-list-create",
    ),

    path(
        "stock-notes/<int:pk>/",
        StockNoteDetailView.as_view(),
        name="stock-note-detail",
    ),

    path(
        "stock-alerts/",
        StockAlertsSummaryView.as_view(),
        name="stock-alerts-summary",
    ),

    path(
        "settings/",
        StoreSettingsView.as_view(),
        name="store-settings",
    ),

    path(
        "master-catalog/lookup/",
        MasterCatalogLookupView.as_view(),
        name="master-catalog-lookup",
    ),

    path(
        "master-catalog/search/",
        MasterCatalogSearchView.as_view(),
        name="master-catalog-search",
    ),
]

