import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { formatCurrency } from "../../utils/formatCurrency";
import { createBatchStockRestock } from "../../services/business";
import { formatStockQty, formatUnitType } from "../../utils/formatStock";
import { useDeviceSecurity } from "../../context/DeviceSecurityContext";

function RestockModal({
    isOpen,
    onClose,
    products = [],
    providers = [],
    initialProduct = null,
    onSuccess,
}) {
    const { isKioskDevice, isUnlocked } = useDeviceSecurity();
    const isOwner = !isKioskDevice || isUnlocked;

    const [providerId, setProviderId] = useState("");
    const [tagNote, setTagNote] = useState("");
    const [items, setItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    // Common seasonal / purpose tag presets
    const TAG_PRESETS = [
        "Navidad 2025",
        "Fin de Año",
        "Semana Santa",
        "Pan diario mañana",
        "Bebidas fin de semana",
        "Compra mensual",
    ];

    useEffect(() => {
        if (isOpen) {
            if (initialProduct) {
                setProviderId(initialProduct.provider ? String(initialProduct.provider) : "");
                setTagNote("");
                setItems([
                    {
                        productId: initialProduct.id,
                        quantity: "",
                        unitCost: initialProduct.cost_price ? String(initialProduct.cost_price) : "",
                        totalCost: "",
                        costMode: "unit", // 'unit' | 'total'
                        updateCost: isOwner,
                    },
                ]);
            } else {
                setProviderId("");
                setTagNote("");
                setItems([
                    {
                        productId: "",
                        quantity: "",
                        unitCost: "",
                        totalCost: "",
                        costMode: "unit",
                        updateCost: isOwner,
                    },
                ]);
            }
        }
    }, [isOpen, initialProduct, isOwner]);

    if (!isOpen) return null;

    function handleAddItem() {
        setItems((curr) => [
            ...curr,
            {
                productId: "",
                quantity: "",
                unitCost: "",
                totalCost: "",
                costMode: "unit",
                updateCost: true,
            },
        ]);
    }

    function handleRemoveItem(index) {
        if (items.length <= 1) return;
        setItems((curr) => curr.filter((_, i) => i !== index));
    }

    function handleUpdateItem(index, field, rawValue) {
        const value =
            rawValue !== null && typeof rawValue === "object" && "target" in rawValue
                ? rawValue.target.value
                : rawValue;

        setItems((curr) => {
            const updated = [...curr];
            const item = { ...updated[index], [field]: value };

            if (field === "productId") {
                const prod = products.find((p) => String(p.id) === String(value));
                if (prod) {
                    if (prod.cost_price && Number(prod.cost_price) > 0 && !item.unitCost) {
                        item.unitCost = String(Math.round(Number(prod.cost_price)));
                    }
                    if (prod.provider && !providerId) {
                        setProviderId(String(prod.provider));
                    }
                }
            }

            // Sync unitCost and totalCost if quantity and one of them is present
            const qty = Number(item.quantity) || 0;
            if (field === "unitCost" && qty > 0) {
                const uc = Number(value) || 0;
                item.totalCost = uc > 0 ? String(Math.round(uc * qty)) : "";
            } else if (field === "totalCost" && qty > 0) {
                const tc = Number(value) || 0;
                item.unitCost = tc > 0 ? String(Math.round(tc / qty)) : "";
            } else if (field === "quantity") {
                const newQty = Number(value) || 0;
                if (item.costMode === "unit" && Number(item.unitCost) > 0 && newQty > 0) {
                    item.totalCost = String(Math.round(Number(item.unitCost) * newQty));
                } else if (item.costMode === "total" && Number(item.totalCost) > 0 && newQty > 0) {
                    item.unitCost = String(Math.round(Number(item.totalCost) / newQty));
                }
            }

            updated[index] = item;
            return updated;
        });
    }

    // Calculations
    const totalItemsCount = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalInvestment = items.reduce((sum, it) => {
        const qty = Number(it.quantity) || 0;
        const uCost = Number(it.unitCost) || 0;
        const tCost = Number(it.totalCost) || 0;
        if (tCost > 0) return sum + tCost;
        if (uCost > 0 && qty > 0) return sum + (uCost * qty);
        return sum;
    }, 0);

    async function handleSubmit(e) {
        e.preventDefault();

        // Validation
        const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0);
        if (validItems.length === 0) {
            toast.error("Agregá al menos un producto con cantidad válida.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                provider: providerId ? Number(providerId) : null,
                notes: tagNote.trim(),
                items: validItems.map((it) => ({
                    product: Number(it.productId),
                    quantity: Number(it.quantity),
                    unit_cost: it.unitCost ? Number(it.unitCost) : null,
                    total_cost: it.totalCost ? Number(it.totalCost) : null,
                    update_product_cost: Boolean(it.updateCost),
                })),
            };

            await createBatchStockRestock(payload);
            toast.success("¡Ingreso de mercadería registrado correctamente!");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error creating stock restock:", error);
            const msg =
                error.response?.data?.detail ||
                error.response?.data?.non_field_errors?.[0] ||
                "No se pudo registrar el ingreso de stock.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Registrar Ingreso de Mercadería
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Cargá las compras de distribuidores, reposiciones diarias o pedidos por temporada.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
                    {/* Top Metadata: Tag / Season & Provider */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Etiqueta / Temporada / Factura (Opcional)
                            </label>
                            <input
                                type="text"
                                value={tagNote}
                                onChange={(e) => setTagNote(e.target.value)}
                                placeholder="Ej: Navidad 2025, Pan diario, Factura #108..."
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                            />
                            {/* Preset Pills */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {TAG_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setTagNote(preset)}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                            tagNote === preset
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "border border-[var(--border)] bg-[var(--surface-accent)]/60 text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Proveedor / Distribuidora (Opcional)
                            </label>
                            <div className="relative">
                                <select
                                    value={providerId}
                                    onChange={(e) => setProviderId(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-3.5 pr-9 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                >
                                    <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">Sin proveedor específico</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
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
                            <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                                Permite filtrar cuánto le compraste a cada distribuidor en el tiempo.
                            </p>
                        </div>
                    </div>

                    {/* Items Table / List */}
                    <div className="mb-4 flex-1">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Artículos Reabastecidos ({items.length})
                            </span>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Agregar otro artículo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => {
                                const selectedProd = products.find((p) => String(p.id) === String(item.productId));
                                return (
                                    <div
                                        key={idx}
                                        className="relative rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 transition"
                                    >
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                            {/* Product Select */}
                                            <div className="sm:col-span-5">
                                                <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                                                    Producto #{idx + 1}
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={item.productId}
                                                        onChange={(e) => handleUpdateItem(idx, "productId", e.target.value)}
                                                        className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 py-2 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                                    >
                                                        <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">Seleccionar producto...</option>
                                                        {sortedProducts.map((p) => (
                                                            <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                                                                {p.name} {p.stock !== null ? `(Stock act: ${formatStockQty(p.stock, p.unit_type)} ${formatUnitType(p.unit_type, false, p.stock)})` : "(Sin seg.)"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                {selectedProd && (
                                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                                        <span>Tipo: <b className="text-[var(--text-primary)]">{formatUnitType(selectedProd.unit_type, true, 1)}</b></span>
                                                        <span>Venta: <b className="text-[var(--text-primary)]">{formatCurrency(selectedProd.sale_price)}</b></span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div className="sm:col-span-3">
                                                <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">
                                                    Cantidad a Ingresar
                                                </label>
                                                <input
                                                    type="number"
                                                    step={selectedProd?.unit_type === "kg" ? "0.01" : "1"}
                                                    min="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                                                    placeholder="Ej: 10"
                                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                                />
                                            </div>

                                            {/* Cost Price */}
                                            <div className="sm:col-span-3">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                                        {item.costMode === "unit" ? "Costo Unitario ($)" : "Costo Total Lote ($)"}
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdateItem(
                                                                idx,
                                                                "costMode",
                                                                item.costMode === "unit" ? "total" : "unit"
                                                            )
                                                        }
                                                        className="text-[10px] font-semibold text-[var(--primary)] hover:underline"
                                                    >
                                                        {item.costMode === "unit" ? "Cambiar a Total" : "Cambiar a Unitario"}
                                                    </button>
                                                </div>
                                                {item.costMode === "unit" ? (
                                                    <MoneyInput
                                                        value={item.unitCost}
                                                        onChange={(e) => handleUpdateItem(idx, "unitCost", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                                    />
                                                ) : (
                                                    <MoneyInput
                                                        value={item.totalCost}
                                                        onChange={(e) => handleUpdateItem(idx, "totalCost", e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                                    />
                                                )}
                                            </div>

                                            {/* Delete Row Button */}
                                            <div className="flex items-end justify-center sm:col-span-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    disabled={items.length <= 1}
                                                    title="Eliminar fila"
                                                    className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-30"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sub-row Options */}
                                        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)]/50 pt-2 text-xs">
                                            {isOwner ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateItem(idx, "updateCost", !item.updateCost)}
                                                    className="group flex cursor-pointer items-center gap-2 select-none text-[11px] font-medium text-[var(--text-secondary)]"
                                                >
                                                    <div
                                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                                            item.updateCost
                                                                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                                : "border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--text-secondary)]"
                                                        }`}
                                                    >
                                                        {item.updateCost && (
                                                            <svg className="h-3 w-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="transition group-hover:text-[var(--text-primary)]">
                                                        Actualizar costo base del producto con este precio
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-[var(--text-secondary)]/70">
                                                    Modo Caja (Registro de ingreso rápido)
                                                </span>
                                            )}

                                            {Number(item.quantity) > 0 && (Number(item.unitCost) > 0 || Number(item.totalCost) > 0) && isOwner && (
                                                <span className="font-medium text-[var(--text-secondary)]">
                                                    Subtotal: <b className="text-[var(--text-primary)]">{formatCurrency(Number(item.totalCost) || (Number(item.unitCost) * Number(item.quantity)))}</b>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Summary & Action Buttons */}
                    <div className="mt-auto border-t border-[var(--border)] pt-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between rounded-xl bg-[var(--surface-accent)]/50 px-4 py-3">
                            <div>
                                <span className="text-xs text-[var(--text-secondary)]">Unidades totales a ingresar:</span>{" "}
                                <strong className="text-sm text-[var(--text-primary)]">{totalItemsCount}</strong>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--text-secondary)]">Inversión estimada:</span>{" "}
                                <strong className="text-base font-bold text-[var(--primary)]">
                                    {isOwner ? formatCurrency(totalInvestment) : "••••••"}
                                </strong>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || totalItemsCount <= 0}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "Registrando..." : "Confirmar Ingreso de Stock"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RestockModal;

