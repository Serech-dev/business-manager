import { useState, useEffect, useCallback } from "react";
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
import ReceiptModal from "../components/transactions/ReceiptModal";
import OnboardingTour from "../components/onboarding/OnboardingTour";

const NEW_SALE_TOUR_STEPS = [
    {
        target: '[data-tour="sale-type-selector"]',
        title: "Tipo de Operación",
        content: "Elegí entre venta de productos, carga SUBE, recarga de celular, cambio de dinero o cobro de libreta (pago a cuenta).",
        position: "bottom",
    },
    {
        target: '[data-tour="sale-product-search"]',
        title: "Buscador & Lector de Barras",
        content: "Buscá artículos por nombre o pasá el código de barras con tu lector físico. También podés pulsar '/' para buscar directo.",
        position: "bottom",
    },
    {
        target: '[data-tour="sale-manual-amount"]',
        title: "Monto Manual / Varios",
        content: "Para artículos sueltos o no registrados, ingresá el monto acá y se sumará automáticamente al total de la venta.",
        position: "bottom",
    },
    {
        target: '[data-tour="sale-payment-amounts"]',
        title: "Medios de Pago & Vuelto",
        content: "Seleccioná Efectivo para calcular el vuelto exacto con botones de billetes, o dividí el pago entre tarjeta, transferencia o libreta.",
        position: "top",
    },
    {
        target: '[data-tour="sale-submit-bar"]',
        title: "Cobrar Venta",
        content: "Confirmá la venta haciendo clic o usando el atajo rápido 'Ctrl+Enter' o 'F9' desde cualquier lugar de la pantalla.",
        position: "top",
    },
];

function createNewOperation() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "sale",
        exchangeAmount: "",
        manualAmount: "",
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

                // If manual amount changed in a sale operation, sync default amount
                if (field === "manualAmount" && op.type === "sale") {
                    const itemsTotal = (op.items || []).reduce((s, it) => s + it.subtotal, 0);
                    const manualTotal = Number(value) || 0;
                    const targetTotal = itemsTotal + manualTotal;
                    if (updated.amounts.length === 1) {
                        updated.amounts = [
                            {
                                ...updated.amounts[0],
                                amount: targetTotal > 0 ? String(targetTotal) : "",
                            },
                        ];
                    }
                }

                return updated;
            })
        );
    }

    function handleUpdateOperationItems(index, items) {
        setOperations((current) =>
            current.map((op, opIndex) => {
                if (opIndex !== index) return op;

                const itemsTotal = items.reduce((sum, it) => sum + it.subtotal, 0);
                const manualTotal = Number(op.manualAmount) || 0;
                const targetTotal = itemsTotal + manualTotal;
                let updatedAmounts = [...op.amounts];

                if (updatedAmounts.length === 1) {
                    updatedAmounts[0] = {
                        ...updatedAmounts[0],
                        amount: targetTotal > 0 ? String(targetTotal) : "",
                    };
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

    const handleSubmit = useCallback(async (event) => {
        if (event) event.preventDefault();
        if (isSubmitting || grandTotal <= 0) return;

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

                const resolvedItems = [];
                if (op.type === "sale" && op.items && op.items.length > 0) {
                    for (const it of op.items) {
                        const qty =
                            it.unitType === "kg"
                                ? (Number(it.grams) || 0) / 1000
                                : it.unitType === "100g"
                                ? (Number(it.grams) || 0) / 100
                                : Number(it.quantity) || 1;

                        resolvedItems.push({
                            product: it.product?.id || null,
                            product_name: it.product?.name || "Producto",
                            unit_type: it.unitType || "unit",
                            quantity: qty,
                            unit_price: Number(it.unitPrice) || 0,
                            subtotal: Number(it.subtotal) || 0,
                        });
                    }
                }

                resolvedOperations.push({
                    type: op.type,
                    exchange_amount: isExchange ? exchangeClientAmount : null,
                    amounts: validAmounts,
                    items: resolvedItems,
                });
            }

            // Auto-generate description from cart items if no custom description is provided
            let finalDescription = description.trim();
            if (!finalDescription) {
                const itemSummaries = [];
                for (const op of operations) {
                    if (op.type === "sale") {
                        if (op.items && op.items.length > 0) {
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
                        if (Number(op.manualAmount) > 0) {
                            itemSummaries.push(`Varios (${formatCurrency(Number(op.manualAmount))})`);
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
    }, [
        client,
        description,
        grandTotal,
        hasPaymentOperation,
        isSubmitting,
        navigate,
        operations,
        printTicketOnSave,
        receivedCash,
        totalCashDue,
    ]);

    // Global shortcut Ctrl+Enter or F9 to submit sale from anywhere
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
            } else if (e.key === "F9") {
                e.preventDefault();
                handleSubmit();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSubmit]);

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
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6 pb-28">
            {/* HEADER */}
            <header className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                            Nueva venta
                        </h1>
                        <span className="rounded-md bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                            Caja
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Atajos: <kbd className="rounded bg-[var(--surface-accent)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-primary)]">/</kbd> Buscar · <kbd className="rounded bg-[var(--surface-accent)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-primary)]">Ctrl+Enter</kbd> Cobrar
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                >
                    Volver a Caja
                </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* OPERATIONS LIST (UNIFIED OPERATION CARDS) */}
                <div className="space-y-5">
                    {operations.map((op, index) => {
                        const isExchange = op.type === "exchange";

                        return (
                            <article
                                key={op.id}
                                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4 p-4 sm:p-5"
                            >
                                {/* OPERATION HEADER (WHEN MULTIPLE OPERATIONS) */}
                                {operations.length > 1 && (
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-bold text-white">
                                                {index + 1}
                                            </span>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                                Operación #{index + 1}
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOperation(index)}
                                            className="text-xs font-semibold text-[var(--danger)] hover:underline"
                                        >
                                            Eliminar operación
                                        </button>
                                    </div>
                                )}

                                {/* PROMINENT TRANSACTION TYPE SELECTOR */}
                                <div data-tour="sale-type-selector">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        Tipo de operación / servicio
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
                                                    className={`rounded-lg border py-3 px-3 text-xs sm:text-sm font-bold transition-all text-center ${
                                                        isSelected
                                                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm ring-1 ring-[var(--primary)] scale-[1.01]"
                                                            : "border-[var(--border)] bg-[var(--surface-accent)]/80 text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                                    }`}
                                                >
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* PRODUCT SELECTION & CART TABLE (FOR SALES) */}
                                {op.type === "sale" && (
                                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/20 p-3.5 sm:p-4">
                                        <SaleProductSelector
                                            products={products}
                                            categories={categories}
                                            items={op.items || []}
                                            onItemsChange={(newItems) =>
                                                handleUpdateOperationItems(index, newItems)
                                            }
                                            manualAmount={op.manualAmount || ""}
                                            onManualAmountChange={(val) =>
                                                handleUpdateOperation(index, "manualAmount", val)
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

                                {/* PAYMENT METHODS & AMOUNTS (INTEGRATED DIRECTLY IN THE OPERATION CARD) */}
                                <div data-tour="sale-payment-amounts">
                                    <TransactionAmounts
                                        amounts={op.amounts}
                                        targetTotal={
                                            op.type === "sale"
                                                ? (op.items || []).reduce((s, it) => s + it.subtotal, 0) + (Number(op.manualAmount) || 0)
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
                                        onRequireClient={() => {}}
                                        receivedCash={receivedCash}
                                        onReceivedCashChange={setReceivedCash}
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
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-accent)]/50"
                >
                    <span>+</span>
                    <span>Agregar otra operación a esta venta</span>
                </button>

                {/* CLIENT & NOTES (SLEEK INLINE 2-COLUMN TOOLBAR) */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Cliente {hasPaymentOperation && <span className="text-[var(--danger)]">* (Requerido)</span>}
                                </label>
                            </div>
                            <TransactionClient
                                selectedClient={client}
                                onSelectClient={setClient}
                                required={hasPaymentOperation}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="tx-description"
                                className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                            >
                                Nota o detalle general (opcional)
                            </label>
                            <input
                                id="tx-description"
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ej: Descuento aplicado, pedido especial, etc."
                                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs sm:text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                        </div>
                    </div>
                </div>

                {/* BOTTOM CHECKOUT BAR (STICKY) */}
                <div data-tour="sale-submit-bar" className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:px-5 sm:py-3.5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-baseline justify-between gap-3 sm:block">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Total a cobrar
                        </p>
                        <p className="text-2xl font-black tabular-nums text-[var(--text-primary)] sm:mt-0.5">
                            {formatCurrency(grandTotal)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {/* TICKET TOGGLE */}
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
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer select-none ${
                                printTicketOnSave
                                    ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/40 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            }`}
                            title="Activar para emitir comprobante / ticket al registrar la venta"
                        >
                            <span
                                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                                    printTicketOnSave
                                        ? "bg-[var(--primary)]"
                                        : "bg-neutral-600/40 dark:bg-neutral-600/60"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                                        printTicketOnSave ? "translate-x-3" : "translate-x-0"
                                    }`}
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
                            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || grandTotal <= 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>
                                {isSubmitting
                                    ? "Registrando..."
                                    : `Cobrar ${formatCurrency(grandTotal)}`}
                            </span>
                            <kbd className="hidden sm:inline-block rounded bg-white/20 px-1 py-0.2 font-mono text-[9px] text-white">
                                Ctrl+Enter
                            </kbd>
                        </button>
                    </div>
                </div>
            </form>

            {/* POST-SALE SUCCESS & RECEIPT MODAL */}
            {showSuccessModal && completedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                        onClick={() => navigate("/")}
                    />
                    <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
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
                        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setShowReceiptModal(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 px-4 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98"
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
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] py-2.5 px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                                >
                                    + Nueva Venta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/")}
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] py-2.5 px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
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

            {/* ONBOARDING TOUR */}
            <OnboardingTour
                tourKey="new-sale"
                steps={NEW_SALE_TOUR_STEPS}
            />
        </div>
    );
}

export default NewTransaction;