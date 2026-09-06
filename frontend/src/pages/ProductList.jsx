import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
    getProducts,
    getCategories,
    getProviders,
    deleteProduct,
    bulkDeleteProducts,
    importStarterCatalog,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import ProductModal from "../components/products/ProductModal";
import CategoryModal from "../components/products/CategoryModal";
import ProviderModal from "../components/products/ProviderModal";
import BulkPriceModal from "../components/products/BulkPriceModal";
import ImportCatalogModal from "../components/products/ImportCatalogModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

// High-contrast, custom styled checkbox component
function CustomCheckbox({ checked, indeterminate = false, onChange, ariaLabel }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
            aria-label={ariaLabel}
            onClick={(e) => {
                e.stopPropagation();
                onChange?.();
            }}
            className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                checked || indeterminate
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs ring-2 ring-[var(--primary)]/30"
                    : "border-[var(--text-secondary)]/50 bg-[var(--surface-accent)]/60 hover:border-[var(--primary)] hover:bg-[var(--surface-accent)]"
            }`}
        >
            {checked && (
                <svg
                    className="h-3.5 w-3.5 stroke-[3.5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
            {indeterminate && !checked && (
                <svg
                    className="h-3.5 w-3.5 stroke-[3.5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            )}
        </button>
    );
}

function ProductList() {
    const { isKioskDevice, isUnlocked, requireOwnerAccess } = useDeviceSecurity();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [providers, setProviders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters & Search
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [statusFilter, setStatusFilter] = useState("active"); // 'active' | 'all' | 'inactive'
    const [sortBy, setSortBy] = useState("name_asc"); // 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'recent'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25); // 25 | 50 | 100 | -1 (all)

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
    const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    async function loadData() {
        try {
            const [prodsData, catsData, provsData] = await Promise.all([
                getProducts(),
                getCategories(),
                getProviders(),
            ]);
            setProducts(prodsData);
            setCategories(catsData);
            setProviders(provsData);
        } catch (error) {
            console.error("Error loading products:", error);
            toast.error("No se pudieron cargar los productos.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (selectedCategory && String(p.category) !== String(selectedCategory)) {
                return false;
            }
            if (selectedProvider && String(p.provider) !== String(selectedProvider)) {
                return false;
            }
            if (statusFilter === "active" && !p.is_active) {
                return false;
            }
            if (statusFilter === "inactive" && p.is_active) {
                return false;
            }
            const q = search.trim().toLowerCase();
            if (q) {
                const matchesName = p.name.toLowerCase().includes(q);
                const matchesBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
                const matchesProvider =
                    p.provider_name && p.provider_name.toLowerCase().includes(q);
                const matchesCategory =
                    p.category_name && p.category_name.toLowerCase().includes(q);
                if (!matchesName && !matchesBarcode && !matchesProvider && !matchesCategory) {
                    return false;
                }
            }
            return true;
        });
    }, [products, selectedCategory, selectedProvider, statusFilter, search]);

    // Counts for status
    const activeCount = useMemo(() => products.filter((p) => p.is_active).length, [products]);
    const inactiveCount = useMemo(() => products.filter((p) => !p.is_active).length, [products]);

    // Active filters list for interactive tag chips
    const activeFiltersList = useMemo(() => {
        const list = [];
        if (search.trim()) {
            list.push({
                id: "search",
                label: `Búsqueda: "${search.trim()}"`,
                onClear: () => setSearch(""),
            });
        }
        if (selectedCategory) {
            const cat = categories.find((c) => String(c.id) === String(selectedCategory));
            list.push({
                id: "category",
                label: `Categoría: ${cat ? cat.name : selectedCategory}`,
                onClear: () => setSelectedCategory(""),
            });
        }
        if (selectedProvider) {
            const prov = providers.find((p) => String(p.id) === String(selectedProvider));
            list.push({
                id: "provider",
                label: `Proveedor: ${prov ? prov.name : selectedProvider}`,
                onClear: () => setSelectedProvider(""),
            });
        }
        if (statusFilter !== "active") {
            list.push({
                id: "status",
                label: statusFilter === "inactive" ? "Solo Inactivos" : "Todos los estados",
                onClear: () => setStatusFilter("active"),
            });
        }
        return list;
    }, [search, selectedCategory, selectedProvider, statusFilter, categories, providers]);

    // Sorted products
    const sortedProducts = useMemo(() => {
        const list = [...filteredProducts];
        if (sortBy === "name_asc") {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "name_desc") {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortBy === "price_asc") {
            list.sort((a, b) => Number(a.sale_price) - Number(b.sale_price));
        } else if (sortBy === "price_desc") {
            list.sort((a, b) => Number(b.sale_price) - Number(a.sale_price));
        } else if (sortBy === "category") {
            list.sort((a, b) =>
                (a.category_name || "zzz").localeCompare(b.category_name || "zzz")
            );
        } else if (sortBy === "recent") {
            list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
        return list;
    }, [filteredProducts, sortBy]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedCategory, selectedProvider, statusFilter, sortBy, pageSize]);

    // Paginated products
    const paginatedProducts = useMemo(() => {
        if (pageSize === -1) return sortedProducts;
        const start = (currentPage - 1) * pageSize;
        return sortedProducts.slice(start, start + pageSize);
    }, [sortedProducts, currentPage, pageSize]);

    const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedProducts.length / pageSize);

    // Selection handlers
    const isAllVisibleSelected = useMemo(() => {
        if (paginatedProducts.length === 0) return false;
        return paginatedProducts.every((p) => selectedIds.includes(p.id));
    }, [paginatedProducts, selectedIds]);

    const isSomeVisibleSelected = useMemo(() => {
        if (paginatedProducts.length === 0) return false;
        return (
            paginatedProducts.some((p) => selectedIds.includes(p.id)) &&
            !isAllVisibleSelected
        );
    }, [paginatedProducts, selectedIds, isAllVisibleSelected]);

    function handleToggleSelectAllVisible() {
        if (isAllVisibleSelected) {
            const visibleSet = new Set(paginatedProducts.map((p) => p.id));
            setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
        } else {
            const newIds = new Set([
                ...selectedIds,
                ...paginatedProducts.map((p) => p.id),
            ]);
            setSelectedIds(Array.from(newIds));
        }
    }

    function handleToggleSelect(id) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
        );
    }

    function handleSelectAllFiltered() {
        setSelectedIds(sortedProducts.map((p) => p.id));
    }

    function handleClearSelection() {
        setSelectedIds([]);
    }

    // Product CRUD actions
    function handleOpenCreate() {
        requireOwnerAccess(() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
        });
    }

    function handleOpenEdit(product) {
        requireOwnerAccess(() => {
            setEditingProduct(product);
            setIsProductModalOpen(true);
        });
    }

    function handleProductSaved(saved) {
        setProducts((prev) => {
            const exists = prev.some((p) => p.id === saved.id);
            if (exists) {
                return prev.map((p) => (p.id === saved.id ? saved : p));
            }
            return [saved, ...prev];
        });
        getCategories().then(setCategories).catch(() => {});
    }

    async function handleDeleteProduct() {
        if (!productToDelete) return;

        setIsDeleting(true);
        try {
            await deleteProduct(productToDelete.id);
            toast.success("Producto eliminado.");
            setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
            setSelectedIds((prev) => prev.filter((id) => id !== productToDelete.id));
            setProductToDelete(null);
            getCategories().then(setCategories).catch(() => {});
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error("No se pudo eliminar el producto.");
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleBulkDelete() {
        if (selectedIds.length === 0) return;

        setIsBulkDeleting(true);
        try {
            const res = await bulkDeleteProducts(selectedIds);
            toast.success(
                res.message || `Se eliminaron ${res.deleted_count} productos.`
            );
            const deletedSet = new Set(selectedIds);
            setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)));
            setSelectedIds([]);
            setIsBulkDeleteOpen(false);
            getCategories().then(setCategories).catch(() => {});
        } catch (error) {
            console.error("Error bulk deleting products:", error);
            toast.error("No se pudieron eliminar los productos seleccionados.");
        } finally {
            setIsBulkDeleting(false);
        }
    }

    function handleBulkPricesUpdated() {
        loadData();
    }

    function handleResetFilters() {
        setSearch("");
        setSelectedCategory("");
        setSelectedProvider("");
        setStatusFilter("active");
        setSortBy("name_asc");
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                Cargando catálogo de productos...
            </div>
        );
    }

    if (isKioskDevice && !isUnlocked) {
        return (
            <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-accent)] text-[var(--primary)] shadow-md">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                </div>
                <h2 className="mt-5 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    Catálogo protegido por PIN
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    La administración de productos, precios y proveedores está reservada para el dueño del negocio.
                </p>
                <button
                    type="button"
                    onClick={() => requireOwnerAccess(() => {})}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"
                >
                    Ingresar PIN de Dueño
                </button>
            </div>
        );
    }

    const startItem =
        sortedProducts.length === 0
            ? 0
            : pageSize === -1
            ? 1
            : (currentPage - 1) * pageSize + 1;
    const endItem =
        pageSize === -1
            ? sortedProducts.length
            : Math.min(currentPage * pageSize, sortedProducts.length);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 space-y-6 pb-28">
            {/* HEADER */}
            <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Catálogo & Precios
                        </p>
                        <span className="rounded-full bg-[var(--surface-accent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                            {products.length} productos
                        </span>
                    </div>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                        Productos
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => requireOwnerAccess(() => setIsBulkPriceModalOpen(true))}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        <svg
                            className="h-4 w-4 text-[var(--primary)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
                            />
                        </svg>
                        <span>Aumento Masivo</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => requireOwnerAccess(() => setIsImportModalOpen(true))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        <span>Catálogo Base</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => requireOwnerAccess(() => setIsCategoryModalOpen(true))}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        Categorías ({categories.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => requireOwnerAccess(() => setIsProviderModalOpen(true))}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        Proveedores ({providers.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => requireOwnerAccess(handleOpenCreate)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </header>

            {/* SEARCH & FILTERS TOOLBAR */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-4">
                {/* PRIMARY CONTROLS ROW */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    {/* SEARCH INPUT */}
                    <div className="relative sm:col-span-12 md:col-span-4">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, código o marca..."
                            className="h-10.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-8 text-xs font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* CATEGORY SELECT */}
                    <div className="relative sm:col-span-6 md:col-span-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-10.5 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map((c) => {
                                const count = products.filter(
                                    (p) => String(p.category) === String(c.id)
                                ).length;
                                return (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({count})
                                    </option>
                                );
                            })}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>
                    </div>

                    {/* PROVIDER SELECT */}
                    <div className="relative sm:col-span-6 md:col-span-3">
                        <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className="h-10.5 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                            <option value="">Todos los proveedores</option>
                            {providers.map((p) => {
                                const count = products.filter(
                                    (prod) => String(prod.provider) === String(p.id)
                                ).length;
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({count})
                                    </option>
                                );
                            })}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>
                    </div>

                    {/* SORT SELECT */}
                    <div className="relative sm:col-span-6 md:col-span-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-10.5 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                            <option value="name_asc">Nombre: A → Z</option>
                            <option value="name_desc">Nombre: Z → A</option>
                            <option value="price_asc">Precio: Menor a Mayor</option>
                            <option value="price_desc">Precio: Mayor a Menor</option>
                            <option value="category">Por Categoría</option>
                            <option value="recent">Más recientes</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* SECONDARY FILTER ROW: STATUS + ACTIVE FILTER TAGS + RESET BUTTON */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs">
                    {/* STATUS SEGMENTED CONTROL WITH COUNTS */}
                    <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/40 p-1">
                        <button
                            type="button"
                            onClick={() => setStatusFilter("active")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                statusFilter === "active"
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Activos</span>
                            <span
                                className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                    statusFilter === "active"
                                        ? "bg-white/20 text-white"
                                        : "bg-[var(--surface)] text-[var(--text-secondary)]"
                                }`}
                            >
                                {activeCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                statusFilter === "all"
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Todos</span>
                            <span
                                className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                    statusFilter === "all"
                                        ? "bg-white/20 text-white"
                                        : "bg-[var(--surface)] text-[var(--text-secondary)]"
                                }`}
                            >
                                {products.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("inactive")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                statusFilter === "inactive"
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Inactivos</span>
                            <span
                                className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                    statusFilter === "inactive"
                                        ? "bg-white/20 text-white"
                                        : "bg-[var(--surface)] text-[var(--text-secondary)]"
                                }`}
                            >
                                {inactiveCount}
                            </span>
                        </button>
                    </div>

                    {/* ACTIVE FILTER TAGS & RESET BUTTON */}
                    <div className="flex flex-wrap items-center gap-2">
                        {activeFiltersList.map((f) => (
                            <span
                                key={f.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/80 px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                            >
                                <span>{f.label}</span>
                                <button
                                    type="button"
                                    onClick={f.onClear}
                                    className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition"
                                    title="Quitar este filtro"
                                >
                                    <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 18 18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </span>
                        ))}

                        {activeFiltersList.length > 0 && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/20 shadow-xs"
                            >
                                <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                    />
                                </svg>
                                <span>Restablecer filtros</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PRODUCT LIST / DENSE TABLE */}
            {sortedProducts.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 text-center shadow-xs">
                    <div className="mx-auto max-w-md space-y-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-accent)] text-[var(--text-secondary)]">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                            </svg>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                {activeFiltersList.length > 0
                                    ? "No se encontraron productos"
                                    : "Catálogo vacío"}
                            </h3>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                {activeFiltersList.length > 0
                                    ? "Probá ajustando la búsqueda o los filtros seleccionados."
                                    : "Podés cargar automáticamente el catálogo base de almacén con más de 80 productos y categorías comunes, o crearlos uno por uno."}
                            </p>
                        </div>

                        {activeFiltersList.length === 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => requireOwnerAccess(() => setIsImportModalOpen(true))}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                                >
                                    <span>Cargar catálogo base (Multi-Rubro)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleOpenCreate}
                                    className="w-full sm:w-auto rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                                >
                                    + Crear producto manual
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            {/* TABLE HEADER (STRICT FIXED HEIGHT h-12 TO PREVENT EXPANDING/JITTER) */}
                            <thead>
                                {selectedIds.length > 0 ? (
                                    <tr className="h-12 border-b border-[var(--primary)]/30 bg-[var(--primary)]/10 text-xs">
                                        <th className="h-12 pl-4 pr-3 w-12 align-middle">
                                            <CustomCheckbox
                                                checked={isAllVisibleSelected}
                                                indeterminate={isSomeVisibleSelected}
                                                onChange={handleToggleSelectAllVisible}
                                                ariaLabel="Deseleccionar o seleccionar todos los visibles"
                                            />
                                        </th>
                                        <th colSpan={3} className="h-12 px-3 align-middle">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className="font-bold text-[var(--primary)]">
                                                    {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
                                                </span>

                                                {selectedIds.length < sortedProducts.length && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllFiltered}
                                                        className="text-xs font-semibold text-[var(--primary)] underline hover:opacity-80"
                                                    >
                                                        (Seleccionar los {sortedProducts.length} filtrados)
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                        <th colSpan={3} className="h-12 pr-4 pl-3 text-right align-middle">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsBulkPriceModalOpen(true)}
                                                    className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                                                    </svg>
                                                    <span>Aumentar Precios ({selectedIds.length})</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setIsBulkDeleteOpen(true)}
                                                    className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-[var(--danger)]/15 px-3 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/25"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                    <span>Eliminar</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleClearSelection}
                                                    className="h-7.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                                >
                                                    Desmarcar
                                                </button>
                                            </div>
                                        </th>
                                    </tr>
                                ) : (
                                    <tr className="h-12 border-b border-[var(--border)] bg-[var(--surface-accent)]/40 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                        <th className="h-12 pl-4 pr-3 w-12 align-middle">
                                            <CustomCheckbox
                                                checked={isAllVisibleSelected}
                                                indeterminate={isSomeVisibleSelected}
                                                onChange={handleToggleSelectAllVisible}
                                                ariaLabel="Seleccionar todos los productos de la página"
                                            />
                                        </th>
                                        <th className="h-12 px-4 min-w-[200px] align-middle">Producto</th>
                                        <th className="h-12 px-4 hidden md:table-cell min-w-[120px] align-middle">Código</th>
                                        <th className="h-12 px-4 hidden sm:table-cell min-w-[130px] align-middle">Proveedor</th>
                                        <th className="h-12 px-4 text-right hidden sm:table-cell min-w-[120px] align-middle">Costo</th>
                                        <th className="h-12 px-4 text-right min-w-[120px] align-middle">Precio Venta</th>
                                        <th className="h-12 pr-4 pl-4 text-right w-24 align-middle">Acciones</th>
                                    </tr>
                                )}
                            </thead>

                            {/* TABLE BODY */}
                            <tbody className="divide-y divide-[var(--border)] font-medium">
                                {paginatedProducts.map((p) => {
                                    const isSelected = selectedIds.includes(p.id);
                                    const hasCost =
                                        p.cost_price && Number(p.cost_price) > 0;

                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={(e) => {
                                                if (
                                                    e.target.tagName !== "BUTTON" &&
                                                    e.target.tagName !== "INPUT" &&
                                                    e.target.tagName !== "SPAN" &&
                                                    e.target.tagName !== "svg"
                                                ) {
                                                    handleOpenEdit(p);
                                                }
                                            }}
                                            className={`transition-colors cursor-pointer ${
                                                isSelected
                                                    ? "bg-[var(--primary)]/10 ring-1 ring-inset ring-[var(--primary)]/20"
                                                    : "hover:bg-[var(--surface-accent)]"
                                            }`}
                                        >
                                            {/* CHECKBOX */}
                                            <td className="py-3.5 pl-4 pr-3 align-middle">
                                                <CustomCheckbox
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(p.id)}
                                                    ariaLabel={`Seleccionar ${p.name}`}
                                                />
                                            </td>

                                            {/* PRODUCT NAME & BADGES */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                                        {p.name}
                                                    </span>
                                                    {p.category_name && (
                                                        <span className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/80 px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                                                            {p.category_name}
                                                        </span>
                                                    )}
                                                    {p.unit_type === "kg" && (
                                                        <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                            Por Kilo
                                                        </span>
                                                    )}
                                                    {p.unit_type === "100g" && (
                                                        <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                                            Por 100g
                                                        </span>
                                                    )}
                                                    {!p.is_active && (
                                                        <span className="rounded-md bg-[var(--danger)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--danger)]">
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Mobile subtitle for small screens */}
                                                <div className="sm:hidden flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-1">
                                                    {p.provider_name && <span>{p.provider_name}</span>}
                                                    {p.barcode && <span className="font-mono">{p.barcode}</span>}
                                                </div>
                                            </td>

                                            {/* BARCODE */}
                                            <td className="py-3.5 px-4 hidden md:table-cell text-[var(--text-secondary)] font-mono text-xs align-middle">
                                                {p.barcode || "—"}
                                            </td>

                                            {/* PROVIDER */}
                                            <td className="py-3.5 px-4 hidden sm:table-cell text-[var(--text-secondary)] align-middle">
                                                {p.provider_name ? (
                                                    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/50 px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]">
                                                        {p.provider_name}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            {/* COST PRICE & MARKUP */}
                                            <td className="py-3.5 px-4 text-right hidden sm:table-cell tabular-nums align-middle">
                                                {hasCost ? (
                                                    <div>
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            {formatCurrency(p.cost_price)}
                                                            {p.unit_type === "kg" && " / kg"}
                                                            {p.unit_type === "100g" && " / 100g"}
                                                        </span>
                                                        {p.markup_percentage !== null && (
                                                            <span className="ml-1.5 text-[11px] font-bold text-[var(--success-text)]">
                                                                (+{p.markup_percentage}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-secondary)]/40">—</span>
                                                )}
                                            </td>

                                            {/* SALE PRICE */}
                                            <td className="py-3.5 px-4 text-right tabular-nums align-middle">
                                                <span className="text-sm sm:text-base font-bold text-[var(--success)]">
                                                    {formatCurrency(p.sale_price)}
                                                </span>
                                                {p.unit_type === "kg" && (
                                                    <span className="text-xs font-semibold text-[var(--text-secondary)] ml-1">
                                                        / kg
                                                    </span>
                                                )}
                                                {p.unit_type === "100g" && (
                                                    <span className="text-xs font-semibold text-[var(--text-secondary)] ml-1">
                                                        / 100g
                                                    </span>
                                                )}
                                            </td>

                                            {/* ACTIONS */}
                                            <td
                                                className="py-3.5 pr-4 pl-4 text-right align-middle"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(p)}
                                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-accent)]"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductToDelete(p)}
                                                        className="rounded-lg p-1.5 text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
                                                        title="Eliminar producto"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth="2"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION & FOOTER BAR */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--surface-accent)]/20 px-5 py-3.5 text-xs">
                        {/* COUNT INFO */}
                        <div className="text-[var(--text-secondary)]">
                            Mostrando <strong className="text-[var(--text-primary)]">{startItem}</strong> -{" "}
                            <strong className="text-[var(--text-primary)]">{endItem}</strong> de{" "}
                            <strong className="text-[var(--text-primary)]">{sortedProducts.length}</strong> productos
                            {sortedProducts.length !== products.length && (
                                <span className="ml-1 text-[var(--text-secondary)]/70">
                                    (filtrados de {products.length})
                                </span>
                            )}
                        </div>

                        {/* CONTROLS */}
                        <div className="flex items-center gap-4">
                            {/* PAGE SIZE */}
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--text-secondary)] font-medium">Filas por pág:</span>
                                <div className="relative">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="h-8.5 appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-7 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={-1}>Todas</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* PAGE BUTTONS */}
                            {pageSize !== -1 && totalPages > 1 && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-accent)] disabled:opacity-30"
                                    >
                                        Ant
                                    </button>

                                    <span className="px-2 font-semibold text-[var(--text-primary)]">
                                        {currentPage} / {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-accent)] disabled:opacity-30"
                                    >
                                        Sig
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING SELECTION ACTION BAR (FOR SCROLLING CONVENIENCE) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                        {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
                    </span>

                    <div className="h-4 w-px bg-[var(--border)]" />

                    <button
                        type="button"
                        onClick={() => setIsBulkPriceModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                    >
                        <span>Aumentar Precios</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsBulkDeleteOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--danger)]/15 px-3 py-2 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger)]/25"
                    >
                        <span>Eliminar</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleClearSelection}
                        className="rounded-lg p-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        title="Desmarcar todos"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* BULK PRICE MODAL */}
            <BulkPriceModal
                isOpen={isBulkPriceModalOpen}
                onClose={() => setIsBulkPriceModalOpen(false)}
                allProducts={products}
                selectedIds={selectedIds}
                categories={categories}
                providers={providers}
                onSuccess={handleBulkPricesUpdated}
            />

            {/* PRODUCT MODAL */}
            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={editingProduct}
                categories={categories}
                providers={providers}
                onSuccess={handleProductSaved}
                onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                onOpenProviderModal={() => setIsProviderModalOpen(true)}
            />

            {/* CATEGORY MODAL */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                categories={categories}
                onCategoriesChange={setCategories}
            />

            {/* PROVIDER MODAL */}
            <ProviderModal
                isOpen={isProviderModalOpen}
                onClose={() => setIsProviderModalOpen(false)}
                providers={providers}
                onProvidersChange={setProviders}
            />

            {/* BULK DELETE CONFIRMATION DIALOG */}
            {isBulkDeleteOpen && (
                <ConfirmDialog
                    title="Eliminar productos seleccionados"
                    message={`¿Estás seguro de que querés eliminar ${selectedIds.length} producto${
                        selectedIds.length === 1 ? "" : "s"
                    }? Esta acción no se puede deshacer.`}
                    confirmLabel={
                        isBulkDeleting
                            ? "Eliminando..."
                            : `Eliminar ${selectedIds.length} productos`
                    }
                    cancelLabel="Cancelar"
                    onConfirm={handleBulkDelete}
                    onCancel={() => setIsBulkDeleteOpen(false)}
                    isLoading={isBulkDeleting}
                />
            )}

            {/* SINGLE DELETE CONFIRMATION DIALOG */}
            {productToDelete && (
                <ConfirmDialog
                    title="Eliminar producto"
                    message={`¿Estás seguro de que querés eliminar "${productToDelete.name}"? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar producto"
                    cancelLabel="Cancelar"
                    onConfirm={handleDeleteProduct}
                    onCancel={() => setProductToDelete(null)}
                    isLoading={isDeleting}
                />
            )}

            {/* MULTI-RUBRO STARTER CATALOG MODAL */}
            <ImportCatalogModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
}

export default ProductList;
