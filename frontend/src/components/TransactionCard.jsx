import { formatCurrency } from "../utils/formatCurrency";


function getTransactionLabel(type) {
    const labels = {
        sale: "Venta",
        service: "Servicio",
        exchange: "Cambio",
        sale_exchange: "Venta + Cambio",
        provider: "Proveedor",
        expense: "Gasto",
        loss: "Pérdida",
    };

    return labels[type] || type;
}


function getMethodLabel(method) {
    const labels = {
        cash: "Efectivo",
        transfer: "Transferencia",
        card: "Tarjeta",
        debt: "Fiado",
    };

    return labels[method] || method;
}


function TransactionCard({
    transaction,
    onDelete,
}) {
    return (
        <article className="
            p-5
            transition
            hover:bg-[var(--surface-accent)]
        ">

            {/* HEADER */}

            <div className="
                flex
                items-start
                justify-between
                gap-6
            ">

                <div className="min-w-0">

                    <div className="
                        flex
                        items-center
                        gap-3
                    ">

                        <h4 className="
                            font-semibold
                            text-[var(--text-primary)]
                        ">
                            {getTransactionLabel(
                                transaction.type
                            )}
                        </h4>

                        <span className="
                            text-xs
                            text-[var(--text-secondary)]
                        ">
                            #{transaction.id}
                        </span>

                    </div>


                    {transaction.description && (
                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            {transaction.description}
                        </p>
                    )}

                </div>


                <strong className="
                    shrink-0
                    text-lg
                    font-semibold
                    text-[var(--text-primary)]
                ">
                    {formatCurrency(
                        transaction.total
                    )}
                </strong>

            </div>


            {/* DETAILS */}

            <div className="
                mt-4
                flex
                items-center
                justify-between
                gap-4
            ">

                <div className="
                    flex
                    flex-wrap
                    gap-2
                ">

                    {transaction.amounts.map(
                        (amount) => (
                            <span
                                key={amount.id}
                                className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface-muted)]
                                    px-2.5
                                    py-1
                                    text-xs
                                    text-[var(--text-secondary)]
                                "
                            >
                                {getMethodLabel(
                                    amount.method
                                )}

                                {" "}

                                {formatCurrency(
                                    amount.amount
                                )}
                            </span>
                        )
                    )}

                </div>


                <button
                    type="button"
                    onClick={() =>
                        onDelete(transaction.id)
                    }
                    className="
                        shrink-0
                        text-sm
                        font-medium
                        text-[var(--danger)]
                        transition
                        hover:underline
                    "
                >
                    Eliminar
                </button>

            </div>

        </article>
    );
}


export default TransactionCard;