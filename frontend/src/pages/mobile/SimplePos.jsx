import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import {
    getProducts,
    getCategories,
    getProviders,
    createTransaction,
    createClient,
    getClients,
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
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";
import { NATIONAL_PRODUCTS } from "../../utils/nationalCatalog";

export function SimplePos({ register, onOpenRegister }) {
    const { settings } = useStoreSettings();
    const { isPro } = useSubscriptionTier();

    // Data State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Cart State
    const [cartItems, setCartItems] = useState([]); // [{ product, quantity, unitPrice, subtotal, grams, hasPromoApplied, promoSavings, promoText }]
    const [manualAmount, setManualAmount] = useState("");
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Modals
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isManualAmountModalOpen, setIsManualAmountModalOpen] = useState(false);
    const [isBarcodeNotFoundOpen, setIsBarcodeNotFoundOpen] = useState(false);
    const [unregisteredBarcode, setUnregisteredBarcode] = useState(null);
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
    const [newProductBarcode, setNewProductBarcode] = useState("");
    const [newProductName, setNewProductName] = useState("");

    // Checkout State
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientSearch, setClientSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' | 'mp' | 'card' | 'debt'
    const [receivedCash, setReceivedCash] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Completed Sale & Receipt
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
            toast.error("Error al cargar productos del catálogo.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Cart calculations
    const cartSummary = useMemo(() => {
        const itemsTotal = cartItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
        const manual = Number(manualAmount) || 0;
        const totalAmount = itemsTotal + manual;
        const totalItemsCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) + (manual > 0 ? 1 : 0);
        const totalSavings = cartItems.reduce((sum, item) => sum + (Number(item.promoSavings) || 0), 0);

        return {
            itemsTotal,
            manual,
            totalAmount,
            totalItemsCount,
            totalSavings,
        };
    }, [cartItems, manualAmount]);

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

    // Update quantity
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

    const clearCart = () => {
        setCartItems([]);
        setManualAmount("");
        setSelectedClient(null);
        setIsCartOpen(false);
        setIsCheckoutOpen(false);
    };

    // Handle Barcode Detection (Hardware or Camera)
    const handleBarcodeScanned = useCallback((code) => {
        const barcodeStr = String(code).trim();
        if (!barcodeStr) return;

        // Search in local store catalog
        const match = products.find(
            p => (p.barcode && String(p.barcode).trim() === barcodeStr) ||
                 (p.sku && String(p.sku).trim() === barcodeStr)
        );

        if (match) {
            addToCart(match, 1);
            return;
        }

        // Check National Argentine Catalog
        const nationalMatch = NATIONAL_PRODUCTS[barcodeStr];
        setUnregisteredBarcode({
            barcode: barcodeStr,
            nationalMatch: nationalMatch || null,
        });
        setIsBarcodeNotFoundOpen(true);
        playBeepWarning();
    }, [products, addToCart]);

    // Hardware Bluetooth / USB scanner hook
    useBarcodeScanner(handleBarcodeScanned, { enabled: !isScannerOpen });

    // Filter products
    const filteredProducts = useMemo(() => {
        let list = products;

        if (selectedCategory !== "all") {
            list = list.filter(p => p.category === selectedCategory || p.category_name === selectedCategory);
        }

        if (searchQuery.trim()) {
            list = filterAndRankProducts(list, searchQuery.trim());
        }

        return list;
    }, [products, selectedCategory, searchQuery]);

    // Vuelto calculation
    const calculatedChange = useMemo(() => {
        const cash = Number(receivedCash) || 0;
        const total = cartSummary.totalAmount;
        return Math.max(0, cash - total);
    }, [receivedCash, cartSummary.totalAmount]);

    // Submit sale
    const handleCompleteSale = async () => {
        if (cartSummary.totalAmount <= 0) {
            toast.error("El carrito está vacío.");
            return;
        }

        if (paymentMethod === "debt" && !selectedClient) {
            toast.error("Seleccioná un cliente para registrar la venta en libreta / a cuenta.");
            return;
        }

        try {
            setIsSubmitting(true);

            // Format items for backend API
            const payloadItems = cartItems.map(item => ({
                product_id: item.product.id,
                product: item.product.id,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                grams: item.grams,
                subtotal: item.subtotal,
            }));

            const payloadAmounts = [
                {
                    method: paymentMethod === "mp" ? "transfer" : (paymentMethod === "debt" ? "debt" : paymentMethod),
                    amount: cartSummary.totalAmount,
                },
            ];

            const payload = {
                type: "sale",
                client: selectedClient ? selectedClient.id : null,
                description: `Venta Móvil / Modo Simple`,
                received_cash: paymentMethod === "cash" && receivedCash ? Number(receivedCash) : null,
                change_amount: paymentMethod === "cash" && calculatedChange > 0 ? calculatedChange : null,
                operations: [
                    {
                        type: "sale",
                        manualAmount: cartSummary.manual || null,
                        items: payloadItems,
                        amounts: payloadAmounts,
                    },
                ],
            };

            const response = await createTransaction(payload);
            playBeepSuccess();
            toast.success("¡Venta registrada con éxito!");

            setCompletedSale(response);
            setShowReceiptModal(true);
            clearCart();
        } catch (err) {
            console.error("Error creating transaction in Simple POS:", err);
            toast.error(err?.response?.data?.detail || "Error al registrar la venta.");
            playBeepWarning();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            {/* Top Search & Action Bar */}
            <div className="sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 shadow-xs">
                <div className="flex items-center gap-2">
                    {/* Search Input */}
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
                            placeholder="Buscar producto o código..."
                            className="w-full pl-9 pr-8 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)]"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Camera Scanner Button */}
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="p-2.5 bg-[var(--surface-accent)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--primary)] rounded-md transition-colors flex items-center justify-center shrink-0 shadow-xs"
                        title="Escanear con Cámara"
                    >
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Quick Manual Amount Button */}
                    <button
                        type="button"
                        onClick={() => setIsManualAmountModalOpen(true)}
                        className="p-2.5 bg-[var(--surface-accent)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--primary)] rounded-md transition-colors flex items-center justify-center shrink-0 shadow-xs text-xs font-bold font-mono"
                        title="Monto Manual / Varios"
                    >
                        +\$
                    </button>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                            selectedCategory === "all"
                                ? "bg-[var(--primary)] text-white font-semibold"
                                : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                        }`}
                    >
                        Todos ({products.length})
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id || cat.name}
                            type="button"
                            onClick={() => setSelectedCategory(cat.name || cat.id)}
                            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                                selectedCategory === (cat.name || cat.id)
                                    ? "bg-[var(--primary)] text-white font-semibold"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid Area */}
            <div className="flex-1 p-3 pb-28">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs">Cargando catálogo táctil...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-secondary)]">
                        <svg className="w-12 h-12 stroke-current opacity-30 mb-2" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-sm font-medium text-[var(--text-primary)]">No se encontraron productos</p>
                        <p className="text-xs mt-1">Probá con otro término o agregalo al catálogo.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {filteredProducts.map((product) => {
                            const inCartItem = cartItems.find(i => i.product.id === product.id);
                            const isLowStock = product.stock !== null && product.stock <= (product.min_stock || 3);
                            const isOutOfStock = product.stock !== null && product.stock <= 0;

                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => addToCart(product, 1)}
                                    className={`relative flex flex-col justify-between p-3 bg-[var(--surface)] border rounded-md text-left transition-all active:scale-98 shadow-xs hover:border-[var(--primary)] ${
                                        inCartItem
                                            ? "border-[var(--primary)] ring-1 ring-[var(--primary)] bg-[var(--surface-accent)]"
                                            : "border-[var(--border)]"
                                    }`}
                                >
                                    {/* In-Cart Quantity Badge */}
                                    {inCartItem && (
                                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center shadow-md">
                                            {inCartItem.quantity}
                                        </div>
                                    )}

                                    <div>
                                        <p className="font-medium text-xs text-[var(--text-primary)] line-clamp-2 leading-snug">
                                            {product.name}
                                        </p>
                                        {product.category_name && (
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                                                {product.category_name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50 flex items-end justify-between">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">
                                            {formatCurrency(product.sale_price)}
                                        </span>

                                        {isOutOfStock ? (
                                            <span className="text-[9px] font-semibold text-rose-500 uppercase">Sin Stock</span>
                                        ) : isLowStock ? (
                                            <span className="text-[9px] text-amber-500 font-medium">Quedan {product.stock}</span>
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sticky Floating Bottom Cart Bar */}
            {cartSummary.totalAmount > 0 && !isCartOpen && !isCheckoutOpen && (
                <div className="fixed bottom-16 inset-x-0 p-3 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-[var(--primary)] hover:opacity-95 text-white rounded-md shadow-lg transition-transform active:scale-98"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                                    {cartSummary.totalItemsCount}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-medium opacity-90">Ver Carrito</p>
                                    {cartSummary.totalSavings > 0 && (
                                        <p className="text-[10px] text-emerald-300 font-bold">
                                            Ahorro: {formatCurrency(cartSummary.totalSavings)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base font-bold font-mono">
                                    {formatCurrency(cartSummary.totalAmount)}
                                </span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Drawer Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-xl max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Cart Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                    Carrito ({cartSummary.totalItemsCount} {cartSummary.totalItemsCount === 1 ? "artículo" : "artículos"})
                                </h3>
                                {cartSummary.totalSavings > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-md">
                                        Promo: -{formatCurrency(cartSummary.totalSavings)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                                >
                                    Vaciar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[var(--border)]/40">
                            {cartItems.map((item, idx) => (
                                <div key={`${item.product.id}-${idx}`} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                            {item.product.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                            <span>{formatCurrency(item.unitPrice)} u.</span>
                                            {item.promoText && (
                                                <span className="text-emerald-400 font-medium">({item.promoText})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quantity Stepper */}
                                    <div className="flex items-center gap-1.5 bg-[var(--surface-accent)] border border-[var(--border)] rounded-md p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => updateItemQuantity(idx, -1)}
                                            className="w-7 h-7 flex items-center justify-center text-[var(--text-primary)] font-bold active:bg-[var(--border)] rounded-sm"
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-xs font-bold font-mono">
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => updateItemQuantity(idx, 1)}
                                            className="w-7 h-7 flex items-center justify-center text-[var(--text-primary)] font-bold active:bg-[var(--border)] rounded-sm"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="text-right min-w-[70px]">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">
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

                            {/* Manual Amount Entry if any */}
                            {cartSummary.manual > 0 && (
                                <div className="pt-2.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--text-primary)]">Monto Manual / Varios</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">Artículo no listado</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold">{formatCurrency(cartSummary.manual)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setManualAmount("")}
                                            className="text-[10px] text-rose-400"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cart Footer & Checkout Button */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-accent)]/50">
                            <div className="flex items-center justify-between mb-3 text-sm">
                                <span className="text-[var(--text-secondary)]">Total a Cobrar:</span>
                                <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
                                    {formatCurrency(cartSummary.totalAmount)}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsCartOpen(false);
                                    setIsCheckoutOpen(true);
                                }}
                                className="w-full py-3 bg-[var(--primary)] hover:opacity-95 text-white font-bold text-sm rounded-md shadow-md transition-transform active:scale-98 flex items-center justify-center gap-2"
                            >
                                <span>Continuar al Cobro</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout / Payment Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                            <div>
                                <h3 className="font-bold text-sm text-[var(--text-primary)]">Cobro de Venta</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Total: {formatCurrency(cartSummary.totalAmount)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCheckoutOpen(false)}
                                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Payment Methods Tabs */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                    Medio de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "cash", label: "Efectivo", icon: "💵" },
                                        { id: "mp", label: "Mercado Pago", icon: "📱" },
                                        { id: "card", label: "Tarjeta Débito/Crédito", icon: "💳" },
                                        { id: "debt", label: "Libreta (A Cuenta)", icon: "📒" },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`p-2.5 rounded-md border text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                                                paymentMethod === m.id
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--surface-accent)] text-[var(--text-primary)] hover:border-[var(--primary)]"
                                            }`}
                                        >
                                            <span>{m.label}</span>
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
                                            placeholder={`$ ${cartSummary.totalAmount}`}
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm text-[var(--text-primary)]"
                                        />
                                    </div>

                                    {/* Fast Bill Buttons */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {[1000, 2000, 5000, 10000, 20000].map((bill) => (
                                            <button
                                                key={bill}
                                                type="button"
                                                onClick={() => setReceivedCash(String(bill))}
                                                className="px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-mono font-medium rounded-md"
                                            >
                                                +{formatCurrency(bill)}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setReceivedCash(String(cartSummary.totalAmount))}
                                            className="px-2.5 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-semibold rounded-md"
                                        >
                                            Monto Exacto
                                        </button>
                                    </div>

                                    {/* Vuelto Indicator */}
                                    {Number(receivedCash) > cartSummary.totalAmount && (
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-emerald-400 font-bold">
                                            <span className="text-xs">Vuelto a Entregar:</span>
                                            <span className="text-base font-mono">
                                                {formatCurrency(calculatedChange)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Client Selector (Required for Debt, Optional for others) */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Cliente {paymentMethod === "debt" ? "(Obligatorio para Libreta)" : "(Opcional)"}
                                </label>
                                <select
                                    value={selectedClient ? selectedClient.id : ""}
                                    onChange={(e) => {
                                        const found = clients.find(c => String(c.id) === e.target.value);
                                        setSelectedClient(found || null);
                                    }}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)]"
                                >
                                    <option value="">Consumidor Final (Sin asignar)</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ""} - Saldo: {formatCurrency(c.current_debt || 0)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Submit Sale Button */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-accent)]/50">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleCompleteSale}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-md shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Procesando Venta...</span>
                                    </>
                                ) : (
                                    <span>Cobrar {formatCurrency(cartSummary.totalAmount)}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Manual Amount Modal */}
            {isManualAmountModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 shadow-xl">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-2">Monto Manual / Varios</h4>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">
                            Ingresá un monto para sumar al total de la venta actual.
                        </p>
                        <input
                            type="number"
                            autoFocus
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            placeholder="$ 0.00"
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base text-[var(--text-primary)] mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsManualAmountModalOpen(false)}
                                className="flex-1 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md"
                            >
                                Aceptar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setManualAmount("");
                                    setIsManualAmountModalOpen(false);
                                }}
                                className="px-3 py-2 bg-[var(--surface-accent)] border border-[var(--border)] text-xs rounded-md"
                            >
                                Cancelar
                            </button>
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
                        subtitle="Apuntá al producto para sumarlo al carrito"
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
                        toast.success(`Producto "${newProd.name}" creado y sumado al carrito.`);
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
