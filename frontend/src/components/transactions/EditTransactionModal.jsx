import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import {
    updateTransaction,
    getClients,
    createClient,
    getTransactionLabel,
} from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function createEmptyOperation() {
    return {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: "sale",
        exchangeAmount: "",
        amounts: [
            {
                method: "cash",
                amount: "",
            },
        ],
    };
}

function EditTransactionModal({
    isOpen,
    onClose,
    transaction,
    onSuccess,
}) {
    const [client, setClient] = useState(null);
    const [description, setDescription] = useState("");
    const [operations, setOperations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Client autocomplete state
    const [clientQuery, setClientQuery] = useState("");
    const [clientsList, setClientsList] = useState([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    useEffect(() => {
        if (isOpen && transaction) {
            setClient(transaction.client || null);
            setClientQuery(transaction.client?.name || "");
            setDescription(transaction.description || "");

            const initialOps = (transaction.operations || []).map((op) => ({
                id: op.id || `temp-${Math.random()}`,
                type: op.type || "sale",
                exchangeAmount: op.exchange_amount ? String(Math.round(Number(op.exchange_amount))) : "",
                amounts: (op.amounts || []).map((a) => ({
                    id: a.id,
                    method: a.method || "cash",
                    amount: a.amount ? String(Math.round(Number(a.amount))) : "",
                })),
            }));

            setOperations(initialOps.length > 0 ? initialOps : [createEmptyOperation()]);
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        let active = true;
        if (clientQuery.trim() && showClientDropdown) {
            setIsSearchingClient(true);
            getClients(clientQuery.trim())
                .then((data) => {
                    if (active) {
                        setClientsList(data || []);
                    }
                })
                .catch(() => {})
                .finally(() => {
                    if (active) setIsSearchingClient(false);
                });
        } else {
            setClientsList([]);
        }
        return () => {
            active = false;
        };
    }, [clientQuery, showClientDropdown]);

    if (!isOpen || !transaction) return null;

    function handleAddOperation() {
        setOperations((prev) => [...prev, createEmptyOperation()]);
    }

    function handleRemoveOperation(index) {
        if (operations.length <= 1) return;
        setOperations((prev) => prev.filter((_, i) => i !== index));
    }

    function handleUpdateOperation(index, field, value) {
        setOperations((prev) =>
            prev.map((op, i) => {
                if (i !== index) return op;
                return { ...op, [field]: value };
            })
        );
    }

    function handleAddAmount(opIndex) {
        setOperations((prev) =>
            prev.map((op, i) => {
                if (i !== opIndex) return op;
                return {
                    ...op,
                    amounts: [...op.amounts, { method: "cash", amount: "" }],
                };
            })
        );
    }

    function handleRemoveAmount(opIndex, amountIndex) {
        setOperations((prev) =>
            prev.map((op, i) => {
                if (i !== opIndex) return op;
                if (op.amounts.length <= 1) return op;
                return {
                    ...op,
                    amounts: op.amounts.filter((_, ai) => ai !== amountIndex),
                };
            })
        );
    }

    function handleUpdateAmount(opIndex, amountIndex, field, value) {
        setOperations((prev) =>
            prev.map((op, i) => {
                if (i !== opIndex) return op;
                const newAmounts = op.amounts.map((a, ai) => {
                    if (ai !== amountIndex) return a;
                    return { ...a, [field]: value };
                });
                return { ...op, amounts: newAmounts };
            })
        );
    }

    const hasDebtOrPayment = operations.some(
        (op) =>
            op.type === "payment" ||
            op.amounts.some((a) => a.method === "debt" && Number(a.amount) > 0)
    );

    const grandTotal = operations.reduce((sum, op) => {
        return (
            sum +
            op.amounts.reduce((opSum, a) => opSum + (Number(a.amount) || 0), 0)
        );
    }, 0);

    async function handleSubmit(e) {
        e.preventDefault();

        if (hasDebtOrPayment && !client) {
            toast.error("Las operaciones con fiado o pago de fiado requieren asignar un cliente.");
            return;
        }

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const validAmounts = op.amounts.filter(
                (a) => a.amount !== "" && Number(a.amount) > 0
            );
            if (validAmounts.length === 0) {
                toast.error(`La operación #${i + 1} (${getTransactionLabel(op.type)}) requiere al menos un monto válido.`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            let resolvedClientId = client?.id || null;
            if (client && !client.id && client.name) {
                const created = await createClient({ name: client.name });
                resolvedClientId = created.id;
            }

            const formattedOperations = operations.map((op) => {
                const validAmounts = op.amounts
                    .filter((a) => a.amount !== "" && Number(a.amount) > 0)
                    .map((a) => ({
                        method: a.method,
                        amount: Number(a.amount),
                    }));

                const isExchange = op.type === "exchange";
                const exchangeNum = Number(op.exchangeAmount) || 0;
                const exchangeFee = Math.round(exchangeNum * 0.1);
                const exchangeClientAmount = Math.max(0, exchangeNum - exchangeFee);

                return {
                    type: op.type,
                    exchange_amount: isExchange ? exchangeClientAmount : null,
                    amounts: validAmounts,
                };
            });

            const payload = {
                client: resolvedClientId,
                description: description.trim(),
                operations: formattedOperations,
            };

            const updated = await updateTransaction(transaction.id, payload);
            toast.success("Transacción actualizada con éxito.");
            if (onSuccess) {
                onSuccess(updated);
            }
            onClose();
        } catch (error) {
            console.error(error);
            const msg =
                error.response?.data?.detail ||
                error.response?.data?.client?.[0] ||
                "No se pudo actualizar la transacción.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/60
            p-4
        ">
            <div className="
                flex
                max-h-[90vh]
                w-full
                max-w-2xl
                flex-col
                border
                border-[var(--border)]
                bg-[var(--surface)]
                shadow-2xl
            ">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Editar Movimiento
                        </p>
                        <h2 className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">
                            Transacción #{transaction.id}
                        </h2>
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-[var(--text-secondary)]">
                            Total corregido
                        </span>
                        <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                            {formatCurrency(grandTotal)}
                        </p>
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <form id="edit-transaction-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* CLIENT SELECTION */}
                    <div className="border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4 rounded-md">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Cliente asignado {hasDebtOrPayment && <span className="text-[var(--danger)]">* (Requerido)</span>}
                        </label>

                        {client ? (
                            <div className="mt-2 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                                <div>
                                    <span className="text-xs text-[var(--text-secondary)]">Cliente:</span>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">{client.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setClient(null);
                                        setClientQuery("");
                                    }}
                                    className="text-xs font-semibold text-[var(--danger)] hover:underline"
                                >
                                    Quitar / Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="relative mt-2">
                                <input
                                    type="text"
                                    value={clientQuery}
                                    onChange={(e) => {
                                        setClientQuery(e.target.value);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => setShowClientDropdown(true)}
                                    placeholder="Buscar cliente o escribir nombre nuevo..."
                                    className="
                                        w-full
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
                                />

                                {showClientDropdown && clientQuery.trim() && (
                                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                                        {clientsList.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setClient(c);
                                                    setClientQuery(c.name);
                                                    setShowClientDropdown(false);
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
                                            >
                                                {c.name} {c.phone ? `(${c.phone})` : ""}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setClient({ name: clientQuery.trim() });
                                                setShowClientDropdown(false);
                                            }}
                                            className="w-full border-t border-[var(--border)] px-3 py-2 text-left text-xs font-bold text-[var(--primary)] hover:bg-[var(--surface-accent)]"
                                        >
                                            + Crear cliente "{clientQuery.trim()}"
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DESCRIPTION / NOTE */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Nota / Observación
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: cigarrillos, saldo de cuenta..."
                            className="
                                mt-1
                                w-full
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
                        />
                    </div>

                    {/* OPERATIONS LIST */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Operaciones ({operations.length})
                            </label>
                            <button
                                type="button"
                                onClick={handleAddOperation}
                                className="text-xs font-bold text-[var(--primary)] hover:underline"
                            >
                                + Agregar operación
                            </button>
                        </div>

                        {operations.map((op, opIndex) => {
                            const isExchange = op.type === "exchange";

                            return (
                                <div
                                    key={op.id}
                                    className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-md space-y-4"
                                >
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                        <span className="text-xs font-bold text-[var(--text-primary)]">
                                            Operación #{opIndex + 1}
                                        </span>
                                        {operations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOperation(opIndex)}
                                                className="text-xs font-medium text-[var(--danger)] hover:underline"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>

                                    {/* TYPE PILLS */}
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                                        {[
                                            { value: "sale", label: "Venta" },
                                            { value: "sube", label: "Carga SUBE" },
                                            { value: "phone", label: "Celular" },
                                            { value: "exchange", label: "Cambio" },
                                            { value: "payment", label: "Pago fiado" },
                                        ].map((t) => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() =>
                                                    handleUpdateOperation(opIndex, "type", t.value)
                                                }
                                                className={`
                                                    rounded-sm
                                                    py-1.5
                                                    text-xs
                                                    font-semibold
                                                    transition
                                                    ${
                                                        op.type === t.value
                                                            ? "bg-[var(--primary)] text-white shadow-xs"
                                                            : "border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                    }
                                                `}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* EXCHANGE AMOUNT */}
                                    {isExchange && (
                                        <div className="rounded-md bg-[var(--surface-accent)]/30 p-3">
                                            <label className="block text-xs font-medium text-[var(--text-secondary)]">
                                                Monto sobre el que se calcula la comisión (10%):
                                            </label>
                                            <div className="relative mt-1">
                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                    $
                                                </span>
                                                <MoneyInput
                                                    value={op.exchangeAmount}
                                                    onChange={(e) =>
                                                        handleUpdateOperation(
                                                            opIndex,
                                                            "exchangeAmount",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="0"
                                                    className="
                                                        w-full
                                                        rounded-md
                                                        border
                                                        border-[var(--border)]
                                                        bg-[var(--background)]
                                                        py-1.5
                                                        pl-7
                                                        pr-3
                                                        text-sm
                                                        tabular-nums
                                                        text-[var(--text-primary)]
                                                        outline-none
                                                        focus:border-[var(--primary)]
                                                    "
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* AMOUNTS & METHODS */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                                Montos y medios de pago
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleAddAmount(opIndex)}
                                                className="text-xs font-medium text-[var(--primary)] hover:underline"
                                            >
                                                + Dividir pago
                                            </button>
                                        </div>

                                        {op.amounts.map((amountItem, amountIndex) => (
                                            <div
                                                key={amountIndex}
                                                className="flex items-center gap-2"
                                            >
                                                <select
                                                    value={amountItem.method}
                                                    onChange={(e) =>
                                                        handleUpdateAmount(
                                                            opIndex,
                                                            amountIndex,
                                                            "method",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="
                                                        w-32
                                                        shrink-0
                                                        rounded-md
                                                        border
                                                        border-[var(--border)]
                                                        bg-[var(--background)]
                                                        px-2.5
                                                        py-1.5
                                                        text-xs
                                                        text-[var(--text-primary)]
                                                        outline-none
                                                        focus:border-[var(--primary)]
                                                    "
                                                >
                                                    <option value="cash">Efectivo</option>
                                                    <option value="transfer">Transferencia</option>
                                                    <option value="card">Tarjeta</option>
                                                    {op.type !== "payment" && (
                                                        <option value="debt">Fiado</option>
                                                    )}
                                                </select>

                                                <div className="relative flex-1">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                        $
                                                    </span>
                                                    <MoneyInput
                                                        value={amountItem.amount}
                                                        onChange={(e) =>
                                                            handleUpdateAmount(
                                                                opIndex,
                                                                amountIndex,
                                                                "amount",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="0"
                                                        className="
                                                            w-full
                                                            rounded-md
                                                            border
                                                            border-[var(--border)]
                                                            bg-[var(--background)]
                                                            py-1.5
                                                            pl-7
                                                            pr-3
                                                            text-sm
                                                            tabular-nums
                                                            text-[var(--text-primary)]
                                                            outline-none
                                                            focus:border-[var(--primary)]
                                                        "
                                                    />
                                                </div>

                                                {op.amounts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveAmount(opIndex, amountIndex)
                                                        }
                                                        className="px-2 text-sm text-[var(--danger)] hover:underline"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </form>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="
                            rounded-md
                            border
                            border-[var(--border)]
                            px-4
                            py-2
                            text-xs
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        form="edit-transaction-form"
                        disabled={isSubmitting || grandTotal <= 0}
                        className="
                            rounded-md
                            bg-[var(--primary)]
                            px-5
                            py-2
                            text-xs
                            font-bold
                            text-white
                            transition
                            hover:bg-[var(--primary-hover)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {isSubmitting ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditTransactionModal;

