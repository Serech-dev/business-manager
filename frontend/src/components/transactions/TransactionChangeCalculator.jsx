import { useMemo } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

/**
 * TransactionChangeCalculator
 * Calculates cash change (vuelto) across the whole transaction.
 * Appears whenever any operation in the transaction contains a cash payment method.
 */
function TransactionChangeCalculator({
    totalCashDue = 0,
    grandTotal = 0,
    receivedCash = "",
    onReceivedCashChange,
}) {
    const cashDue = Number(totalCashDue) || 0;
    const receivedNum = Number(receivedCash) || 0;
    const isMixedPayment = grandTotal > 0 && cashDue > 0 && cashDue < grandTotal;

    // Calculate banknote suggestions: Exacto, $5.000, $10.000, $20.000 (scaled if total is higher)
    const billSuggestions = useMemo(() => {
        if (cashDue <= 0) return [];

        if (cashDue > 20000) {
            const round1 = Math.ceil(cashDue / 10000) * 10000;
            const round2 = round1 + 10000;
            const round3 = round1 + 20000;
            return [
                { label: "Exacto", value: cashDue },
                { label: formatCurrency(round1), value: round1 },
                { label: formatCurrency(round2), value: round2 },
                { label: formatCurrency(round3), value: round3 },
            ];
        }

        return [
            { label: "Exacto", value: cashDue },
            { label: "$ 5.000", value: 5000 },
            { label: "$ 10.000", value: 10000 },
            { label: "$ 20.000", value: 20000 },
        ];
    }, [cashDue]);

    if (cashDue <= 0) return null;

    const change = Math.max(0, receivedNum - cashDue);
    const remaining = Math.max(0, cashDue - receivedNum);
    const hasEnteredReceived = receivedCash !== "" && receivedNum > 0;

    return (
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-5 py-3">
                <div className="flex items-center gap-2">
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
                            d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v8.25m0-8.25h19.5m-19.5 0c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v8.25m-19.5 0h19.5m0 0v1.5a.75.75 0 0 1-.75.75H18.75m0 0a60.07 60.07 0 0 1-15.797-2.101c-.727-.198-1.453.342-1.453 1.096v-1.5"
                        />
                    </svg>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Pago en Efectivo y Cálculo de Vuelto
                    </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[var(--text-secondary)]">A pagar en efectivo:</span>
                    <span className="font-extrabold text-[var(--text-primary)] tabular-nums">
                        {formatCurrency(cashDue)}
                    </span>
                    {isMixedPayment && (
                        <span className="text-[11px] text-[var(--text-secondary)]">
                            (de {formatCurrency(grandTotal)} total)
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Input row & Quick bills */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                    {/* Amount Received Input */}
                    <div>
                        <label
                            htmlFor="cash-received-input"
                            className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                        >
                            Paga con (Efectivo entregado por el cliente)
                        </label>

                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                $
                            </span>

                            <MoneyInput
                                id="cash-received-input"
                                value={receivedCash}
                                onChange={(e) => onReceivedCashChange(e.target.value)}
                                placeholder="0"
                                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-10 text-base font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />

                            {receivedCash && (
                                <button
                                    type="button"
                                    onClick={() => onReceivedCashChange("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                    title="Limpiar monto"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick bill shortcuts */}
                    <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                            Billetes / Montos sugeridos
                        </span>

                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {billSuggestions.map((bill) => {
                                const isSelected = Number(receivedCash) === bill.value;

                                return (
                                    <button
                                        key={bill.label}
                                        type="button"
                                        onClick={() => onReceivedCashChange(String(bill.value))}
                                        className={`rounded-xl border py-2 px-2 text-xs font-bold transition text-center ${
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        {bill.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* VUELTO / CHANGE CALCULATION BANNER */}
                {hasEnteredReceived ? (
                    receivedNum >= cashDue ? (
                        change > 0 ? (
                            <div className="flex items-center justify-between rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)]/20 p-4 transition animate-in fade-in duration-150">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--success-text)] block">
                                        Vuelto a entregar al cliente
                                    </span>
                                    <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                        Recibido {formatCurrency(receivedNum)} — Cobro {formatCurrency(cashDue)}
                                    </span>
                                </div>

                                <div className="text-right">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-[var(--success)] tabular-nums">
                                        {formatCurrency(change)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-4 transition animate-in fade-in duration-150">
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                    <span>Pago exacto en efectivo — Sin vuelto a entregar.</span>
                                </div>
                                <span className="text-xs font-bold text-[var(--primary)] tabular-nums">
                                    {formatCurrency(cashDue)}
                                </span>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 transition animate-in fade-in duration-150">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-500 block">
                                    Monto insuficiente
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                    Entregó {formatCurrency(receivedNum)} de {formatCurrency(cashDue)} requeridos
                                </span>
                            </div>

                            <div className="text-right">
                                <span className="text-xs font-bold text-amber-500 uppercase block">Faltan</span>
                                <span className="text-lg font-bold text-amber-500 tabular-nums">
                                    {formatCurrency(remaining)}
                                </span>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-accent)]/20 p-3 text-center text-xs text-[var(--text-secondary)]">
                        Seleccioná un billete sugerido o ingresá con cuánto abona el cliente para calcular el vuelto automáticamente.
                    </div>
                )}
            </div>
        </section>
    );
}

export default TransactionChangeCalculator;

