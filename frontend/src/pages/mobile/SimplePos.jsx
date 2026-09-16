import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import {
    getProducts,
    getCategories,
    getClients,
    createTransaction,
    createClient,
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

export function SimplePos({ register, onOpenRegister }) {
    const {
        settings,
        calculateSubeFee,
        calculatePhoneFee,
        calculateExchangeFee,
    } = useStoreSettings();
    const { isPro } = useSubscriptionTier();

    // Data State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Active Ticket (Cart) State
    const [ticketItems, setTicketItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [isCatalogExpanded, setIsCatalogExpanded] = useState(true);

    // Client State
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [newClientName, setNewClientName] = useState("");
    const [isCreatingClient, setIsCreatingClient] = useState(false);

    // Quick Service Dialogs State
    const [activeServiceSheet, setActiveServiceSheet] = useState(null); // 'varios' | 'sube' | 'phone' | 'exchange' | 'payment' | 'weight' | 'editPrice'
    const [manualAmount, setManualAmount] = useState("");
    const [manualDescription, setManualDescription] = useState("");

    const [subeAmount, setSubeAmount] = useState("");
    const [phoneAmount, setPhoneAmount] = useState("");
    const [exchangeAmount, setExchangeAmount] = useState("");
    const [debtPaymentAmount, setDebtPaymentAmount] = useState("");
    const [debtPaymentClient, setDebtPaymentClient] = useState(null);

    // Weight Item Grams Edit State
    const [editingWeightItemIndex, setEditingWeightItemIndex] = useState(null);
    const [customGramsValue, setCustomGramsValue] = useState("");

    // In-Ticket Custom Price Edit State
    const [editingPriceItemIndex, setEditingPriceItemIndex] = useState(null);
    const [customPriceValue, setCustomPriceValue] = useState("");

    // Barcode & Modals
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

    // Post-Sale Receipt Modal
    const [completedSale, setCompletedSale] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Load Catalog Data
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

    // Financial Calculation of the Entire Ticket
    const grandTotal = useMemo(() => {
        return ticketItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    }, [ticketItems]);

    const totalSavings = useMemo(() => {
        return ticketItems.reduce((sum, item) => sum + (Number(item.promoSavings) || 0), 0);
    }, [ticketItems]);

    const totalItemCount = useMemo(() => {
        return ticketItems.reduce((count, item) => {
            if (item.type === "product" && item.unitType === "unit") {
                return count + item.quantity;
            }
            return count + 1;
        }, 0);
    }, [ticketItems]);

    // ==========================================
    // TICKET ACTIONS
    // ==========================================

    // 1. Add Product to Ticket
    const addProductToTicket = useCallback((product, qtyToAdd = 1, customGrams = null) => {
        setTicketItems((prevItems) => {
            const isWeight = product.unit_type === "kg" || product.unit_type === "100g";
            const existingIndex = prevItems.findIndex(
                (i) => i.type === "product" && i.product?.id === product.id
            );

            if (existingIndex >= 0 && !isWeight) {
                // Increment unit quantity
                const updated = [...prevItems];
                const currentItem = updated[existingIndex];
                const newQty = currentItem.quantity + qtyToAdd;
                const pricing = calculateItemPricing(product, newQty, currentItem.customUnitPrice, null);

                updated[existingIndex] = {
                    ...currentItem,
                    quantity: newQty,
                    unitPrice: pricing.unitPrice,
                    subtotal: pricing.subtotal,
                    hasPromoApplied: pricing.hasPromoApplied,
                    promoSavings: pricing.promoSavings,
                    promoText: pricing.promoText,
                };
                return updated;
            } else if (existingIndex >= 0 && isWeight && customGrams) {
                // Update grams for weighable product
                const updated = [...prevItems];
                const currentItem = updated[existingIndex];
                const newGrams = (currentItem.grams || 0) + customGrams;
                const pricing = calculateItemPricing(product, 1, currentItem.customUnitPrice, newGrams);

                updated[existingIndex] = {
                    ...currentItem,
                    grams: newGrams,
                    unitPrice: pricing.unitPrice,
                    subtotal: pricing.subtotal,
                    hasPromoApplied: pricing.hasPromoApplied,
                    promoSavings: pricing.promoSavings,
                    promoText: pricing.promoText,
                };
                return updated;
            } else {
                // New Line Item
                const initialGrams = isWeight
                    ? customGrams || (product.unit_type === "kg" ? 1000 : 100)
                    : null;
                const pricing = calculateItemPricing(product, qtyToAdd, null, initialGrams);

                return [
                    ...prevItems,
                    {
                        id: `prod-${product.id}-${Date.now()}`,
                        type: "product",
                        product,
                        unitType: product.unit_type || "unit",
                        quantity: qtyToAdd,
                        grams: initialGrams,
                        customUnitPrice: null,
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
        toast.success(`+ ${product.name}`, { duration: 1200, id: `pos-${product.id}` });
    }, []);

    // 2. Add Manual / Unlisted Item
    const handleAddManualItem = (e) => {
        if (e) e.preventDefault();
        const amt = Number(manualAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá un monto mayor a $0.");
            return;
        }

        const name = manualDescription.trim() || "Varios / Monto Manual";
        setTicketItems((prev) => [
            ...prev,
            {
                id: `manual-${Date.now()}`,
                type: "manual",
                name,
                quantity: 1,
                unitPrice: amt,
                subtotal: amt,
                promoSavings: 0,
            },
        ]);

        setManualAmount("");
        setManualDescription("");
        setActiveServiceSheet(null);
        playBeepSuccess();
        toast.success(`Sumado: ${name} (${formatCurrency(amt)})`);
    };

    // 3. Add SUBE Recharge
    const handleAddSubeRecharge = (e) => {
        if (e) e.preventDefault();
        const amt = Number(subeAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá un monto de carga válido.");
            return;
        }

        const feeInfo = calculateSubeFee(amt);
        setTicketItems((prev) => [
            ...prev,
            {
                id: `sube-${Date.now()}`,
                type: "sube",
                name: "Carga Tarjeta SUBE",
                rechargeAmount: amt,
                fee: feeInfo.fee,
                unitPrice: feeInfo.totalToCharge,
                subtotal: feeInfo.totalToCharge,
                promoSavings: 0,
            },
        ]);

        setSubeAmount("");
        setActiveServiceSheet(null);
        playBeepSuccess();
        toast.success(`Sumada carga SUBE de ${formatCurrency(amt)}`);
    };

    // 4. Add Phone Recharge
    const handleAddPhoneRecharge = (e) => {
        if (e) e.preventDefault();
        const amt = Number(phoneAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá un monto de recarga válido.");
            return;
        }

        const feeInfo = calculatePhoneFee(amt);
        setTicketItems((prev) => [
            ...prev,
            {
                id: `phone-${Date.now()}`,
                type: "phone",
                name: "Recarga Celular",
                rechargeAmount: amt,
                fee: feeInfo.fee,
                unitPrice: feeInfo.totalToCharge,
                subtotal: feeInfo.totalToCharge,
                promoSavings: 0,
            },
        ]);

        setPhoneAmount("");
        setActiveServiceSheet(null);
        playBeepSuccess();
        toast.success(`Sumada recarga de ${formatCurrency(amt)}`);
    };

    // 5. Add Money Exchange
    const handleAddExchange = (e) => {
        if (e) e.preventDefault();
        const amt = Number(exchangeAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá el monto de cambio.");
            return;
        }

        const feeInfo = calculateExchangeFee(amt);
        setTicketItems((prev) => [
            ...prev,
            {
                id: `exchange-${Date.now()}`,
                type: "exchange",
                name: "Cambio de Dinero (Efectivo)",
                exchangeAmount: amt,
                fee: feeInfo.fee,
                clientAmount: feeInfo.clientAmount,
                unitPrice: amt,
                subtotal: amt,
                promoSavings: 0,
            },
        ]);

        setExchangeAmount("");
        setActiveServiceSheet(null);
        playBeepSuccess();
        toast.success(`Sumado cambio de dinero (${formatCurrency(amt)})`);
    };

    // 6. Add Debt Payment (Pago A Cuenta)
    const handleAddDebtPayment = (e) => {
        if (e) e.preventDefault();
        const client = debtPaymentClient || selectedClient;
        if (!client) {
            toast.error("Seleccioná el cliente que realiza el pago a cuenta.");
            return;
        }

        const amt = Number(debtPaymentAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá un monto de pago válido.");
            return;
        }

        setTicketItems((prev) => [
            ...prev,
            {
                id: `payment-${Date.now()}`,
                type: "payment",
                name: `Pago A Cuenta · ${client.name}`,
                client,
                unitPrice: amt,
                subtotal: amt,
                promoSavings: 0,
            },
        ]);

        // Also assign client to sale if not set
        if (!selectedClient) {
            setSelectedClient(client);
        }

        setDebtPaymentAmount("");
        setDebtPaymentClient(null);
        setActiveServiceSheet(null);
        playBeepSuccess();
        toast.success(`Sumado pago a cuenta de ${client.name}`);
    };

    // 7. Update Item Quantity (stepper)
    const updateItemQuantity = (index, delta) => {
        setTicketItems((prev) => {
            const updated = [...prev];
            const item = updated[index];

            if (item.type !== "product" || item.unitType !== "unit") {
                if (delta < 0) {
                    return updated.filter((_, i) => i !== index);
                }
                return prev;
            }

            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                return updated.filter((_, i) => i !== index);
            }

            const pricing = calculateItemPricing(item.product, newQty, item.customUnitPrice, item.grams);
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

    // 8. Update Item Grams (for weighable items)
    const handleSaveItemGrams = (targetGrams) => {
        if (editingWeightItemIndex === null) return;
        const grams = Number(targetGrams);
        if (!grams || grams <= 0) {
            toast.error("Ingresá un peso en gramos válido.");
            return;
        }

        setTicketItems((prev) => {
            const updated = [...prev];
            const item = updated[editingWeightItemIndex];
            if (!item) return prev;

            const pricing = calculateItemPricing(item.product, 1, item.customUnitPrice, grams);
            updated[editingWeightItemIndex] = {
                ...item,
                grams,
                unitPrice: pricing.unitPrice,
                subtotal: pricing.subtotal,
                hasPromoApplied: pricing.hasPromoApplied,
                promoSavings: pricing.promoSavings,
                promoText: pricing.promoText,
            };
            return updated;
        });

        setEditingWeightItemIndex(null);
        setCustomGramsValue("");
        setActiveServiceSheet(null);
    };

    // 9. Update Custom Unit Price on Item
    const handleSaveItemCustomPrice = (newPrice) => {
        if (editingPriceItemIndex === null) return;
        const price = Number(newPrice);
        if (!price || price < 0) {
            toast.error("Ingresá un precio válido.");
            return;
        }

        setTicketItems((prev) => {
            const updated = [...prev];
            const item = updated[editingPriceItemIndex];
            if (!item) return prev;

            const pricing = calculateItemPricing(item.product, item.quantity, price, item.grams);
            updated[editingPriceItemIndex] = {
                ...item,
                customUnitPrice: price,
                unitPrice: price,
                subtotal: pricing.subtotal,
                hasPromoApplied: false,
                promoSavings: 0,
                promoText: null,
            };
            return updated;
        });

        setEditingPriceItemIndex(null);
        setCustomPriceValue("");
        setActiveServiceSheet(null);
        toast.success("Precio modificado en el ticket.");
    };

    // 10. Remove Item
    const removeTicketItem = (index) => {
        setTicketItems((prev) => prev.filter((_, i) => i !== index));
    };

    // 11. Clear Whole Ticket
    const clearTicket = () => {
        setTicketItems([]);
        setSelectedClient(null);
        setReceivedCash("");
        setIsCheckoutOpen(false);
    };

    // ==========================================
    // BARCODE SCANNING
    // ==========================================
    const handleBarcodeScanned = useCallback((code) => {
        const barcodeStr = String(code).trim();
        if (!barcodeStr) return;

        const match = products.find(
            (p) =>
                (p.barcode && String(p.barcode).trim() === barcodeStr) ||
                (p.sku && String(p.sku).trim() === barcodeStr)
        );

        if (match) {
            addProductToTicket(match, 1);
            return;
        }

        const nationalMatch = NATIONAL_PRODUCTS[barcodeStr];
        setUnregisteredBarcode({
            barcode: barcodeStr,
            nationalMatch: nationalMatch || null,
        });
        setIsBarcodeNotFoundOpen(true);
        playBeepWarning();
    }, [products, addProductToTicket]);

    useBarcodeScanner(handleBarcodeScanned, { enabled: !isScannerOpen });

    // Filter Products Search
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return filterAndRankProducts(products, searchQuery.trim()).slice(0, 10);
    }, [products, searchQuery]);

    // Filter Catalog by Category
    const catalogFilteredProducts = useMemo(() => {
        let list = products;
        if (selectedCategory !== "all") {
            list = list.filter(
                (p) => p.category === selectedCategory || p.category_name === selectedCategory
            );
        }
        return list;
    }, [products, selectedCategory]);

    // Filter Clients for Client Selector
    const filteredClients = useMemo(() => {
        if (!clientSearchQuery.trim()) return clients;
        const q = clientSearchQuery.toLowerCase();
        return clients.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.phone && c.phone.includes(q))
        );
    }, [clients, clientSearchQuery]);

    // Handle Quick Client Creation
    const handleCreateClientQuick = async (e) => {
        if (e) e.preventDefault();
        const name = newClientName.trim();
        if (!name) return;

        try {
            setIsCreatingClient(true);
            const created = await createClient({ name });
            setClients((prev) => [created, ...prev]);
            setSelectedClient(created);
            setNewClientName("");
            setIsClientModalOpen(false);
            toast.success(`Cliente "${created.name}" creado y asignado.`);
        } catch (err) {
            console.error("Error creating client:", err);
            toast.error("Error al crear cliente.");
        } finally {
            setIsCreatingClient(false);
        }
    };

    // Calculate Cash Change / Vuelto
    const calculatedChange = useMemo(() => {
        const cash = Number(receivedCash) || 0;
        return Math.max(0, cash - grandTotal);
    }, [receivedCash, grandTotal]);

    // ==========================================
    // SUBMIT TRANSACTION
    // ==========================================
    const handleCompleteTransaction = async () => {
        if (grandTotal <= 0) {
            toast.error("El monto de la operación debe ser mayor a $0.");
            return;
        }

        const hasPaymentItem = ticketItems.some((i) => i.type === "payment");
        if ((paymentMethod === "debt" || hasPaymentItem) && !selectedClient) {
            toast.error("Seleccioná un cliente para registrar la operación a cuenta.");
            return;
        }

        try {
            setIsSubmitting(true);

            // Group ticket items into backend operations
            const operations = [];

            // 1. Product & Manual items -> type 'sale'
            const saleItems = ticketItems.filter((i) => i.type === "product");
            const manualItems = ticketItems.filter((i) => i.type === "manual");

            if (saleItems.length > 0 || manualItems.length > 0) {
                const manualTotal = manualItems.reduce((sum, i) => sum + i.subtotal, 0);
                const resolvedItems = saleItems.map((item) => {
                    const qty =
                        item.unitType === "kg"
                            ? (Number(item.grams) || 0) / 1000
                            : item.unitType === "100g"
                            ? (Number(item.grams) || 0) / 100
                            : Number(item.quantity) || 1;

                    return {
                        product: item.product?.id || null,
                        product_id: item.product?.id || null,
                        product_name: item.product?.name || "Producto",
                        unit_type: item.unitType || "unit",
                        quantity: qty,
                        grams: item.grams,
                        unit_price: Number(item.unitPrice) || 0,
                        subtotal: Number(item.subtotal) || 0,
                    };
                });

                const saleTotal =
                    resolvedItems.reduce((s, i) => s + i.subtotal, 0) + manualTotal;

                operations.push({
                    type: "sale",
                    manualAmount: manualTotal > 0 ? manualTotal : null,
                    amounts: [
                        {
                            method: paymentMethod === "mp" ? "transfer" : paymentMethod,
                            amount: saleTotal,
                        },
                    ],
                    items: resolvedItems,
                });
            }

            // 2. SUBE Items
            const subeItems = ticketItems.filter((i) => i.type === "sube");
            for (const sube of subeItems) {
                operations.push({
                    type: "sube",
                    rechargeAmount: sube.rechargeAmount,
                    amounts: [
                        {
                            method: paymentMethod === "mp" ? "transfer" : paymentMethod,
                            amount: sube.subtotal,
                        },
                    ],
                    items: [],
                });
            }

            // 3. Phone Items
            const phoneItems = ticketItems.filter((i) => i.type === "phone");
            for (const phone of phoneItems) {
                operations.push({
                    type: "phone",
                    rechargeAmount: phone.rechargeAmount,
                    amounts: [
                        {
                            method: paymentMethod === "mp" ? "transfer" : paymentMethod,
                            amount: phone.subtotal,
                        },
                    ],
                    items: [],
                });
            }

            // 4. Exchange Items
            const exchangeItems = ticketItems.filter((i) => i.type === "exchange");
            for (const ex of exchangeItems) {
                operations.push({
                    type: "exchange",
                    exchange_amount: ex.clientAmount,
                    amounts: [
                        {
                            method: paymentMethod === "mp" ? "transfer" : paymentMethod,
                            amount: ex.subtotal,
                        },
                    ],
                    items: [],
                });
            }

            // 5. Debt Payment Items (A Cuenta)
            const paymentItems = ticketItems.filter((i) => i.type === "payment");
            for (const pay of paymentItems) {
                operations.push({
                    type: "payment",
                    manualAmount: pay.subtotal,
                    amounts: [
                        {
                            method: paymentMethod === "mp" ? "transfer" : paymentMethod,
                            amount: pay.subtotal,
                        },
                    ],
                    items: [],
                });
            }

            // Auto-generate description
            const itemNames = ticketItems
                .map((i) => (i.type === "product" ? i.product.name : i.name))
                .slice(0, 3)
                .join(", ");
            const desc = `Venta Móvil (${ticketItems.length} art.): ${itemNames}${ticketItems.length > 3 ? "..." : ""}`;

            const payload = {
                client: selectedClient ? selectedClient.id : null,
                description: desc,
                received_cash:
                    paymentMethod === "cash" && receivedCash ? Number(receivedCash) : null,
                change_amount:
                    paymentMethod === "cash" && calculatedChange > 0 ? calculatedChange : null,
                operations,
            };

            const response = await createTransaction(payload);
            playBeepSuccess();
            toast.success("¡Venta cobrada con éxito!");

            setCompletedSale(response);
            setShowReceiptModal(true);
            clearTicket();
        } catch (err) {
            console.error("Error creating mobile transaction:", err);
            toast.error(err?.response?.data?.detail || "Error al registrar la venta.");
            playBeepWarning();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-28">
            {/* Top Store Status & Client Ribbon */}
            <div className="sticky top-0 z-20 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] px-3 py-2 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                    {/* Active Client Chip */}
                    <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-accent)]/80 hover:bg-[var(--surface-accent)] border border-[var(--border)] rounded-xl text-left transition-colors"
                    >
                        <div className="w-6 h-6 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                    {selectedClient ? selectedClient.name : "Consumidor Final"}
                                </span>
                                {selectedClient && selectedClient.current_debt > 0 && (
                                    <span className="text-[10px] text-rose-400 font-bold font-mono">
                                        (Debe {formatCurrency(selectedClient.current_debt)})
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] block truncate">
                                {selectedClient ? "Tocar para cambiar" : "Tocar para asignar cliente (A cuenta)"}
                            </span>
                        </div>
                    </button>

                    {/* Clear Ticket Button */}
                    {ticketItems.length > 0 && (
                        <button
                            type="button"
                            onClick={clearTicket}
                            className="px-2.5 py-1.5 text-xs text-rose-400 font-semibold hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 flex items-center gap-1"
                            title="Vaciar Ticket"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Vaciar</span>
                        </button>
                    )}
                </div>

                {/* Quick Services Ribbon (Pills with soft styling) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-0.5">
                    {/* + Varios */}
                    <button
                        type="button"
                        onClick={() => setActiveServiceSheet("varios")}
                        className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>+ Varios $</span>
                    </button>

                    {/* Carga SUBE */}
                    <button
                        type="button"
                        onClick={() => setActiveServiceSheet("sube")}
                        className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>SUBE</span>
                    </button>

                    {/* Recarga Celular */}
                    <button
                        type="button"
                        onClick={() => setActiveServiceSheet("phone")}
                        className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Celular</span>
                    </button>

                    {/* Cambio de Dinero */}
                    <button
                        type="button"
                        onClick={() => setActiveServiceSheet("exchange")}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Cambio $</span>
                    </button>

                    {/* Cobro A Cuenta */}
                    <button
                        type="button"
                        onClick={() => setActiveServiceSheet("payment")}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Cobro A Cuenta</span>
                    </button>
                </div>
            </div>

            {/* Main POS Content */}
            <div className="p-3 space-y-3.5">
                {/* Search Bar + Live Camera Button */}
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
                                placeholder="Buscar por nombre, marca o código..."
                                className="w-full pl-9 pr-8 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)] shadow-xs transition-colors"
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

                        {/* Scanner Trigger */}
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="p-2.5 bg-[var(--primary)] text-white hover:opacity-95 rounded-2xl shadow-md flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                            title="Escanear con Cámara"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Instant Search Dropdown Results */}
                    {searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-30 divide-y divide-[var(--border)]/60 max-h-72 overflow-y-auto">
                            {searchMatches.length === 0 ? (
                                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                                    No se encontraron productos coincidentes.
                                </div>
                            ) : (
                                searchMatches.map((prod) => (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => {
                                            addProductToTicket(prod, 1);
                                            setSearchQuery("");
                                        }}
                                        className="w-full p-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] transition-colors"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{prod.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-secondary)]">
                                                <span>{prod.category_name || "Sin rubro"}</span>
                                                {prod.stock !== undefined && prod.stock !== null && (
                                                    <span className={prod.stock <= 0 ? "text-rose-400 font-bold" : ""}>
                                                        · Stock: {prod.stock}
                                                    </span>
                                                )}
                                            </div>
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

                {/* THE ACTIVE TICKET CARD */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden">
                    {/* Ticket Header */}
                    <div className="px-3.5 py-2.5 bg-[var(--surface-accent)]/50 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                Ticket de Venta ({totalItemCount})
                            </span>
                            {totalSavings > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                                    Ahorro: -{formatCurrency(totalSavings)}
                                </span>
                            )}
                        </div>

                        {ticketItems.length > 0 && (
                            <span className="text-xs font-bold font-mono text-[var(--primary)]">
                                {formatCurrency(grandTotal)}
                            </span>
                        )}
                    </div>

                    {/* Ticket Items List / Empty State */}
                    {ticketItems.length === 0 ? (
                        <div className="p-6 text-center text-[var(--text-secondary)] space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-accent)] flex items-center justify-center text-[var(--text-secondary)]/50">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">El ticket está vacío</p>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                    Buscá productos, usá la cámara o elegí una acción rápida arriba.
                                </p>
                            </div>

                            {/* Preset Shortcuts */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManualAmount("500");
                                        setActiveServiceSheet("varios");
                                    }}
                                    className="px-2.5 py-1 bg-[var(--surface-accent)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] text-xs font-mono font-medium rounded-lg border border-[var(--border)]"
                                >
                                    +$500 Varios
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManualAmount("1000");
                                        setActiveServiceSheet("varios");
                                    }}
                                    className="px-2.5 py-1 bg-[var(--surface-accent)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] text-xs font-mono font-medium rounded-lg border border-[var(--border)]"
                                >
                                    +$1.000 Varios
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="px-2.5 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold rounded-lg border border-[var(--primary)]/20 flex items-center gap-1"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    </svg>
                                    <span>Escanear</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]/40 p-2 space-y-2">
                            {ticketItems.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    className="pt-2 first:pt-0 flex items-center justify-between gap-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {/* Type Badge */}
                                            {item.type !== "product" && (
                                                <span
                                                    className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-md ${
                                                        item.type === "sube"
                                                            ? "bg-cyan-500/15 text-cyan-400"
                                                            : item.type === "phone"
                                                            ? "bg-purple-500/15 text-purple-400"
                                                            : item.type === "exchange"
                                                            ? "bg-amber-500/15 text-amber-400"
                                                            : item.type === "payment"
                                                            ? "bg-emerald-500/15 text-emerald-400"
                                                            : "bg-sky-500/15 text-sky-400"
                                                    }`}
                                                >
                                                    {item.type === "sube"
                                                        ? "SUBE"
                                                        : item.type === "phone"
                                                        ? "CEL"
                                                        : item.type === "exchange"
                                                        ? "CAMBIO"
                                                        : item.type === "payment"
                                                        ? "A CUENTA"
                                                        : "VARIOS"}
                                                </span>
                                            )}
                                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                                {item.type === "product" ? item.product.name : item.name}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-secondary)]">
                                            {item.type === "product" ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingPriceItemIndex(idx);
                                                            setCustomPriceValue(String(item.unitPrice));
                                                            setActiveServiceSheet("editPrice");
                                                        }}
                                                        className="font-mono hover:text-[var(--primary)] hover:underline flex items-center gap-0.5"
                                                        title="Modificar precio unitario para este ticket"
                                                    >
                                                        <span>{formatCurrency(item.unitPrice)}</span>
                                                        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>

                                                    {/* Weighable grams pill */}
                                                    {(item.unitType === "kg" || item.unitType === "100g") && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingWeightItemIndex(idx);
                                                                setCustomGramsValue(String(item.grams || 100));
                                                                setActiveServiceSheet("weight");
                                                            }}
                                                            className="px-1.5 py-0.2 bg-[var(--surface-accent)] text-[var(--text-primary)] font-bold text-[10px] rounded hover:border-[var(--primary)] border border-[var(--border)]"
                                                        >
                                                            {item.grams >= 1000
                                                                ? `${(item.grams / 1000).toFixed(2).replace(/\.?0+$/, "")} kg`
                                                                : `${item.grams} g`}
                                                        </button>
                                                    )}

                                                    {item.promoText && (
                                                        <span className="text-emerald-400 font-semibold text-[10px]">
                                                            ({item.promoText})
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span>{formatCurrency(item.subtotal)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stepper for unit products */}
                                    {item.type === "product" && item.unitType === "unit" && (
                                        <div className="flex items-center gap-1 bg-[var(--surface-accent)] border border-[var(--border)] rounded-xl p-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => updateItemQuantity(idx, -1)}
                                                className="w-7 h-7 flex items-center justify-center font-bold text-xs active:bg-[var(--border)] rounded-lg transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center text-xs font-bold font-mono">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateItemQuantity(idx, 1)}
                                                className="w-7 h-7 flex items-center justify-center font-bold text-xs active:bg-[var(--border)] rounded-lg transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}

                                    {/* Subtotal & Delete Action */}
                                    <div className="text-right min-w-[70px] shrink-0">
                                        <p className="text-xs font-bold font-mono text-[var(--text-primary)]">
                                            {formatCurrency(item.subtotal)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => removeTicketItem(idx)}
                                            className="text-[10px] text-rose-400 hover:text-rose-300 p-0.5"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* VISUAL FAVORITES & CATEGORY PRODUCT BROWSER */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                        type="button"
                        onClick={() => setIsCatalogExpanded((prev) => !prev)}
                        className="w-full px-3.5 py-3 bg-[var(--surface-accent)]/30 text-left flex items-center justify-between text-xs font-bold text-[var(--text-primary)]"
                    >
                        <div className="flex items-center gap-2">
                            <span>Favoritos & Catálogo</span>
                            <span className="text-[10px] font-normal text-[var(--text-secondary)]">
                                ({products.length} productos)
                            </span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {isCatalogExpanded ? "▲ Ocultar" : "▼ Ver Grilla"}
                        </span>
                    </button>

                    {isCatalogExpanded && (
                        <div className="p-3 border-t border-[var(--border)] space-y-3">
                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory("all")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                                        selectedCategory === "all"
                                            ? "bg-[var(--primary)] text-white font-bold shadow-xs"
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
                                        className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                                            selectedCategory === (cat.name || cat.id)
                                                ? "bg-[var(--primary)] text-white font-bold shadow-xs"
                                                : "bg-[var(--surface-accent)] text-[var(--text-secondary)] border border-[var(--border)]"
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Tactile Products Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {catalogFilteredProducts.slice(0, 18).map((prod) => (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => addProductToTicket(prod, 1)}
                                        className="p-3 bg-[var(--surface-accent)]/50 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)]/60 rounded-2xl text-left flex flex-col justify-between transition-all active:scale-95 shadow-2xs group"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">
                                                {prod.name}
                                            </p>
                                            <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5 truncate">
                                                {prod.category_name || "General"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--border)]/40">
                                            <span className="text-xs font-extrabold font-mono text-[var(--primary)]">
                                                {formatCurrency(prod.sale_price)}
                                            </span>
                                            <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                                                {prod.unit_type === "kg"
                                                    ? "/kg"
                                                    : prod.unit_type === "100g"
                                                    ? "/100g"
                                                    : "un."}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* STICKY FLOATING BOTTOM CHECKOUT BAR */}
            {grandTotal > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-16 inset-x-0 p-3 z-30 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setReceivedCash(String(grandTotal));
                                setIsCheckoutOpen(true);
                            }}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-[var(--primary)] hover:opacity-95 text-white rounded-2xl shadow-2xl transition-transform active:scale-98"
                        >
                            <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                                        Cobrar Venta
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-white/20 text-[10px] font-extrabold rounded-md">
                                        {totalItemCount} {totalItemCount === 1 ? "artículo" : "artículos"}
                                    </span>
                                </div>
                                <p className="text-xs font-medium opacity-90 truncate max-w-[160px]">
                                    {selectedClient ? selectedClient.name : "Consumidor Final"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base font-black font-mono">
                                    {formatCurrency(grandTotal)}
                                </span>
                                <span className="px-3 py-1 bg-white text-[var(--primary)] font-bold text-xs rounded-xl shadow-xs">
                                    Cobrar →
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* CHECKOUT / PAYMENT BOTTOM DRAWER */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
                            <div>
                                <h3 className="font-bold text-sm text-[var(--text-primary)]">Confirmar y Cobrar</h3>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Total a pagar: <strong className="text-[var(--primary)] font-mono">{formatCurrency(grandTotal)}</strong>
                                </p>
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

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Payment Method Selector */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                    Medio de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "cash", label: "Efectivo" },
                                        { id: "mp", label: "Mercado Pago / Transf." },
                                        { id: "card", label: "Tarjeta Débito / Crédito" },
                                        { id: "debt", label: "A Cuenta (Fiado)" },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                                                paymentMethod === m.id
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--surface-accent)] text-[var(--text-primary)] hover:border-[var(--primary)]/60"
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Bill Shortcuts & Vuelto Calculation */}
                            {paymentMethod === "cash" && (
                                <div className="p-3.5 bg-[var(--surface-accent)]/70 border border-[var(--border)] rounded-2xl space-y-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                                            Efectivo Recibido:
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                            <input
                                                type="number"
                                                value={receivedCash}
                                                onChange={(e) => setReceivedCash(e.target.value)}
                                                placeholder={`$ ${grandTotal}`}
                                                className="w-full pl-8 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-base text-[var(--text-primary)] font-bold focus:outline-hidden focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Fast Cash Bill Buttons */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setReceivedCash(String(grandTotal))}
                                            className="px-2.5 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold rounded-lg"
                                        >
                                            Monto Exacto
                                        </button>
                                        {[1000, 2000, 5000, 10000, 20000].map((bill) => (
                                            <button
                                                key={bill}
                                                type="button"
                                                onClick={() => setReceivedCash(String(bill))}
                                                className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-mono font-semibold rounded-lg"
                                            >
                                                ${bill.toLocaleString("es-AR")}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Prominent Vuelto Indicator */}
                                    {Number(receivedCash) >= grandTotal && (
                                        <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
                                            <span className="text-xs">Vuelto a Entregar:</span>
                                            <span className="text-lg font-mono font-black">
                                                {formatCurrency(calculatedChange)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* A Cuenta warning */}
                            {paymentMethod === "debt" && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-1">
                                    <p className="font-bold text-amber-400">Venta A Cuenta (Fiado)</p>
                                    <p className="text-[11px] text-[var(--text-secondary)]">
                                        {selectedClient ? (
                                            <>
                                                Se sumarán <strong>{formatCurrency(grandTotal)}</strong> a la deuda de{" "}
                                                <strong>{selectedClient.name}</strong>.
                                            </>
                                        ) : (
                                            <span className="text-rose-400 font-bold">
                                                Tenés que asignar un cliente arriba para fiar esta venta.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Submit Action */}
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-accent)]/50">
                            <button
                                type="button"
                                disabled={isSubmitting || (paymentMethod === "debt" && !selectedClient)}
                                onClick={handleCompleteTransaction}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Registrando venta...</span>
                                    </>
                                ) : (
                                    <span>Cobrar {formatCurrency(grandTotal)}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* QUICK SERVICE BOTTOM SHEETS */}
            {/* ========================================================================= */}

            {/* 1. Varios / Monto Manual Sheet */}
            {activeServiceSheet === "varios" && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                + Monto Manual / Varios
                            </h4>
                            <button
                                type="button"
                                onClick={() => setActiveServiceSheet(null)}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <form onSubmit={handleAddManualItem} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Monto ($):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                    <MoneyInput
                                        autoFocus
                                        value={manualAmount}
                                        onChange={(e) => setManualAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-1.5">
                                {[200, 500, 1000, 2000, 5000].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setManualAmount(String(val))}
                                        className="flex-1 min-w-[60px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] font-mono text-xs font-bold rounded-lg"
                                    >
                                        +${val}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Descripción (Opcional):
                                </label>
                                <input
                                    type="text"
                                    value={manualDescription}
                                    onChange={(e) => setManualDescription(e.target.value)}
                                    placeholder="Ej: Hielo, Fósforos, etc."
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-[var(--primary)] text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Sumar al Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. SUBE Recharge Sheet */}
            {activeServiceSheet === "sube" && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                    Carga Tarjeta SUBE
                                </h4>
                                <span className="text-[10px] text-cyan-400 font-semibold">
                                    Comisión: {settings.sube_fee_type === "percentage" ? `${settings.sube_fee_value}%` : formatCurrency(settings.sube_fee_value)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveServiceSheet(null)}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <form onSubmit={handleAddSubeRecharge} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Saldo a Cargar ($):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                    <MoneyInput
                                        autoFocus
                                        value={subeAmount}
                                        onChange={(e) => setSubeAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {[1000, 2000, 3000, 5000, 10000].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setSubeAmount(String(val))}
                                        className="flex-1 min-w-[65px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] font-mono text-xs font-bold rounded-lg"
                                    >
                                        ${val.toLocaleString("es-AR")}
                                    </button>
                                ))}
                            </div>

                            {Number(subeAmount) > 0 && (
                                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Total a cobrar con comisión:</span>
                                    <strong className="text-cyan-400 font-mono">
                                        {formatCurrency(calculateSubeFee(Number(subeAmount)).totalToCharge)}
                                    </strong>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Sumar Carga SUBE al Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Phone Recharge Sheet */}
            {activeServiceSheet === "phone" && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                    Recarga de Celular
                                </h4>
                                <span className="text-[10px] text-purple-400 font-semibold">
                                    Comisión: {settings.phone_fee_type === "percentage" ? `${settings.phone_fee_value}%` : formatCurrency(settings.phone_fee_value)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveServiceSheet(null)}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <form onSubmit={handleAddPhoneRecharge} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Monto de Recarga ($):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                    <MoneyInput
                                        autoFocus
                                        value={phoneAmount}
                                        onChange={(e) => setPhoneAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {[1000, 1500, 2000, 3000, 5000].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setPhoneAmount(String(val))}
                                        className="flex-1 min-w-[65px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] font-mono text-xs font-bold rounded-lg"
                                    >
                                        ${val.toLocaleString("es-AR")}
                                    </button>
                                ))}
                            </div>

                            {Number(phoneAmount) > 0 && (
                                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Total a cobrar con comisión:</span>
                                    <strong className="text-purple-400 font-mono">
                                        {formatCurrency(calculatePhoneFee(Number(phoneAmount)).totalToCharge)}
                                    </strong>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Sumar Recarga al Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Exchange Sheet */}
            {activeServiceSheet === "exchange" && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                    Cambio de Dinero (Virtual a Efectivo)
                                </h4>
                                <span className="text-[10px] text-amber-400 font-semibold">
                                    Comisión: {settings.exchange_fee_type === "percentage" ? `${settings.exchange_fee_value}%` : formatCurrency(settings.exchange_fee_value)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveServiceSheet(null)}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <form onSubmit={handleAddExchange} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Monto transferido por el cliente ($):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                    <MoneyInput
                                        autoFocus
                                        value={exchangeAmount}
                                        onChange={(e) => setExchangeAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            {Number(exchangeAmount) > 0 && (
                                <div className="p-3 bg-[var(--surface-accent)] rounded-xl text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Comisión ganada:</span>
                                        <span className="font-bold text-amber-400 font-mono">
                                            +{formatCurrency(calculateExchangeFee(Number(exchangeAmount)).fee)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-[var(--border)] font-bold">
                                        <span>Efectivo a entregar al cliente:</span>
                                        <span className="text-emerald-400 font-mono">
                                            {formatCurrency(calculateExchangeFee(Number(exchangeAmount)).clientAmount)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Sumar Cambio al Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. Debt Payment Sheet (Cobro A Cuenta) */}
            {activeServiceSheet === "payment" && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Cobro A Cuenta (Pago de Deuda)
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveServiceSheet(null);
                                    setDebtPaymentClient(null);
                                }}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        {!debtPaymentClient && !selectedClient ? (
                            <div className="space-y-2 overflow-y-auto flex-1">
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Seleccioná el cliente que entrega dinero para su cuenta corriente:
                                </p>
                                <div className="divide-y divide-[var(--border)]/50">
                                    {clients
                                        .filter((c) => (c.current_debt || 0) > 0)
                                        .map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setDebtPaymentClient(c);
                                                    setDebtPaymentAmount(String(c.current_debt || ""));
                                                }}
                                                className="w-full p-2.5 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] rounded-xl"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--text-primary)]">{c.name}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)]">{c.phone || "Sin teléfono"}</p>
                                                </div>
                                                <span className="text-xs font-bold font-mono text-rose-400">
                                                    Debe: {formatCurrency(c.current_debt || 0)}
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleAddDebtPayment} className="space-y-3">
                                <div className="p-3 bg-[var(--surface-accent)] rounded-xl text-xs flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)]">
                                            {(debtPaymentClient || selectedClient).name}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">
                                            Deuda actual: {formatCurrency((debtPaymentClient || selectedClient).current_debt || 0)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDebtPaymentClient(null)}
                                        className="text-[10px] text-[var(--primary)] font-bold underline"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                        Monto Entregado ($):
                                    </label>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={debtPaymentAmount}
                                        onChange={(e) => setDebtPaymentAmount(e.target.value)}
                                        placeholder={`$ ${(debtPaymentClient || selectedClient).current_debt || 0}`}
                                        className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>

                                {(debtPaymentClient || selectedClient).current_debt > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDebtPaymentAmount(
                                                String((debtPaymentClient || selectedClient).current_debt)
                                            )
                                        }
                                        className="text-xs text-[var(--primary)] font-bold hover:underline"
                                    >
                                        Saldar deuda total ({formatCurrency((debtPaymentClient || selectedClient).current_debt)})
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg"
                                >
                                    Sumar Pago al Ticket
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* 6. Weight Grams Editor Sheet */}
            {activeServiceSheet === "weight" && editingWeightItemIndex !== null && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Ajustar Peso en Gramos
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveServiceSheet(null);
                                    setEditingWeightItemIndex(null);
                                }}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Gramos (g):
                                </label>
                                <input
                                    type="number"
                                    autoFocus
                                    value={customGramsValue}
                                    onChange={(e) => setCustomGramsValue(e.target.value)}
                                    placeholder="100"
                                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                />
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-1.5">
                                {[100, 150, 200, 250, 300, 500, 1000].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setCustomGramsValue(String(g))}
                                        className="flex-1 min-w-[55px] py-1.5 bg-[var(--surface-accent)] border border-[var(--border)] font-mono text-xs font-bold rounded-lg"
                                    >
                                        {g >= 1000 ? "1 kg" : `${g}g`}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSaveItemGrams(customGramsValue)}
                                className="w-full py-3 bg-[var(--primary)] text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Guardar Peso
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. Custom Unit Price Edit Sheet */}
            {activeServiceSheet === "editPrice" && editingPriceItemIndex !== null && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
                    <div className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl p-4 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Modificar Precio en Ticket
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveServiceSheet(null);
                                    setEditingPriceItemIndex(null);
                                }}
                                className="text-xs text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                    Nuevo Precio Unitario ($):
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)]">$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={customPriceValue}
                                        onChange={(e) => setCustomPriceValue(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-8 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSaveItemCustomPrice(customPriceValue)}
                                className="w-full py-3 bg-[var(--primary)] text-white font-bold text-xs rounded-xl shadow-lg"
                            >
                                Aplicar al Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CLIENT SELECTOR & CREATION MODAL */}
            {/* ========================================================================= */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleUp">
                        <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                                Asignar Cliente
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                Cerrar
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-3 border-b border-[var(--border)]">
                            <input
                                type="text"
                                autoFocus
                                value={clientSearchQuery}
                                onChange={(e) => setClientSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre o teléfono..."
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
                            />
                        </div>

                        {/* Quick Create New Client Input */}
                        <div className="px-3 py-2 bg-[var(--surface-accent)]/50 border-b border-[var(--border)]">
                            <form onSubmit={handleCreateClientQuick} className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    placeholder="+ Nuevo cliente rápido..."
                                    className="flex-1 px-2.5 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)]"
                                />
                                <button
                                    type="submit"
                                    disabled={isCreatingClient || !newClientName.trim()}
                                    className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                >
                                    Crear
                                </button>
                            </form>
                        </div>

                        {/* Clients List */}
                        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border)]/50">
                            {/* Consumidor Final */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClient(null);
                                    setIsClientModalOpen(false);
                                }}
                                className="w-full p-2.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] rounded-xl flex items-center justify-between"
                            >
                                <span>Consumidor Final (Sin asignar)</span>
                                {!selectedClient && (
                                    <span className="text-[10px] text-[var(--primary)] font-bold">Seleccionado</span>
                                )}
                            </button>

                            {filteredClients.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedClient(c);
                                        setIsClientModalOpen(false);
                                    }}
                                    className="w-full p-2.5 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] rounded-xl transition-colors"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-primary)]">{c.name}</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">{c.phone || "Sin teléfono"}</p>
                                    </div>
                                    <span
                                        className={`text-xs font-bold font-mono ${
                                            (c.current_debt || 0) > 0 ? "text-rose-400" : "text-[var(--text-secondary)]"
                                        }`}
                                    >
                                        {(c.current_debt || 0) > 0 ? `Debe ${formatCurrency(c.current_debt)}` : "$0"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* FULLSCREEN CAMERA BARCODE SCANNER */}
            {/* ========================================================================= */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <MobileCameraScanner
                        onScan={(code) => handleBarcodeScanned(code)}
                        onClose={() => setIsScannerOpen(false)}
                        title="Escáner Modo Venta"
                        subtitle="Apuntá al código para sumarlo al ticket"
                        continuous={true}
                    />
                </div>
            )}

            {/* Unknown Barcode Modal */}
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
                    setTicketItems((prev) => [
                        ...prev,
                        {
                            id: `custom-${Date.now()}`,
                            type: "manual",
                            name: customItem.name,
                            quantity: 1,
                            unitPrice: customItem.price,
                            subtotal: customItem.price,
                            promoSavings: 0,
                        },
                    ]);
                    playBeepSuccess();
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
                        setProducts((prev) => [newProd, ...prev]);
                        setIsCreateProductModalOpen(false);
                        addProductToTicket(newProd, 1);
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
