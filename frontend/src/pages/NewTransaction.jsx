import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    createTransaction,
    createClient,
    getTransactionLabel,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";

import TransactionClient from "../components/transactions/TransactionClient";
import TransactionExchange from "../components/transactions/TransactionExchange";
import TransactionAmounts from "../components/transactions/TransactionAmounts";

function createNewOperation() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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

function NewTransaction() {
    const navigate = useNavigate();

    const [client, setClient] = useState(null);
    const [description, setDescription] = useState("");
    const [operations, setOperations] = useState([createNewOperation()]);
    const [showExtraDetails, setShowExtraDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasPaymentOperation = operations.some((op) => op.type === "payment");

    function handleAddOperation() {
        setOperations((current) => [...current, createNewOperation()]);
    }

    function handleRemoveOperation(index) {
        if (operations.length <= 1) return;
        setOperations((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function handleUpdateOperation(index, field, value) {
        setOperations((current) =>
            current.map((op, opIndex) => {
                if (opIndex !== index) return op;

                const updated = {
                    ...op,
                    [field]: value,
                };

                // If type changed, reset inapplicable exchange fields
                if (field === "type") {
                    if (value !== "exchange") {
                        updated.exchangeAmount = "";
                    }
                    if (value === "payment") {
                        setShowExtraDetails(true);
                    }
                }

                // If exchange amount changed in an exchange operation, sync default amount
                if (field === "exchangeAmount" && op.type === "exchange") {
                    updated.amounts = [
                        {
                            method: op.amounts[0]?.method || "cash",
                            amount: value,
                        },
                    ];
                }

                return updated;
            })
        );
    }

    const grandTotal = operations.reduce((total, op) => {
        return (
            total +
            (op.amounts || []).reduce(
                (sum, a) => sum + (Number(a.amount) || 0),
                0
            )
        );
    }, 0);

    async function handleSubmit(event) {
        event.preventDefault();

        // VALIDATION
        const hasDebtAmount = operations.some((op) =>
            op.amounts.some((a) => a.method === "debt" && Number(a.amount) > 0)
        );

        if ((hasPaymentOperation || hasDebtAmount) && !client) {
            toast.error(
                hasPaymentOperation
                    ? "El pago a cuenta requiere seleccionar un cliente."
                    : "Para registrar una venta a cuenta tenés que seleccionar o crear un cliente."
            );
            setShowExtraDetails(true);
            return;
        }

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const opLabel =
                operations.length > 1
                    ? `En la operación #${i + 1} (${getTransactionLabel(op.type)}): `
                    : "";

            const validAmounts = op.amounts.filter(
                (item) => item.amount !== "" && Number(item.amount) > 0
            );

            if (validAmounts.length === 0) {
                toast.error(`${opLabel}Ingresá al menos un monto válido.`);
                return;
            }

            if (
                op.type === "exchange" &&
                (!op.exchangeAmount || Number(op.exchangeAmount) <= 0)
            ) {
                toast.error(`${opLabel}Ingresá el monto de cambio.`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Auto-create client if needed
            let clientId = client?.id || null;
            if (client && !client.id && client.name) {
                const newClient = await createClient({
                    name: client.name,
                });
                clientId = newClient.id;
            }

            const resolvedOperations = [];

            for (const op of operations) {
                const validAmounts = op.amounts
                    .filter(
                        (item) => item.amount !== "" && Number(item.amount) > 0
                    )
                    .map((item) => ({
                        method: item.method,
                        amount: item.amount,
                    }));

                const isExchange = op.type === "exchange";
                const exchangeNum = Number(op.exchangeAmount) || 0;
                const exchangeFee = Math.round(exchangeNum * 0.1);
                const exchangeClientAmount = Math.max(0, exchangeNum - exchangeFee);

                resolvedOperations.push({
                    type: op.type,
                    exchange_amount: isExchange ? exchangeClientAmount : null,
                    amounts: validAmounts,
                });
            }

            const payload = {
                client: clientId,
                description: description.trim(),
                operations: resolvedOperations,
            };

            await createTransaction(payload);

            toast.success(
                operations.length > 1
                    ? "Venta registrada con éxito."
                    : "Venta registrada con éxito."
            );

            navigate("/");
        } catch (error) {
            console.error(error);
            const message =
                error.response?.data?.register ||
                error.response?.data?.client ||
                error.response?.data?.non_field_errors?.[0] ||
                "No se pudo registrar la venta.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="
            px-4
            py-6
            sm:px-8
            lg:px-12
        ">
            <div className="
                mx-auto
                max-w-3xl
            ">
                {/* PAGE HEADER */}
                <header className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[var(--border)]
                    pb-4
                ">
                    <div>
                        <p className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--primary)]
                        ">
                            Caja registradora
                        </p>

                        <h1 className="
                            mt-0.5
                            text-2xl
                            font-bold
                            tracking-tight
                            text-[var(--text-primary)]
                        ">
                            Nueva venta
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="
                            rounded-md
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            px-3.5
                            py-1.5
                            text-xs
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        Volver
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-6"
                >
                    {/* OPERATIONS LIST (FRONT AND CENTER) */}
                    <div className="space-y-5">
                        {operations.map((op, index) => {
                            const isExchange = op.type === "exchange";

                            return (
                                <article
                                    key={op.id}
                                    className="
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                        shadow-xs
                                    "
                                >
                                    {/* OPERATION CARD HEADER */}
                                    <div className="
                                        flex
                                        items-center
                                        justify-between
                                        border-b
                                        border-[var(--border)]
                                        bg-[var(--surface-accent)]/60
                                        px-5
                                        py-3
                                    ">
                                        <div className="flex items-center gap-2">
                                            <span className="
                                                flex
                                                h-5
                                                w-5
                                                items-center
                                                justify-center
                                                rounded-full
                                                bg-[var(--primary)]
                                                text-xs
                                                font-bold
                                                text-white
                                            ">
                                                {index + 1}
                                            </span>
                                            <h3 className="
                                                text-sm
                                                font-bold
                                                text-[var(--text-primary)]
                                            ">
                                                {operations.length > 1
                                                    ? `Operación #${index + 1}`
                                                    : "Detalle de la venta"}
                                            </h3>
                                        </div>

                                        {operations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveOperation(index)
                                                }
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
                                        )}
                                    </div>

                                    <div className="space-y-4 p-5">
                                        {/* TYPE SELECTOR PILLS */}
                                        <div>
                                            <label className="
                                                block
                                                text-xs
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-[var(--text-secondary)]
                                            ">
                                                Tipo de venta / servicio
                                            </label>

                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                                {[
                                                    { value: "sale", label: "Venta" },
                                                    { value: "sube", label: "Carga SUBE" },
                                                    { value: "phone", label: "Celular" },
                                                    { value: "exchange", label: "Cambio" },
                                                    { value: "payment", label: "Pago a cuenta" },
                                                ].map((t) => {
                                                    const isSelected = op.type === t.value;
                                                    return (
                                                        <button
                                                            key={t.value}
                                                            type="button"
                                                            onClick={() =>
                                                                handleUpdateOperation(
                                                                    index,
                                                                    "type",
                                                                    t.value
                                                                )
                                                            }
                                                            className={`
                                                                rounded-md
                                                                border
                                                                py-2
                                                                px-2.5
                                                                text-xs
                                                                font-semibold
                                                                transition
                                                                text-center
                                                                ${
                                                                    isSelected
                                                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                                                }
                                                            `}
                                                        >
                                                            {t.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* EXCHANGE DETAILS (IF APPLICABLE) */}
                                        {isExchange && (
                                            <TransactionExchange
                                                exchangeAmount={op.exchangeAmount}
                                                onChangeExchangeAmount={(val) =>
                                                    handleUpdateOperation(
                                                        index,
                                                        "exchangeAmount",
                                                        val
                                                    )
                                                }
                                            />
                                        )}

                                        {/* AMOUNTS & PAYMENT METHODS */}
                                        <TransactionAmounts
                                            amounts={op.amounts}
                                            onAmountsChange={(amounts) =>
                                                handleUpdateOperation(
                                                    index,
                                                    "amounts",
                                                    amounts
                                                )
                                            }
                                            disableDebt={op.type === "payment"}
                                            hasClient={Boolean(client)}
                                            onRequireClient={() => setShowExtraDetails(true)}
                                        />
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* ADD ANOTHER OPERATION BUTTON */}
                    <button
                        type="button"
                        onClick={handleAddOperation}
                        className="
                            flex
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-md
                            border
                            border-dashed
                            border-[var(--border)]
                            bg-[var(--surface)]
                            py-3
                            text-xs
                            font-semibold
                            text-[var(--text-secondary)]
                            transition
                            hover:border-[var(--primary)]
                            hover:text-[var(--primary)]
                            hover:bg-[var(--surface-accent)]
                        "
                    >
                        <span>+</span>
                        Agregar otra operación a esta venta
                    </button>

                    {/* OPTIONAL CLIENT & NOTE (COMPACT & UNCONGESTED) */}
                    <div className="
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                    ">
                        <button
                            type="button"
                            onClick={() => setShowExtraDetails(!showExtraDetails)}
                            className="
                                flex
                                w-full
                                items-center
                                justify-between
                                px-5
                                py-3.5
                                text-left
                                transition
                                hover:bg-[var(--surface-accent)]/50
                            "
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Cliente y notas
                                </span>
                                {client && (
                                    <span className="
                                        rounded
                                        bg-[var(--primary)]/10
                                        px-2
                                        py-0.5
                                        text-xs
                                        font-semibold
                                        text-[var(--primary)]
                                    ">
                                        {client.name}
                                    </span>
                                )}
                                {hasPaymentOperation && (
                                    <span className="text-xs font-semibold text-[var(--danger)]">
                                        (Obligatorio para pago a cuenta)
                                    </span>
                                )}
                            </div>

                            <span className="text-xs text-[var(--text-secondary)]">
                                {showExtraDetails || hasPaymentOperation ? "▲ Ocultar" : "▼ Modificar"}
                            </span>
                        </button>

                        {(showExtraDetails || hasPaymentOperation || client || description) && (
                            <div className="
                                border-t
                                border-[var(--border)]
                                p-5
                                space-y-4
                            ">
                                <TransactionClient
                                    selectedClient={client}
                                    onSelectClient={setClient}
                                    required={hasPaymentOperation}
                                />

                                <div>
                                    <label
                                        htmlFor="tx-description"
                                        className="
                                            block
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-[var(--text-secondary)]
                                        "
                                    >
                                        Nota o detalle general (opcional)
                                    </label>
                                    <input
                                        id="tx-description"
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ej: Descuento aplicado, Entrega de paquete, etc."
                                        className="
                                            mt-1.5
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
                                            transition
                                            placeholder:text-[var(--text-secondary)]/60
                                            focus:border-[var(--primary)]
                                            focus:ring-2
                                            focus:ring-[var(--primary)]/20
                                        "
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BOTTOM CHECKOUT ACTION BAR */}
                    <div className="
                        sticky
                        bottom-4
                        z-20
                        flex
                        flex-col
                        gap-3
                        rounded-lg
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-4
                        shadow-xl
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    ">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Total a cobrar
                            </p>
                            <p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                                {formatCurrency(grandTotal)}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/")}
                                disabled={isSubmitting}
                                className="
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-medium
                                    text-[var(--text-secondary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                    hover:text-[var(--text-primary)]
                                    disabled:opacity-50
                                "
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting || grandTotal <= 0}
                                className="
                                    rounded-md
                                    bg-[var(--primary)]
                                    px-6
                                    py-2.5
                                    text-sm
                                    font-bold
                                    text-white
                                    shadow-sm
                                    transition
                                    hover:bg-[var(--primary-hover)]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {isSubmitting
                                    ? "Registrando..."
                                    : `Registrar venta (${formatCurrency(grandTotal)})`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewTransaction;