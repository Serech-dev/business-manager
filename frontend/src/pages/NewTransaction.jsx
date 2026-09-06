import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    createTransaction,
    createClient,
    getProducts,
    getCategories,
    getTransactionLabel,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";

import TransactionClient from "../components/transactions/TransactionClient";
import TransactionExchange from "../components/transactions/TransactionExchange";
import TransactionAmounts from "../components/transactions/TransactionAmounts";
import SaleProductSelector from "../components/transactions/SaleProductSelector";
import TransactionChangeCalculator from "../components/transactions/TransactionChangeCalculator";
import ReceiptModal from "../components/transactions/ReceiptModal";

function createNewOperation() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "sale",
        exchangeAmount: "",
        items: [],
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

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [client, setClient] = useState(null);
    const [description, setDescription] = useState("");
    const [receivedCash, setReceivedCash] = useState("");
    const [operations, setOperations] = useState([createNewOperation()]);
    const [showExtraDetails, setShowExtraDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Post-sale completion & ticket modal
    const [printTicketOnSave, setPrintTicketOnSave] = useState(() => {
        return localStorage.getItem("bm_print_ticket_on_save") === "true";
    });
    const [completedSale, setCompletedSale] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        async function loadCatalog() {
            try {
                const [prodsData, catsData] = await Promise.all([
                    getProducts(),
                    getCategories(),
                ]);
                setProducts(prodsData);
                setCategories(catsData);
            } catch (err) {
                console.error("Error loading products catalog for sale:", err);
            }
        }
        loadCatalog();
    }, []);

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

    function handleUpdateOperationItems(index, items) {
        setOperations((current) =>
            current.map((op, opIndex) => {
                if (opIndex !== index) return op;

                const cartTotal = items.reduce((sum, it) => sum + it.subtotal, 0);
                let updatedAmounts = [...op.amounts];

                if (items.length > 0) {
                    if (updatedAmounts.length === 1) {
                        updatedAmounts[0] = {
                            ...updatedAmounts[0],
                            amount: cartTotal > 0 ? String(cartTotal) : "",
                        };
                    }
                }

                return {
                    ...op,
                    items,
                    amounts: updatedAmounts,
                };
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

    const totalCashDue = operations.reduce((sum, op) => {
        return (
            sum +
            (op.amounts || [])
                .filter((a) => a.method === "cash")
                .reduce((s, a) => s + (Number(a.amount) || 0), 0)
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

            // Auto-generate description from cart items if no custom description is provided
            let finalDescription = description.trim();
            if (!finalDescription) {
                const itemSummaries = [];
                for (const op of operations) {
                    if (op.type === "sale" && op.items && op.items.length > 0) {
                        for (const it of op.items) {
                            if (it.unitType === "unit") {
                                itemSummaries.push(
                                    `${it.quantity > 1 ? `${it.quantity} ` : ""}${it.product.name}`
                                );
                            } else {
                                const weightStr =
                                    it.grams >= 1000
                                        ? `${(it.grams / 1000).toFixed(2).replace(/\.?0+$/, "")}kg`
                                        : `${it.grams}g`;
                                itemSummaries.push(`${weightStr} ${it.product.name}`);
                            }
                        }
                    }
                }
                if (itemSummaries.length > 0) {
                    finalDescription = itemSummaries.join(", ");
                }
            }

            // Append cash change note if cash payment was given with change
            const receivedNum = Number(receivedCash) || 0;
            if (totalCashDue > 0 && receivedNum > totalCashDue) {
                const change = receivedNum - totalCashDue;
                const changeNote = `(Pagó ${formatCurrency(receivedNum)} · Vuelto ${formatCurrency(change)})`;
                if (finalDescription) {
                    finalDescription = `${finalDescription} · ${changeNote}`;
                } else {
                    finalDescription = changeNote;
                }
            }

            const payload = {
                client: clientId,
                description: finalDescription,
                operations: resolvedOperations,
            };

            const createdTx = await createTransaction(payload);

            toast.success("Venta registrada con éxito.");

            if (printTicketOnSave) {
                // Collect cart items for receipt printing
                const allCartItems = operations
                    .flatMap((op) => op.items || [])
                    .filter(Boolean);

                setCompletedSale({
                    transaction: {
                        ...createdTx,
                        client: client?.name || (typeof client === "string" ? client : null) || createdTx?.client,
                        description: finalDescription,
                    },
                    items: allCartItems,
                });
                setShowSuccessModal(true);
            } else {
                navigate("/");
            }
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

    function handleResetForm() {
        setOperations([createNewOperation()]);
        setClient(null);
        setDescription("");
        setReceivedCash("");
        setShowExtraDetails(false);
        setCompletedSale(null);
        setShowSuccessModal(false);
        setShowReceiptModal(false);
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

                                        {/* PRODUCT SELECTION & WEIGHT CALCULATOR (FOR SALES) */}
                                        {op.type === "sale" && (
                                            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/20 p-4">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                                    Productos
                                                </label>
                                                <SaleProductSelector
                                                    products={products}
                                                    categories={categories}
                                                    items={op.items || []}
                                                    onItemsChange={(newItems) =>
                                                        handleUpdateOperationItems(index, newItems)
                                                    }
                                                />
                                            </div>
                                        )}

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
                                            targetTotal={
                                                op.type === "sale" && op.items && op.items.length > 0
                                                    ? op.items.reduce((s, it) => s + it.subtotal, 0)
                                                    : (op.type === "exchange" ? Number(op.exchangeAmount) || 0 : 0)
                                            }
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

                    {/* CASH CHANGE CALCULATOR (VUELTO) */}
                    {totalCashDue > 0 && (
                        <TransactionChangeCalculator
                            totalCashDue={totalCashDue}
                            grandTotal={grandTotal}
                            receivedCash={receivedCash}
                            onReceivedCashChange={setReceivedCash}
                        />
                    )}

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
                        bottom-3
                        z-20
                        flex
                        flex-col
                        gap-2.5
                        rounded-xl
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-3
                        shadow-xl
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        sm:px-4
                        sm:py-3
                    ">
                        <div className="flex items-baseline justify-between gap-3 sm:block">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Total a cobrar
                            </p>
                            <p className="text-xl font-bold tabular-nums text-[var(--text-primary)] sm:mt-0.5 sm:text-2xl">
                                {formatCurrency(grandTotal)}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                            {/* CUSTOM PRINT TICKET SWITCH TOGGLE */}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !printTicketOnSave;
                                    setPrintTicketOnSave(next);
                                    localStorage.setItem(
                                        "bm_print_ticket_on_save",
                                        next ? "true" : "false"
                                    );
                                }}
                                className={`
                                    group
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-lg
                                    border
                                    px-2.5
                                    py-1.5
                                    text-xs
                                    font-semibold
                                    transition
                                    select-none
                                    ${
                                        printTicketOnSave
                                            ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--surface-accent)]/40 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                    }
                                `}
                                title="Activar para emitir comprobante / ticket al registrar la venta"
                            >
                                {/* Micro slider track */}
                                <span
                                    className={`
                                        relative
                                        inline-flex
                                        h-4
                                        w-7
                                        shrink-0
                                        items-center
                                        rounded-full
                                        p-0.5
                                        transition-colors
                                        duration-200
                                        ease-in-out
                                        ${
                                            printTicketOnSave
                                                ? "bg-[var(--primary)]"
                                                : "bg-neutral-600/40 dark:bg-neutral-600/60"
                                        }
                                    `}
                                >
                                    <span
                                        className={`
                                            inline-block
                                            h-3
                                            w-3
                                            rounded-full
                                            bg-white
                                            shadow-xs
                                            transition-transform
                                            duration-200
                                            ease-in-out
                                            ${printTicketOnSave ? "translate-x-3" : "translate-x-0"}
                                        `}
                                    />
                                </span>

                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                    <svg
                                        className="h-3.5 w-3.5 shrink-0"
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
                                    <span>Imprimir ticket</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/")}
                                disabled={isSubmitting}
                                className="
                                    rounded-lg
                                    border
                                    border-[var(--border)]
                                    px-3.5
                                    py-2
                                    text-xs
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
                                    rounded-lg
                                    bg-[var(--primary)]
                                    px-5
                                    py-2
                                    text-xs
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

                {/* POST-SALE SUCCESS & RECEIPT PROMPT MODAL */}
                {showSuccessModal && completedSale && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                            onClick={() => navigate("/")}
                        />
                        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
                            <div className="text-center space-y-2">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m4.5 12.75 6 6 9-13.5"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                    ¡Venta Registrada!
                                </h3>
                                <p className="text-3xl font-extrabold text-[var(--primary)] tabular-nums">
                                    {formatCurrency(completedSale.transaction.total || grandTotal)}
                                </p>
                                {completedSale.transaction.client && (
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Cliente:{" "}
                                        <span className="font-semibold text-[var(--text-primary)]">
                                            {typeof completedSale.transaction.client === "object"
                                                ? completedSale.transaction.client.name
                                                : completedSale.transaction.client}
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="space-y-2.5 pt-2 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setShowReceiptModal(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 px-4 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98"
                                >
                                    <svg
                                        className="h-4 w-4"
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
                                    <span>Imprimir Ticket</span>
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResetForm}
                                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] py-2.5 px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                                    >
                                        + Nueva Venta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/")}
                                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] py-2.5 px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        Ir al Inicio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RECEIPT MODAL */}
                {completedSale && (
                    <ReceiptModal
                        isOpen={showReceiptModal}
                        onClose={() => setShowReceiptModal(false)}
                        transaction={completedSale.transaction}
                        items={completedSale.items}
                    />
                )}
            </div>
        </div>
    );
}

export default NewTransaction;