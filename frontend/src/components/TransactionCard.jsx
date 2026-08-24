import { useState } from "react";
import toast from "react-hot-toast";

import {
    updateTransactionAmountReceived,
    getMethodLabel,
    getTransactionLabel,
} from "../services/business";

import { formatCurrency } from "../utils/formatCurrency";


function formatDate(value) {
    return new Intl.DateTimeFormat(
        "es-AR",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    ).format(new Date(value));
}


function TransactionCard({
    transaction,
    onDelete,
    onTransactionUpdate,
}) {
    const [updatingAmountId, setUpdatingAmountId] =
        useState(null);


    async function handleReceivedChange(amount) {
        setUpdatingAmountId(amount.id);

        try {
            const updatedAmount =
                await updateTransactionAmountReceived(
                    amount.id,
                    !amount.received
                );

            onTransactionUpdate({
                ...transaction,
                amounts: transaction.amounts.map(
                    (currentAmount) =>
                        currentAmount.id === amount.id
                            ? {
                                ...currentAmount,
                                ...updatedAmount,
                            }
                            : currentAmount
                ),
            });
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo actualizar el estado."
            );
        } finally {
            setUpdatingAmountId(null);
        }
    }


    const isProvider =
        transaction.type === "provider";

    const isLoss =
        transaction.type === "loss";

    const isPayment =
        transaction.type === "payment";

    const isIncoming =
        !isProvider &&
        !isLoss;

    const title = isProvider
        ? `Proveedor · ${transaction.provider?.name || "Sin proveedor"}`
        : transaction.client?.name
            ? `${getTransactionLabel(transaction.type)} · ${transaction.client.name}`
            : getTransactionLabel(transaction.type);


    return (
        <article className="
            border
            border-[var(--border)]
            bg-[var(--surface)]
            transition
            hover:bg-[var(--surface-accent)]
        ">

            {/* HEADER */}

            <div className="
                flex
                items-start
                justify-between
                gap-5
                px-5
                py-4
            ">

                <div className="min-w-0">

                    <h4 className="
                        truncate
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        {title}
                    </h4>


                    <div className="
                        mt-1
                        flex
                        flex-wrap
                        items-center
                        gap-x-2
                        gap-y-1
                        text-xs
                        text-[var(--text-secondary)]
                    ">

                        {transaction.created_at && (
                            <span>
                                {formatDate(
                                    transaction.created_at
                                )}
                            </span>
                        )}

                        <span>
                            #{transaction.id}
                        </span>

                    </div>

                </div>


                <div className="
                    shrink-0
                    text-right
                ">

                    <strong className={`
                        text-lg
                        font-semibold
                        ${
                            isIncoming
                                ? "text-[var(--success)]"
                                : isLoss || isProvider
                                    ? "text-[var(--danger)]"
                                    : "text-[var(--text-primary)]"
                        }
                    `}>
                        {isIncoming ? "+" : "-"}
                        {formatCurrency(
                            transaction.total
                        )}
                    </strong>

                </div>

            </div>


            {/* DESCRIPTION */}

            {transaction.description && (
                <div className="
                    border-t
                    border-[var(--border)]
                    px-5
                    py-3
                ">
                    <p className="
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        {transaction.description}
                    </p>
                </div>
            )}


            {/* CONTEXT */}

            {(transaction.exchange_amount ||
                transaction.provider?.name ||
                transaction.client?.name) && (

                <div className="
                    flex
                    flex-wrap
                    gap-x-5
                    gap-y-2
                    border-t
                    border-[var(--border)]
                    px-5
                    py-3
                    text-sm
                ">

                    {transaction.client?.name && (
                        <div>
                            <span className="
                                text-[var(--text-secondary)]
                            ">
                                Cliente:{" "}
                            </span>

                            <span className="
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                {transaction.client.name}
                            </span>
                        </div>
                    )}


                    {transaction.provider?.name && (
                        <div>
                            <span className="
                                text-[var(--text-secondary)]
                            ">
                                Proveedor:{" "}
                            </span>

                            <span className="
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                {transaction.provider.name}
                            </span>
                        </div>
                    )}


                    {transaction.exchange_amount && (
                        <div>
                            <span className="
                                text-[var(--text-secondary)]
                            ">
                                Cambio:{" "}
                            </span>

                            <span className="
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                {formatCurrency(
                                    transaction.exchange_amount
                                )}
                            </span>
                        </div>
                    )}

                </div>
            )}


            {/* PAYMENTS */}

            <div className="
                border-t
                border-[var(--border)]
                px-5
                py-3
            ">

                <div className="
                    space-y-2
                ">

                    {transaction.amounts.map(
                        (amount) => {

                            const isTransfer =
                                amount.method === "transfer";

                            const isUpdating =
                                updatingAmountId ===
                                amount.id;


                            return (
                                <div
                                    key={amount.id}
                                    className="
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-x-3
                                        gap-y-1
                                        text-sm
                                    "
                                >

                                    <span className="
                                        font-medium
                                        text-[var(--text-primary)]
                                    ">
                                        {getMethodLabel(
                                            amount.method
                                        )}
                                    </span>


                                    <span className="
                                        text-[var(--text-secondary)]
                                    ">
                                        {formatCurrency(
                                            amount.amount
                                        )}
                                    </span>


                                    {amount.method === "debt" && (
                                        <span className="
                                            text-xs
                                            font-medium
                                            text-[var(--warning)]
                                        ">
                                            Fiado
                                        </span>
                                    )}


                                    {isTransfer && (
                                        <>
                                            <span className="
                                                text-[var(--text-secondary)]
                                            ">
                                                ·
                                            </span>

                                            {amount.received ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReceivedChange(
                                                            amount
                                                        )
                                                    }
                                                    disabled={
                                                        isUpdating
                                                    }
                                                    className="
                                                        text-xs
                                                        font-semibold
                                                        text-[var(--success)]
                                                        transition
                                                        hover:underline
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                    "
                                                >
                                                    ✓ Recibida
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReceivedChange(
                                                            amount
                                                        )
                                                    }
                                                    disabled={
                                                        isUpdating
                                                    }
                                                    className="
                                                        border
                                                        border-[var(--warning)]
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        font-semibold
                                                        text-[var(--warning)]
                                                        transition
                                                        hover:bg-[var(--surface-accent)]
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                    "
                                                >
                                                    {isUpdating
                                                        ? "Actualizando..."
                                                        : "Pendiente · Marcar recibida"}
                                                </button>
                                            )}

                                        </>
                                    )}

                                </div>
                            );
                        }
                    )}

                </div>

            </div>


            {/* FOOTER */}

            <div className="
                flex
                items-center
                justify-between
                border-t
                border-[var(--border)]
                px-5
                py-3
            ">

                <span className="
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    {isPayment
                        ? "Pago de deuda"
                        : isLoss
                            ? "Salida de caja"
                            : isProvider
                                ? "Salida de caja"
                                : "Movimiento"}
                </span>


                <button
                    type="button"
                    onClick={() =>
                        onDelete(transaction.id)
                    }
                    className="
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