import { getMethodLabel, getTransactionLabel } from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";

function TransactionSummary({
    operations,
    isSubmitting,
    onCancel,
}) {
    // Grand total
    const grandTotal = operations.reduce((total, op) => {
        const opTotal = (op.amounts || []).reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
        );
        return total + opTotal;
    }, 0);

    // Totals by payment method
    const methodTotals = {};
    operations.forEach((op) => {
        (op.amounts || []).forEach((item) => {
            const amount = Number(item.amount) || 0;
            if (amount > 0) {
                methodTotals[item.method] =
                    (methodTotals[item.method] || 0) + amount;
            }
        });
    });

    return (
        <aside className="
            lg:sticky
            lg:top-6
        ">
            <section className="
                border
                border-[var(--border)]
                bg-[var(--surface)]
            ">
                {/* HEADER / TOTAL */}
                <div className="
                    border-b
                    border-[var(--border)]
                    px-6
                    py-5
                ">
                    <p className="
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wider
                        text-[var(--text-secondary)]
                    ">
                        Resumen general
                    </p>

                    <p className="
                        mt-2
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        Total {operations.length > 1 ? `(${operations.length} operaciones)` : "de la operación"}
                    </p>

                    <p className="
                        mt-1
                        text-3xl
                        font-bold
                        tracking-tight
                        text-[var(--text-primary)]
                    ">
                        {formatCurrency(grandTotal)}
                    </p>
                </div>

                {/* OPERATIONS LIST BREAKDOWN */}
                <div className="
                    divide-y
                    divide-[var(--border)]
                    border-b
                    border-[var(--border)]
                    px-6
                    py-4
                ">
                    <p className="
                        pb-2
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wider
                        text-[var(--text-secondary)]
                    ">
                        Desglose de operaciones
                    </p>

                    {operations.map((op, idx) => {
                        const opSubtotal = (op.amounts || []).reduce(
                            (sum, item) => sum + (Number(item.amount) || 0),
                            0
                        );

                        const participant =
                            op.type === "provider" || op.type === "provider_payment"
                                ? op.provider?.name
                                : op.client?.name;

                        return (
                            <div
                                key={op.id || idx}
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    py-2.5
                                    text-xs
                                "
                            >
                                <div className="min-w-0 pr-2">
                                    <p className="
                                        font-medium
                                        text-[var(--text-primary)]
                                    ">
                                        {operations.length > 1 && (
                                            <span className="text-[var(--text-secondary)] mr-1">
                                                #{idx + 1}
                                            </span>
                                        )}
                                        {getTransactionLabel(op.type)}
                                    </p>
                                    {participant && (
                                        <p className="
                                            truncate
                                            text-[var(--text-secondary)]
                                        ">
                                            {participant}
                                        </p>
                                    )}
                                </div>

                                <span className="
                                    shrink-0
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    {formatCurrency(opSubtotal)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* PAYMENT METHODS BREAKDOWN */}
                {Object.keys(methodTotals).length > 0 && (
                    <div className="
                        border-b
                        border-[var(--border)]
                        px-6
                        py-4
                    ">
                        <p className="
                            pb-2
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--text-secondary)]
                        ">
                            Medios de pago
                        </p>

                        <div className="space-y-1.5">
                            {Object.entries(methodTotals).map(([method, amount]) => (
                                <div
                                    key={method}
                                    className="
                                        flex
                                        justify-between
                                        text-xs
                                    "
                                >
                                    <span className="text-[var(--text-secondary)]">
                                        {getMethodLabel(method)}
                                    </span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="p-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="
                            w-full
                            rounded-md
                            bg-[var(--primary)]
                            px-4
                            py-3
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-[var(--primary-hover)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {isSubmitting
                            ? "Registrando..."
                            : operations.length > 1
                                ? `Registrar ${operations.length} operaciones`
                                : "Registrar operación"}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        className="
                            mt-2
                            w-full
                            rounded-md
                            px-4
                            py-2.5
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        Cancelar
                    </button>
                </div>
            </section>
        </aside>
    );
}

export default TransactionSummary;
