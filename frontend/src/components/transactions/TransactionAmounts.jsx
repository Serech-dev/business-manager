import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function TransactionAmounts({
    amounts,
    onAmountsChange,
    disableDebt = false,
    hasClient = false,
    onRequireClient,
}) {
    function updateAmount(index, field, value) {
        if (field === "method" && value === "debt" && !hasClient) {
            onRequireClient?.();
        }

        const updated = amounts.map((item, itemIndex) =>
            itemIndex === index
                ? {
                    ...item,
                    [field]: value,
                }
                : item
        );
        onAmountsChange(updated);
    }

    function addAmount() {
        onAmountsChange([
            ...amounts,
            {
                method: "cash",
                amount: "",
            },
        ]);
    }

    function removeAmount(index) {
        if (amounts.length <= 1) return;
        const updated = amounts.filter((_, itemIndex) => itemIndex !== index);
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
                            <select
                                value={item.method}
                                onChange={(event) =>
                                    updateAmount(index, "method", event.target.value)
                                }
                                className="
                                    w-40
                                    shrink-0
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    bg-[var(--background)]
                                    px-3
                                    py-2
                                    text-sm
                                    text-[var(--text-primary)]
                                    outline-none
                                    focus:border-[var(--primary)]
                                "
                            >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia</option>
                                <option value="card">Tarjeta</option>
                                {!disableDebt && <option value="debt">A cuenta</option>}
                            </select>

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

            {subtotal > 0 && amounts.length > 1 && (
                <div className="
                    flex
                    items-center
                    justify-between
                    border-t
                    border-[var(--border)]
                    bg-[var(--surface-muted)]
                    px-6
                    py-2.5
                    text-xs
                ">
                    <span className="text-[var(--text-secondary)]">
                        Subtotal de esta operación:
                    </span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                        {formatCurrency(subtotal)}
                    </strong>
                </div>
            )}
        </section>
    );
}

export default TransactionAmounts;
