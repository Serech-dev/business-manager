import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { formatCurrency } from "../../utils/formatCurrency";
import { createProduct, updateProduct } from "../../services/business";

function ProductModal({
    isOpen,
    onClose,
    product,
    categories = [],
    providers = [],
    onSuccess,
    onOpenCategoryModal,
    onOpenProviderModal,
}) {
    const isEditing = Boolean(product && product.id);

    const [name, setName] = useState("");
    const [unitType, setUnitType] = useState("unit"); // 'unit' | 'kg' | '100g'
    const [salePrice, setSalePrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [providerId, setProviderId] = useState("");
    const [barcode, setBarcode] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (product && isEditing) {
            setName(product.name || "");
            setUnitType(product.unit_type || "unit");
            setSalePrice(product.sale_price ? String(product.sale_price) : "");
            setCostPrice(product.cost_price && Number(product.cost_price) > 0 ? String(product.cost_price) : "");
            setCategoryId(product.category ? String(product.category) : "");
            setProviderId(product.provider ? String(product.provider) : "");
            setBarcode(product.barcode || "");
            setStock(product.stock !== null && product.stock !== undefined ? String(product.stock) : "");
            setMinStock(product.min_stock !== null && product.min_stock !== undefined ? String(product.min_stock) : "");
            setIsActive(product.is_active ?? true);
            if (product.barcode || (product.stock && Number(product.stock) > 0)) {
                setShowAdvanced(true);
            }
        } else {
            setName("");
            setUnitType("unit");
            setSalePrice("");
            setCostPrice("");
            setCategoryId("");
            setProviderId("");
            setBarcode("");
            setStock("");
            setMinStock("1");
            setIsActive(true);
            setShowAdvanced(false);
        }
    }, [product, isEditing, isOpen]);

    // Auto-select newly created category or provider when added via quick modal
    const prevCategoriesRef = useRef(categories);
    const prevProvidersRef = useRef(providers);

    useEffect(() => {
        if (isOpen && categories.length > prevCategoriesRef.current.length) {
            const prevIds = new Set(prevCategoriesRef.current.map((c) => c.id));
            const newlyAdded = categories.find((c) => !prevIds.has(c.id));
            if (newlyAdded) {
                setCategoryId(String(newlyAdded.id));
            }
        }
        prevCategoriesRef.current = categories;
    }, [categories, isOpen]);

    useEffect(() => {
        if (isOpen && providers.length > prevProvidersRef.current.length) {
            const prevIds = new Set(prevProvidersRef.current.map((p) => p.id));
            const newlyAdded = providers.find((p) => !prevIds.has(p.id));
            if (newlyAdded) {
                setProviderId(String(newlyAdded.id));
            }
        }
        prevProvidersRef.current = providers;
    }, [providers, isOpen]);

    if (!isOpen) return null;

    // Calculate live margin
    const numCost = Number(costPrice) || 0;
    const numSale = Number(salePrice) || 0;
    const profit = numSale - numCost;
    const markupPct = numCost > 0 ? Math.round(((numSale - numCost) / numCost) * 100) : null;

    async function handleSubmit(e) {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("El nombre del producto es obligatorio.");
            return;
        }

        if (!salePrice || Number(salePrice) <= 0) {
            toast.error("Ingresá un precio de venta válido.");
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                name: name.trim(),
                unit_type: unitType,
                sale_price: Number(salePrice),
                cost_price: costPrice ? Number(costPrice) : 0,
                category: categoryId ? Number(categoryId) : null,
                provider: providerId ? Number(providerId) : null,
                barcode: barcode.trim() || null,
                stock: stock !== "" ? Number(stock) : null,
                min_stock: minStock !== "" ? Number(minStock) : 1,
                is_active: isActive,
            };

            const saved = isEditing
                ? await updateProduct(product.id, data)
                : await createProduct(data);

            toast.success(isEditing ? "Producto actualizado." : "Producto creado.");
            onSuccess(saved);
            onClose();
        } catch (error) {
            console.error(error);
            const msg =
                error.response?.data?.name?.[0] ||
                error.response?.data?.barcode?.[0] ||
                "No se pudo guardar el producto.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    }

    const unitLabelSuffix =
        unitType === "kg" ? "($/kg)" : unitType === "100g" ? "($/100g)" : "";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            />

            <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)] shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {isEditing ? "Editar Producto" : "Nuevo Producto"}
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {isEditing ? "Modificá precios y detalles" : "Cargá un producto a tu catálogo"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        ✕
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5">
                    {/* NAME */}
                    <div>
                        <div className="flex h-5 items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Nombre del producto <span className="text-[var(--danger)]">*</span>
                            </label>
                        </div>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Milanesas de Pollo, Coca Cola 500ml, Pan Francés..."
                            maxLength={150}
                            className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none placeholder:font-normal placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                    </div>

                    {/* UNIT TYPE SELECTOR */}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Tipo de venta / Unidad
                        </label>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setUnitType("unit")}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    unitType === "unit"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Por Unidad</span>
                                <span className="text-[10px] font-normal opacity-70">x unidad (u.)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setUnitType("kg")}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    unitType === "kg"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Por Kilo</span>
                                <span className="text-[10px] font-normal opacity-70">$/kg (al peso)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setUnitType("100g")}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center text-xs font-semibold transition ${
                                    unitType === "100g"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <span>Por 100g</span>
                                <span className="text-[10px] font-normal opacity-70">$/100g (fracción)</span>
                            </button>
                        </div>
                    </div>

                    {/* PRICES GRID */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {/* SALE PRICE */}
                        <div>
                            <div className="flex h-5 items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Precio de Venta {unitLabelSuffix} <span className="text-[var(--danger)]">*</span>
                                </label>
                            </div>
                            <div className="relative mt-1.5">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    required
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    placeholder="0"
                                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--success)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                            </div>
                        </div>

                        {/* COST PRICE */}
                        <div>
                            <div className="flex h-5 items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Precio Costo {unitLabelSuffix} <span className="text-[10px] text-[var(--text-secondary)]/70">(Opcional)</span>
                                </label>
                            </div>
                            <div className="relative mt-1.5">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    placeholder="0"
                                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LIVE MARGIN BADGE */}
                    {numCost > 0 && numSale > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/60 px-3.5 py-2 text-xs">
                            <span className="text-[var(--text-secondary)]">
                                Ganancia estimada: <strong className="text-[var(--text-primary)]">{formatCurrency(profit)}</strong>
                            </span>
                            <span className={`font-bold ${markupPct >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                Margen: {markupPct >= 0 ? `+${markupPct}%` : `${markupPct}%`}
                            </span>
                        </div>
                    )}

                    {/* CATEGORY & PROVIDER */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {/* CATEGORY */}
                        <div>
                            <div className="flex h-5 items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Categoría
                                </label>
                                {onOpenCategoryModal && (
                                    <button
                                        type="button"
                                        onClick={onOpenCategoryModal}
                                        className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                                    >
                                        + Gestionar
                                    </button>
                                )}
                            </div>
                            <div className="relative mt-1.5">
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    <option value="">Sin categoría</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* PROVIDER */}
                        <div>
                            <div className="flex h-5 items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Proveedor Habitual
                                </label>
                                {onOpenProviderModal && (
                                    <button
                                        type="button"
                                        onClick={onOpenProviderModal}
                                        className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                                    >
                                        + Gestionar
                                    </button>
                                )}
                            </div>
                            <div className="relative mt-1.5">
                                <select
                                    value={providerId}
                                    onChange={(e) => setProviderId(e.target.value)}
                                    className="h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 pr-9 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    <option value="">Sin proveedor asignado</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLLAPSIBLE ADVANCED FIELDS (BARCODE & STOCK) */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/40 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        >
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                </svg>
                                <span>Código de barra y stock (opcional)</span>
                            </div>
                            <svg className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {showAdvanced && (
                            <div className="mt-2.5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/20 p-3.5">
                                {/* BARCODE */}
                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Código de Barras / SKU
                                    </label>
                                    <input
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Escaneá o escribí el código..."
                                        className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    />
                                </div>

                                {/* STOCK & MIN STOCK */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Stock inicial {unitType === "kg" ? "(kg)" : "(u.)"}
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={stock}
                                            onChange={(e) => setStock(e.target.value)}
                                            placeholder="0"
                                            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Alerta mínimo {unitType === "kg" ? "(kg)" : "(u.)"}
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={minStock}
                                            onChange={(e) => setMinStock(e.target.value)}
                                            placeholder="1"
                                            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                        {/* CUSTOM ACTIVE TOGGLE SWITCH */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => setIsActive(!isActive)}
                            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/50 px-3.5 py-2.5 text-left transition hover:bg-[var(--surface-accent)]"
                        >
                            <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                    Producto Activo
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    {isActive ? "Disponible para seleccionar y vender" : "Oculto en las listas de venta"}
                                </p>
                            </div>

                            <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                                isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            }`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                                    isActive ? "translate-x-5.5" : "translate-x-0.5"
                                }`} />
                            </div>
                        </button>
                    </div>

                    {/* ACTIONS STICKY FOOTER */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductModal;

