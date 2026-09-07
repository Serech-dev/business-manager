import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { bulkAssignProductProvider } from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatStockQty, formatUnitType } from "../../utils/formatStock";
import { filterAndRankProducts } from "../../utils/productSearch";

// High-contrast custom checkbox
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

function AssignProductsToProviderModal({
    isOpen,
    onClose,
    provider,
    allProducts = [],
    categories = [],
    onSuccess,
}) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [providerFilter, setProviderFilter] = useState("all"); // "all" | "unassigned" | "other" | "current"
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync selected products when modal opens or provider changes
    useEffect(() => {
        if (isOpen && provider?.id) {
            const currentAssigned = allProducts
                .filter(
                    (p) =>
                        Number(p.provider) === Number(provider.id) ||
                        Number(p.provider?.id) === Number(provider.id)
                )
                .map((p) => p.id);
            setSelectedIds(currentAssigned);
            setSearch("");
            setSelectedCategory("");
            setProviderFilter("all");
        }
    }, [isOpen, provider?.id, allProducts]);

    // Filter products based on search, category and provider assignment
    const filteredProducts = useMemo(() => {
        let list = filterAndRankProducts(allProducts, search, {
            categoryId: selectedCategory,
            statusFilter: "active",
        });

        if (providerFilter === "unassigned") {
            list = list.filter((p) => !p.provider && !p.provider_id);
        } else if (providerFilter === "current") {
            list = list.filter(
                (p) =>
                    Number(p.provider) === Number(provider?.id) ||
                    Number(p.provider?.id) === Number(provider?.id)
            );
        } else if (providerFilter === "other") {
            list = list.filter(
                (p) =>
                    (p.provider || p.provider_id) &&
                    Number(p.provider) !== Number(provider?.id) &&
                    Number(p.provider?.id) !== Number(provider?.id)
            );
        }

        return list;
    }, [allProducts, search, selectedCategory, providerFilter, provider?.id]);

    const isAllVisibleSelected = useMemo(() => {
        if (filteredProducts.length === 0) return false;
        return filteredProducts.every((p) => selectedIds.includes(p.id));
    }, [filteredProducts, selectedIds]);

    const isSomeVisibleSelected = useMemo(() => {
        if (filteredProducts.length === 0) return false;
        return (
            filteredProducts.some((p) => selectedIds.includes(p.id)) &&
            !isAllVisibleSelected
        );
    }, [filteredProducts, selectedIds, isAllVisibleSelected]);

    function handleToggleSelectAll() {
        if (isAllVisibleSelected) {
            const visibleSet = new Set(filteredProducts.map((p) => p.id));
            setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
        } else {
            const visibleIds = filteredProducts.map((p) => p.id);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    }

    function handleToggleProduct(id) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    if (!isOpen || !provider) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Find products previously assigned that were unchecked
            const previouslyAssigned = allProducts
                .filter((p) => Number(p.provider) === Number(provider.id) || Number(p.provider?.id) === Number(provider.id))
                .map((p) => p.id);
            
            const newlyAssigned = selectedIds.filter((id) => !previouslyAssigned.includes(id));
            const newlyUnassigned = previouslyAssigned.filter((id) => !selectedIds.includes(id));

            const promises = [];
            if (newlyAssigned.length > 0) {
                promises.push(bulkAssignProductProvider(newlyAssigned, provider.id));
            }
            if (newlyUnassigned.length > 0) {
                promises.push(bulkAssignProductProvider(newlyUnassigned, null));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                toast.success(`Se actualizaron los productos de ${provider.name}.`);
                onSuccess?.();
            } else {
                toast("No hubo cambios en los productos vinculados.");
            }
            onClose();
        } catch (error) {
            console.error("Error updating provider products:", error);
            toast.error("Error al actualizar productos del proveedor.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 5.625a1.875 1.875 0 1 1 3.75 0 1.875 1.875 0 0 1-3.75 0Zm1.125 7.5a1.875 1.875 0 1 1 3.75 0 1.875 1.875 0 0 1-3.75 0Zm-3.75 7.5a1.875 1.875 0 1 1 3.75 0 1.875 1.875 0 0 1-3.75 0Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                Vincular Productos a {provider.name}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Marcá los productos suministrados por este proveedor
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filters Bar */}
                <div className="border-b border-[var(--border)] bg-[var(--surface-accent)]/30 px-6 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search input */}
                        <div className="relative min-w-[220px] flex-1">
                            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Category filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        {/* Provider Filter Segment */}
                        <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setProviderFilter("all")}
                                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                                    providerFilter === "all"
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                type="button"
                                onClick={() => setProviderFilter("unassigned")}
                                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                                    providerFilter === "unassigned"
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Sin Proveedor
                            </button>
                            <button
                                type="button"
                                onClick={() => setProviderFilter("current")}
                                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                                    providerFilter === "current"
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                De este Proveedor
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Header & Selection Status */}
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/10 px-6 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <div className="flex items-center gap-3">
                        <CustomCheckbox
                            checked={isAllVisibleSelected}
                            indeterminate={isSomeVisibleSelected}
                            onChange={handleToggleSelectAll}
                            ariaLabel="Seleccionar todos los visibles"
                        />
                        <span>
                            {filteredProducts.length} producto{filteredProducts.length === 1 ? "" : "s"} visible{filteredProducts.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[var(--primary)]">
                            {selectedIds.length} vinculados en total
                        </span>
                    </div>
                </div>

                {/* Product List Table (Scrollable) */}
                <div className="flex-1 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
                            No se encontraron productos con los filtros actuales.
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {filteredProducts.map((product) => {
                                const isChecked = selectedIds.includes(product.id);
                                const isCurrentProvider =
                                    Number(product.provider) === Number(provider.id) ||
                                    Number(product.provider?.id) === Number(provider.id);

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => handleToggleProduct(product.id)}
                                        className={`flex cursor-pointer items-center justify-between gap-4 px-6 py-3 transition hover:bg-[var(--surface-accent)]/50 ${
                                            isChecked ? "bg-[var(--primary)]/5" : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <CustomCheckbox
                                                checked={isChecked}
                                                onChange={() => handleToggleProduct(product.id)}
                                                ariaLabel={`Seleccionar ${product.name}`}
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                                                        {product.name}
                                                    </p>
                                                    {product.barcode && (
                                                        <span className="hidden rounded bg-[var(--surface-accent)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] sm:inline">
                                                            {product.barcode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                                    <span>{product.category_name || "Sin categoría"}</span>
                                                    {product.provider_name ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className={isCurrentProvider ? "text-[var(--primary)] font-semibold" : ""}>
                                                                {product.provider_name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>•</span>
                                                            <span className="italic">Sin proveedor</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 shrink-0 text-right text-xs">
                                            <div>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Costo</p>
                                                <p className="font-semibold text-[var(--text-primary)]">
                                                    {product.cost_price ? formatCurrency(product.cost_price) : "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Precio Venta</p>
                                                <p className="font-bold text-[var(--text-primary)]">
                                                    {formatCurrency(product.sale_price)}
                                                </p>
                                            </div>
                                            <div className="min-w-[70px]">
                                                <p className="text-[10px] text-[var(--text-secondary)]">Stock</p>
                                                <p className="font-medium text-[var(--text-primary)]">
                                                    {formatStockQty(product.stock_quantity || 0, product.unit_type)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
                    <span className="text-xs text-[var(--text-secondary)]">
                        {selectedIds.length} producto{selectedIds.length === 1 ? "" : "s"} asignado{selectedIds.length === 1 ? "" : "s"} a {provider.name}
                    </span>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                "Guardar Vinculación"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssignProductsToProviderModal;
