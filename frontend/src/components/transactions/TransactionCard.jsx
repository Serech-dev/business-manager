import { useState } from "react";
import toast from "react-hot-toast";

import {
    updateTransactionAmountReceived,
    getMethodLabel,
    getTransactionLabel,
} from "../../services/business";

import { formatCurrency } from "../../utils/formatCurrency";

function formatDate(value) {
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function getTransactionTitle(transaction) {
    const operations = transaction.operations || [];
    const clientName = transaction.client?.name;
    let baseTitle = "";

    if (operations.length === 0) {
        baseTitle = `Transacción #${transaction.id}`;
    } else if (operations.length === 1) {
        const op = operations[0];
        const label = getTransactionLabel(op.type);
        const providerName = op.provider?.name;

        if (providerName) {
            baseTitle = `${label} - ${providerName}`;
        } else if (clientName) {
            baseTitle = `${label} - ${clientName}`;
        } else {
            baseTitle = label;
        }
    } else {
        const distinctLabels = [
            ...new Set(operations.map((op) => getTransactionLabel(op.type))),
        ];
        const opsSummary = distinctLabels.join(" + ");
        if (clientName) {
            baseTitle = `${opsSummary} - ${clientName}`;
        } else {
            baseTitle = opsSummary;
        }
    }

    if (transaction.description && transaction.description.trim()) {
        const cleanDesc = transaction.description.trim();
        const normBase = baseTitle.toLowerCase().replace(/[\s\-_]/g, "");
        const normDesc = cleanDesc.toLowerCase().replace(/[\s\-_]/g, "");

        if (
            normBase !== normDesc &&
            !normBase.includes(normDesc) &&
            !normDesc.includes(normBase)
        ) {
            return `${baseTitle} · ${cleanDesc}`;
        }
    }

    return baseTitle;
}

function TransactionCard({
    transaction,
    onDelete,
    onTransactionUpdate,
}) {
    const [updatingAmountId, setUpdatingAmountId] = useState(null);

    const operations = transaction.operations || [];

    // Calculate grand total if not directly provided
    const grandTotal =
        transaction.total !== undefined
            ? transaction.total
            : operations.reduce(
                (total, op) =>
                    total +
                    (op.amounts || []).reduce(
                        (sum, a) => sum + (Number(a.amount) || 0),
                        0
                    ),
                0
            );

    async function handleReceivedChange(operationId, amount) {
        setUpdatingAmountId(amount.id);

        try {
            const updatedAmount = await updateTransactionAmountReceived(
                amount.id,
                !amount.received
            );

            onTransactionUpdate({
                ...transaction,
                operations: operations.map((op) =>
                    op.id === operationId
                        ? {
                            ...op,
                            amounts: op.amounts.map((currentAmount) =>
                                currentAmount.id === amount.id
                                    ? {
                                        ...currentAmount,
                                        ...updatedAmount,
                                    }
                                    : currentAmount
                            ),
                        }
                        : op
                ),
            });

            toast.success(
                updatedAmount.received
                    ? "Transferencia marcada como recibida."
                    : "Transferencia marcada como pendiente."
            );
        } catch (error) {
            console.error(error);
            toast.error("No se pudo actualizar el estado.");
        } finally {
            setUpdatingAmountId(null);
        }
    }

    // Determine overall incoming/outgoing color
    const hasOutgoing = operations.some(
        (op) =>
            op.type === "provider" ||
            op.type === "provider_payment" ||
            op.type === "expense" ||
            op.type === "loss"
    );

    return (
        <article className="
            border
            border-[var(--border)]
            bg-[var(--surface)]
            transition
            hover:bg-[var(--surface-accent)]/30
        ">
            {/* HEADER */}
            <div className="
                flex
                items-start
                justify-between
                gap-4
                px-5
                py-4
            ">
                <div className="min-w-0">
                    <h4 className="
                        truncate
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        {getTransactionTitle(transaction)}
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
                            <span>{formatDate(transaction.created_at)}</span>
                        )}
                        <span>#{transaction.id}</span>
                        {transaction.client && (
                            <span className="font-medium text-[var(--text-primary)]">
                                · Cliente: {transaction.client.name}
                            </span>
                        )}
                        {operations.length > 1 && (
                            <span className="
                                rounded
                                bg-[var(--surface-muted)]
                                px-1.5
                                py-0.5
                                font-medium
                            ">
                                {operations.length} operaciones
                            </span>
                        )}
                    </div>
                </div>

                <div className="shrink-0 text-right">
                    <strong className={`
                        text-lg
                        font-bold
                        tabular-nums
                        ${
                            hasOutgoing
                                ? "text-[var(--danger)]"
                                : "text-[var(--success)]"
                        }
                    `}>
                        {hasOutgoing ? "-" : "+"}
                        {formatCurrency(grandTotal)}
                    </strong>
                </div>
            </div>

            {/* OPERATIONS LIST */}
            <div className="
                divide-y
                divide-[var(--border)]
                border-t
                border-[var(--border)]
            ">
                {operations.map((op, opIndex) => {
                    const opTotal =
                        op.total !== undefined
                            ? op.total
                            : (op.amounts || []).reduce(
                                (sum, a) => sum + (Number(a.amount) || 0),
                                0
                            );

                    const providerName =
                        op.type === "provider" || op.type === "provider_payment"
                            ? op.provider?.name
                            : null;

                    const isOpOutgoing =
                        op.type === "provider" ||
                        op.type === "provider_payment" ||
                        op.type === "expense" ||
                        op.type === "loss";

                    return (
                        <div
                            key={op.id || opIndex}
                            className="
                                space-y-2
                                px-5
                                py-3.5
                                bg-[var(--surface)]
                            "
                        >
                            {/* OPERATION TITLE & CONTEXT */}
                            <div className="
                                flex
                                items-center
                                justify-between
                                gap-2
                            ">
                                <div className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                    text-sm
                                ">
                                    <span className="
                                        rounded
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface-muted)]
                                        px-2
                                        py-0.5
                                        text-xs
                                        font-semibold
                                        text-[var(--text-primary)]
                                    ">
                                        {getTransactionLabel(op.type)}
                                    </span>

                                    {providerName && (
                                        <span className="
                                            text-xs
                                            font-medium
                                            text-[var(--text-secondary)]
                                        ">
                                            Proveedor:{" "}
                                            <strong className="text-[var(--text-primary)] font-semibold">
                                                {providerName}
                                            </strong>
                                        </span>
                                    )}

                                    {op.exchange_amount && (
                                        <span className="
                                            text-xs
                                            text-[var(--text-secondary)]
                                        ">
                                            · Cambio: <strong className="text-[var(--text-primary)]">{formatCurrency(op.exchange_amount)}</strong>
                                        </span>
                                    )}
                                </div>

                                <span className={`
                                    text-sm
                                    font-semibold
                                    tabular-nums
                                    ${
                                        isOpOutgoing
                                            ? "text-[var(--danger)]"
                                            : "text-[var(--text-primary)]"
                                    }
                                `}>
                                    {formatCurrency(opTotal)}
                                </span>
                            </div>

                            {/* OPERATION AMOUNTS BREAKDOWN */}
                            <div className="
                                flex
                                flex-wrap
                                items-center
                                gap-x-3
                                gap-y-1.5
                                pt-1
                                text-xs
                            ">
                                {(op.amounts || []).map((amount) => {
                                    const isTransfer = amount.method === "transfer";
                                    const isUpdating = updatingAmountId === amount.id;

                                    return (
                                        <div
                                            key={amount.id || amount.method}
                                            className="
                                                flex
                                                items-center
                                                gap-1.5
                                                rounded
                                                border
                                                border-[var(--border)]
                                                bg-[var(--background)]
                                                px-2
                                                py-1
                                            "
                                        >
                                            <span className={`
                                                font-medium
                                                ${
                                                    amount.method === "debt"
                                                        ? "text-[var(--warning)]"
                                                        : "text-[var(--text-primary)]"
                                                }
                                            `}>
                                                {getMethodLabel(amount.method)}:
                                            </span>

                                            <span className="text-[var(--text-secondary)]">
                                                {formatCurrency(amount.amount)}
                                            </span>

                                            {isTransfer && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReceivedChange(
                                                            op.id,
                                                            amount
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                    className={`
                                                        ml-1
                                                        rounded
                                                        px-1.5
                                                        py-0.5
                                                        text-[10px]
                                                        font-bold
                                                        transition
                                                        ${
                                                            amount.received
                                                                ? "bg-[var(--success)]/10 text-[var(--success)] hover:underline"
                                                                : "border border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/10"
                                                        }
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                    `}
                                                >
                                                    {isUpdating
                                                        ? "..."
                                                        : amount.received
                                                            ? "✓ Recibida"
                                                            : "Pendiente · Marcar recibida"}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FOOTER */}
            <div className="
                flex
                items-center
                justify-between
                border-t
                border-[var(--border)]
                px-5
                py-2.5
            ">
                <span className="
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    {operations.length === 1
                        ? "1 operación"
                        : `${operations.length} operaciones`}
                </span>

                <button
                    type="button"
                    onClick={() => onDelete(transaction.id)}
                    className="
                        text-xs
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