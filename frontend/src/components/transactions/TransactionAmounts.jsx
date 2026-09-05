import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function TransactionAmounts({
    amounts,
    targetTotal = 0,
    onAmountsChange,
    disableDebt = false,
    hasClient = false,
    onRequireClient,
}) {
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

    return (
        <section className="
            border
            border-[var(--border)]
            bg-[var(--surface)]
        ">
            <div className="
                flex
                items-start
                justify-between
                gap-4
                border-b
                border-[var(--border)]
                px-6
                py-4
            ">
                <div>
                    <h3 className="
                        text-sm
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        Montos y medios de pago
                    </h3>
                    <p className="
                        mt-0.5
                        text-xs
                        text-[var(--text-secondary)]
                    ">
                        Podés dividir el pago entre distintos medios.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addAmount}
                    className="
                        shrink-0
                        rounded-md
                        border
                        border-[var(--border)]
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-[var(--primary)]
                        transition
                        hover:border-[var(--primary)]
                        hover:bg-[var(--surface-accent)]
                    "
                >
                    + Agregar medio
                </button>
            </div>

            <div className="
                divide-y
                divide-[var(--border)]
            ">
                {amounts.map((item, index) => (
                    <div key={index} className="divide-y divide-[var(--border)]/50">
                        <div className="
                            flex
                            items-center
                            gap-3
                            p-4
                            sm:px-6
                        ">
                            <div className="relative w-40 shrink-0">
                                <select
                                    value={item.method}
                                    onChange={(event) =>
                                        updateAmount(index, "method", event.target.value)
                                    }
                                    className="
                                        w-full
                                        appearance-none
                                        cursor-pointer
                                        rounded-xl
                                        border
                                        border-[var(--border)]
                                        bg-[var(--background)]
                                        px-3.5
                                        py-2.5
                                        pr-8
                                        text-xs
                                        font-semibold
                                        text-[var(--text-primary)]
                                        outline-none
                                        transition
                                        focus:border-[var(--primary)]
                                        focus:ring-2
                                        focus:ring-[var(--primary)]/20
                                    "
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

                            <div className="
                                relative
                                min-w-0
                                flex-1
                            ">
                                <span className="
                                    pointer-events-none
                                    absolute
                                    left-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-sm
                                    text-[var(--text-secondary)]
                                ">
                                    $
                                </span>

                                <MoneyInput
                                    value={item.amount}
                                    onChange={(event) =>
                                        updateAmount(index, "amount", event.target.value)
                                    }
                                    placeholder="0"
                                    className="
                                        w-full
                                        rounded-md
                                        border
                                        border-[var(--border)]
                                        bg-[var(--background)]
                                        py-2
                                        pl-7
                                        pr-3
                                        text-sm
                                        tabular-nums
                                        text-[var(--text-primary)]
                                        outline-none
                                        focus:border-[var(--primary)]
                                        focus:ring-2
                                        focus:ring-[var(--primary)]/20
                                    "
                                />
                            </div>

                            {amounts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeAmount(index)}
                                    className="
                                        rounded-md
                                        p-1.5
                                        text-lg
                                        leading-none
                                        text-[var(--danger)]
                                        transition
                                        hover:bg-[var(--danger-bg)]
                                    "
                                    aria-label="Eliminar monto"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {item.method === "debt" && !hasClient && (
                            <div className="bg-[var(--warning)]/5 px-4 py-2 text-xs font-medium text-[var(--warning)] sm:px-6">
                                Para registrar como fiado, tenés que asignar o crear un cliente en la sección de abajo.
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {amounts.length > 1 && (
                <div className="
                    flex
                    flex-wrap
                    items-center
                    justify-between
                    gap-2
                    border-t
                    border-[var(--border)]
                    bg-[var(--surface-muted)]
                    px-6
                    py-2.5
                    text-xs
                ">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-secondary)]">
                            Suma de medios:
                        </span>
                        <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                            {formatCurrency(subtotal)}
                        </strong>

                        {targetTotal > 0 && subtotal < targetTotal && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-500">
                                Faltan {formatCurrency(targetTotal - subtotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal > targetTotal && (
                            <span className="rounded bg-[var(--danger)]/10 px-1.5 py-0.5 text-[11px] font-bold text-[var(--danger)]">
                                Supera por {formatCurrency(subtotal - targetTotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal === targetTotal && (
                            <span className="rounded bg-[var(--success)]/10 px-1.5 py-0.5 text-[11px] font-bold text-[var(--success-text)]">
                                Total completo
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
                            className="rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
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
