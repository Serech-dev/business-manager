import { useState } from "react";
import toast from "react-hot-toast";

import {
    updateTransactionAmountReceived,
    getMethodLabel,
    getTransactionLabel,
} from "../../services/business";

import { formatCurrency } from "../../utils/formatCurrency";
import EditTransactionModal from "./EditTransactionModal";
import ReceiptModal from "./ReceiptModal";
import { useDeviceSecurity } from "../../context/DeviceSecurityContext";

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
    const { requireOwnerAccess } = useDeviceSecurity();
    const [updatingAmountId, setUpdatingAmountId] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
            overflow-hidden
            rounded-xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            shadow-xs
            transition-all
            duration-200
            hover:border-[var(--primary)]/35
            hover:shadow-sm
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
                                bg-[var(--surface-accent)]/20
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

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsReceiptModalOpen(true)}
                        className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-[var(--border)]
                            bg-[var(--surface-accent)]/50
                            px-2.5
                            py-1
                            text-xs
                            font-semibold
                            text-[var(--text-primary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--primary)]
                        "
                        title="Imprimir ticket / comprobante de venta"
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.19-.37 3.229M6.72 13.829l-1.92 8.32a.75.75 0 0 0 .96.88l3.48-1.16 3.48 1.16a.75.75 0 0 0 .48 0l3.48-1.16 3.48 1.16a.75.75 0 0 0 .96-.88l-1.92-8.32"
                            />
                        </svg>
                        <span>Ticket</span>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            requireOwnerAccess(() => setIsEditModalOpen(true))
                        }
                        className="
                            rounded-lg
                            border
                            border-[var(--border)]
                            bg-[var(--surface-accent)]/50
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-[var(--text-primary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--primary)]
                        "
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onClick={() => onDelete(transaction.id)}
                        className="
                            rounded-lg
                            border
                            border-[var(--border)]
                            bg-[var(--surface-accent)]/50
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-[var(--danger)]
                            transition
                            hover:bg-[var(--danger)]/10
                            hover:border-[var(--danger)]/30
                        "
                    >
                        Eliminar
                    </button>
                </div>
            </div>

            {/* RECEIPT MODAL */}
            {isReceiptModalOpen && (
                <ReceiptModal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    transaction={transaction}
                />
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <EditTransactionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    transaction={transaction}
                    onSuccess={(updated) => {
                        if (onTransactionUpdate) {
                            onTransactionUpdate(updated);
                        }
                    }}
                />
            )}
        </article>
    );
}

export default TransactionCard;