import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    createTransaction,
    createClient,
    createProvider,
    getTransactionLabel,
} from "../services/business";

import TransactionBasicInfo from "../components/transactions/TransactionBasicInfo";
import TransactionClient from "../components/transactions/TransactionClient";
import TransactionProvider from "../components/transactions/TransactionProvider";
import TransactionExchange from "../components/transactions/TransactionExchange";
import TransactionAmounts from "../components/transactions/TransactionAmounts";
import TransactionSummary from "../components/transactions/TransactionSummary";

function createNewOperation() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "sale",
        provider: null,
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

                // If type changed, reset inapplicable relationships / exchange fields
                if (field === "type") {
                    const newType = value;
                    if (newType !== "provider" && newType !== "provider_payment") {
                        updated.provider = null;
                    }

                    if (newType !== "exchange") {
                        updated.exchangeAmount = "";
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

    async function handleSubmit(event) {
        event.preventDefault();

        // VALIDATION
        if (hasPaymentOperation && !client) {
            toast.error(
                "El pago de fiado requiere seleccionar un cliente para la transacción."
            );
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

            if (
                (op.type === "provider" || op.type === "provider_payment") &&
                !op.provider
            ) {
                toast.error(`${opLabel}Seleccioná un proveedor.`);
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

            // Auto-create any new providers and format operations
            const resolvedOperations = [];

            for (const op of operations) {
                let providerId = op.provider?.id || null;
                if (op.provider && !op.provider.id && op.provider.name) {
                    const newProvider = await createProvider({
                        name: op.provider.name,
                    });
                    providerId = newProvider.id;
                }

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
                    provider: providerId,
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
                    ? "Operaciones registradas con éxito."
                    : "Operación registrada con éxito."
            );

            navigate("/");
        } catch (error) {
            console.error(error);
            const message =
                error.response?.data?.register ||
                error.response?.data?.client ||
                error.response?.data?.non_field_errors?.[0] ||
                "No se pudo registrar la transacción.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            px-6
            py-5
            lg:px-10
        ">
            <div className="
                mx-auto
                max-w-6xl
            ">
                {/* PAGE HEADER */}
                <header className="
                    border-b
                    border-[var(--border)]
                    pb-4
                ">
                    <div>
                        <p className="
                            text-sm
                            font-medium
                            uppercase
                            tracking-wider
                            text-[var(--primary)]
                        ">
                            Caja registradora
                        </p>

                        <h1 className="
                            mt-1
                            text-3xl
                            font-bold
                            tracking-tight
                            text-[var(--text-primary)]
                        ">
                            Nueva operación
                        </h1>

                        <p className="
                            mt-2
                            max-w-2xl
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Registrá uno o varios movimientos dentro de la caja actual.
                        </p>
                    </div>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6"
                >
                    <div className="
                        grid
                        gap-6
                        lg:grid-cols-[minmax(0,1fr)_340px]
                        lg:items-start
                    ">
                        {/* LEFT COLUMN: GENERAL INFO & OPERATIONS */}
                        <div className="space-y-6">
                            {/* GENERAL TRANSACTION INFO & CLIENT */}
                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                p-5
                                shadow-sm
                                space-y-4
                            ">
                                <h2 className="
                                    text-base
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Datos de la transacción
                                </h2>

                                <TransactionClient
                                    selectedClient={client}
                                    onSelectClient={setClient}
                                    required={hasPaymentOperation}
                                />

                                <TransactionBasicInfo
                                    description={description}
                                    onChangeDescription={setDescription}
                                />
                            </section>

                            {/* OPERATIONS LIST */}
                            <div className="space-y-6">
                                {operations.map((op, index) => {
                                    const isProvider =
                                        op.type === "provider" ||
                                        op.type === "provider_payment";

                                    const isExchange = op.type === "exchange";

                                    return (
                                        <article
                                            key={op.id}
                                            className="
                                                border
                                                border-[var(--border)]
                                                bg-[var(--surface)]
                                                shadow-sm
                                            "
                                        >
                                            {/* OPERATION CARD HEADER */}
                                            <div className="
                                                flex
                                                items-center
                                                justify-between
                                                border-b
                                                border-[var(--border)]
                                                bg-[var(--surface-accent)]/50
                                                px-6
                                                py-3.5
                                            ">
                                                <div className="flex items-center gap-2">
                                                    <span className="
                                                        flex
                                                        h-6
                                                        w-6
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
                                                        font-semibold
                                                        text-[var(--text-primary)]
                                                    ">
                                                        Operación #{index + 1}
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
                                                        Eliminar operación
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-4 p-5">
                                                {/* TYPE SELECTOR */}
                                                <div>
                                                    <label
                                                        htmlFor={`type-${op.id}`}
                                                        className="
                                                            text-sm
                                                            font-medium
                                                            text-[var(--text-primary)]
                                                        "
                                                    >
                                                        Tipo de operación
                                                    </label>

                                                    <select
                                                        id={`type-${op.id}`}
                                                        value={op.type}
                                                        onChange={(event) =>
                                                            handleUpdateOperation(
                                                                index,
                                                                "type",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="
                                                            mt-2
                                                            w-full
                                                            rounded-md
                                                            border
                                                            border-[var(--border)]
                                                            bg-[var(--background)]
                                                            px-3
                                                            py-2.5
                                                            text-sm
                                                            text-[var(--text-primary)]
                                                            outline-none
                                                            transition
                                                            focus:border-[var(--primary)]
                                                            focus:ring-2
                                                            focus:ring-[var(--primary)]/20
                                                        "
                                                    >
                                                        <option value="sale">
                                                            Venta
                                                        </option>
                                                        <option value="sube">
                                                            Carga SUBE
                                                        </option>
                                                        <option value="phone">
                                                            Carga de celular
                                                        </option>
                                                        <option value="exchange">
                                                            Cambio
                                                        </option>
                                                        <option value="payment">
                                                            Pago de fiado
                                                        </option>
                                                        <option value="provider">
                                                            Proveedor
                                                        </option>
                                                        <option value="provider_payment">
                                                            Pago a proveedor
                                                        </option>
                                                        <option value="expense">
                                                            Gasto
                                                        </option>
                                                        <option value="loss">
                                                            Pérdida
                                                        </option>
                                                    </select>
                                                </div>

                                                {/* PROVIDER */}
                                                {isProvider && (
                                                    <TransactionProvider
                                                        selectedProvider={op.provider}
                                                        onSelectProvider={(provider) =>
                                                            handleUpdateOperation(
                                                                index,
                                                                "provider",
                                                                provider
                                                            )
                                                        }
                                                        required={true}
                                                    />
                                                )}

                                                {/* EXCHANGE DETAILS */}
                                                {isExchange && (
                                                    <TransactionExchange
                                                        exchangeAmount={
                                                            op.exchangeAmount
                                                        }
                                                        onChangeExchangeAmount={(
                                                            val
                                                        ) =>
                                                            handleUpdateOperation(
                                                                index,
                                                                "exchangeAmount",
                                                                val
                                                            )
                                                        }
                                                    />
                                                )}

                                                {/* AMOUNTS & METHODS */}
                                                <TransactionAmounts
                                                    amounts={op.amounts}
                                                    onAmountsChange={(amounts) =>
                                                        handleUpdateOperation(
                                                            index,
                                                            "amounts",
                                                            amounts
                                                        )
                                                    }
                                                    disableDebt={
                                                        op.type === "payment" ||
                                                        op.type ===
                                                            "provider_payment"
                                                    }
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {/* ADD OPERATION BUTTON */}
                            <button
                                type="button"
                                onClick={handleAddOperation}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-lg
                                    border-2
                                    border-dashed
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                    py-4
                                    text-sm
                                    font-semibold
                                    text-[var(--primary)]
                                    transition
                                    hover:border-[var(--primary)]
                                    hover:bg-[var(--surface-accent)]
                                "
                            >
                                <span className="text-lg leading-none">+</span>
                                Agregar otra operación a esta transacción
                            </button>
                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <TransactionSummary
                            client={client}
                            operations={operations}
                            isSubmitting={isSubmitting}
                            onCancel={() => navigate("/")}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewTransaction;