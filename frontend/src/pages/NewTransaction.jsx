import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    createTransaction,
    createClient,
    getProducts,
    getCategories,
    getProviders,
    getTransactionLabel,
} from "../services/business";
import { formatCurrency, roundUpTo50 } from "../utils/formatCurrency";

import TransactionClient from "../components/transactions/TransactionClient";
import TransactionExchange from "../components/transactions/TransactionExchange";
import TransactionRecharge from "../components/transactions/TransactionRecharge";
import TransactionAmounts from "../components/transactions/TransactionAmounts";
import SaleProductSelector from "../components/transactions/SaleProductSelector";
import ReceiptModal from "../components/transactions/ReceiptModal";
import ProductModal from "../components/products/ProductModal";
import DebtLimitAuthorizeModal from "../components/transactions/DebtLimitAuthorizeModal";
import MoneyInput from "../components/MoneyInput";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useSubscriptionTier } from "../hooks/useSubscriptionTier";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

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
        content: "Buscá artículos por nombre o pasá el código de barras con tu lector físico.",
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
        exchangeMode: "payout",
        rechargeAmount: "",
        manualAmount: "",
        items: [],
        paymentAmount: "",
    };
}

function allocateAmountsToOperations(opsWithTargets, validAmounts) {
    if (opsWithTargets.length === 1) {
        return [
            {
                ...opsWithTargets[0].op,
                amounts:
                    validAmounts.length > 0
                        ? validAmounts
                        : [{ method: "cash", amount: 0, bank_account: null }],
            },
        ];
    }

    const pools = validAmounts.map((a) => ({
        method: a.method,
        remaining: Number(a.amount),
        bank_account: a.bank_account || null,
    }));

    // Prioritize constrained operations (payment and exchange cannot use debt)
    const indexedOps = opsWithTargets.map((item, originalIndex) => ({
        ...item,
        originalIndex,
    }));

    indexedOps.sort((a, b) => {
        const aNoDebt = a.op.type === "payment" || a.op.type === "exchange";
        const bNoDebt = b.op.type === "payment" || b.op.type === "exchange";
        if (aNoDebt && !bNoDebt) return -1;
        if (!aNoDebt && bNoDebt) return 1;
        return a.originalIndex - b.originalIndex;
    });

    const results = new Array(opsWithTargets.length);

    indexedOps.forEach((item, idx) => {
        const isLast = idx === indexedOps.length - 1;
        const noDebtAllowed =
            item.op.type === "payment" || item.op.type === "exchange";
        let needed = item.targetTotal;
        const opAmounts = [];

        for (const pool of pools) {
            if (pool.remaining <= 0) continue;
            if (noDebtAllowed && pool.method === "debt") continue;
            if (needed <= 0 && !isLast) break;

            const take =
                !isLast && needed > 0
                    ? Math.min(pool.remaining, needed)
                    : pool.remaining;

            if (take > 0) {
                opAmounts.push({
                    method: pool.method,
                    amount: take,
                    bank_account: pool.bank_account,
                });
                pool.remaining -= take;
                needed -= take;
            }
        }

        if (opAmounts.length === 0) {
            opAmounts.push({
                method: validAmounts[0]?.method || "cash",
                amount: 0,
                bank_account: validAmounts[0]?.bank_account || null,
            });
        }

        results[item.originalIndex] = {
            ...item.op,
            amounts: opAmounts,
        };
    });

    return results;
}

