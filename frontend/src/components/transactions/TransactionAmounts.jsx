import { useMemo } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function TransactionAmounts({
    amounts,
    targetTotal = 0,
    onAmountsChange,
    disableDebt = false,
    hasClient = false,
    onRequireClient,
    receivedCash = "",
    onReceivedCashChange,
}) {
    const isSingleMethod = amounts.length === 1;

    function handleSelectSingleMethod(method) {
        if (method === "debt" && !hasClient) {
            onRequireClient?.();
        }

        onAmountsChange([
            {
                method,
                amount: targetTotal > 0 ? String(targetTotal) : amounts[0]?.amount || "",
            },
        ]);
    }

    function updateAmount(index, field, value) {
        if (field === "method" && value === "debt" && !hasClient) {
            onRequireClient?.();
        }

        let updated = amounts.map((item, itemIndex) =>
            itemIndex === index
                ? {
                    ...item,
                    [field]: value,
                }
                : item
        );

        // Auto-recalculate the other amount when splitting across 2 payment methods
        if (field === "amount" && targetTotal > 0 && updated.length === 2) {
            const otherIndex = index === 0 ? 1 : 0;
            const enteredVal = Number(value) || 0;
            if (value !== "" && enteredVal >= 0) {
                const remainder = Math.max(0, targetTotal - enteredVal);
                updated[otherIndex] = {
                    ...updated[otherIndex],
                    amount: remainder > 0 ? String(remainder) : "0",
                };
            }
        }

        onAmountsChange(updated);
    }

    function addAmount() {
        const usedMethods = new Set(amounts.map((a) => a.method));
        const allMethods = ["cash", "transfer", "card", "debt"];
        const nextMethod = allMethods.find((m) => !usedMethods.has(m)) || "transfer";

        if (targetTotal > 0) {
            const currentSum = amounts.reduce(
                (sum, item) => sum + (Number(item.amount) || 0),
                0
            );
            const remainder = Math.max(0, targetTotal - currentSum);

            onAmountsChange([
                ...amounts,
                {
                    method: nextMethod,
                    amount: remainder > 0 ? String(remainder) : "",
                },
            ]);
        } else {
            onAmountsChange([
                ...amounts,
                {
                    method: nextMethod,
                    amount: "",
                },
            ]);
        }
    }

    function removeAmount(index) {
        if (amounts.length <= 1) return;
        const updated = amounts.filter((_, itemIndex) => itemIndex !== index);
        if (updated.length === 1 && targetTotal > 0) {
            updated[0] = {
                ...updated[0],
                amount: String(targetTotal),
            };
        }
        onAmountsChange(updated);
    }

    const subtotal = amounts.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    );

    // Calculate total cash due across all operations/methods
    const cashDue = useMemo(() => {
        return amounts
            .filter((a) => a.method === "cash")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    }, [amounts]);

    const receivedNum = Number(receivedCash) || 0;
    const change = Math.max(0, receivedNum - cashDue);
    const hasEnteredReceived = receivedCash !== "" && receivedNum > 0;

    // Bill suggestions based on cashDue
    const billSuggestions = useMemo(() => {
        if (cashDue <= 0) return [];

        if (cashDue > 20000) {
            const round1 = Math.ceil(cashDue / 10000) * 10000;
            const round2 = round1 + 10000;
            const round3 = round1 + 20000;
            const unique = Array.from(new Set([cashDue, round1, round2, round3]));
            return unique.map((val) => ({
                label: val === cashDue ? "Exacto" : formatCurrency(val),
                value: val,
            }));
        }

        return [
            { label: "Exacto", value: cashDue },
            { label: "$ 5.000", value: 5000 },
            { label: "$ 10.000", value: 10000 },
            { label: "$ 20.000", value: 20000 },
        ].filter((b, idx, arr) => arr.findIndex((x) => x.value === b.value) === idx);
    }, [cashDue]);

    const methods = [
        { id: "cash", label: "Efectivo" },
        { id: "transfer", label: "Transferencia" },
        { id: "card", label: "Tarjeta" },
        ...(!disableDebt ? [{ id: "debt", label: "A cuenta" }] : []),
    ];

    const hasCashMethod = amounts.some((a) => a.method === "cash");

    return (
        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Medio de pago
                </span>

                {isSingleMethod ? (
                    <button
                        type="button"
                        onClick={addAmount}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                        + Dividir pago
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={addAmount}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                        + Agregar otro medio
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {isSingleMethod ? (
                    /* Single Payment Method Selection */
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {methods.map((m) => {
                                const isSelected = amounts[0]?.method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectSingleMethod(m.id)}
                                        className={`rounded-lg border py-2.5 px-3 text-xs sm:text-sm font-bold transition text-center ${
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                : "border-[var(--border)] bg-[var(--surface-accent)]/40 text-[var(--text-secondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Amount Input */}
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                $
                            </span>
                            <MoneyInput
                                value={amounts[0]?.amount}
                                onChange={(event) =>
                                    updateAmount(0, "amount", event.target.value)
                                }
                                placeholder="0"
                                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                        </div>

                        {amounts[0]?.method === "debt" && !hasClient && (
                            <div className="rounded-lg bg-[var(--warning)]/10 p-2.5 text-xs font-medium text-[var(--warning)]">
                                Para registrar a cuenta, asigná un cliente en la sección de abajo.
                            </div>
                        )}
                    </div>
                ) : (
                    /* Split Payment Multi-Row Interface */
                    <div className="space-y-2.5">
                        {amounts.map((item, index) => (
                            <div key={index} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-40 sm:w-44 shrink-0">
                                        <select
                                            value={item.method}
                                            onChange={(e) =>
                                                updateAmount(index, "method", e.target.value)
                                            }
                                            className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pr-8 text-xs sm:text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                        >
                                            <option value="cash">Efectivo</option>
                                            <option value="transfer">Transferencia</option>
                                            <option value="card">Tarjeta</option>
                                            {!disableDebt && <option value="debt">A cuenta</option>}
                                        </select>
                                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="relative flex-1">
                                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                            $
                                        </span>
                                        <MoneyInput
                                            value={item.amount}
                                            onChange={(e) =>
                                                updateAmount(index, "amount", e.target.value)
                                            }
                                            placeholder="0"
                                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeAmount(index)}
                                        className="h-10 w-10 flex items-center justify-center rounded-lg text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                        title="Eliminar medio"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {item.method === "debt" && !hasClient && (
                                    <div className="rounded-lg bg-[var(--warning)]/10 px-3 py-1.5 text-xs font-medium text-[var(--warning)]">
                                        Requiere asignar cliente abajo.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* IN-CARD CASH RECEIVED & VUELTO (VISIBLE DIRECTLY WHEN CASH IS USED) */}
                {hasCashMethod && cashDue > 0 && onReceivedCashChange && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3.5 space-y-3 animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label
                                htmlFor="inline-cash-received"
                                className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                                Paga con (Efectivo del cliente)
                            </label>

                            <span className="text-xs text-[var(--text-secondary)]">
                                Total en efectivo: <strong className="text-[var(--text-primary)] tabular-nums">{formatCurrency(cashDue)}</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                            {/* Input */}
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    id="inline-cash-received"
                                    value={receivedCash}
                                    onChange={(e) => onReceivedCashChange(e.target.value)}
                                    placeholder={String(cashDue)}
                                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-8 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                                {receivedCash && (
                                    <button
                                        type="button"
                                        onClick={() => onReceivedCashChange("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                        title="Limpiar"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Quick Bill Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {billSuggestions.map((bill) => {
                                    const isSelected = Number(receivedCash) === bill.value;
                                    return (
                                        <button
                                            key={bill.label}
                                            type="button"
                                            onClick={() => onReceivedCashChange(String(bill.value))}
                                            className={`rounded-lg border px-2.5 py-2 text-xs font-bold transition flex-1 text-center ${
                                                isSelected
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                            }`}
                                        >
                                            {bill.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PROMINENT VUELTO CALLOUT BANNER */}
                        {hasEnteredReceived && (
                            receivedNum >= cashDue ? (
                                change > 0 ? (
                                    <div className="flex items-center justify-between rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)]/25 px-4 py-3 transition animate-in fade-in duration-150">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--success-text)] block">
                                                Vuelto a entregar
                                            </span>
                                            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                                Paga {formatCurrency(receivedNum)} − Cobro {formatCurrency(cashDue)}
                                            </span>
                                        </div>
                                        <span className="text-xl sm:text-2xl font-black text-[var(--success)] tabular-nums">
                                            {formatCurrency(change)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2.5 text-xs font-bold text-[var(--primary)]">
                                        <span className="flex items-center gap-1.5">
                                            <span>✓</span>
                                            <span>Pago exacto en efectivo (Sin vuelto).</span>
                                        </span>
                                        <span className="tabular-nums">{formatCurrency(cashDue)}</span>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-500">
                                    <span>Monto insuficiente:</span>
                                    <span className="tabular-nums">Faltan {formatCurrency(cashDue - receivedNum)}</span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* SPLIT PAYMENT STATUS FOOTER */}
            {amounts.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-accent)]/20 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-secondary)]">Suma de medios:</span>
                        <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                            {formatCurrency(subtotal)}
                        </strong>

                        {targetTotal > 0 && subtotal < targetTotal && (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                                Faltan {formatCurrency(targetTotal - subtotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal > targetTotal && (
                            <span className="rounded bg-[var(--danger)]/15 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
                                +{formatCurrency(subtotal - targetTotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal === targetTotal && (
                            <span className="rounded bg-[var(--success)]/15 px-2 py-0.5 text-xs font-bold text-[var(--success)]">
                                Total cubierto
                            </span>
                        )}
                    </div>

                    {targetTotal > 0 && subtotal < targetTotal && (
                        <button
                            type="button"
                            onClick={() => {
                                const diff = targetTotal - subtotal;
                                const lastIdx = amounts.length - 1;
                                const lastAmt = Number(amounts[lastIdx].amount) || 0;
                                updateAmount(lastIdx, "amount", String(lastAmt + diff));
                            }}
                            className="rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                        >
                            + Asignar restante ({formatCurrency(targetTotal - subtotal)})
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}

export default TransactionAmounts;
