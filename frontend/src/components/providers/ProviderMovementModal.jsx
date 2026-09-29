import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import {
    createTransaction,
    getProviders,
    createProvider,
    getBankAccounts,
    getProducts,
} from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function ProviderMovementModal({
    isOpen,
    onClose,
    initialProvider = null,
    initialType = null,
    onSuccess,
}) {
    const [providers, setProviders] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(initialProvider);
    const [providerSearch, setProviderSearch] = useState("");
    const [type, setType] = useState("provider"); // "provider" | "provider_payment" | "expense" | "loss"

    // Source Type for Expense / Loss: "money" vs "merchandise"
    const [sourceType, setSourceType] = useState("money");

    // Money amounts
    const [totalTargetAmount, setTotalTargetAmount] = useState("");
    const [cashAmount, setCashAmount] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [debtAmount, setDebtAmount] = useState("");

    // Merchandise mode & items
    const [merchandiseMode, setMerchandiseMode] = useState("catalog"); // "catalog" | "quick"
    const [productSearch, setProductSearch] = useState("");
    const [catalogResults, setCatalogResults] = useState([]);
    const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]); // [{ product, quantity, unit_price }]
    const [quickMerchandiseAmount, setQuickMerchandiseAmount] = useState("");
    const [quickMerchandiseName, setQuickMerchandiseName] = useState("");

    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedProvider(initialProvider);
            setProviderSearch(initialProvider?.name || "");
            const defaultType = initialType || (initialProvider ? "provider" : "expense");
            setType(defaultType);
            setSourceType("money");
            setTotalTargetAmount("");
            setCashAmount("");
            setTransferAmount("");
            setDebtAmount("");
            setDescription("");
            setMerchandiseMode("catalog");
            setProductSearch("");
            setCatalogResults([]);
            setSelectedProducts([]);
            setQuickMerchandiseAmount("");
            setQuickMerchandiseName("");
            setIsSubmitting(false);

            loadInitialData();
        }
    }, [isOpen, initialProvider, initialType]);

    async function loadInitialData() {
        setIsLoadingProviders(true);
        try {
            const [providersData, banksData] = await Promise.all([
                getProviders(),
                getBankAccounts(true),
            ]);
            setProviders(providersData || []);
            setBankAccounts(banksData || []);
            const defBank = (banksData || []).find((b) => b.is_default) || banksData?.[0];
            if (defBank) setSelectedBankId(defBank.id);
        } catch (error) {
            console.error("Error loading provider modal data:", error);
        } finally {
            setIsLoadingProviders(false);
        }
    }

    // Debounced search in catalog for merchandise loss/expense
    useEffect(() => {
        if (!isOpen || sourceType !== "merchandise" || merchandiseMode !== "catalog") return;

        if (!productSearch.trim()) {
            setCatalogResults([]);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingCatalog(true);
            try {
                const results = await getProducts({ search: productSearch.trim(), is_active: 1 });
                setCatalogResults(results || []);
            } catch (err) {
                console.error("Error searching catalog products:", err);
            } finally {
                setIsSearchingCatalog(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [productSearch, isOpen, sourceType, merchandiseMode]);

    if (!isOpen) return null;

    const isProviderType = type === "provider" || type === "provider_payment";
    const allowsDebt = type === "provider";
    const allowsTransfer = type !== "loss";
    const isMerchandise = (type === "expense" || type === "loss") && sourceType === "merchandise";

    // Money calculation
    const assignedTotal =
        (Number(cashAmount) || 0) +
        (allowsTransfer ? Number(transferAmount) || 0 : 0) +
        (allowsDebt ? Number(debtAmount) || 0 : 0);

    const targetTotal = Number(totalTargetAmount) || 0;
    const difference = targetTotal - assignedTotal;

    // Merchandise calculation
    const merchandiseCatalogTotal = selectedProducts.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
    );
    const merchandiseQuickTotal = Number(quickMerchandiseAmount) || 0;
    const totalMerchandiseValue = merchandiseMode === "catalog" ? merchandiseCatalogTotal : merchandiseQuickTotal;

    // Overall total
    const effectiveTotal = isMerchandise ? totalMerchandiseValue : (targetTotal > 0 ? targetTotal : assignedTotal);

    function handleTotalTargetChange(value) {
        setTotalTargetAmount(value);
        const numVal = Number(value) || 0;

        // If no methods are filled, automatically allocate total to Cash
        if (numVal > 0) {
            const currentCash = Number(cashAmount) || 0;
            const currentTrans = Number(transferAmount) || 0;
            const currentDebt = Number(debtAmount) || 0;

            if (currentCash === 0 && currentTrans === 0 && currentDebt === 0) {
                setCashAmount(value);
            } else if (currentTrans === 0 && currentDebt === 0) {
                // If only cash was set, sync cash with new total
                setCashAmount(value);
            }
        }
    }

    function handleCashChange(value) {
        setCashAmount(value);
        if (targetTotal > 0 && allowsTransfer) {
            const newCash = Number(value) || 0;
            const debt = Number(debtAmount) || 0;
            const remainder = targetTotal - newCash - debt;
            if (remainder >= 0) {
                setTransferAmount(String(remainder));
            }
        }
    }

    function handleAddProductItem(product) {
        const existingIdx = selectedProducts.findIndex((item) => item.product.id === product.id);
        const costPrice = Number(product.cost_price) > 0 ? Number(product.cost_price) : Number(product.sale_price) || 0;

        if (existingIdx >= 0) {
            const updated = [...selectedProducts];
            updated[existingIdx].quantity = Number(updated[existingIdx].quantity) + 1;
            setSelectedProducts(updated);
        } else {
            setSelectedProducts([
                ...selectedProducts,
                {
                    product,
                    quantity: 1,
                    unit_price: costPrice,
                },
            ]);
        }
        setProductSearch("");
        setCatalogResults([]);
    }

    function handleUpdateProductQuantity(index, newQty) {
        if (newQty <= 0) {
            handleRemoveProductItem(index);
            return;
        }
        const updated = [...selectedProducts];
        updated[index].quantity = newQty;
        setSelectedProducts(updated);
    }

    function handleUpdateProductPrice(index, newPrice) {
        const updated = [...selectedProducts];
        updated[index].unit_price = newPrice;
        setSelectedProducts(updated);
    }

    function handleRemoveProductItem(index) {
        setSelectedProducts(selectedProducts.filter((_, idx) => idx !== index));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isProviderType && !selectedProvider) {
            toast.error("Seleccioná o creá un proveedor.");
            return;
        }

        let amounts = [];
        let items = [];

        if (isMerchandise) {
            if (merchandiseMode === "catalog") {
                if (selectedProducts.length === 0) {
                    toast.error("Seleccioná al menos un producto del catálogo.");
                    return;
                }
                items = selectedProducts.map((item) => ({
                    product: item.product.id,
                    product_name: item.product.name,
                    unit_type: item.product.unit_type || "unit",
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.unit_price) || 0,
                    subtotal: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
                }));
            } else {
                if (merchandiseQuickTotal <= 0) {
                    toast.error("Ingresá un valor estimado válido para la mercadería.");
                    return;
                }
                items = [
                    {
                        product: null,
                        product_name:
                            quickMerchandiseName.trim() ||
                            (type === "loss" ? "Pérdida de mercadería" : "Consumo interno de mercadería"),
                        quantity: 1,
                        unit_price: merchandiseQuickTotal,
                        subtotal: merchandiseQuickTotal,
                    },
                ];
            }
        } else {
            // Money mode: validate total allocation if a declared target was provided
            if (targetTotal > 0 && Math.abs(difference) > 0.01) {
                toast.error(
                    difference > 0
                        ? `Faltan asignar ${formatCurrency(difference)} a los métodos de pago.`
                        : `El total asignado supera el monto declarado por ${formatCurrency(Math.abs(difference))}.`
                );
                return;
            }

            if (Number(cashAmount) > 0) {
                amounts.push({ method: "cash", amount: cashAmount });
            }
            if (allowsTransfer && Number(transferAmount) > 0) {
                const transferObj = { method: "transfer", amount: transferAmount };
                if (selectedBankId) {
                    transferObj.bank_account = selectedBankId;
                }
                amounts.push(transferObj);
            }
            if (allowsDebt && Number(debtAmount) > 0) {
                amounts.push({ method: "debt", amount: debtAmount });
            }

            if (amounts.length === 0) {
                toast.error("Ingresá al menos un monto válido.");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            let providerId = selectedProvider?.id;
            if (isProviderType && selectedProvider && !selectedProvider.id && selectedProvider.name) {
                const newProv = await createProvider({ name: selectedProvider.name });
                providerId = newProv.id;
            }

            const defaultDesc = isMerchandise
                ? type === "loss"
                    ? "Pérdida de mercadería"
                    : "Consumo de mercadería"
                : "";

            const payload = {
                description: description.trim() || defaultDesc,
                operations: [
                    {
                        type,
                        provider: isProviderType ? providerId : null,
                        amounts,
                        items,
                    },
                ],
            };

            await createTransaction(payload);

            const successMessage =
                type === "provider"
                    ? "Compra registrada con éxito."
                    : type === "provider_payment"
                        ? "Pago a proveedor registrado con éxito."
                        : type === "expense"
                            ? isMerchandise
                                ? "Consumo de mercadería registrado con éxito (sin salida de caja)."
                                : "Gasto registrado con éxito."
                            : isMerchandise
                                ? "Pérdida de mercadería registrada con éxito (sin salida de caja)."
                                : "Pérdida registrada con éxito.";

            toast.success(successMessage);

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            console.error(error);
            const message =
                error.response?.data?.register ||
                error.response?.data?.non_field_errors?.[0] ||
                error.response?.data?.amounts ||
                "No se pudo registrar el movimiento.";
            toast.error(typeof message === "string" ? message : JSON.stringify(message));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)] px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Salidas y gastos
                        </p>
                        <h2 className="mt-0.5 text-base font-bold text-[var(--text-primary)]">
                            {type === "provider"
                                ? "Compra a proveedor"
                                : type === "provider_payment"
                                ? "Pago a proveedor"
                                : type === "expense"
                                ? "Registrar gasto"
                                : "Registrar pérdida"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* MOVEMENT TYPE TOGGLE */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                            Tipo de movimiento
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setType("provider");
                                    setSourceType("money");
                                }}
                                className={`rounded-md border p-3 text-left transition ${
                                    type === "provider"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <div className="text-xs font-bold">Compra a proveedor</div>
                                <div className="text-[11px] opacity-75 font-normal">Mercadería o insumos</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("provider_payment");
                                    setSourceType("money");
                                    setDebtAmount("");
                                }}
                                className={`rounded-md border p-3 text-left transition ${
                                    type === "provider_payment"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <div className="text-xs font-bold">Pago a proveedor</div>
                                <div className="text-[11px] opacity-75 font-normal">Pago de deuda</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("expense");
                                    setDebtAmount("");
                                }}
                                className={`rounded-md border p-3 text-left transition ${
                                    type === "expense"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <div className="text-xs font-bold">Gasto</div>
                                <div className="text-[11px] opacity-75 font-normal">Luz, insumos, limpieza, etc.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("loss");
                                    setDebtAmount("");
                                    setTransferAmount("");
                                }}
                                className={`rounded-md border p-3 text-left transition ${
                                    type === "loss"
                                        ? "border-[var(--danger)] bg-[var(--danger)]/10 font-semibold text-[var(--danger)] ring-1 ring-[var(--danger)]"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <div className="text-xs font-bold">Pérdida</div>
                                <div className="text-[11px] opacity-75 font-normal">Faltante, rotura, vencido</div>
                            </button>
                        </div>
                    </div>

                    {/* DUAL SOURCE TOGGLE (Only for Expense and Loss) */}
                    {(type === "expense" || type === "loss") && (
                        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/40 p-3 space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Origen de la salida / pérdida
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSourceType("money")}
                                    className={`flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-bold transition ${
                                        sourceType === "money"
                                            ? "border border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v11.25m0-11.25h16.5m0 0v11.25m-16.5 0h16.5" />
                                    </svg>
                                    <span>Dinero (Caja o Banco)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSourceType("merchandise")}
                                    className={`flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-bold transition ${
                                        sourceType === "merchandise"
                                            ? "border border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                    </svg>
                                    <span>Mercadería (Productos)</span>
                                </button>
                            </div>

                            {sourceType === "merchandise" && (
                                <p className="text-[11px] text-[var(--text-secondary)] leading-tight pt-1">
                                    Afecta el stock o registro de pérdidas sin descontar dinero físico de la caja registradora.
                                </p>
                            )}
                        </div>
                    )}

                    {/* PROVIDER SELECTION (Only when provider operation) */}
                    {isProviderType && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                Proveedor <span className="text-[var(--danger)]">*</span>
                            </label>

                            {selectedProvider ? (
                                <div className="mt-1.5 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                                            {selectedProvider.name}
                                        </span>
                                        {!selectedProvider.id && (
                                            <span className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                                                Nuevo
                                            </span>
                                        )}
                                        {selectedProvider.phone && (
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                · {selectedProvider.phone}
                                            </span>
                                        )}
                                    </div>

                                    {!initialProvider && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedProvider(null);
                                                setProviderSearch("");
                                            }}
                                            className="text-xs font-semibold text-[var(--danger)] hover:underline"
                                        >
                                            Cambiar
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="relative mt-1.5">
                                    <input
                                        type="text"
                                        value={providerSearch}
                                        onChange={(e) => setProviderSearch(e.target.value)}
                                        placeholder="Buscar o escribir nombre del proveedor..."
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                    />

                                    {providerSearch.trim() && (
                                        <div className="absolute left-0 right-0 top-[100%] z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                                            {providers
                                                .filter((p) =>
                                                    p.name.toLowerCase().includes(providerSearch.toLowerCase())
                                                )
                                                .map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProvider(p);
                                                            setProviderSearch(p.name);
                                                        }}
                                                        className="flex w-full items-center justify-between border-b border-[var(--border)] px-3.5 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
                                                    >
                                                        <span className="font-medium">{p.name}</span>
                                                        {p.phone && (
                                                            <span className="text-xs text-[var(--text-secondary)]">
                                                                {p.phone}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProvider({
                                                        id: null,
                                                        name: providerSearch.trim(),
                                                    });
                                                }}
                                                className="flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-accent)]"
                                            >
                                                + Crear proveedor "{providerSearch.trim()}"
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MERCHANDISE SECTION (WHEN SOURCE = MERCHANDISE) */}
                    {isMerchandise && (
                        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/20 p-3.5">
                            {/* Submode tabs: Catalog vs Quick */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Detalle de mercadería
                                </label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setMerchandiseMode("catalog")}
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            merchandiseMode === "catalog"
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        Elegir del catálogo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMerchandiseMode("quick")}
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            merchandiseMode === "quick"
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        Monto directo
                                    </button>
                                </div>
                            </div>

                            {merchandiseMode === "catalog" ? (
                                <div className="space-y-3">
                                    {/* Catalog Search Input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            placeholder="Buscar producto por nombre o código de barra..."
                                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                        {isSearchingCatalog && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                Buscando...
                                            </span>
                                        )}

                                        {catalogResults.length > 0 && (
                                            <div className="absolute left-0 right-0 top-[100%] z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                                                {catalogResults.map((p) => {
                                                    const cost = Number(p.cost_price) > 0 ? Number(p.cost_price) : Number(p.sale_price) || 0;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => handleAddProductItem(p)}
                                                            className="flex w-full items-center justify-between border-b border-[var(--border)] px-3.5 py-2 text-left text-xs hover:bg-[var(--surface-accent)]"
                                                        >
                                                            <div>
                                                                <div className="font-semibold text-[var(--text-primary)]">{p.name}</div>
                                                                <div className="text-[10px] text-[var(--text-secondary)]">
                                                                    Stock actual: {p.stock !== null ? p.stock : "Sin stock"} · Costo: {formatCurrency(cost)}
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-[var(--primary)]">+ Agregar</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Products List */}
                                    {selectedProducts.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {selectedProducts.map((item, idx) => (
                                                <div
                                                    key={item.product.id}
                                                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-[var(--text-primary)] truncate">
                                                            {item.product.name}
                                                        </div>
                                                        <div className="text-[10px] text-[var(--text-secondary)]">
                                                            {formatCurrency(item.unit_price)} c/u
                                                        </div>
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateProductQuantity(idx, Number(item.quantity) - 1)}
                                                            className="h-6 w-6 rounded border border-[var(--border)] bg-[var(--surface-accent)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateProductQuantity(idx, Number(e.target.value))}
                                                            className="h-6 w-12 rounded border border-[var(--border)] bg-[var(--background)] text-center text-xs font-bold text-[var(--text-primary)]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateProductQuantity(idx, Number(item.quantity) + 1)}
                                                            className="h-6 w-6 rounded border border-[var(--border)] bg-[var(--surface-accent)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <div className="w-20 text-right font-bold text-[var(--text-primary)]">
                                                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProductItem(idx)}
                                                        className="text-[var(--danger)] hover:opacity-80 p-1"
                                                        title="Eliminar"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-[var(--text-secondary)] py-2">
                                            Buscá y seleccioná los artículos afectados.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                                            Monto estimado de la mercadería
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                $
                                            </span>
                                            <MoneyInput
                                                value={quickMerchandiseAmount}
                                                onChange={(e) => setQuickMerchandiseAmount(e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                                            Concepto del consumo / rotura
                                        </label>
                                        <input
                                            type="text"
                                            value={quickMerchandiseName}
                                            onChange={(e) => setQuickMerchandiseName(e.target.value)}
                                            placeholder="Ej: Panadería diaria, Lácteos vencidos, etc."
                                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Total Merchandise Badge */}
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-xs">
                                <span className="font-semibold text-[var(--text-secondary)]">Valor total de mercadería:</span>
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                    {formatCurrency(totalMerchandiseValue)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* MONEY SECTION (WHEN SOURCE = MONEY) */}
                    {!isMerchandise && (
                        <div className="space-y-4">
                            {/* PRIMARY TOTAL DECLARATION (Helps cashiers avoid calculation errors) */}
                            <div className="rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                                        Monto total del gasto / salida <span className="text-[var(--danger)]">*</span>
                                    </label>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        Total a dividir en formas de pago
                                    </span>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--primary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        value={totalTargetAmount}
                                        onChange={(e) => handleTotalTargetChange(e.target.value)}
                                        placeholder="Ingresá el monto total del comprobante o gasto..."
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2.5 pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    />
                                </div>

                                {/* Discrepancy / Allocation Feedback */}
                                {targetTotal > 0 && (
                                    <div className="flex items-center justify-between text-xs pt-1">
                                        {Math.abs(difference) < 0.01 ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                                Total asignado correctamente
                                            </span>
                                        ) : difference > 0 ? (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-semibold text-amber-600">
                                                    Faltan asignar: {formatCurrency(difference)}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCashAmount(String((Number(cashAmount) || 0) + difference))}
                                                        className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 hover:bg-amber-500/20"
                                                    >
                                                        + Efectivo
                                                    </button>
                                                    {allowsTransfer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setTransferAmount(String((Number(transferAmount) || 0) + difference))}
                                                            className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 hover:bg-amber-500/20"
                                                        >
                                                            + Transferencia
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-[var(--danger)]">
                                                Supera el total por {formatCurrency(Math.abs(difference))}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PAYMENT METHODS BREAKDOWN */}
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    División por forma de pago
                                </label>

                                {/* CASH */}
                                <div className="flex items-center gap-3">
                                    <div className="w-36 shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
                                        Efectivo (caja)
                                    </div>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                            $
                                        </span>
                                        <MoneyInput
                                            value={cashAmount}
                                            onChange={(e) => handleCashChange(e.target.value)}
                                            placeholder="0"
                                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                {/* TRANSFER */}
                                {allowsTransfer && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-36 shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
                                                Transferencia / Banco
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                    $
                                                </span>
                                                <MoneyInput
                                                    value={transferAmount}
                                                    onChange={(e) => setTransferAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                        {Number(transferAmount) > 0 && bankAccounts.length > 1 && (
                                            <div className="flex items-center justify-end gap-2 pr-1">
                                                <span className="text-[11px] text-[var(--text-secondary)]">
                                                    Cuenta origen:
                                                </span>
                                                <div className="relative">
                                                    <select
                                                        value={selectedBankId || ""}
                                                        onChange={(e) =>
                                                            setSelectedBankId(
                                                                e.target.value ? Number(e.target.value) : null
                                                            )
                                                        }
                                                        className="h-7 appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-2 pr-6 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                    >
                                                        {bankAccounts.map((acc) => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.name} {acc.is_default ? "(Principal)" : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <svg
                                                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth="2"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* DEBT / DEBO */}
                                {allowsDebt && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-36 shrink-0 text-xs font-semibold text-[var(--warning)]">
                                            Quedo debiendo
                                        </div>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                                $
                                            </span>
                                            <MoneyInput
                                                value={debtAmount}
                                                onChange={(e) => setDebtAmount(e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-md border border-[var(--warning)]/50 bg-[var(--background)] py-2 pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--warning)]"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TOTAL SUMMARY */}
                                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-xs">
                                    <span className="font-semibold text-[var(--text-secondary)]">
                                        Suma asignada:
                                    </span>
                                    <span className="text-sm font-bold text-[var(--text-primary)]">
                                        {formatCurrency(assignedTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DETAIL / MOTIVO */}
                    <div>
                        <label
                            htmlFor="movement-description"
                            className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
                        >
                            {type === "expense" || type === "loss"
                                ? "Motivo / Detalle"
                                : "Detalle (opcional)"}
                        </label>
                        <input
                            id="movement-description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                type === "expense"
                                    ? isMerchandise
                                        ? "Ej: Consumo de insumos para cocina o limpieza"
                                        : "Ej: Artículos de limpieza, Pago de luz, Bolsas"
                                    : type === "loss"
                                    ? isMerchandise
                                        ? "Ej: Mercadería rota al recibir mercadería"
                                        : "Ej: Faltante de caja"
                                    : "Ej: Pedido semanal, Bebidas"
                            }
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)]/70 focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                        <div className="text-xs">
                            <span className="text-[var(--text-secondary)]">Total: </span>
                            <strong className="text-sm text-[var(--text-primary)]">
                                {formatCurrency(effectiveTotal)}
                            </strong>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="rounded-md border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting || effectiveTotal <= 0}
                                className="rounded-md bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? "Guardando..." : "Guardar movimiento"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProviderMovementModal;