function NewTransaction() {
    const navigate = useNavigate();
    const { settings, calculateExchangeFee, calculateSubeFee, calculatePhoneFee, calculateDebtSurcharge, calculateCardSurcharge, getClientDebtLimit } = useStoreSettings();
    const { isKioskDevice, isUnlocked, requireOwnerAccess } = useDeviceSecurity();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [providers, setProviders] = useState([]);
    const [client, setClient] = useState(null);
    const [description, setDescription] = useState("");
    const [receivedCash, setReceivedCash] = useState("");
    const [operations, setOperations] = useState([createNewOperation()]);
    const [transactionAmounts, setTransactionAmounts] = useState([
        { method: "cash", amount: "" },
    ]);
    const [ignoreDebtSurcharge, setIgnoreDebtSurcharge] = useState(false);
    const [pendingDebtLimitData, setPendingDebtLimitData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Post-sale completion & ticket modal
    const [printTicketOnSave, setPrintTicketOnSave] = useState(() => {
        return localStorage.getItem("bm_print_ticket_on_save") === "true";
    });
    const [completedSale, setCompletedSale] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Quick-create product modal from scanned unknown barcode
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
    const [newProductBarcode, setNewProductBarcode] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [newProductSalePrice, setNewProductSalePrice] = useState("");
    const [newProductCostPrice, setNewProductCostPrice] = useState("");
    const [newProductUnitType, setNewProductUnitType] = useState("unit");
    const [targetOperationIndex, setTargetOperationIndex] = useState(0);

    const { isPremium, hasFeature } = useSubscriptionTier();

    useEffect(() => {
        async function loadCatalog() {
            try {
                const fetchProviders = (isPremium || hasFeature("provider_debts"))
                    ? getProviders()
                    : Promise.resolve([]);

                const [prodsData, catsData, provsData] = await Promise.all([
                    getProducts(),
                    getCategories(),
                    fetchProviders,
                ]);
                setProducts(prodsData);
                setCategories(catsData);
                setProviders(provsData || []);
            } catch (err) {
                console.error("Error loading products catalog for sale:", err);
            }
        }
        loadCatalog();
    }, [isPremium, hasFeature]);

    function handleProductUpdated(updatedProduct) {
        setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    }

    function handleOpenCreateProduct(barcode, detectedProduct, opIndex = 0) {
        setNewProductBarcode(barcode || "");
        setNewProductName(detectedProduct?.name || "");
        setNewProductSalePrice(detectedProduct?.sale_price ? String(detectedProduct.sale_price) : "");
        setNewProductCostPrice(detectedProduct?.cost_price ? String(detectedProduct.cost_price) : "");
        setNewProductUnitType(detectedProduct?.unit_type || "unit");
        setTargetOperationIndex(opIndex);
        setIsCreateProductModalOpen(true);
    }

    function handleProductCreatedSuccess(newProduct) {
        setProducts((prev) => [...prev, newProduct]);
        if (targetOperationIndex !== null && operations[targetOperationIndex]) {
            const op = operations[targetOperationIndex];
            const newItem = {
                product: newProduct,
                unitType: newProduct.unit_type || "unit",
                quantity: 1,
                grams: null,
                unitPrice: Number(newProduct.sale_price),
                subtotal: roundUpTo50(Number(newProduct.sale_price)),
            };
            handleUpdateOperationItems(targetOperationIndex, [...(op.items || []), newItem]);
        }
        setIsCreateProductModalOpen(false);
        setNewProductBarcode("");
        setNewProductName("");
        setNewProductSalePrice("");
        setNewProductCostPrice("");
        setNewProductUnitType("unit");
    }

    const hasPaymentOperation = operations.some((op) => op.type === "payment");

    function handleSelectClient(selected) {
        setClient(selected);
        if (selected && Number(selected.debt) > 0) {
            setOperations((prev) =>
                prev.map((op) => {
                    if (op.type === "payment" && !op.paymentAmount) {
                        return {
                            ...op,
                            paymentAmount: String(Math.round(Number(selected.debt))),
                        };
                    }
                    return op;
                })
            );
        }
    }

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

                // If type changed, reset inapplicable fields
                if (field === "type") {
                    if (value !== "exchange") {
                        updated.exchangeAmount = "";
                        updated.exchangeMode = "payout";
                    }
                    if (value !== "sube" && value !== "phone") {
                        updated.rechargeAmount = "";
                    }
                    if (value !== "sale") {
                        updated.items = [];
                        updated.manualAmount = "";
                    }
                    if (value !== "payment") {
                        updated.paymentAmount = "";
                    } else if (client && Number(client.debt) > 0 && !updated.paymentAmount) {
                        updated.paymentAmount = String(Math.round(Number(client.debt)));
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
                return {
                    ...op,
                    items,
                };
            })
        );
    }

    function handleToggleIgnoreDebtSurcharge(ignored) {
        setIgnoreDebtSurcharge(ignored);
    }

    const getOpTargetTotal = useCallback(
        (op) => {
            if (op.type === "sale") {
                const itemsTotal = (op.items || []).reduce(
                    (s, it) => s + (Number(it.subtotal) || 0),
                    0
                );
                const manualTotal = Number(op.manualAmount) || 0;
                return roundUpTo50(itemsTotal + manualTotal);
            }
            if (op.type === "sube") {
                return calculateSubeFee(op.rechargeAmount || 0).totalToCharge;
            }
            if (op.type === "phone") {
                return calculatePhoneFee(op.rechargeAmount || 0).totalToCharge;
            }
            if (op.type === "exchange") {
                return calculateExchangeFee(
                    op.exchangeAmount || 0,
                    op.exchangeMode || "payout"
                ).totalToCharge;
            }
            if (op.type === "payment") {
                return Number(op.paymentAmount) || 0;
            }
            return 0;
        },
        [calculateSubeFee, calculatePhoneFee, calculateExchangeFee]
    );

    const grandTargetTotal = useMemo(() => {
        return operations.reduce((sum, op) => sum + getOpTargetTotal(op), 0);
    }, [operations, getOpTargetTotal]);

    // Reactive sync for transactionAmounts when grandTargetTotal or surcharge settings change
    useEffect(() => {
        setTransactionAmounts((current) => {
            if (current.length === 2 && grandTargetTotal > 0) {
                const firstAmt = Number(current[0].amount) || 0;
                const remainder = Math.max(0, grandTargetTotal - firstAmt);
                let secondAmt = roundUpTo50(remainder);
                if (
                    current[1].method === "debt" &&
                    settings.debt_surcharge_enabled &&
                    !ignoreDebtSurcharge
                ) {
                    secondAmt = calculateDebtSurcharge(remainder).totalWithSurcharge;
                } else if (
                    current[1].method === "card" &&
                    settings.card_surcharge_enabled
                ) {
                    secondAmt = calculateCardSurcharge(remainder).totalWithSurcharge;
                }
                const nextVal = secondAmt > 0 ? String(secondAmt) : "0";
                if (current[1].amount !== nextVal) {
                    return [current[0], { ...current[1], amount: nextVal }];
                }
                return current;
            }

            if (current.length === 1) {
                const method = current[0]?.method || "cash";
                let nextAmount = "";
                if (grandTargetTotal > 0) {
                    if (
                        method === "debt" &&
                        settings.debt_surcharge_enabled &&
                        !ignoreDebtSurcharge
                    ) {
                        nextAmount = String(
                            calculateDebtSurcharge(grandTargetTotal).totalWithSurcharge
                        );
                    } else if (
                        method === "card" &&
                        settings.card_surcharge_enabled
                    ) {
                        nextAmount = String(
                            calculateCardSurcharge(grandTargetTotal).totalWithSurcharge
                        );
                    } else {
                        nextAmount = String(roundUpTo50(grandTargetTotal));
                    }
                }

                if (current[0]?.amount === nextAmount) {
                    return current;
                }

                return [
                    {
                        ...current[0],
                        amount: nextAmount,
                    },
                ];
            }

            return current;
        });
    }, [
        grandTargetTotal,
        settings.debt_surcharge_enabled,
        settings.card_surcharge_enabled,
        ignoreDebtSurcharge,
        calculateDebtSurcharge,
        calculateCardSurcharge,
    ]);

    const grandTotal = useMemo(() => {
        return transactionAmounts.reduce(
            (total, a) => total + (Number(a.amount) || 0),
            0
        );
    }, [transactionAmounts]);

    const totalCashDue = useMemo(() => {
        return transactionAmounts
            .filter((a) => a.method === "cash")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    }, [transactionAmounts]);

    const executeSubmit = useCallback(async (allowOverLimit = false) => {
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

            const validAmounts = transactionAmounts
                .filter(
                    (item) => item.amount !== "" && Number(item.amount) > 0
                )
                .map((item) => ({
                    method: item.method,
                    amount: Number(item.amount),
                    bank_account: ["transfer", "card"].includes(item.method)
                        ? (item.bank_account ? Number(item.bank_account) : null)
                        : null,
                }));

            const opsWithTargets = [];

            for (const op of operations) {
                const isExchange = op.type === "exchange";
                const exchangeNum = Number(op.exchangeAmount) || 0;
                const {
                    clientAmount: exchangeClientAmount,
                    totalToCharge: exchangeTotalToCharge,
                } = calculateExchangeFee(
                    exchangeNum,
                    op.exchangeMode || "payout"
                );

                let opTarget = 0;
                let resolvedItems = [];

                if (op.type === "sale") {
                    if (op.items && op.items.length > 0) {
                        for (const it of op.items) {
                            let productId = it.product?.id || null;
                            if (it.product && !it.product.id && it.product.name) {
                                const newProd = await createProduct({
                                    name: it.product.name,
                                    sale_price: it.product.sale_price,
                                    cost_price: it.product.cost_price || 0,
                                    unit_type: it.unitType || "unit",
                                    category: it.product.category || null,
                                });
                                productId = newProd.id;
                            }

                            resolvedItems.push({
                                product: productId,
                                product_name: it.product?.name || "Producto",
                                unit_type: it.unitType || "unit",
                                quantity: it.quantity || 1,
                                grams: it.grams || 0,
                                unit_price: it.unitPrice || 0,
                                subtotal: it.subtotal || 0,
                            });
                        }
                    }
                    const itemsTotal = (op.items || []).reduce(
                        (s, it) => s + (Number(it.subtotal) || 0),
                        0
                    );
                    const manualTotal = Number(op.manualAmount) || 0;
                    opTarget = roundUpTo50(itemsTotal + manualTotal);
                } else if (op.type === "sube") {
                    opTarget = calculateSubeFee(op.rechargeAmount || 0).totalToCharge;
                } else if (op.type === "phone") {
                    opTarget = calculatePhoneFee(op.rechargeAmount || 0).totalToCharge;
                } else if (op.type === "exchange") {
                    opTarget = exchangeTotalToCharge;
                } else if (op.type === "payment") {
                    opTarget = Number(op.paymentAmount) || 0;
                }

                opsWithTargets.push({
                    targetTotal: opTarget,
                    op: {
                        type: op.type,
                        exchange_amount: isExchange ? exchangeClientAmount : null,
                        items: resolvedItems,
                    },
                });
            }

            const resolvedOperations = allocateAmountsToOperations(
                opsWithTargets,
                validAmounts
            );

            // Auto-generate description from cart items / services if no custom description is provided
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
                    } else if (op.type === "sube") {
                        const amt = Number(op.rechargeAmount) || 0;
                        itemSummaries.push(`Carga SUBE${amt > 0 ? ` (${formatCurrency(amt)})` : ""}`);
                    } else if (op.type === "phone") {
                        const amt = Number(op.rechargeAmount) || 0;
                        itemSummaries.push(`Recarga Celular${amt > 0 ? ` (${formatCurrency(amt)})` : ""}`);
                    } else if (op.type === "exchange") {
                        const amt = Number(op.exchangeAmount) || 0;
                        const modeLabel = (op.exchangeMode || "payout") === "payout" ? "Retiro" : "Recibido";
                        itemSummaries.push(`Cambio (${modeLabel})${amt > 0 ? ` (${formatCurrency(amt)})` : ""}`);
                    } else if (op.type === "payment") {
                        const amt = Number(op.paymentAmount) || 0;
                        itemSummaries.push(`A cuenta${amt > 0 ? ` (${formatCurrency(amt)})` : ""}`);
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
                ...(allowOverLimit ? { allow_over_limit: true } : {}),
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
                error.response?.data?.debt_limit ||
                error.response?.data?.register ||
                error.response?.data?.client ||
                error.response?.data?.non_field_errors?.[0] ||
                "No se pudo registrar la venta.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        calculateExchangeFee,
        calculatePhoneFee,
        calculateSubeFee,
        client,
        description,
        navigate,
        operations,
        printTicketOnSave,
        receivedCash,
        totalCashDue,
        transactionAmounts,
    ]);

    const handleSubmit = useCallback(async (event) => {
        if (event) event.preventDefault();
        if (isSubmitting || grandTotal <= 0) return;

        // VALIDATION
        const validAmounts = transactionAmounts.filter(
            (item) => item.amount !== "" && Number(item.amount) > 0
        );

        if (validAmounts.length === 0) {
            toast.error("Ingresá al menos un monto de pago válido.");
            return;
        }

        const hasDebtAmount = validAmounts.some((a) => a.method === "debt");

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

            if (op.type === "sale") {
                const hasItems = op.items && op.items.length > 0;
                const hasManual = Number(op.manualAmount) > 0;
                if (!hasItems && !hasManual) {
                    toast.error(`${opLabel}Agregá productos al carrito o un monto manual.`);
                    return;
                }
            } else if (op.type === "sube" || op.type === "phone") {
                if (!op.rechargeAmount || Number(op.rechargeAmount) <= 0) {
                    toast.error(`${opLabel}Ingresá el monto de recarga.`);
                    return;
                }
            } else if (op.type === "exchange") {
                if (!op.exchangeAmount || Number(op.exchangeAmount) <= 0) {
                    toast.error(`${opLabel}Ingresá el monto de cambio.`);
                    return;
                }
            } else if (op.type === "payment") {
                if (!op.paymentAmount || Number(op.paymentAmount) <= 0) {
                    toast.error(`${opLabel}Ingresá el monto a abonar a la cuenta.`);
                    return;
                }
            }
        }

        // Check credit limit if paying on account
        const totalSaleDebt = validAmounts
            .filter((a) => a.method === "debt")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

        const clientDebt = Number(client?.debt || 0);
        const effectiveLimit = client ? getClientDebtLimit(client) : null;
        const projectedDebt = clientDebt + totalSaleDebt;
        const isOverLimit = effectiveLimit !== null && effectiveLimit > 0 && projectedDebt > effectiveLimit && totalSaleDebt > 0;

        if (isOverLimit) {
            if (isKioskDevice && !isUnlocked) {
                requireOwnerAccess(() => executeSubmit(true));
                return;
            }

            setPendingDebtLimitData({
                clientName: client?.name || "Cliente",
                currentDebt: clientDebt,
                saleDebt: totalSaleDebt,
                projectedDebt,
                effectiveLimit,
            });
            return;
        }

        await executeSubmit(false);
    }, [
        client,
        executeSubmit,
        getClientDebtLimit,
        grandTotal,
        hasPaymentOperation,
        isKioskDevice,
        isSubmitting,
        isUnlocked,
        operations,
        requireOwnerAccess,
        transactionAmounts,
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
        setIgnoreDebtSurcharge(false);
        setDescription("");
        setReceivedCash("");
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
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                >
                    Volver a Caja
                </button>
            </header>

            <div className="space-y-6">
                {/* OPERATIONS LIST (UNIFIED OPERATION CARDS) */}
                <div className="space-y-4">
                    {operations.map((op, index) => {
                        const isExchange = op.type === "exchange";
                        const isRecharge = op.type === "sube" || op.type === "phone";
                        const opSubtotal = getOpTargetTotal(op);

                        return (
                            <article
                                key={op.id}
                                className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4 p-4 sm:p-5"
                            >
                                {/* OPERATION HEADER */}
                                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                                    <div className="flex items-center gap-2">
                                        {operations.length > 1 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--primary)] text-xs font-bold text-white">
                                                {index + 1}
                                            </span>
                                        )}
                                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                            {operations.length > 1
                                                ? `Operación #${index + 1}: ${getTransactionLabel(op.type)}`
                                                : getTransactionLabel(op.type)}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                                            Subtotal: {formatCurrency(opSubtotal)}
                                        </span>
                                        {operations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOperation(index)}
                                                className="text-xs font-semibold text-[var(--danger)] hover:underline cursor-pointer"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>

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
                                                    className={`rounded-md border py-2.5 px-3 text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                                                        isSelected
                                                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs scale-[1.01]"
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
                                    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/20 p-3.5 sm:p-4">
                                        <SaleProductSelector
                                            products={products}
                                            categories={categories}
                                            providers={providers}
                                            items={op.items}
                                            onItemsChange={(newItems) =>
                                                handleUpdateOperationItems(index, newItems)
                                            }
                                            manualAmount={op.manualAmount || ""}
                                            onManualAmountChange={(val) =>
                                                handleUpdateOperation(index, "manualAmount", val)
                                            }
                                            onProductUpdated={handleProductUpdated}
                                            onCreateNewProduct={(barcode, detected) =>
                                                handleOpenCreateProduct(barcode, detected, index)
                                            }
                                        />
                                    </div>
                                )}

                                {/* RECHARGE DETAILS (SUBE / PHONE) */}
                                {isRecharge && (
                                    <TransactionRecharge
                                        type={op.type}
                                        rechargeAmount={op.rechargeAmount || ""}
                                        onChangeRechargeAmount={(val) =>
                                            handleUpdateOperation(
                                                index,
                                                "rechargeAmount",
                                                val
                                            )
                                        }
                                    />
                                )}

                                {/* EXCHANGE DETAILS (IF APPLICABLE) */}
                                {isExchange && (
                                    <TransactionExchange
                                        exchangeAmount={op.exchangeAmount}
                                        exchangeMode={op.exchangeMode || "payout"}
                                        onChangeExchangeAmount={(val) =>
                                            handleUpdateOperation(
                                                index,
                                                "exchangeAmount",
                                                val
                                            )
                                        }
                                        onChangeExchangeMode={(mode) =>
                                            handleUpdateOperation(
                                                index,
                                                "exchangeMode",
                                                mode
                                            )
                                        }
                                    />
                                )}

                                {/* PAYMENT / A CUENTA DETAILS */}
                                {op.type === "payment" && (
                                    <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3.5 sm:p-4">
                                        {client && Number(client.debt) > 0 && (
                                            <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                                                <div className="space-y-0.5">
                                                    <span className="text-[var(--text-secondary)]">
                                                        Deuda pendiente del cliente:
                                                    </span>
                                                    <strong className="block text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                                        {formatCurrency(Number(client.debt))}
                                                    </strong>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleUpdateOperation(
                                                            index,
                                                            "paymentAmount",
                                                            String(Math.round(Number(client.debt)))
                                                        )
                                                    }
                                                    className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
                                                >
                                                    Abonar deuda total
                                                </button>
                                            </div>
                                        )}

                                        <div>
                                            <label
                                                htmlFor={`payment-amount-${op.id}`}
                                                className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                                            >
                                                Monto a abonar a la cuenta ($)
                                            </label>
                                            <div className="relative">
                                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                                    $
                                                </span>
                                                <MoneyInput
                                                    id={`payment-amount-${op.id}`}
                                                    value={op.paymentAmount || ""}
                                                    onChange={(e) =>
                                                        handleUpdateOperation(
                                                            index,
                                                            "paymentAmount",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>

                {/* ADD ANOTHER OPERATION BUTTON */}
                <button
                    type="button"
                    onClick={handleAddOperation}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-accent)]/50 cursor-pointer"
                >
                    <span>+</span>
                    <span>Agregar otra operación a esta venta</span>
                </button>

                {/* CLIENT & NOTES (SLEEK INLINE 2-COLUMN TOOLBAR) */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Cliente {hasPaymentOperation && <span className="text-[var(--danger)]">* (Requerido)</span>}
                                </label>
                            </div>
                            <TransactionClient
                                selectedClient={client}
                                onSelectClient={handleSelectClient}
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
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs sm:text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                        </div>
                    </div>
                </div>

                {/* UNIFIED PAYMENT SECTION */}
                <div
                    data-tour="sale-payment-amounts"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-4"
                >
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                Método de pago
                            </h2>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                Seleccioná el método para abonar el total de la transacción
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
                                Total a cubrir
                            </span>
                            <span className="text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums">
                                {formatCurrency(grandTargetTotal)}
                            </span>
                        </div>
                    </div>

                    <TransactionAmounts
                        amounts={transactionAmounts}
                        targetTotal={grandTargetTotal}
                        onAmountsChange={setTransactionAmounts}
                        disableDebt={hasPaymentOperation}
                        hasClient={Boolean(client)}
                        client={client}
                        ignoreDebtSurcharge={ignoreDebtSurcharge}
                        onToggleIgnoreDebtSurcharge={handleToggleIgnoreDebtSurcharge}
                        onRequireClient={() => {}}
                        receivedCash={receivedCash}
                        onReceivedCashChange={setReceivedCash}
                    />
                </div>

                {/* BOTTOM CHECKOUT BAR (STICKY) */}
                <div data-tour="sale-submit-bar" className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:px-5 sm:py-3.5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
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
                            className="rounded-md border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || grandTotal <= 0}
                            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>
                                {isSubmitting
                                    ? "Registrando..."
                                    : `Cobrar ${formatCurrency(grandTotal)}`}
                            </span>
                            <kbd className="hidden sm:inline-block rounded-sm bg-white/20 px-1 py-0.2 font-mono text-[9px] text-white">
                                Ctrl+Enter
                            </kbd>
                        </button>
                    </div>
                </div>
            </div>

            {/* POST-SALE SUCCESS & RECEIPT MODAL */}
            {showSuccessModal && completedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/70 transition-opacity"
                        onClick={() => navigate("/")}
                    />
                    <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
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

            {/* CREATE PRODUCT MODAL FROM BARCODE */}
            <ProductModal
                isOpen={isCreateProductModalOpen}
                onClose={() => {
                    setIsCreateProductModalOpen(false);
                    setNewProductBarcode("");
                    setNewProductName("");
                    setNewProductSalePrice("");
                    setNewProductCostPrice("");
                    setNewProductUnitType("unit");
                }}
                initialBarcode={newProductBarcode}
                initialName={newProductName}
                initialSalePrice={newProductSalePrice}
                initialCostPrice={newProductCostPrice}
                initialUnitType={newProductUnitType}
                categories={categories}
                providers={providers}
                onSuccess={handleProductCreatedSuccess}
            />

            {/* DEBT LIMIT OVERRIDE AUTHORIZATION MODAL */}
            <DebtLimitAuthorizeModal
                isOpen={Boolean(pendingDebtLimitData)}
                onClose={() => setPendingDebtLimitData(null)}
                onAuthorize={async () => {
                    setPendingDebtLimitData(null);
                    await executeSubmit(true);
                }}
                clientName={pendingDebtLimitData?.clientName}
                currentDebt={pendingDebtLimitData?.currentDebt}
                saleDebt={pendingDebtLimitData?.saleDebt}
                projectedDebt={pendingDebtLimitData?.projectedDebt}
                effectiveLimit={pendingDebtLimitData?.effectiveLimit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

export default NewTransaction;