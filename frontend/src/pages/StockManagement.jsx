import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
    getProducts,
    getCategories,
    getProviders,
    getStockMovements,
    getStockInsights,
    getStockNotes,
    updateStockNote,
    deleteStockNote,
    getStockAlertsSummary,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import { formatStockQty, formatUnitType } from "../utils/formatStock";
import { filterAndRankProducts } from "../utils/productSearch";
import RestockModal from "../components/stock/RestockModal";
import StockAdjustModal from "../components/stock/StockAdjustModal";
import StockNoteModal from "../components/stock/StockNoteModal";
import ProductModal from "../components/products/ProductModal";
import ConfirmDialog from "../components/ConfirmDialog";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

const STOCK_TOUR_STEPS = [
    {
        target: '[data-tour="stock-restock-btn"]',
        title: "Ingreso de Mercadería",
        content: "Cargá pedidos y reposiciones en lote por proveedor, actualizando cantidades, precios de costo y forma de pago.",
        position: "bottom",
    },
    {
        target: '[data-tour="stock-kpis"]',
        title: "Alertas y Métricas de Stock",
        content: "Monitoreá artículos con bajo stock, productos agotados y la valuación total de tu inventario a precio de costo.",
        position: "bottom",
    },
    {
        target: '[data-tour="stock-tabs"]',
        title: "Vistas de Stock",
        content: "Alterná entre el inventario activo, el historial cronológico de reposiciones y la lista de notas de compras pendientes.",
        position: "bottom",
    },
    {
        target: '[data-tour="stock-table-actions"]',
        title: "Ajuste Rápido y Reposición",
        content: "Registrá mermas o roturas al instante con motivos de auditoría, o sumá unidades directamente a cada producto.",
        position: "top",
    },
];

function formatDate(val) {
    if (!val) return "-";
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(val));
}

