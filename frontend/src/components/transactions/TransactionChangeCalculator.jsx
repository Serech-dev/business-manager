import { useMemo } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

/**
 * TransactionChangeCalculator
 * Compact cash change (vuelto) calculator.
 * Renders when any operation contains a cash payment amount.
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

    // Banknote suggestions: Exacto, $1.000, $2.000, $5.000, $10.000, $20.000 (scaled if total is higher)
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

        const presets = [
            { label: "Exacto", value: cashDue },
            { label: "$ 2.000", value: 2000 },
            { label: "$ 5.000", value: 5000 },
            { label: "$ 10.000", value: 10000 },
            { label: "$ 20.000", value: 20000 },
        ];

        // Filter out amounts smaller than cashDue except Exacto
        return presets.filter((p) => p.label === "Exacto" || p.value >= cashDue);
    }, [cashDue]);

    if (cashDue <= 0) return null;

    const change = Math.max(0, receivedNum - cashDue);
    const remaining = Math.max(0, cashDue - receivedNum);
    const hasEnteredReceived = receivedCash !== "" && receivedNum > 0;

    return (
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-3.5 py-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v8.25m0-8.25h19.5m-19.5 0c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v8.25m-19.5 0h19.5m0 0v1.5a.75.75 0 0 1-.75.75H18.75m0 0a60.07 60.07 0 0 1-15.797-2.101c-.727-.198-1.453.342-1.453 1.096v-1.5" />
                    </svg>
                    <span>Cálculo de Vuelto</span>
                </div>

                <div className="flex items-center gap-1 text-xs">
                    <span className="text-[var(--text-secondary)]">Efectivo:</span>
                    <strong className="font-extrabold text-[var(--text-primary)] tabular-nums">
                        {formatCurrency(cashDue)}
                    </strong>
                </div>
            </div>

            <div className="p-3 space-y-2.5">
                {/* Input row & Quick bill presets */}
                <div className="space-y-2">
                    <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                            Paga con $
                        </span>
                        <MoneyInput
                            id="cash-received-input"
                            value={receivedCash}
                            onChange={(e) => onReceivedCashChange(e.target.value)}
                            placeholder="0"
                            className="h-9.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-24 pr-8 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />

                        {receivedCash && (
                            <button
                                type="button"
                                onClick={() => onReceivedCashChange("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                title="Limpiar"
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-1">
                        {billSuggestions.map((bill) => {
                            const isSelected = Number(receivedCash) === bill.value;

                            return (
                                <button
                                    key={bill.label}
                                    type="button"
                                    onClick={() => onReceivedCashChange(String(bill.value))}
                                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
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

                {/* VUELTO BANNER */}
                {hasEnteredReceived && (
                    receivedNum >= cashDue ? (
                        change > 0 ? (
                            <div className="flex items-center justify-between rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)]/20 p-3">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success-text)] block">
                                        Vuelto a entregar
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)] block">
                                        Recibido {formatCurrency(receivedNum)}
                                    </span>
                                </div>

                                <span className="text-xl font-extrabold text-[var(--success)] tabular-nums">
                                    {formatCurrency(change)}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-2.5 text-xs text-[var(--primary)] font-bold">
                                <span>Pago exacto — Sin vuelto</span>
                                <span className="tabular-nums">{formatCurrency(cashDue)}</span>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                            <span>Monto insuficiente</span>
                            <span>Faltan {formatCurrency(remaining)}</span>
                        </div>
                    )
                )}
            </div>
        </section>
    );
}

export default TransactionChangeCalculator;
