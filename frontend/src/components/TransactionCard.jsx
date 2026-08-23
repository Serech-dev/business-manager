import { useState } from "react";
import toast from "react-hot-toast";

import {
    updateTransactionAmountReceived,
    getMethodLabel,
    getTransactionLabel,
} from "../services/business";

import {
    formatCurrency,
} from "../utils/formatCurrency";


function TransactionCard({
    transaction,
    onDelete,
    onTransactionUpdate,
}) {
    const [updatingAmountId, setUpdatingAmountId] =
        useState(null);


    async function handleReceivedChange(
        amount
    ) {
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


    return (
        <article className="
            border
            border-[var(--border)]
            bg-[var(--surface)]
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


            {/* PAYMENTS */}

            <div className="
                mt-5
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
                                    gap-y-2
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
                                                    text-[var(--success-text)]
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
                                                    px-2.5
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
                                                    : "⚠ Pendiente · Marcar recibida"}
                                            </button>
                                        )}

                                    </>
                                )}

                            </div>
                        );
                    }
                )}

            </div>


            {/* FOOTER */}

            <div className="
                mt-5
                flex
                justify-end
                border-t
                border-[var(--border)]
                pt-4
            ">

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