function StockManagement() {
    const { requireOwnerAccess, isKioskDevice, isUnlocked } = useDeviceSecurity();
    const isOwner = !isKioskDevice || isUnlocked;

    const [activeTab, setActiveTab] = useState("inventory");

    // Master data
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [providers, setProviders] = useState([]);
    const [alertsSummary, setAlertsSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Tab 1: Inventory Filters & Search
    const [invSearch, setInvSearch] = useState("");
    const [invCategory, setInvCategory] = useState("");
    const [invProvider, setInvProvider] = useState("");
    const [invStatus, setInvStatus] = useState("all"); // 'all' | 'out_of_stock' | 'low_stock' | 'in_stock' | 'untracked'

    // Tab 2: Restock History & Insights
    const [movements, setMovements] = useState([]);
    const [insights, setInsights] = useState(null);
    const [historySearch, setHistorySearch] = useState("");
    const [selectedTag, setSelectedTag] = useState("");
    const [historyStartDate, setHistoryStartDate] = useState("");
    const [historyEndDate, setHistoryEndDate] = useState("");
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);

    // Tab 3: Stock Notes
    const [notes, setNotes] = useState([]);
    const [notesStatusFilter, setNotesStatusFilter] = useState("pending");
    const [notesSearch, setNotesSearch] = useState("");
    const [noteToDelete, setNoteToDelete] = useState(null);

    // Modals
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [restockProduct, setRestockProduct] = useState(null);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustProduct, setAdjustProduct] = useState(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    async function loadMasterData() {
        try {
            const [prodsData, catsData, provsData, summaryData] = await Promise.all([
                getProducts(),
                getCategories(),
                getProviders(),
                getStockAlertsSummary().catch(() => null),
            ]);
            setProducts(prodsData);
            setCategories(catsData);
            setProviders(provsData);
            setAlertsSummary(summaryData);
        } catch (error) {
            console.error("Error loading stock master data:", error);
            toast.error("No se pudieron cargar los datos de stock.");
        } finally {
            setIsLoading(false);
        }
    }

    async function loadHistoryData() {
        setIsInsightsLoading(true);
        try {
            const [movs, ins] = await Promise.all([
                getStockMovements({
                    search: historySearch,
                    tag: selectedTag,
                    start_date: historyStartDate,
                    end_date: historyEndDate,
                }),
                getStockInsights({
                    search: historySearch,
                    tag: selectedTag,
                    start_date: historyStartDate,
                    end_date: historyEndDate,
                }),
            ]);
            setMovements(movs);
            setInsights(ins);
        } catch (error) {
            console.error("Error loading stock history/insights:", error);
        } finally {
            setIsInsightsLoading(false);
        }
    }

    async function loadNotesData() {
        try {
            const notesData = await getStockNotes({
                status: notesStatusFilter,
                search: notesSearch,
            });
            setNotes(notesData);
        } catch (error) {
            console.error("Error loading stock notes:", error);
        }
    }

    useEffect(() => {
        loadMasterData();
    }, []);

    useEffect(() => {
        if (activeTab === "history") {
            loadHistoryData();
        } else if (activeTab === "notes") {
            loadNotesData();
        }
    }, [activeTab, selectedTag, historyStartDate, historyEndDate, notesStatusFilter]);

    async function handleToggleNoteStatus(noteId, newStatus) {
        try {
            await updateStockNote(noteId, { status: newStatus });
            toast.success(newStatus === "bought" ? "Marcado como resuelto." : "Estado actualizado.");
            loadNotesData();
            loadMasterData();
        } catch (error) {
            console.error("Error updating note status:", error);
            toast.error("No se pudo actualizar el estado de la nota.");
        }
    }

    async function handleDeleteNote() {
        if (!noteToDelete) return;
        try {
            await deleteStockNote(noteToDelete.id);
            toast.success("Nota eliminada.");
            setNoteToDelete(null);
            loadNotesData();
            loadMasterData();
        } catch (error) {
            console.error("Error deleting note:", error);
            toast.error("No se pudo eliminar la nota.");
        }
    }

    const filteredProducts = useMemo(() => {
        return filterAndRankProducts(products, invSearch, {
            categoryId: invCategory,
            providerId: invProvider,
            statusFilter: invStatus,
        });
    }, [products, invCategory, invProvider, invStatus, invSearch]);

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        Control de Stock & Reabastecimiento
                    </h1>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Monitoreo de inventario en tiempo real, balance de compras por temporada y registro de faltantes.
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingNote(null);
                            setIsNoteModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:bg-[var(--surface-accent)]"
                    >
                        <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span>Anotar Faltante / Pedido</span>
                    </button>

                    <button
                        type="button"
                        data-tour="stock-restock-btn"
                        onClick={() => {
                            setRestockProduct(null);
                            setIsRestockModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] active:scale-98"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Registrar Ingreso de Stock</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div data-tour="stock-kpis" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Artículos con seguimiento
                    </span>
                    <div className="mt-1.5 text-2xl font-black text-[var(--text-primary)] tabular-nums">
                        {alertsSummary?.tracked_count ?? products.filter((p) => p.stock !== null).length}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">de {products.length} productos</span>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Stock bajo
                        </span>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {alertsSummary?.low_stock_count ?? 0}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">Por debajo del mínimo</span>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Sin stock
                        </span>
                        <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                    </div>
                    <div className="mt-1.5 text-2xl font-black text-[var(--danger)] tabular-nums">
                        {alertsSummary?.out_of_stock_count ?? 0}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">Agotados</span>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Valor total en mercadería
                        </span>
                        {!isOwner && (
                            <button
                                type="button"
                                onClick={() => requireOwnerAccess(() => {})}
                                className="text-[10px] font-bold text-[var(--primary)] hover:underline"
                                title="Desbloquear con PIN de dueño"
                            >
                                PIN
                            </button>
                        )}
                    </div>
                    <div className="mt-1.5 text-2xl font-black text-[var(--text-primary)] tabular-nums">
                        {isOwner ? (
                            formatCurrency(alertsSummary?.total_inventory_cost ?? 0)
                        ) : (
                            <span className="text-xl font-mono text-[var(--text-secondary)]">••••••</span>
                        )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                        {isOwner ? "A precio de costo" : "Protegido en Modo Caja"}
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div data-tour="stock-tabs" className="flex border-b border-[var(--border)]">
                <button
                    type="button"
                    onClick={() => setActiveTab("inventory")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "inventory"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <span>Control de inventario</span>
                    <span className="rounded-md bg-[var(--surface-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                        {filteredProducts.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "history"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <span>Historial de compras & temporadas</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("notes")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "notes"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <span>Notas & pedidos</span>
                    {alertsSummary?.pending_notes_count > 0 && (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {alertsSummary.pending_notes_count}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: INVENTORY & STOCK TABLE */}
            {activeTab === "inventory" && (
                <div className="space-y-4">
                    {/* Filters Row */}
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2.5">
                            {/* Search */}
                            <div className="relative min-w-[220px] flex-1">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={invSearch}
                                    onChange={(e) => setInvSearch(e.target.value)}
                                    placeholder="Buscar producto o código..."
                                    className="h-9.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="relative">
                                <select
                                    value={invCategory}
                                    onChange={(e) => setInvCategory(e.target.value)}
                                    className="h-9.5 appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                >
                                    <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">Todas las categorías</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>

                            {/* Provider Filter */}
                            <div className="relative">
                                <select
                                    value={invProvider}
                                    onChange={(e) => setInvProvider(e.target.value)}
                                    className="h-9.5 appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                >
                                    <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">Todos los proveedores</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status segmented filters */}
                        <div className="flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-2 sm:border-t-0 sm:pt-0">
                            {[
                                { id: "all", label: "Todos" },
                                { id: "out_of_stock", label: "Sin stock" },
                                { id: "low_stock", label: "Stock bajo" },
                                { id: "in_stock", label: "Stock normal" },
                                { id: "untracked", label: "Sin seguimiento" },
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setInvStatus(st.id)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                        invStatus === st.id
                                            ? "bg-[var(--primary)] text-white shadow-xs"
                                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div data-tour="stock-table-actions" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-[var(--text-primary)]">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3">Categoría / Proveedor</th>
                                        <th className="px-4 py-3 text-right">Costo unit.</th>
                                        <th className="px-4 py-3 text-right">Precio venta</th>
                                        <th className="px-4 py-3 text-right">Mínimo</th>
                                        <th className="px-4 py-3 text-right">Stock actual</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-secondary)]">
                                                No se encontraron productos con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map((prod) => {
                                            const isTracked = prod.stock !== null && prod.stock !== undefined;
                                            const stockNum = isTracked ? Number(prod.stock) : null;
                                            const minStockNum = Number(prod.min_stock) || 0;

                                            return (
                                                <tr key={prod.id} className="transition hover:bg-[var(--surface-accent)]/40">
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-[var(--text-primary)] text-xs">
                                                            {prod.name}
                                                        </div>
                                                        <div className="text-[11px] text-[var(--text-secondary)]">
                                                            <span>{formatUnitType(prod.unit_type, true, 1)}</span>
                                                            {prod.barcode && <span className="ml-2 font-mono">#{prod.barcode}</span>}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-[11px] text-[var(--text-secondary)]">
                                                        <div>{prod.category_name || "Sin categoría"}</div>
                                                        {prod.provider_name && (
                                                            <div className="text-[10px] text-[var(--text-secondary)]/80">
                                                                {prod.provider_name}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-xs text-[var(--text-secondary)] tabular-nums">
                                                        {isOwner ? (
                                                            Number(prod.cost_price) > 0 ? formatCurrency(prod.cost_price) : "—"
                                                        ) : (
                                                            <span className="font-mono text-[10px] text-[var(--text-secondary)]/50">••••</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-xs font-bold text-[var(--text-primary)] tabular-nums">
                                                        {formatCurrency(prod.sale_price)}
                                                    </td>

                                                    <td className="px-4 py-3 text-right text-[11px] tabular-nums">
                                                        {minStockNum > 0 ? (
                                                            <span className="font-semibold text-[var(--text-primary)]">
                                                                {formatStockQty(minStockNum, prod.unit_type)}{" "}
                                                                <span className="text-[10px] font-normal text-[var(--text-secondary)]">
                                                                    {formatUnitType(prod.unit_type, false, minStockNum)}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-[var(--text-secondary)]/60">Sin alerta</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        {isTracked ? (
                                                            <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                                                                {formatStockQty(stockNum, prod.unit_type)}{" "}
                                                                <span className="text-[10px] font-normal text-[var(--text-secondary)]">
                                                                    {formatUnitType(prod.unit_type, false, stockNum)}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-[var(--text-secondary)] italic">Desactivado</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        {isTracked ? (
                                                            stockNum <= 0 ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--danger)]">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                                                                    Sin stock
                                                                </span>
                                                            ) : stockNum <= minStockNum ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                    Stock bajo
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                    Normal
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/60 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                                                Sin seguimiento
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAdjustProduct(prod);
                                                                    setIsAdjustModalOpen(true);
                                                                }}
                                                                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-accent)]"
                                                            >
                                                                Recuento
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setRestockProduct(prod);
                                                                    setIsRestockModalOpen(true);
                                                                }}
                                                                className="rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                                                            >
                                                                Ingreso
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    requireOwnerAccess(() => {
                                                                        setEditingProduct(prod);
                                                                        setIsProductModalOpen(true);
                                                                    });
                                                                }}
                                                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                                                title={isOwner ? "Editar producto" : "Requiere PIN de dueño"}
                                                            >
                                                                Editar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: RESTOCK HISTORY & SEASONAL INSIGHTS */}
            {activeTab === "history" && (
                <div className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2.5">
                            <div className="relative min-w-[200px] flex-1">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Filtrar por producto o etiqueta..."
                                    className="h-9.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={loadHistoryData}
                                className="h-9.5 rounded-lg bg-[var(--surface-accent)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                            >
                                Aplicar
                            </button>
                        </div>

                        {/* Tag filter selector */}
                        {insights?.available_tags?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-2 sm:border-t-0 sm:pt-0">
                                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Temporada:</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTag("")}
                                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                        selectedTag === ""
                                            ? "bg-[var(--primary)] text-white"
                                            : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    Todas
                                </button>
                                {insights.available_tags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            selectedTag === tag
                                                ? "bg-[var(--primary)] text-white"
                                                : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comparison Insights Card */}
                    {insights?.summary && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        {selectedTag ? `Balance de compras: "${selectedTag}"` : "Balance general de compras vs. ventas"}
                                    </h3>
                                    <p className="text-[11px] text-[var(--text-secondary)]">
                                        Análisis comparativo de unidades compradas, vendidas y remanente de inventario.
                                    </p>
                                </div>
                                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    Vendido: {insights.summary.overall_sell_through_rate}%
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Comprado / Ingresado</span>
                                    <div className="mt-1 text-lg font-black text-[var(--text-primary)] tabular-nums">
                                        {insights.summary.total_restocked_units} u.
                                    </div>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        {isOwner ? formatCurrency(insights.summary.total_restocked_cost) : "••••••"}
                                    </span>
                                </div>

                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Vendido</span>
                                    <div className="mt-1 text-lg font-black text-[var(--success)] tabular-nums">
                                        {insights.summary.total_sold_units} u.
                                    </div>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        {isOwner ? formatCurrency(insights.summary.total_sales_revenue) : "••••••"}
                                    </span>
                                </div>

                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Remanente en stock</span>
                                    <div className="mt-1 text-lg font-black text-[var(--text-primary)] tabular-nums">
                                        {Math.max(0, insights.summary.total_restocked_units - insights.summary.total_sold_units)} u.
                                    </div>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        {insights.summary.overall_sell_through_rate >= 90 ? "Stock optimizado" : "Con sobrante"}
                                    </span>
                                </div>

                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Margen estimado</span>
                                    <div className={`mt-1 text-lg font-black tabular-nums ${insights.summary.net_margin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                        {isOwner ? formatCurrency(insights.summary.net_margin) : "••••••"}
                                    </div>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        {isOwner ? "Ventas menos costo" : "Protegido con PIN"}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div className="mb-1 flex justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                                    <span>Tasa de absorción</span>
                                    <span className="text-[var(--text-primary)]">{insights.summary.overall_sell_through_rate}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-accent)]">
                                    <div
                                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.max(0, insights.summary.overall_sell_through_rate))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                        <div className="border-b border-[var(--border)] px-4 py-2.5 bg-[var(--surface-accent)]/30 font-bold text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                            Registro de movimientos de stock ({movements.length})
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-[var(--text-primary)]">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Costo unit. / total</th>
                                        <th className="px-4 py-3">Proveedor</th>
                                        <th className="px-4 py-3">Etiqueta / Nota</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {movements.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-10 text-center text-xs text-[var(--text-secondary)]">
                                                No hay movimientos registrados para esta búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        movements.map((mov) => {
                                            const isGain = Number(mov.quantity) > 0;
                                            return (
                                                <tr key={mov.id} className="transition hover:bg-[var(--surface-accent)]/30">
                                                    <td className="px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
                                                        {formatDate(mov.created_at)}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">
                                                        {mov.product_name}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="rounded-md bg-[var(--surface-accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                                            {mov.movement_type_display}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                                                        <span className={isGain ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                                                            {isGain ? `+${formatStockQty(mov.quantity)}` : formatStockQty(mov.quantity)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-[11px] text-[var(--text-secondary)] tabular-nums">
                                                        {isOwner ? (
                                                            <>
                                                                {mov.unit_cost ? formatCurrency(mov.unit_cost) : "—"}
                                                                {mov.total_cost && ` (Tot: ${formatCurrency(mov.total_cost)})`}
                                                            </>
                                                        ) : (
                                                            <span className="font-mono text-[10px] text-[var(--text-secondary)]/50">••••</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
                                                        {mov.provider_name || "—"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[11px] font-medium text-[var(--text-primary)]">
                                                        {mov.notes || "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: STOCK NOTES */}
            {activeTab === "notes" && (
                <div className="space-y-4">
                    {/* Header bar */}
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Estado:</span>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { id: "pending", label: "Pendientes" },
                                    { id: "bought", label: "Comprados / Resueltos" },
                                    { id: "dismissed", label: "Descartados" },
                                    { id: "all", label: "Todos" },
                                ].map((st) => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setNotesStatusFilter(st.id)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                            notesStatusFilter === st.id
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingNote(null);
                                setIsNoteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)]"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Nueva nota</span>
                        </button>
                    </div>

                    {/* Notes Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {notes.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-xs text-[var(--text-secondary)]">
                                No hay notas ni pedidos en esta categoría.
                            </div>
                        ) : (
                            notes.map((note) => {
                                const isMissing = note.note_type === "missing";
                                return (
                                    <div
                                        key={note.id}
                                        className={`flex flex-col justify-between rounded-xl border p-4 shadow-xs transition ${
                                            note.status === "bought"
                                                ? "border-emerald-500/20 bg-emerald-500/5"
                                                : note.status === "dismissed"
                                                ? "border-[var(--border)] bg-[var(--surface)] opacity-60"
                                                : "border-[var(--border)] bg-[var(--surface)]"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="rounded-md bg-[var(--surface-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                                    {isMissing ? "Faltante de stock" : "Pedido de cliente"}
                                                </span>

                                                <span className="text-[10px] text-[var(--text-secondary)]">
                                                    {formatDate(note.created_at)}
                                                </span>
                                            </div>

                                            <h4 className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                                                {note.item_name}
                                            </h4>

                                            {note.customer_name && (
                                                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                                    Cliente: <span className="font-semibold text-[var(--text-primary)]">{note.customer_name}</span>
                                                </div>
                                            )}

                                            {note.notes && (
                                                <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-3">
                                                    {note.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions footer */}
                                        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {note.status === "pending" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleNoteStatus(note.id, "bought")}
                                                        className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition"
                                                    >
                                                        Marcar resuelto
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleNoteStatus(note.id, "pending")}
                                                        className="rounded-lg bg-[var(--surface-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                                                    >
                                                        Reabrir
                                                    </button>
                                                )}

                                                {note.status === "pending" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleNoteStatus(note.id, "dismissed")}
                                                        className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] transition"
                                                    >
                                                        Descartar
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingNote(note);
                                                        setIsNoteModalOpen(true);
                                                    }}
                                                    className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] transition"
                                                    title="Editar nota"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        requireOwnerAccess(() => setNoteToDelete(note));
                                                    }}
                                                    className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition"
                                                    title={isOwner ? "Eliminar nota" : "Requiere PIN de dueño"}
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <RestockModal
                isOpen={isRestockModalOpen}
                onClose={() => {
                    setIsRestockModalOpen(false);
                    setRestockProduct(null);
                }}
                products={products}
                providers={providers}
                initialProduct={restockProduct}
                onSuccess={() => {
                    loadMasterData();
                    if (activeTab === "history") loadHistoryData();
                }}
            />

            <StockAdjustModal
                isOpen={isAdjustModalOpen}
                onClose={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustProduct(null);
                }}
                product={adjustProduct}
                onSuccess={() => {
                    loadMasterData();
                    if (activeTab === "history") loadHistoryData();
                }}
            />

            <StockNoteModal
                isOpen={isNoteModalOpen}
                onClose={() => {
                    setIsNoteModalOpen(false);
                    setEditingNote(null);
                }}
                note={editingNote}
                products={products}
                onSuccess={() => {
                    loadNotesData();
                    loadMasterData();
                }}
            />

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                }}
                product={editingProduct}
                categories={categories}
                providers={providers}
                onSuccess={() => {
                    loadMasterData();
                }}
            />

            {noteToDelete && (
                <ConfirmDialog
                    title="Eliminar Nota"
                    message={`¿Estás seguro de que querés eliminar la nota sobre "${noteToDelete.item_name}"?`}
                    confirmLabel="Eliminar"
                    cancelLabel="Cancelar"
                    onConfirm={handleDeleteNote}
                    onCancel={() => setNoteToDelete(null)}
                />
            )}

            {/* ONBOARDING TOUR */}
            <OnboardingTour
                tourKey="stock"
                steps={STOCK_TOUR_STEPS}
            />
        </div>
    );
}

export default StockManagement;
