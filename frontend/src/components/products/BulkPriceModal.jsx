import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { bulkUpdateProductPrices } from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";

function calculatePreviewPrice(val, adjType, adjVal, rounding) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    const num = Number(val);
    const adj = Number(adjVal) || 0;
    let newPrice = 0;
    if (adjType === "percentage") {
        newPrice = num * (1 + adj / 100);
    } else {
        newPrice = num + adj;
    }
    if (newPrice < 0) newPrice = 0;

    if (rounding === "10") {
        newPrice = Math.round(newPrice / 10) * 10;
    } else if (rounding === "50") {
        newPrice = Math.round(newPrice / 50) * 50;
    } else if (rounding === "100") {
        newPrice = Math.round(newPrice / 100) * 100;
    } else {
        newPrice = Math.round(newPrice * 100) / 100;
    }
    return newPrice;
}

function BulkPriceModal({
    isOpen,
    onClose,
    allProducts = [],
    selectedIds = [],
    categories = [],
    providers = [],
    onSuccess,
}) {
    const [scope, setScope] = useState(
        selectedIds.length > 0 ? "selected" : "provider"
    );
    const [selectedProviderId, setSelectedProviderId] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [adjustmentType, setAdjustmentType] = useState("percentage"); // 'percentage' | 'fixed'
    const [adjustmentValue, setAdjustmentValue] = useState("10");
    const [targetField, setTargetField] = useState("sale"); // 'sale' | 'cost' | 'both'
    const [rounding, setRounding] = useState("50"); // 'none' | '10' | '50' | '100'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync default scope when modal opens or selectedIds change
    useEffect(() => {
        if (isOpen) {
            if (selectedIds.length > 0) {
                setScope("selected");
            } else if (providers.length > 0) {
                setScope("provider");
                setSelectedProviderId(String(providers[0].id));
            } else if (categories.length > 0) {
                setScope("category");
                setSelectedCategoryId(String(categories[0].id));
            } else {
                setScope("all");
            }
        }
    }, [isOpen, selectedIds.length]);

    // Determine affected products based on current scope selection
    const affectedProducts = useMemo(() => {
        if (scope === "selected") {
            const idSet = new Set(selectedIds);
            return allProducts.filter((p) => idSet.has(p.id));
        }
        if (scope === "provider") {
            if (!selectedProviderId) return [];
            return allProducts.filter(
                (p) => String(p.provider) === String(selectedProviderId)
            );
        }
        if (scope === "category") {
            if (!selectedCategoryId) return [];
            return allProducts.filter(
                (p) => String(p.category) === String(selectedCategoryId)
            );
        }
        if (scope === "all") {
            return allProducts;
        }
        return [];
    }, [scope, selectedIds, selectedProviderId, selectedCategoryId, allProducts]);

    // Sample preview items (up to 5)
    const previewSamples = useMemo(() => {
        return affectedProducts.slice(0, 5);
    }, [affectedProducts]);

    if (!isOpen) return null;

    const quickPercentages = [5, 10, 15, 20, 25, 30];

    async function handleSubmit(e) {
        e.preventDefault();

        const numVal = Number(adjustmentValue);
        if (isNaN(numVal) || numVal === 0) {
            toast.error("Ingresá un valor de ajuste válido.");
            return;
        }

        if (affectedProducts.length === 0) {
            toast.error("No hay productos afectados por esta selección.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                scope,
                adjustment_type: adjustmentType,
                adjustment_value: numVal,
                target_field: targetField,
                rounding,
            };

            if (scope === "selected") {
                payload.selected_ids = selectedIds;
            } else if (scope === "provider") {
                payload.provider_id = Number(selectedProviderId);
            } else if (scope === "category") {
                payload.category_id = Number(selectedCategoryId);
            }

            const res = await bulkUpdateProductPrices(payload);
            toast.success(
                res.message ||
                    `Se actualizaron los precios de ${res.updated_count} productos.`
            );
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error bulk updating prices:", error);
            const msg =
                error.response?.data?.error ||
                "No se pudieron actualizar los precios masivamente.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            />

            <div
                className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
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
                                        d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                Aumento Masivo de Precios
                            </h2>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Actualizá precios en lote por proveedor, categoría o selección manual.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
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
                                d="M6 18 18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* SCOPE SELECTOR */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            1. Alcance del aumento
                        </label>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {selectedIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setScope("selected")}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                        scope === "selected"
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    <span>Seleccionados</span>
                                    <span className="text-[10px] font-bold opacity-80">
                                        ({selectedIds.length})
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setScope("provider")}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    scope === "provider"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Por Proveedor</span>
                                <span className="text-[10px] font-normal opacity-70">
                                    Distribuidor
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScope("category")}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    scope === "category"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Por Categoría</span>
                                <span className="text-[10px] font-normal opacity-70">
                                    Rubro
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScope("all")}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    scope === "all"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Todo el catálogo</span>
                                <span className="text-[10px] font-bold opacity-80">
                                    ({allProducts.length})
                                </span>
                            </button>
                        </div>

                        {/* SUB-SELECTOR: PROVIDER */}
                        {scope === "provider" && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3 space-y-1.5">
                                <label className="text-xs font-semibold text-[var(--text-primary)]">
                                    Seleccioná el proveedor:
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedProviderId}
                                        onChange={(e) => setSelectedProviderId(e.target.value)}
                                        className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    >
                                        <option value="">-- Seleccionar proveedor --</option>
                                        {providers.map((pr) => {
                                            const count = allProducts.filter(
                                                (p) => String(p.provider) === String(pr.id)
                                            ).length;
                                            return (
                                                <option key={pr.id} value={pr.id}>
                                                    {pr.name} ({count} productos)
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
                            </div>
                        )}

                        {/* SUB-SELECTOR: CATEGORY */}
                        {scope === "category" && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3 space-y-1.5">
                                <label className="text-xs font-semibold text-[var(--text-primary)]">
                                    Seleccioná la categoría:
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    >
                                        <option value="">-- Seleccionar categoría --</option>
                                        {categories.map((c) => {
                                            const count = allProducts.filter(
                                                (p) => String(p.category) === String(c.id)
                                            ).length;
                                            return (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({count} productos)
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
                            </div>
                        )}
                    </div>

                    {/* ADJUSTMENT TYPE & VALUE */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            2. Ajuste a aplicar
                        </label>

                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            {/* Percentage vs Fixed Toggle */}
                            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType("percentage")}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                        adjustmentType === "percentage"
                                            ? "bg-[var(--primary)] text-white shadow-xs"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    Porcentaje (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentType("fixed")}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                        adjustmentType === "fixed"
                                            ? "bg-[var(--primary)] text-white shadow-xs"
                                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    Monto Fijo ($)
                                </button>
                            </div>

                            {/* Value input */}
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                    {adjustmentType === "percentage" ? "%" : "$"}
                                </span>
                                <input
                                    type="number"
                                    step={adjustmentType === "percentage" ? "1" : "50"}
                                    value={adjustmentValue}
                                    onChange={(e) => setAdjustmentValue(e.target.value)}
                                    placeholder={adjustmentType === "percentage" ? "10" : "500"}
                                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2 pl-8 pr-4 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Quick Percentage Chips */}
                        {adjustmentType === "percentage" && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] font-medium text-[var(--text-secondary)] mr-1">
                                    Valores frecuentes:
                                </span>
                                {quickPercentages.map((pct) => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => setAdjustmentValue(String(pct))}
                                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                                            adjustmentValue === String(pct)
                                                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        +{pct}%
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TARGET FIELD & ROUNDING */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Target Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                3. Precio a modificar
                            </label>
                            <div className="relative">
                                <select
                                    value={targetField}
                                    onChange={(e) => setTargetField(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    <option value="sale">Precio de Venta</option>
                                    <option value="cost">Precio de Costo</option>
                                    <option value="both">Ambos (Costo y Venta)</option>
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Rounding Rule */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                4. Redondeo
                            </label>
                            <div className="relative">
                                <select
                                    value={rounding}
                                    onChange={(e) => setRounding(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    <option value="50">Al $50 más cercano</option>
                                    <option value="100">Al $100 más cercano</option>
                                    <option value="10">Al $10 más cercano</option>
                                    <option value="none">Sin redondeo (con centavos)</option>
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LIVE PREVIEW SECTION */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                                Vista previa ({affectedProducts.length} producto{affectedProducts.length === 1 ? "" : "s"} a modificar)
                            </span>
                            {affectedProducts.length > 0 && (
                                <span className="rounded-md bg-[var(--success)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--success-text)]">
                                    {adjustmentType === "percentage"
                                        ? `${Number(adjustmentValue) >= 0 ? "+" : ""}${adjustmentValue}%`
                                        : `${Number(adjustmentValue) >= 0 ? "+$" : "-$"}${Math.abs(Number(adjustmentValue))}`}
                                </span>
                            )}
                        </div>

                        {affectedProducts.length === 0 ? (
                            <p className="text-xs text-[var(--text-secondary)] italic">
                                Seleccioná un proveedor o categoría para previsualizar los cambios.
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
                                {previewSamples.map((p) => {
                                    const currentPrice =
                                        targetField === "cost" ? p.cost_price : p.sale_price;
                                    const newPrice = calculatePreviewPrice(
                                        currentPrice,
                                        adjustmentType,
                                        adjustmentValue,
                                        rounding
                                    );
                                    const diff = newPrice - Number(currentPrice || 0);

                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between px-3 py-1.5 text-xs"
                                        >
                                            <div className="truncate pr-2 max-w-[200px] sm:max-w-[260px] flex items-center gap-1.5">
                                                <span className="font-semibold text-[var(--text-primary)] truncate">
                                                    {p.name}
                                                </span>
                                                {p.unit_type === "kg" && (
                                                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        kg
                                                    </span>
                                                )}
                                                {p.unit_type === "100g" && (
                                                    <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                                        100g
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 tabular-nums">
                                                <span className="text-[var(--text-secondary)] line-through text-[11px]">
                                                    {formatCurrency(currentPrice)}
                                                    {p.unit_type === "kg" && " / kg"}
                                                    {p.unit_type === "100g" && " / 100g"}
                                                </span>
                                                <span className="font-bold text-[var(--success)]">
                                                    {formatCurrency(newPrice)}
                                                    {p.unit_type === "kg" && " / kg"}
                                                    {p.unit_type === "100g" && " / 100g"}
                                                </span>
                                                <span className="text-[10px] font-semibold text-[var(--success-text)]">
                                                    ({diff >= 0 ? "+" : ""}{formatCurrency(diff)})
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {affectedProducts.length > 5 && (
                                    <div className="bg-[var(--surface-accent)]/40 px-3 py-1 text-[11px] text-[var(--text-secondary)] text-center">
                                        ... y {affectedProducts.length - 5} productos más
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || affectedProducts.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Aplicando..."
                                : `Aplicar a ${affectedProducts.length} producto${
                                      affectedProducts.length === 1 ? "" : "s"
                                  }`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BulkPriceModal;
