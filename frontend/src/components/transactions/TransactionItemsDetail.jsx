import { useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";

/**
 * Formats item quantity and unit type for ticket-style item display.
 */
function formatItemQuantity(quantity, unitType) {
    const qty = Number(quantity) || 0;
    if (unitType === "kg") {
        if (qty < 1) {
            return `${Math.round(qty * 1000)} g`;
        }
        return `${parseFloat(qty.toFixed(3))} kg`;
    }
    if (unitType === "100g") {
        return `${Math.round(qty * 100)} g`;
    }
    return `${Math.round(qty)} u.`;
}

/**
 * Expandable notebook/ticket style component displaying the itemized products
 * and manual amounts sold in a transaction or operation.
 */
export default function TransactionItemsDetail({
    items = [],
    manualAmount = null,
    className = "",
    defaultOpen = false,
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const validItems = items || [];
    const numManual = Number(manualAmount) || 0;
    const hasItems = validItems.length > 0;
    const hasManual = numManual > 0;

    if (!hasItems && !hasManual) {
        return null;
    }

    const totalCount = validItems.reduce((acc, it) => {
        if (it.unit_type === "kg" || it.unit_type === "100g") {
            return acc + 1;
        }
        return acc + (Number(it.quantity) || 1);
    }, 0) + (hasManual ? 1 : 0);

    const labelCount = validItems.length + (hasManual ? 1 : 0);

    return (
        <div className={`text-xs ${className}`}>
            {/* TOGGLE BUTTON */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--surface-accent)] transition shadow-2xs select-none"
            >
                <svg
                    className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
                <span>
                    {isOpen
                        ? "Ocultar detalle"
                        : `Ver detalle (${labelCount} ${labelCount === 1 ? "artículo" : "artículos"})`}
                </span>
            </button>

            {/* EXPANDED NOTEBOOK TICKET VIEW */}
            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/30 p-2.5 space-y-2 shadow-2xs"
                >
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        <span>Artículo / Producto</span>
                        <div className="flex items-center gap-6">
                            <span>Cant. × Precio</span>
                            <span className="w-16 text-right">Subtotal</span>
                        </div>
                    </div>

                    <div className="divide-y divide-[var(--border)]/60 text-xs">
                        {validItems.map((item, idx) => {
                            const isWeight = item.unit_type === "kg" || item.unit_type === "100g";
                            const unitPriceLabel = isWeight
                                ? `${formatCurrency(item.unit_price)}/${item.unit_type === "kg" ? "kg" : "100g"}`
                                : `${formatCurrency(item.unit_price)}`;

                            return (
                                <div
                                    key={item.id || idx}
                                    className="flex items-center justify-between py-1.5 gap-2"
                                >
                                    {/* Product Name */}
                                    <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-[var(--text-primary)] truncate">
                                            {item.product_name}
                                        </span>
                                        {isWeight && (
                                            <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                                                {item.unit_type}
                                            </span>
                                        )}
                                    </div>

                                    {/* Quantity & Unit Price */}
                                    <div className="flex items-center gap-6 shrink-0">
                                        <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                                            {formatItemQuantity(item.quantity, item.unit_type)} × {unitPriceLabel}
                                        </span>

                                        {/* Subtotal */}
                                        <span className="w-16 text-right font-bold text-[var(--text-primary)] tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Manual / Unlisted Amount if present */}
                        {hasManual && (
                            <div className="flex items-center justify-between py-1.5 gap-2 text-xs">
                                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        Varios / Monto manual
                                    </span>
                                    <span className="rounded bg-[var(--surface-accent)] px-1 py-0.2 text-[9px] font-bold text-[var(--text-secondary)]">
                                        manual
                                    </span>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        1 u.
                                    </span>
                                    <span className="w-16 text-right font-bold text-[var(--text-primary)] tabular-nums">
                                        {formatCurrency(numManual)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
