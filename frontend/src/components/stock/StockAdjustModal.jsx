import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { adjustStock } from "../../services/business";
import { formatStockQty, formatUnitType } from "../../utils/formatStock";

function StockAdjustModal({
    isOpen,
    onClose,
    product,
    onSuccess,
}) {
    const [newStock, setNewStock] = useState("");
    const [minStock, setMinStock] = useState("");
    const [movementType, setMovementType] = useState("adjustment"); // 'adjustment' | 'loss' | 'restock'
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && product) {
            const isKg = product.unit_type === "kg";
            const rawVal = product.stock !== null && product.stock !== undefined ? product.stock : 0;
            const formatted = isKg
                ? parseFloat(Number(rawVal).toFixed(2)).toString()
                : String(Math.round(Number(rawVal)));
            setNewStock(formatted);

            const rawMin = product.min_stock !== null && product.min_stock !== undefined ? product.min_stock : 1;
            const formattedMin = Number(rawMin) > 0
                ? (isKg ? parseFloat(Number(rawMin).toFixed(2)).toString() : String(Math.round(Number(rawMin))))
                : "1";
            setMinStock(formattedMin);

            setMovementType("adjustment");
            setNotes("");
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const currentStockNum = product.stock !== null ? Number(product.stock) : 0;
    const newStockNum = Number(newStock) || 0;
    const minStockNum = minStock.trim() !== "" ? Number(minStock) : 1;
    const delta = newStockNum - currentStockNum;
    const isKg = product.unit_type === "kg";

    async function handleSubmit(e) {
        e.preventDefault();

        if (newStock === "" || isNaN(newStockNum)) {
            toast.error("Ingresá un valor numérico para el nuevo stock.");
            return;
        }

        setIsSaving(true);
        try {
            await adjustStock({
                product: product.id,
                new_stock: newStockNum,
                min_stock: minStockNum,
                movement_type: movementType,
                notes: notes.trim() || (movementType === "adjustment" ? "Recuento de inventario" : "Ajuste manual"),
            });

            if (newStockNum <= 0) {
                toast.error(`Stock de "${product.name}" quedó en 0 (Agotado).`);
            } else if (minStockNum > 0 && newStockNum <= minStockNum) {
                toast(`⚠️ Stock de "${product.name}" quedó en ${formatStockQty(newStockNum, product.unit_type)} (por debajo del mínimo de ${formatStockQty(minStockNum, product.unit_type)}).`, {
                    icon: "⚠️",
                    duration: 4000,
                });
            } else {
                toast.success(`Stock de "${product.name}" actualizado a ${formatStockQty(newStockNum, product.unit_type)} ${formatUnitType(product.unit_type, true, newStockNum)}.`);
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error adjusting stock:", error);
            toast.error("No se pudo actualizar el stock.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
            <div className="flex w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            Ajustar Stock / Recuento
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {product.name}
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

                {/* Body */}
                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                        <div>
                            <span className="text-[11px] font-semibold uppercase text-[var(--text-secondary)]">Stock Actual</span>
                            <div className="text-lg font-bold text-[var(--text-primary)]">
                                {product.stock !== null ? (
                                    <>
                                        {formatStockQty(product.stock, product.unit_type)}{" "}
                                        <span className="text-sm font-normal text-[var(--text-secondary)]">
                                            {formatUnitType(product.unit_type, true, Number(product.stock))}
                                        </span>
                                    </>
                                ) : (
                                    "Sin seguimiento"
                                )}
                            </div>
                        </div>
                        {delta !== 0 && (
                            <div className="text-right">
                                <span className="text-[11px] font-semibold uppercase text-[var(--text-secondary)]">Diferencia</span>
                                <div className={`text-sm font-bold ${delta > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                    {delta > 0 ? `+${formatStockQty(delta, product.unit_type)}` : formatStockQty(delta, product.unit_type)}{" "}
                                    <span className="text-xs font-normal">
                                        {formatUnitType(product.unit_type, true, Math.abs(delta))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Nuevo Stock */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Nuevo Stock Real
                            </label>
                            <input
                                type="number"
                                step={isKg ? "0.01" : "1"}
                                value={newStock}
                                onChange={(e) => setNewStock(e.target.value)}
                                placeholder="0"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-lg font-bold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                autoFocus
                            />
                        </div>

                        {/* Alerta Stock Mínimo */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Alerta Mínimo ({formatUnitType(product.unit_type, false)})
                            </label>
                            <input
                                type="number"
                                step={isKg ? "0.01" : "1"}
                                min="0"
                                value={minStock}
                                onChange={(e) => setMinStock(e.target.value)}
                                placeholder="1"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-lg font-bold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                            />
                        </div>
                    </div>

                    {/* Live Warning Preview */}
                    {newStockNum <= 0 && newStock !== "" && (
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)]/30 px-3 py-2 text-xs font-semibold text-[var(--danger)]">
                            <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                            <span>Quedará marcado como <b>Sin Stock (Agotado)</b>.</span>
                        </div>
                    )}
                    {newStockNum > 0 && minStockNum > 0 && newStockNum <= minStockNum && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>Quedará marcado con <b>Alerta de Stock Bajo</b> (≤ {minStockNum} {formatUnitType(product.unit_type, false)}).</span>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Motivo del Ajuste
                        </label>
                        <div className="relative">
                            <select
                                value={movementType}
                                onChange={(e) => setMovementType(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-3.5 pr-9 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                            >
                                <option value="adjustment" className="bg-[var(--surface)] text-[var(--text-primary)]">Recuento de Inventario / Corrección</option>
                                <option value="loss" className="bg-[var(--surface)] text-[var(--text-primary)]">Pérdida / Rotura / Producto Vencido</option>
                                <option value="restock" className="bg-[var(--surface)] text-[var(--text-primary)]">Ingreso Directo</option>
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Nota o Comentario (Opcional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Se cayó una botella, Recuento fin de mes..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                        >
                            {isSaving ? "Guardando..." : "Actualizar Stock"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StockAdjustModal;

