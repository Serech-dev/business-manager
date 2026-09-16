import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import {
    getProducts,
    getCategories,
    getClients,
    createTransaction,
    updateProduct,
} from "../../services/business";
import { filterAndRankProducts } from "../../utils/productSearch";
import { playBeepSuccess, playBeepWarning } from "../../utils/audio";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { calculateItemPricing } from "../../components/transactions/SaleProductSelector";
import MobileCameraScanner from "../../components/mobile/MobileCameraScanner";
import BarcodeNotFoundModal from "../../components/transactions/BarcodeNotFoundModal";
import ProductModal from "../../components/products/ProductModal";
import ReceiptModal from "../../components/transactions/ReceiptModal";
import MoneyInput from "../../components/MoneyInput";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";
import { NATIONAL_PRODUCTS } from "../../utils/nationalCatalog";

const OPERATION_TYPES = [
    { id: "sale", label: "Venta de Productos" },
    { id: "sube", label: "Carga SUBE" },
    { id: "phone", label: "Recarga Celular" },
    { id: "exchange", label: "Cambio de Dinero" },
    { id: "payment", label: "Cobro de Libreta" },
];

export function SimplePos({ register, onOpenRegister }) {
    const {
        settings,
        calculateSubeFee,
        calculatePhoneFee,
        calculateExchangeFee,
    } = useStoreSettings();
    const { isPro } = useSubscriptionTier();

    // Active Operation Type
    const [operationType, setOperationType] = useState("sale"); // 'sale' | 'sube' | 'phone' | 'exchange' | 'payment'

    // Data State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sale State
    const [cartItems, setCartItems] = useState([]);
    const [manualAmount, setManualAmount] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

    // Other Operation States
    const [rechargeAmount, setRechargeAmount] = useState("");
    const [exchangeAmount, setExchangeAmount] = useState("");
    const [debtPaymentAmount, setDebtPaymentAmount] = useState("");

    // Client State
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");

    // Modals
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isBarcodeNotFoundOpen, setIsBarcodeNotFoundOpen] = useState(false);
    const [unregisteredBarcode, setUnregisteredBarcode] = useState(null);
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
    const [newProductBarcode, setNewProductBarcode] = useState("");
    const [newProductName, setNewProductName] = useState("");

    // Checkout State
    const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' | 'mp' | 'card' | 'debt'
    const [receivedCash, setReceivedCash] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Receipt Modal
    const [completedSale, setCompletedSale] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Load Initial Catalog Data
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [prodsData, catsData, clientsData] = await Promise.all([
                getProducts(),
                getCategories(),
                getClients(),
            ]);
            setProducts(Array.isArray(prodsData) ? prodsData : prodsData?.results || []);
            setCategories(Array.isArray(catsData) ? catsData : catsData?.results || []);
            setClients(Array.isArray(clientsData) ? clientsData : clientsData?.results || []);
        } catch (err) {
            console.error("Error loading Simple POS data:", err);
            toast.error("Error al cargar datos del comercio.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Financial Calculation per Operation Type
    const totalToCharge = useMemo(() => {
        if (operationType === "sale") {
            const itemsTotal = cartItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
            const manual = Number(manualAmount) || 0;
            return itemsTotal + manual;
        }

        if (operationType === "sube") {
            const feeInfo = calculateSubeFee(rechargeAmount);
            return feeInfo.totalToCharge;
        }

        if (operationType === "phone") {
            const feeInfo = calculatePhoneFee(rechargeAmount);
            return feeInfo.totalToCharge;
        }

        if (operationType === "exchange") {
            return Number(exchangeAmount) || 0;
        }

        if (operationType === "payment") {
            return Number(debtPaymentAmount) || 0;
        }

        return 0;
    }, [
        operationType,
        cartItems,
        manualAmount,
        rechargeAmount,
        exchangeAmount,
        debtPaymentAmount,
        calculateSubeFee,
        calculatePhoneFee,
    ]);

    const totalSavings = useMemo(() => {
        if (operationType !== "sale") return 0;
        return cartItems.reduce((sum, item) => sum + (Number(item.promoSavings) || 0), 0);
    }, [operationType, cartItems]);

    // Add product to cart
    const addToCart = useCallback((product, qtyToAdd = 1, customGrams = null) => {
        setCartItems((prevItems) => {
            const existingIndex = prevItems.findIndex(i => i.product.id === product.id);
            const isWeight = product.unit_type === "kg" || product.unit_type === "100g";

            if (existingIndex >= 0) {
                const updated = [...prevItems];
                const currentItem = updated[existingIndex];
                const newQty = isWeight ? currentItem.quantity : currentItem.quantity + qtyToAdd;
                const newGrams = isWeight ? (currentItem.grams || 0) + (customGrams || 100) : null;

                const pricing = calculateItemPricing(product, newQty, null, newGrams);
                updated[existingIndex] = {
                    ...currentItem,
                    quantity: newQty,
                    grams: newGrams,
                    unitPrice: pricing.unitPrice,
                    subtotal: pricing.subtotal,
                    hasPromoApplied: pricing.hasPromoApplied,
                    promoSavings: pricing.promoSavings,
                    promoText: pricing.promoText,
                };
                return updated;
            } else {
                const initialGrams = isWeight ? (customGrams || (product.unit_type === "kg" ? 1000 : 100)) : null;
                const pricing = calculateItemPricing(product, qtyToAdd, null, initialGrams);
                return [
                    ...prevItems,
                    {
                        product,
                        quantity: qtyToAdd,
                        grams: initialGrams,
                        unitPrice: pricing.unitPrice,
                        subtotal: pricing.subtotal,
                        hasPromoApplied: pricing.hasPromoApplied,
                        promoSavings: pricing.promoSavings,
                        promoText: pricing.promoText,
                    },
                ];
            }
        });

        playBeepSuccess();
        toast.success(`+1 ${product.name}`, { duration: 1500, id: `pos-${product.id}` });
    }, []);

    const updateItemQuantity = (index, delta) => {
        setCartItems((prev) => {
            const updated = [...prev];
            const item = updated[index];
            const newQty = item.quantity + delta;

            if (newQty <= 0) {
                return updated.filter((_, i) => i !== index);
            }

            const pricing = calculateItemPricing(item.product, newQty, null, item.grams);
            updated[index] = {
                ...item,
                quantity: newQty,
                unitPrice: pricing.unitPrice,
                subtotal: pricing.subtotal,
                hasPromoApplied: pricing.hasPromoApplied,
                promoSavings: pricing.promoSavings,
                promoText: pricing.promoText,
            };
            return updated;
        });
    };

    const removeItem = (index) => {
        setCartItems((prev) => prev.filter((_, i) => i !== index));
    };

    const clearCurrentOperation = () => {
        setCartItems([]);
        setManualAmount("");
        setRechargeAmount("");
        setExchangeAmount("");
        setDebtPaymentAmount("");
        setSelectedClient(null);
        setReceivedCash("");
        setIsCheckoutOpen(false);
    };

    // Hardware and Camera Barcode Handler
    const handleBarcodeScanned = useCallback((code) => {
        if (operationType !== "sale") return;
        const barcodeStr = String(code).trim();
        if (!barcodeStr) return;

        const match = products.find(
            p => (p.barcode && String(p.barcode).trim() === barcodeStr) ||
                 (p.sku && String(p.sku).trim() === barcodeStr)
        );

        if (match) {
            addToCart(match, 1);
            return;
        }

        const nationalMatch = NATIONAL_PRODUCTS[barcodeStr];
        setUnregisteredBarcode({
            barcode: barcodeStr,
            nationalMatch: nationalMatch || null,
        });
        setIsBarcodeNotFoundOpen(true);
        playBeepWarning();
    }, [operationType, products, addToCart]);

    useBarcodeScanner(handleBarcodeScanned, { enabled: !isScannerOpen && operationType === "sale" });

    // Filter products when searching or browsing catalog
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return filterAndRankProducts(products, searchQuery.trim()).slice(0, 8);
    }, [products, searchQuery]);

    const catalogFilteredProducts = useMemo(() => {
        let list = products;
        if (selectedCategory !== "all") {
            list = list.filter(p => p.category === selectedCategory || p.category_name === selectedCategory);
        }
        return list;
    }, [products, selectedCategory]);

    // Clients matching search
    const filteredClients = useMemo(() => {
        if (!clientSearchQuery.trim()) return clients;
        const q = clientSearchQuery.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }, [clients, clientSearchQuery]);

    // Change / Vuelto Calculation
    const calculatedChange = useMemo(() => {
        const cash = Number(receivedCash) || 0;
        return Math.max(0, cash - totalToCharge);
    }, [receivedCash, totalToCharge]);

    // Submit Complete Transaction
    const handleCompleteTransaction = async () => {
        if (totalToCharge <= 0) {
            toast.error("El monto de la operación debe ser mayor a $0.");
            return;
        }

        if (paymentMethod === "debt" && !selectedClient) {
            toast.error("Seleccioná un cliente para registrar la operación en libreta.");
            return;
        }

        if (operationType === "payment" && !selectedClient) {
            toast.error("Seleccioná el cliente que realiza el pago a cuenta.");
            return;
        }

        try {
            setIsSubmitting(true);

            let opData = {
                type: operationType,
                amounts: [
                    {
                        method: paymentMethod === "mp" ? "transfer" : (paymentMethod === "debt" ? "debt" : paymentMethod),
                        amount: totalToCharge,
                    },
                ],
                items: [],
            };

            if (operationType === "sale") {
                opData.manualAmount = Number(manualAmount) || null;
                opData.items = cartItems.map(item => ({
                    product_id: item.product.id,
                    product: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    grams: item.grams,
                    subtotal: item.subtotal,
                }));
            } else if (operationType === "sube" || operationType === "phone") {
                opData.rechargeAmount = Number(rechargeAmount);
            } else if (operationType === "exchange") {
                opData.exchangeAmount = Number(exchangeAmount);
            } else if (operationType === "payment") {
                opData.manualAmount = Number(debtPaymentAmount);
            }

            const payload = {
                type: operationType,
                client: selectedClient ? selectedClient.id : null,
                description: `Operación Móvil · ${OPERATION_TYPES.find(o => o.id === operationType)?.label}`,
                received_cash: paymentMethod === "cash" && receivedCash ? Number(receivedCash) : null,
                change_amount: paymentMethod === "cash" && calculatedChange > 0 ? calculatedChange : null,
                operations: [opData],
            };

            const response = await createTransaction(payload);
            playBeepSuccess();
            toast.success("¡Operación registrada con éxito!");

            setCompletedSale(response);
            setShowReceiptModal(true);
            clearCurrentOperation();
        } catch (err) {
            console.error("Error submitting mobile transaction:", err);
            toast.error(err?.response?.data?.detail || "Error al registrar la operación.");
            playBeepWarning();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            {/* Top Operation Type Selector */}
            <div className="sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--border)] px-3 py-2 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {OPERATION_TYPES.map((op) => (
                        <button
                            key={op.id}
                            type="button"
                            onClick={() => {
                                setOperationType(op.id);
                                setSearchQuery("");
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                operationType === op.id
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                            }`}
                        >
                            <span>{op.label}</span>
                        </button>
                    ))}
                </div>

                {/* Client Status Bar */}
                <div className="mt-2 pt-2 border-t border-[var(--border)]/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0">
                            Cliente:
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsClientModalOpen(true)}
                            className="text-xs font-semibold text-[var(--primary)] truncate hover:underline text-left"
                        >
                            {selectedClient ? (
                                <span>
                                    {selectedClient.name} (Saldo: {formatCurrency(selectedClient.current_debt || 0)})
                                </span>
                            ) : (
                                <span className="text-[var(--text-secondary)] font-normal">Consumidor Final (Tocar para asignar)</span>
                            )}
                        </button>
                    </div>

                    {selectedClient && (
                        <button
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 hover:bg-rose-500/10 rounded"
                        >
                            Quitar
                        </button>
                    )}
                </div>
            </div>

            {/* Main Active Operation Area */}
            <div className="flex-1 p-3 pb-28 space-y-3.5">
                {/* 1. PRODUCT SALE VIEW */}
                {operationType === "sale" && (
                    <>
                        {/* Search & Camera Input */}
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar producto o escanear código..."
                                        className="w-full pl-9 pr-8 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)]"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)]"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="p-2.5 bg-[var(--primary)] text-white hover:opacity-95 rounded-md shadow-xs flex items-center justify-center shrink-0"
                                    title="Escanear con Cámara"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Search Dropdown Matches */}
                            {searchQuery.trim() && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xl z-30 divide-y divide-[var(--border)]/60 max-h-60 overflow-y-auto">
                                    {searchMatches.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                                            No se encontraron productos coincidentes.
                                        </div>
                                    ) : (
                                        searchMatches.map((prod) => (
                                            <button
                                                key={prod.id}
                                                type="button"
                                                onClick={() => {
                                                    addToCart(prod, 1);
                                                    setSearchQuery("");
                                                }}
                                                className="w-full p-2.5 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] transition-colors"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{prod.name}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)]">{prod.category_name || "Sin rubro"}</p>
                                                </div>
                                                <span className="text-xs font-bold text-[var(--primary)] font-mono shrink-0">
                                                    {formatCurrency(prod.sale_price)}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Live Items in Ticket Card */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs overflow-hidden">
                            <div className="px-3 py-2 bg-[var(--surface-accent)]/40 border-b border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                        Artículos ({cartItems.length})
                                    </span>
                                    {totalSavings > 0 && (
                                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">
                                            Ahorro: -{formatCurrency(totalSavings)}
                                        </span>
                                    )}
                                </div>

                                {cartItems.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setCartItems([])}
                                        className="text-[10px] text-rose-400 font-medium hover:underline"
                                    >
                                        Vaciar
                                    </button>
                                )}
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="p-6 text-center text-[var(--text-secondary)]">
                                    <svg className="w-10 h-10 mx-auto opacity-30 mb-2 stroke-current" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <p className="text-xs font-medium text-[var(--text-primary)]">El carrito está vacío</p>
                                    <p className="text-[11px] mt-0.5">Escaneá un código de barras o buscá un artículo arriba.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--border)]/40 p-2 space-y-2">
                                    {cartItems.map((item, idx) => (
                                        <div key={`${item.product.id}-${idx}`} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                                    {item.product.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                                                    <span>{formatCurrency(item.unitPrice)}</span>
                                                    {item.promoText && (
                                                        <span className="text-emerald-400 font-semibold text-[10px]">({item.promoText})</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stepper */}
                                            <div className="flex items-center gap-1 bg-[var(--surface-accent)] border border-[var(--border)] rounded p-0.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => updateItemQuantity(idx, -1)}
                                                    className="w-6 h-6 flex items-center justify-center font-bold text-xs active:bg-[var(--border)] rounded"
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center text-xs font-bold font-mono">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateItemQuantity(idx, 1)}
                                                    className="w-6 h-6 flex items-center justify-center font-bold text-xs active:bg-[var(--border)] rounded"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Subtotal & Delete */}
                                            <div className="text-right min-w-[65px] shrink-0">
                                                <p className="text-xs font-bold font-mono text-[var(--text-primary)]">
                                                    {formatCurrency(item.subtotal)}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="text-[10px] text-rose-400 hover:text-rose-300"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Monto Manual / Varios Row */}
                        <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                                Monto Manual / Varios
                            </label>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-[var(--text-secondary)]">$</span>
                                <input
                                    type="number"
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    placeholder="0"
                                    className="flex-1 px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm font-bold text-[var(--text-primary)]"
                                />
                                {manualAmount && (
                                    <button
                                        type="button"
                                        onClick={() => setManualAmount("")}
                                        className="text-xs text-rose-400 px-2"
                                    >
                                        Borrar
                                    </button>
                                )}
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                                {[500, 1000, 2000, 5000].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => {
                                            const current = Number(manualAmount) || 0;
                                            setManualAmount(String(current + amt));
                                        }}
                                        className="px-2.5 py-1 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-mono font-medium rounded"
                                    >
                                        +{formatCurrency(amt)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Collapsible Catalog Browser */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setIsCatalogExpanded((prev) => !prev)}
                                className="w-full px-3 py-2.5 bg-[var(--surface-accent)]/30 text-left flex items-center justify-between text-xs font-bold text-[var(--text-primary)]"
                            >
                                <span>Explorar Catálogo ({products.length} productos)</span>
                                <span className="text-xs">{isCatalogExpanded ? "▲ Ocultar" : "▼ Ver Grilla"}</span>
                            </button>

                            {isCatalogExpanded && (
                                <div className="p-3 border-t border-[var(--border)] space-y-3">
                                    {/* Category Pills */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategory("all")}
                                            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                                                selectedCategory === "all"
                                                    ? "bg-[var(--primary)] text-white font-bold"
                                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)] border border-[var(--border)]"
                                            }`}
                                        >
                                            Todos
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id || cat.name}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.name || cat.id)}
                                                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                                                    selectedCategory === (cat.name || cat.id)
                                                        ? "bg-[var(--primary)] text-white font-bold"
                                                        : "bg-[var(--surface-accent)] text-[var(--text-secondary)] border border-[var(--border)]"
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Product Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {catalogFilteredProducts.slice(0, 16).map((prod) => (
                                            <button
                                                key={prod.id}
                                                type="button"
                                                onClick={() => addToCart(prod, 1)}
                                                className="p-2.5 bg-[var(--surface-accent)]/50 border border-[var(--border)] hover:border-[var(--primary)] rounded text-left flex flex-col justify-between transition-transform active:scale-98"
                                            >
                                                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
                                                    {prod.name}
                                                </p>
                                                <span className="text-xs font-bold font-mono text-[var(--primary)] mt-1.5">
                                                    {formatCurrency(prod.sale_price)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 2. SUBE RECHARGE VIEW */}
                {operationType === "sube" && (
                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Carga Tarjeta SUBE
                            </h3>
                            <span className="text-xs font-bold text-sky-400">
                                Comisión: {settings.sube_fee_type === "percentage" ? `${settings.sube_fee_value}%` : formatCurrency(settings.sube_fee_value)}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                Saldo solicitado ($):
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">$</span>
                                <MoneyInput
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-8 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base font-bold text-[var(--text-primary)]"
                                />
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {[1000, 2000, 3000, 5000, 10000].map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setRechargeAmount(String(val))}
                                    className="flex-1 min-w-[70px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] font-mono text-xs font-bold rounded"
                                >
                                    ${val.toLocaleString("es-AR")}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. PHONE RECHARGE VIEW */}
                {operationType === "phone" && (
                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Recarga de Celular
                            </h3>
                            <span className="text-xs font-bold text-sky-400">
                                Comisión: {settings.phone_fee_type === "percentage" ? `${settings.phone_fee_value}%` : formatCurrency(settings.phone_fee_value)}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                Saldo solicitado ($):
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">$</span>
                                <MoneyInput
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-8 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base font-bold text-[var(--text-primary)]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {[1000, 1500, 2000, 3000, 5000].map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setRechargeAmount(String(val))}
                                    className="flex-1 min-w-[70px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] font-mono text-xs font-bold rounded"
                                >
                                    ${val.toLocaleString("es-AR")}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. MONEY EXCHANGE VIEW */}
                {operationType === "exchange" && (
                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Cambio de Dinero (Virtual a Efectivo)
                            </h3>
                            <span className="text-xs font-bold text-sky-400">
                                Comisión: {settings.exchange_fee_type === "percentage" ? `${settings.exchange_fee_value}%` : formatCurrency(settings.exchange_fee_value)}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                Monto transferido por el cliente ($):
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">$</span>
                                <MoneyInput
                                    value={exchangeAmount}
                                    onChange={(e) => setExchangeAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-8 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base font-bold text-[var(--text-primary)]"
                                />
                            </div>
                        </div>

                        {Number(exchangeAmount) > 0 && (
                            <div className="p-3 bg-[var(--surface-accent)] rounded-md text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Comisión ganada:</span>
                                    <span className="font-bold text-sky-400 font-mono">
                                        +{formatCurrency(calculateExchangeFee(Number(exchangeAmount)).fee)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-[var(--border)] text-sm font-bold">
                                    <span>Efectivo a entregar:</span>
                                    <span className="text-emerald-400 font-mono">
                                        {formatCurrency(calculateExchangeFee(Number(exchangeAmount)).clientAmount)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. DEBT PAYMENT (COBRO DE LIBRETA) */}
                {operationType === "payment" && (
                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs space-y-4">
                        <div className="border-b border-[var(--border)] pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Cobro de Libreta / Pago a Cuenta
                            </h3>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                Registrá el dinero que un cliente entrega para saldar su deuda.
                            </p>
                        </div>

                        {!selectedClient ? (
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(true)}
                                className="w-full py-3 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 font-bold text-xs rounded-md shadow-xs"
                            >
                                Seleccionar Cliente con Deuda
                            </button>
                        ) : (
                            <div className="p-3 bg-[var(--surface-accent)] rounded-md text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)]">{selectedClient.name}</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">{selectedClient.phone || "Sin teléfono"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-[var(--text-secondary)] block">Deuda actual:</span>
                                        <span className="font-bold text-rose-400 font-mono text-sm">
                                            {formatCurrency(selectedClient.current_debt || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                                        Monto entregado por el cliente ($):
                                    </label>
                                    <input
                                        type="number"
                                        value={debtPaymentAmount}
                                        onChange={(e) => setDebtPaymentAmount(e.target.value)}
                                        placeholder={`$ ${selectedClient.current_debt || 0}`}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base font-bold text-[var(--text-primary)]"
                                    />
                                </div>

                                {selectedClient.current_debt > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setDebtPaymentAmount(String(selectedClient.current_debt))}
                                        className="text-[10px] text-[var(--primary)] font-bold hover:underline"
                                    >
                                        Saldar deuda total ({formatCurrency(selectedClient.current_debt)})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            {totalToCharge > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-16 inset-x-0 p-3 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setIsCheckoutOpen(true)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-[var(--primary)] hover:opacity-95 text-white rounded-md shadow-xl transition-transform active:scale-98"
                        >
                            <div className="text-left">
                                <p className="text-[11px] font-medium opacity-90 uppercase tracking-wide">
                                    {OPERATION_TYPES.find(o => o.id === operationType)?.label}
                                </p>
                                <p className="text-xs font-bold">
                                    {selectedClient ? selectedClient.name : "Consumidor Final"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base font-bold font-mono">
                                    {formatCurrency(totalToCharge)}
                                </span>
                                <span className="px-3 py-1 bg-white text-[var(--primary)] font-bold text-xs rounded shadow-xs">
                                    Cobrar →
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Checkout / Payment Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                            <div>
                                <h3 className="font-bold text-sm text-[var(--text-primary)]">Confirmar y Cobrar</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Total: {formatCurrency(totalToCharge)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCheckoutOpen(false)}
                                className="p-1 text-[var(--text-secondary)]"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Payment Methods */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                    Medio de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "cash", label: "Efectivo" },
                                        { id: "mp", label: "Mercado Pago" },
                                        { id: "card", label: "Tarjeta Débito/Crédito" },
                                        { id: "debt", label: "Libreta (A Cuenta)" },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`p-2.5 rounded-md border text-center text-xs font-semibold transition-colors ${
                                                paymentMethod === m.id
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--surface-accent)] text-[var(--text-primary)] hover:border-[var(--primary)]"
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Bill Shortcuts & Vuelto Calculation */}
                            {paymentMethod === "cash" && (
                                <div className="p-3 bg-[var(--surface-accent)] border border-[var(--border)] rounded-md space-y-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                                            Efectivo Recibido:
                                        </label>
                                        <input
                                            type="number"
                                            value={receivedCash}
                                            onChange={(e) => setReceivedCash(e.target.value)}
                                            placeholder={`$ ${totalToCharge}`}
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm text-[var(--text-primary)] font-bold"
                                        />
                                    </div>

                                    {/* Fast Bill Buttons */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {[1000, 2000, 5000, 10000, 20000].map((bill) => (
                                            <button
                                                key={bill}
                                                type="button"
                                                onClick={() => setReceivedCash(String(bill))}
                                                className="px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-mono font-medium rounded"
                                            >
                                                +{formatCurrency(bill)}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setReceivedCash(String(totalToCharge))}
                                            className="px-2.5 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-semibold rounded"
                                        >
                                            Monto Exacto
                                        </button>
                                    </div>

                                    {/* Vuelto Indicator */}
                                    {Number(receivedCash) > totalToCharge && (
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-emerald-400 font-bold">
                                            <span className="text-xs">Vuelto a Entregar:</span>
                                            <span className="text-base font-mono">
                                                {formatCurrency(calculatedChange)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Submit Sale Button */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-accent)]/50">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleCompleteTransaction}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-md shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Registrando...</span>
                                    </>
                                ) : (
                                    <span>Cobrar {formatCurrency(totalToCharge)}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Search & Select Modal */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                            <h4 className="font-bold text-xs text-[var(--text-primary)]">Seleccionar Cliente</h4>
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="p-3 border-b border-[var(--border)]">
                            <input
                                type="text"
                                autoFocus
                                value={clientSearchQuery}
                                onChange={(e) => setClientSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre o teléfono..."
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)]"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border)]/50">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClient(null);
                                    setIsClientModalOpen(false);
                                }}
                                className="w-full p-2.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] rounded"
                            >
                                Consumidor Final (Sin asignar)
                            </button>

                            {filteredClients.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedClient(c);
                                        setIsClientModalOpen(false);
                                    }}
                                    className="w-full p-2.5 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] rounded"
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--text-primary)]">{c.name}</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">{c.phone || "Sin teléfono"}</p>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-amber-400">
                                        Saldo: {formatCurrency(c.current_debt || 0)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Barcode Scanner Fullscreen Overlay */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <MobileCameraScanner
                        onScan={(code) => handleBarcodeScanned(code)}
                        onClose={() => setIsScannerOpen(false)}
                        title="Escáner Modo Venta"
                        subtitle="Apuntá al producto para sumarlo a la venta"
                        continuous={true}
                    />
                </div>
            )}

            {/* Barcode Not Found Modal */}
            <BarcodeNotFoundModal
                isOpen={isBarcodeNotFoundOpen}
                barcode={unregisteredBarcode?.barcode}
                nationalMatch={unregisteredBarcode?.nationalMatch}
                onClose={() => {
                    setIsBarcodeNotFoundOpen(false);
                    setUnregisteredBarcode(null);
                }}
                onCreateDirect={(barcodeToCreate, suggestedName = "") => {
                    setNewProductBarcode(barcodeToCreate);
                    setNewProductName(suggestedName);
                    setIsBarcodeNotFoundOpen(false);
                    setIsCreateProductModalOpen(true);
                }}
                onSellAsCustom={(customItem) => {
                    setIsBarcodeNotFoundOpen(false);
                    setUnregisteredBarcode(null);
                    setCartItems(prev => [
                        ...prev,
                        {
                            product: {
                                id: `temp-${Date.now()}`,
                                name: customItem.name,
                                sale_price: customItem.price,
                                unit_type: "unit",
                            },
                            quantity: 1,
                            unitPrice: customItem.price,
                            subtotal: customItem.price,
                            hasPromoApplied: false,
                            promoSavings: 0,
                            promoText: null,
                        },
                    ]);
                    toast.success(`Sumado: ${customItem.name}`);
                }}
            />

            {/* Quick Product Creation Modal */}
            {isCreateProductModalOpen && (
                <ProductModal
                    isOpen={isCreateProductModalOpen}
                    initialBarcode={newProductBarcode}
                    initialName={newProductName}
                    categories={categories}
                    providers={[]}
                    onClose={() => {
                        setIsCreateProductModalOpen(false);
                        setNewProductBarcode("");
                        setNewProductName("");
                    }}
                    onSave={(newProd) => {
                        setProducts(prev => [newProd, ...prev]);
                        setIsCreateProductModalOpen(false);
                        addToCart(newProd, 1);
                        toast.success(`Producto "${newProd.name}" creado y sumado.`);
                    }}
                />
            )}

            {/* Post-Sale Receipt Modal */}
            <ReceiptModal
                isOpen={showReceiptModal}
                transaction={completedSale}
                onClose={() => {
                    setShowReceiptModal(false);
                    setCompletedSale(null);
                }}
            />
        </div>
    );
}

export default SimplePos;
