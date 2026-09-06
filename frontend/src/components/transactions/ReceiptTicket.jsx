import { formatCurrency } from "../../utils/formatCurrency";
import { getTransactionLabel, getMethodLabel } from "../../services/business";

function formatDateTicket(value) {
    if (!value) {
        const now = new Date();
        return new Intl.DateTimeFormat("es-AR", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(now);
    }
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

/**
 * ReceiptTicket
 * Authentic, clean POS thermal ticket component.
 * Formatted for standard 58mm & 80mm roll widths or regular print.
 */
function ReceiptTicket({
    transaction,
    items = null,
    businessName = "Mi Negocio",
    paperWidth = "58mm",
}) {
    if (!transaction) return null;

    const operations = transaction.operations || [];
    const clientName = transaction.client?.name || (typeof transaction.client === "string" ? transaction.client : null);
    const dateStr = formatDateTicket(transaction.created_at);
    const ticketId = transaction.id ? String(transaction.id).padStart(6, "0") : "NUEVO";

    // Grand total
    const grandTotal =
        transaction.total !== undefined
            ? Number(transaction.total)
            : operations.reduce(
                  (total, op) =>
                      total +
                      (op.amounts || []).reduce(
                          (sum, a) => sum + (Number(a.amount) || 0),
                          0
                      ),
                  0
              );

    // Collect all cart items across operations if passed or embedded
    const cartItems =
        items ||
        operations.flatMap((op) => op.items || []).filter(Boolean);

    // Collect all payment methods across operations
    const paymentMethods = [];
    operations.forEach((op) => {
        (op.amounts || []).forEach((a) => {
            const num = Number(a.amount) || 0;
            if (num > 0) {
                paymentMethods.push({
                    method: a.method,
                    amount: num,
                });
            }
        });
    });

    // Detect if change/vuelto info is present in description (e.g. "(Pagó $10.000 · Vuelto $5.700)")
    let changeInfo = null;
    if (transaction.description) {
        const match = transaction.description.match(/Pagó\s*([$0-9.,\s]+)·\s*Vuelto\s*([$0-9.,\s]+)/i);
        if (match) {
            changeInfo = {
                paid: match[1].trim(),
                change: match[2].trim(),
            };
        }
    }

    const is80mm = paperWidth === "80mm";

    return (
        <div
            id="printable-receipt"
            className={`mx-auto bg-white text-black font-mono leading-tight select-text text-left ${
                is80mm ? "w-[300px] text-xs p-4" : "w-[240px] text-[11px] p-3"
            }`}
            style={{
                fontFamily: "'Courier New', Courier, monospace, monospace",
                color: "#000000",
                backgroundColor: "#ffffff",
            }}
        >
            {/* HEADER */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                    {businessName || "MI NEGOCIO"}
                </h2>
                <p className="text-[10px] text-gray-700">Comprobante de Venta</p>
                <div className="flex justify-between text-[10px] text-gray-800 pt-1">
                    <span>Ticket #{ticketId}</span>
                    <span>{dateStr}</span>
                </div>
                {clientName && (
                    <div className="text-left text-[10px] pt-0.5">
                        <span className="font-semibold">Cliente:</span> {clientName}
                    </div>
                )}
            </div>

            {/* ITEMS / DETAILS */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-gray-400">
                {cartItems.length > 0 ? (
                    // ITEMIZED PRODUCTS LIST
                    <div className="space-y-1.5">
                        {cartItems.map((item, idx) => {
                            const isWeight = item.unitType === "kg" || item.unitType === "100g";
                            const weightStr = isWeight
                                ? item.grams >= 1000
                                    ? `${(item.grams / 1000).toFixed(3).replace(/\.?0+$/, "")} kg`
                                    : `${item.grams} g`
                                : null;

                            return (
                                <div key={idx} className="space-y-0.5">
                                    <div className="flex justify-between items-start gap-1">
                                        <span className="font-medium truncate flex-1">
                                            {item.unitType === "unit" && item.quantity > 1
                                                ? `${item.quantity}x `
                                                : ""}
                                            {item.product?.name || "Producto"}
                                        </span>
                                        <span className="font-bold shrink-0 tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </span>
                                    </div>

                                    {/* Weight or unit price sub-detail */}
                                    {isWeight && (
                                        <div className="text-[10px] text-gray-700 pl-2">
                                            {weightStr} @ {formatCurrency(item.product?.sale_price)}/{item.unitType === "kg" ? "kg" : "100g"}
                                        </div>
                                    )}
                                    {item.unitType === "unit" && item.quantity > 1 && (
                                        <div className="text-[10px] text-gray-700 pl-2">
                                            {formatCurrency(item.unitPrice)} c/u
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // OPERATIONS SUMMARY / LUMP-SUM SALE
                    <div className="space-y-1.5">
                        {operations.map((op, idx) => {
                            const opTotal =
                                op.total !== undefined
                                    ? op.total
                                    : (op.amounts || []).reduce(
                                          (sum, a) => sum + (Number(a.amount) || 0),
                                          0
                                      );

                            return (
                                <div key={idx} className="flex justify-between items-start gap-1">
                                    <span className="font-medium">
                                        {getTransactionLabel(op.type)}
                                        {op.provider?.name ? ` - ${op.provider.name}` : ""}
                                    </span>
                                    <span className="font-bold shrink-0 tabular-nums">
                                        {formatCurrency(opTotal)}
                                    </span>
                                </div>
                            );
                        })}

                        {transaction.description && !changeInfo && (
                            <p className="text-[10px] text-gray-700 italic pt-1">
                                {transaction.description}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* TOTAL */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-gray-400">
                <div className="flex justify-between items-center text-sm font-extrabold">
                    <span>TOTAL</span>
                    <span className="tabular-nums text-base">
                        {formatCurrency(grandTotal)}
                    </span>
                </div>

                {/* PAYMENT METHODS BREAKDOWN */}
                {paymentMethods.length > 0 && (
                    <div className="pt-1.5 space-y-0.5 text-[10px] text-gray-800">
                        {paymentMethods.map((pm, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>{getMethodLabel(pm.method)}:</span>
                                <span className="tabular-nums font-medium">
                                    {formatCurrency(pm.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* CASH CHANGE BREAKDOWN */}
                {changeInfo && (
                    <div className="pt-1.5 space-y-0.5 text-[10px] border-t border-dotted border-gray-300 mt-1">
                        <div className="flex justify-between text-gray-800">
                            <span>Abona con:</span>
                            <span className="tabular-nums">{changeInfo.paid}</span>
                        </div>
                        <div className="flex justify-between font-bold text-black">
                            <span>Su Vuelto:</span>
                            <span className="tabular-nums">{changeInfo.change}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-gray-700">
                <p className="font-bold tracking-wider text-black">
                    *** COMPROBANTE NO FISCAL ***
                </p>
                <p>¡Muchas gracias por su compra!</p>
            </div>
        </div>
    );
}

export default ReceiptTicket;

