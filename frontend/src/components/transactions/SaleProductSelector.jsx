import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { filterAndRankProducts } from "../../utils/productSearch";
import { playBeepSuccess, playBeepWarning } from "../../utils/audio";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import BarcodeNotFoundModal from "./BarcodeNotFoundModal";
import { NATIONAL_PRODUCTS } from "../../utils/nationalCatalog";
import { updateProduct } from "../../services/business";

/**
 * Calculates item pricing, subtotal, and promo savings dynamically.
 */
export function calculateItemPricing(product, quantity, customUnitPrice = null, grams = null) {
    const regularUnitPrice = customUnitPrice !== null ? customUnitPrice : Number(product.sale_price) || 0;
    const isWeight = product.unit_type === "kg" || product.unit_type === "100g";

    if (isWeight) {
        const factor = product.unit_type === "kg" ? 1000 : 100;
        const subtotal = Math.round(((grams || 0) / factor) * regularUnitPrice);
        return {
            unitPrice: regularUnitPrice,
            subtotal,
            hasPromoApplied: false,
            promoSavings: 0,
            promoText: null,
        };
    }

    const promoQty = parseInt(product.promo_quantity, 10);
    const promoPrc = Number(product.promo_price);
    const hasPromoConfig = Boolean(
        !product.is_bundle &&
        promoQty >= 2 &&
        promoPrc > 0 &&
        (customUnitPrice === null || customUnitPrice === Number(product.sale_price))
    );

    if (hasPromoConfig && quantity >= promoQty) {
        const bundles = Math.floor(quantity / promoQty);
        const loose = quantity % promoQty;
        const subtotal = Math.round((bundles * promoPrc) + (loose * regularUnitPrice));
        const regularTotal = Math.round(quantity * regularUnitPrice);
        const promoSavings = Math.max(0, regularTotal - subtotal);

        return {
            unitPrice: regularUnitPrice,
            subtotal,
            hasPromoApplied: true,
            promoSavings,
            promoText: `Promo ${promoQty}x ${formatCurrency(promoPrc)}`,
        };
    }

    return {
        unitPrice: regularUnitPrice,
        subtotal: Math.round(quantity * regularUnitPrice),
        hasPromoApplied: false,
        promoSavings: 0,
        promoText: null,
    };
}

/**
 * SaleProductSelector
 * Allows fast search, arrow-key navigation, zero-focus barcode scanning, national catalog discovery,
 * weight calculation (kg / 100g), quantity selection, promo pricing, and in-cart price editing.
 */
function SaleProductSelector({
    products = [],
    categories = [],
    providers = [],
    items = [],
    onItemsChange,
    manualAmount = "",
    onManualAmountChange,
    onProductUpdated,
    onCreateNewProduct,
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);

    // Unregistered barcode modal state
    const [unregisteredBarcode, setUnregisteredBarcode] = useState(null);
    const [isBarcodeNotFoundModalOpen, setIsBarcodeNotFoundModalOpen] = useState(false);

    // Weight / Quantity Modal Dialog State
    const [activeProductForWeight, setActiveProductForWeight] = useState(null);
    const [weightInputMode, setWeightInputMode] = useState("weight"); // 'weight' | 'money'
    const [weightGrams, setWeightGrams] = useState("");
    const [targetMoney, setTargetMoney] = useState("");
    const [editingItemIndex, setEditingItemIndex] = useState(null);

    // In-Cart Unit Price Editing State
    const [editingPriceIndex, setEditingPriceIndex] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState("");
    const [updateCatalogPrice, setUpdateCatalogPrice] = useState(false);
    const [isUpdatingCatalogPrice, setIsUpdatingCatalogPrice] = useState(false);
    const cartPriceInputRef = useRef(null);

    const searchInputRef = useRef(null);
    const searchContainerRef = useRef(null);

    // Filter active products in store
    const activeProducts = useMemo(() => {
        return products.filter((p) => p.is_active);
    }, [products]);

    // Local store search results matching query with precision relevance ranking
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return filterAndRankProducts(activeProducts, searchQuery, {
            maxResults: 20,
        });
    }, [activeProducts, searchQuery]);

    // Master / National catalog matches not yet added to user's store
    const nationalSearchResults = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
        const query = searchQuery.trim().toLowerCase();

        const existingBarcodes = new Set(activeProducts.map((p) => p.barcode).filter(Boolean));
        const existingNames = new Set(activeProducts.map((p) => p.name.trim().toLowerCase()));

        const matches = [];
        for (const item of NATIONAL_PRODUCTS) {
            if (existingBarcodes.has(item.barcode) || existingNames.has(item.name.trim().toLowerCase())) {
                continue;
            }
            const nameMatch = item.name.toLowerCase().includes(query);
            const catMatch = item.category && item.category.toLowerCase().includes(query);
            const barcodeMatch = item.barcode && item.barcode.includes(query);

            if (nameMatch || catMatch || barcodeMatch) {
                matches.push(item);
                if (matches.length >= 8) break;
            }
        }
        return matches;
    }, [activeProducts, searchQuery]);

    const totalResultsCount = searchResults.length + nationalSearchResults.length;

    // Reset selected result index when results change
    useEffect(() => {
        setSelectedResultIndex(0);
    }, [searchResults, nationalSearchResults]);

    // Close search dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(e.target)
            ) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Open weight/quantity dialog or add unit/bundle product directly to cart
    const handleSelectProduct = useCallback(
        (product) => {
            setIsSearchOpen(false);
            setSearchQuery("");

            if (product.unit_type === "unit" || product.is_bundle) {
                // For unit or combo products, check if already in cart
                const existingIndex = items.findIndex(
                    (it) => it.product.id === product.id
                );
                if (existingIndex >= 0) {
                    const updated = [...items];
                    const item = updated[existingIndex];
                    const newQty = item.quantity + 1;
                    const pricing = calculateItemPricing(product, newQty, item.unitPrice, item.grams);
                    updated[existingIndex] = {
                        ...item,
                        quantity: newQty,
                        ...pricing,
                    };
                    onItemsChange(updated);
                } else {
                    const pricing = calculateItemPricing(product, 1, Number(product.sale_price), null);
                    const newItem = {
                        product,
                        unitType: "unit",
                        quantity: 1,
                        grams: null,
                        ...pricing,
                    };
                    onItemsChange([...items, newItem]);
                }
            } else {
                // Open weight dialog for kg or 100g
                setActiveProductForWeight(product);
                setEditingItemIndex(null);
                setWeightInputMode("weight");
                setWeightGrams(product.unit_type === "kg" ? "500" : "150");
                setTargetMoney("");
            }
        },
        [items, onItemsChange]
    );

    // Select a national catalog product: opens the fast setup card to confirm/edit price
    function handleSelectNationalProduct(natItem) {
        setIsSearchOpen(false);
        setSearchQuery("");
        setUnregisteredBarcode(natItem.barcode);
        setIsBarcodeNotFoundModalOpen(true);
    }

    // Dedicated Hardware Barcode Scanner Handler (works zero-focus anywhere on the page)
    const handleHardwareScan = useCallback(
        (code) => {
            const clean = code.trim().toLowerCase();
            if (!clean) return;

            // 1. Check exact barcode match
            let matched = activeProducts.find(
                (p) => p.barcode && p.barcode.trim().toLowerCase() === clean
            );

            // 2. Fallback: check numeric equality
            if (!matched) {
                const numericClean = clean.replace(/\D/g, "");
                if (numericClean.length >= 4) {
                    matched = activeProducts.find((p) => {
                        if (!p.barcode) return false;
                        const pNum = p.barcode.replace(/\D/g, "");
                        return pNum === numericClean || pNum.endsWith(numericClean) || numericClean.endsWith(pNum);
                    });
                }
            }

            // 3. Fallback: check exact name match
            if (!matched) {
                matched = activeProducts.find((p) => p.name.trim().toLowerCase() === clean);
            }

            if (matched) {
                playBeepSuccess();
                handleSelectProduct(matched);
                toast.success(`+1 ${matched.name} (${formatCurrency(matched.sale_price)})`, {
                    id: "scanner-toast",
                    duration: 1800,
                });
                setSearchQuery("");
                setIsSearchOpen(false);
            } else {
                playBeepWarning();
                setUnregisteredBarcode(code.trim());
                setIsBarcodeNotFoundModalOpen(true);
            }
        },
        [activeProducts, handleSelectProduct]
    );

    // Attach global hardware scanner listener
    useBarcodeScanner(handleHardwareScan, {
        enabled: !isBarcodeNotFoundModalOpen && !activeProductForWeight && editingPriceIndex === null,
    });



    // Search input keyboard navigation (Up, Down, Enter, Escape)
    function handleSearchKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (totalResultsCount > 0) {
                setSelectedResultIndex((prev) => (prev + 1) % totalResultsCount);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (totalResultsCount > 0) {
                setSelectedResultIndex((prev) =>
                    prev === 0 ? totalResultsCount - 1 : prev - 1
                );
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchResults.length > 0 && selectedResultIndex < searchResults.length) {
                const targetProd = searchResults[selectedResultIndex];
                playBeepSuccess();
                handleSelectProduct(targetProd);
            } else if (nationalSearchResults.length > 0) {
                const natIdx = selectedResultIndex - searchResults.length;
                const targetNat = nationalSearchResults[natIdx] || nationalSearchResults[0];
                handleSelectNationalProduct(targetNat);
            } else if (searchQuery.trim().length >= 3) {
                playBeepWarning();
                setUnregisteredBarcode(searchQuery.trim());
                setIsBarcodeNotFoundModalOpen(true);
            }
        } else if (e.key === "Escape") {
            setIsSearchOpen(false);
            setSearchQuery("");
        }
    }

    // Handle editing an existing cart item's weight
    function handleEditItem(item, index) {
        if (item.unitType === "unit") return;
        setActiveProductForWeight(item.product);
        setEditingItemIndex(index);
        setWeightInputMode("weight");
        setWeightGrams(String(item.grams || ""));
        setTargetMoney("");
    }

    // Save weight dialog item to cart
    function handleConfirmWeightItem() {
        if (!activeProductForWeight) return;

        let finalGrams = 0;
        let finalSubtotal = 0;
        const salePrice = Number(activeProductForWeight.sale_price) || 0;

        if (weightInputMode === "weight") {
            finalGrams = Number(weightGrams) || 0;
            if (finalGrams <= 0) return;

            if (activeProductForWeight.unit_type === "kg") {
                finalSubtotal = Math.round((finalGrams / 1000) * salePrice);
            } else {
                finalSubtotal = Math.round((finalGrams / 100) * salePrice);
            }
        } else {
            const money = Number(targetMoney) || 0;
            if (money <= 0) return;
            finalSubtotal = money;

            if (activeProductForWeight.unit_type === "kg") {
                finalGrams = Math.round((money / salePrice) * 1000);
            } else {
                finalGrams = Math.round((money / salePrice) * 100);
            }
        }

        const newItem = {
            product: activeProductForWeight,
            unitType: activeProductForWeight.unit_type,
            quantity: 1,
            grams: finalGrams,
            unitPrice: salePrice,
            subtotal: finalSubtotal,
        };

        if (editingItemIndex !== null && editingItemIndex >= 0) {
            const updated = [...items];
            updated[editingItemIndex] = newItem;
            onItemsChange(updated);
        } else {
            onItemsChange([...items, newItem]);
        }

        setActiveProductForWeight(null);
        setEditingItemIndex(null);
    }

    // Increment / decrement unit items directly in cart
    function handleUpdateQuantity(index, delta) {
        const updated = [...items];
        const item = updated[index];
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            handleRemoveItem(index);
            return;
        }
        const pricing = calculateItemPricing(item.product, newQty, item.unitPrice, item.grams);
        updated[index] = {
            ...item,
            quantity: newQty,
            ...pricing,
        };
        onItemsChange(updated);
    }

    // Direct quantity input change
    function handleDirectQuantityChange(index, value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) return;
        const updated = [...items];
        const item = updated[index];
        const pricing = calculateItemPricing(item.product, parsed, item.unitPrice, item.grams);
        updated[index] = {
            ...item,
            quantity: parsed,
            ...pricing,
        };
        onItemsChange(updated);
    }

    // Start editing in-cart unit price
    function handleStartEditPrice(idx, currentPrice) {
        setEditingPriceIndex(idx);
        setEditingPriceValue(String(currentPrice));
        setUpdateCatalogPrice(false);
        setTimeout(() => {
            cartPriceInputRef.current?.focus();
            cartPriceInputRef.current?.select();
        }, 50);
    }

    // Save in-cart unit price
    async function handleSaveCartItemPrice(idx) {
        const parsedPrice = Number(editingPriceValue);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            toast.error("Precio inválido");
            return;
        }

        const updated = [...items];
        const item = updated[idx];
        const pricing = calculateItemPricing(item.product, item.quantity, parsedPrice, item.grams);
        updated[idx] = {
            ...item,
            ...pricing,
        };
        onItemsChange(updated);
        setEditingPriceIndex(null);

        // Optionally update product price permanently in catalog
        if (updateCatalogPrice && item.product?.id) {
            setIsUpdatingCatalogPrice(true);
            try {
                const updatedProd = await updateProduct(item.product.id, {
                    ...item.product,
                    sale_price: parsedPrice,
                });
                onProductUpdated?.(updatedProd);
                toast.success(`Precio actualizado en tu catálogo: ${formatCurrency(parsedPrice)}`);
            } catch (err) {
                console.error("Error updating product price in catalog:", err);
            } finally {
                setIsUpdatingCatalogPrice(false);
            }
        }
    }

    function handleRemoveItem(index) {
        const updated = items.filter((_, i) => i !== index);
        onItemsChange(updated);
    }

    function handleClearCart() {
        onItemsChange([]);
    }

    // Weight live calculations
    const liveCalculatedSubtotal = useMemo(() => {
        if (!activeProductForWeight) return 0;
        const salePrice = Number(activeProductForWeight.sale_price) || 0;
        if (weightInputMode === "weight") {
            const g = Number(weightGrams) || 0;
            if (activeProductForWeight.unit_type === "kg") {
                return Math.round((g / 1000) * salePrice);
            } else {
                return Math.round((g / 100) * salePrice);
            }
        } else {
            return Number(targetMoney) || 0;
        }
    }, [activeProductForWeight, weightInputMode, weightGrams, targetMoney]);

    const liveCalculatedGrams = useMemo(() => {
        if (!activeProductForWeight) return 0;
        const salePrice = Number(activeProductForWeight.sale_price) || 0;
        if (weightInputMode === "weight") {
            return Number(weightGrams) || 0;
        } else {
            const money = Number(targetMoney) || 0;
            if (money <= 0 || salePrice <= 0) return 0;
            if (activeProductForWeight.unit_type === "kg") {
                return Math.round((money / salePrice) * 1000);
            } else {
                return Math.round((money / salePrice) * 100);
            }
        }
    }, [activeProductForWeight, weightInputMode, weightGrams, targetMoney]);

    const totalCartSum = useMemo(() => {
        return items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    }, [items]);

    return (
        <div className="space-y-4">
            {/* SEARCH BOX & CATEGORY FILTER */}
            <div ref={searchContainerRef} className="relative space-y-2">
                {/* SEARCH INPUT */}
                <div data-tour="sale-product-search" className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>

                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            setIsSearchOpen(Boolean(val.trim()));
                        }}
                        onFocus={() => {
                            if (searchQuery.trim()) {
                                setIsSearchOpen(true);
                            }
                        }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Buscá por nombre, marca o pasá el código de barras..."
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 pr-10 text-sm font-semibold text-[var(--text-primary)] shadow-xs outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    />

                    {/* RIGHT ACTION: CLEAR BUTTON */}
                    {searchQuery && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setIsSearchOpen(false);
                                    searchInputRef.current?.focus();
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-accent)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>



                {/* SEARCH DROPDOWN POPUP */}
                {isSearchOpen && Boolean(searchQuery.trim()) && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl divide-y divide-[var(--border)]">
                        {searchResults.length === 0 && nationalSearchResults.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--text-secondary)] space-y-1">
                                <p>No se encontraron productos para &quot;{searchQuery}&quot;</p>
                                <p className="text-[11px] text-[var(--primary)]">
                                    Presioná Enter para crearlo como nuevo producto.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* 1. STORE PRODUCTS */}
                                {searchResults.length > 0 && (
                                    <div>
                                        {searchResults.map((p, idx) => {
                                            const isKg = p.unit_type === "kg";
                                            const is100g = p.unit_type === "100g";
                                            const isSelected = idx === selectedResultIndex;

                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSelectProduct(p)}
                                                    onMouseEnter={() => setSelectedResultIndex(idx)}
                                                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition ${
                                                        isSelected
                                                            ? "bg-[var(--primary)]/10 text-[var(--text-primary)]"
                                                            : "hover:bg-[var(--surface-accent)] text-[var(--text-primary)]"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold truncate">
                                                                {p.name}
                                                            </span>
                                                            {p.is_bundle && (
                                                                <span className="inline-flex items-center gap-1 shrink-0 rounded-sm bg-[var(--primary)]/15 px-1.5 py-0.2 text-[10px] font-bold text-[var(--primary)]">
                                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                                                    </svg>
                                                                    <span>{p.bundle_items?.length === 1 ? "Oferta" : "Combo"}</span>
                                                                </span>
                                                            )}
                                                            {p.promo_quantity && Number(p.promo_quantity) >= 2 && Number(p.promo_price) > 0 && !p.is_bundle && (
                                                                <span className="inline-flex items-center gap-1 shrink-0 rounded-sm bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386l5.242-3.145c.826-.486 1.05-1.542.486-2.292L11.159 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                                                                    </svg>
                                                                    <span>{p.promo_quantity}x {formatCurrency(p.promo_price)}</span>
                                                                </span>
                                                            )}
                                                            {isKg && (
                                                                <span className="shrink-0 rounded-sm bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                    Por Kilo
                                                                </span>
                                                            )}
                                                            {is100g && (
                                                                <span className="shrink-0 rounded-sm bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                                    Por 100g
                                                                </span>
                                                            )}
                                                            {p.stock !== null && p.stock !== undefined && (
                                                                <span className={`shrink-0 rounded-sm px-1.5 py-0.2 text-[9px] font-bold ${
                                                                    Number(p.stock) <= 0
                                                                        ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                                                                        : Number(p.stock) <= (Number(p.min_stock) || 0)
                                                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                                        : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                                                                }`}>
                                                                    {Number(p.stock) <= 0 ? "Sin stock" : `Stock: ${p.stock}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                            {p.category_name && <span>{p.category_name}</span>}
                                                            {p.barcode && <span className="font-mono">{p.barcode}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-right tabular-nums">
                                                        <span className="text-xs font-bold text-[var(--success)]">
                                                            {formatCurrency(p.sale_price)}
                                                        </span>
                                                        {isKg && (
                                                            <span className="text-[10px] font-medium text-[var(--text-secondary)] ml-0.5">
                                                                /kg
                                                            </span>
                                                        )}
                                                        {is100g && (
                                                            <span className="text-[10px] font-medium text-[var(--text-secondary)] ml-0.5">
                                                                /100g
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 2. NATIONAL / MASTER CATALOG DISCOVERIES */}
                                {nationalSearchResults.length > 0 && (
                                    <div>
                                        <div className="bg-[var(--surface-accent)]/80 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center justify-between border-t border-[var(--border)]">
                                            <div className="flex items-center gap-1.5">
                                                <span>⭐ Catálogo Nacional Maestro ({nationalSearchResults.length})</span>
                                            </div>
                                            <span className="text-[9px] font-normal text-[var(--text-secondary)]">Clic para sumar a tu negocio</span>
                                        </div>

                                        {nationalSearchResults.map((nat, natIdx) => {
                                            const globalIdx = searchResults.length + natIdx;
                                            const isSelected = globalIdx === selectedResultIndex;

                                            return (
                                                <button
                                                    key={nat.barcode || nat.name}
                                                    type="button"
                                                    onClick={() => handleSelectNationalProduct(nat)}
                                                    onMouseEnter={() => setSelectedResultIndex(globalIdx)}
                                                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition ${
                                                        isSelected
                                                            ? "bg-[var(--primary)]/15 text-[var(--text-primary)]"
                                                            : "hover:bg-[var(--surface-accent)] text-[var(--text-primary)]"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[var(--text-primary)] truncate">
                                                                {nat.name}
                                                            </span>
                                                            <span className="shrink-0 rounded bg-[var(--primary)]/15 px-1.5 py-0.2 text-[9px] font-bold text-[var(--primary)]">
                                                                + Agregar
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                            <span>{nat.category}</span>
                                                            {nat.barcode && <span className="font-mono">{nat.barcode}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-right tabular-nums">
                                                        <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                                                            Sugerido: {formatCurrency(nat.sale_price)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--primary)]">
                                                            Sumar a la venta →
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ALWAYS-VISIBLE MANUAL / VARIOS AMOUNT FIELD */}
            <div data-tour="sale-manual-amount" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
                <div className="space-y-0.5">
                    <label htmlFor="sale-manual-amount" className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] block cursor-pointer">
                        Monto manual / Varios (+)
                    </label>
                    <span className="text-xs text-[var(--text-secondary)]">
                        Suma directamente al total de la venta (artículos sueltos o no registrados).
                    </span>
                </div>

                <div className="relative w-full sm:w-56 shrink-0">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[var(--text-secondary)]">
                        $
                    </span>
                    <MoneyInput
                        id="sale-manual-amount"
                        value={manualAmount}
                        onChange={(e) => onManualAmountChange?.(e.target.value)}
                        placeholder="0"
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-9 text-base sm:text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                    {manualAmount && Number(manualAmount) > 0 && (
                        <button
                            type="button"
                            onClick={() => onManualAmountChange?.("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--surface-accent)] text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                            title="Limpiar monto manual"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* WEIGHT & QUANTITY MODAL / DIALOG */}
            {activeProductForWeight && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/70"
                        onClick={() => setActiveProductForWeight(null)}
                    />

                    <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <span className="inline-block rounded-md bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
                                    {activeProductForWeight.unit_type === "kg"
                                        ? "Venta por Kilo"
                                        : "Venta por 100 Gramos"}
                                </span>
                                <h3 className="text-base font-bold text-[var(--text-primary)]">
                                    {activeProductForWeight.name}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Precio:{" "}
                                    <span className="font-bold text-[var(--success)]">
                                        {formatCurrency(activeProductForWeight.sale_price)}
                                    </span>
                                    {activeProductForWeight.unit_type === "kg" ? " por kilo" : " por 100g"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveProductForWeight(null)}
                                className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* MODE SELECTOR */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setWeightInputMode("weight")}
                                className={`rounded-lg py-2 text-xs font-bold transition ${
                                    weightInputMode === "weight"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Por Peso (gramos)
                            </button>
                            <button
                                type="button"
                                onClick={() => setWeightInputMode("money")}
                                className={`rounded-lg py-2 text-xs font-bold transition ${
                                    weightInputMode === "money"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Por Monto ($ dinero)
                            </button>
                        </div>

                        {weightInputMode === "weight" ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Gramos pesados
                                    </label>
                                    <div className="relative mt-1">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoFocus
                                            value={weightGrams}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                setWeightGrams(val);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleConfirmWeightItem();
                                                } else if (e.key === "Escape") {
                                                    setActiveProductForWeight(null);
                                                }
                                            }}
                                            placeholder="750"
                                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pr-14 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-secondary)]">
                                            gramos
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                                    {(activeProductForWeight.unit_type === "kg"
                                        ? [
                                              { label: "1/4 kg", g: 250 },
                                              { label: "1/2 kg", g: 500 },
                                              { label: "3/4 kg", g: 750 },
                                              { label: "1 kg", g: 1000 },
                                              { label: "1.5 kg", g: 1500 },
                                              { label: "2 kg", g: 2000 },
                                          ]
                                        : [
                                              { label: "50g", g: 50 },
                                              { label: "100g", g: 100 },
                                              { label: "150g", g: 150 },
                                              { label: "200g", g: 200 },
                                              { label: "250g", g: 250 },
                                              { label: "500g", g: 500 },
                                          ]
                                    ).map((preset) => (
                                        <button
                                            key={preset.g}
                                            type="button"
                                            onClick={() => setWeightGrams(String(preset.g))}
                                            className={`rounded-md border px-1.5 py-1.5 text-xs font-bold transition ${
                                                String(weightGrams) === String(preset.g)
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50"
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Monto deseado ($)
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                            $
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoFocus
                                            value={targetMoney}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                setTargetMoney(val);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleConfirmWeightItem();
                                                } else if (e.key === "Escape") {
                                                    setActiveProductForWeight(null);
                                                }
                                            }}
                                            placeholder="2000"
                                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5">
                                    {[1000, 1500, 2000, 3000].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTargetMoney(String(amt))}
                                            className={`rounded-md border px-2 py-1.5 text-xs font-bold transition ${
                                                String(targetMoney) === String(amt)
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50"
                                            }`}
                                        >
                                            ${amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-3">
                            <div>
                                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                                    Equivalente
                                </span>
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                    {liveCalculatedGrams >= 1000
                                        ? `${(liveCalculatedGrams / 1000).toFixed(3).replace(/\.?0+$/, "")} kg (${liveCalculatedGrams} g)`
                                        : `${liveCalculatedGrams} g`}
                                </span>
                            </div>

                            <div className="text-right">
                                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                                    Subtotal
                                </span>
                                <span className="text-base font-extrabold text-[var(--success)] tabular-nums">
                                    {formatCurrency(liveCalculatedSubtotal)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setActiveProductForWeight(null)}
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmWeightItem}
                                disabled={liveCalculatedSubtotal <= 0}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                            >
                                <span>+</span>
                                {editingItemIndex !== null ? "Guardar" : "Agregar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CART ITEMS TABLE */}
            {items.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                Ítems en la venta ({items.length})
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleClearCart}
                            className="text-xs font-semibold text-[var(--danger)] hover:underline"
                        >
                            Vaciar lista
                        </button>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-[var(--border)] max-h-[380px] overflow-y-auto">
                        {items.map((item, idx) => {
                            const isWeight = item.unitType === "kg" || item.unitType === "100g";
                            const isEditingThisPrice = editingPriceIndex === idx;

                            return (
                                <div
                                    key={idx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 text-xs sm:text-sm transition hover:bg-[var(--surface-accent)]/60 gap-2"
                                >
                                    {/* Left: Name and weight/unit details */}
                                    <div className="flex flex-col pr-2 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                                {item.product.name}
                                            </span>
                                            {item.product.is_bundle && (
                                                <span className="inline-flex items-center gap-1 shrink-0 rounded-sm bg-[var(--primary)]/15 px-1.5 py-0.2 text-[10px] font-bold text-[var(--primary)]">
                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                                    </svg>
                                                    <span>{item.product.bundle_items?.length === 1 ? "Oferta Especial" : `Combo (${item.product.bundle_items?.length || 0} arts.)`}</span>
                                                </span>
                                            )}
                                            {item.unitType === "kg" && (
                                                <span className="shrink-0 rounded-sm bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    kg
                                                </span>
                                            )}
                                            {item.unitType === "100g" && (
                                                <span className="shrink-0 rounded-sm bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                    100g
                                                </span>
                                            )}
                                            {item.hasPromoApplied && (
                                                <span className="inline-flex items-center gap-1 shrink-0 rounded-sm bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386l5.242-3.145c.826-.486 1.05-1.542.486-2.292L11.159 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                                                    </svg>
                                                    <span>{item.promoText} aplicada (-{formatCurrency(item.promoSavings)})</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-2">
                                            {isWeight ? (
                                                <span>
                                                    {item.grams >= 1000
                                                        ? `${(item.grams / 1000).toFixed(3).replace(/\.?0+$/, "")} kg`
                                                        : `${item.grams} g`}{" "}
                                                    × {formatCurrency(item.unitPrice)}
                                                    {item.unitType === "kg" ? "/kg" : "/100g"}
                                                </span>
                                            ) : (
                                                 <div className="flex flex-wrap items-center gap-2">
                                                    {!isEditingThisPrice ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-xs text-[var(--text-secondary)]">
                                                                {formatCurrency(item.unitPrice)} c/u
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartEditPrice(idx, item.unitPrice)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-accent)] transition shadow-2xs"
                                                                title="Editar precio de este producto en la venta"
                                                            >
                                                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                                </svg>
                                                                <span>Editar precio</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2 bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--primary)] shadow-xs">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold text-xs text-[var(--text-secondary)]">$</span>
                                                                <input
                                                                    ref={cartPriceInputRef}
                                                                    type="number"
                                                                    step="any"
                                                                    value={editingPriceValue}
                                                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            handleSaveCartItemPrice(idx);
                                                                        } else if (e.key === "Escape") {
                                                                            setEditingPriceIndex(null);
                                                                        }
                                                                    }}
                                                                    className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveCartItemPrice(idx)}
                                                                disabled={isUpdatingCatalogPrice}
                                                                className="rounded bg-[var(--primary)] px-2 py-0.5 text-[11px] font-bold text-white hover:bg-[var(--primary-hover)] transition"
                                                            >
                                                                ✓ Aplicar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPriceIndex(null)}
                                                                className="rounded bg-[var(--surface-accent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                                                            >
                                                                ✕ Cancelar
                                                            </button>
                                                            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] ml-1 cursor-pointer select-none">
                                                                <div
                                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                                                        updateCatalogPrice
                                                                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                                                            : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]"
                                                                    }`}
                                                                >
                                                                    {updateCatalogPrice && (
                                                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                            <polyline points="20 6 9 17 4 12" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={updateCatalogPrice}
                                                                    onChange={(e) => setUpdateCatalogPrice(e.target.checked)}
                                                                    className="sr-only"
                                                                />
                                                                <span>Guardar en catálogo</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Quantity Stepper / Weight Edit, Subtotal, Delete */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                        {!isWeight ? (
                                            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(idx, -1)}
                                                    className="h-7.5 w-7.5 flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="text"
                                                    value={item.quantity}
                                                    onChange={(e) => handleDirectQuantityChange(idx, e.target.value)}
                                                    className="w-9 text-center font-bold text-xs sm:text-sm tabular-nums text-[var(--text-primary)] bg-transparent outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(idx, 1)}
                                                    className="h-7.5 w-7.5 flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleEditItem(item, idx)}
                                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition"
                                            >
                                                Editar peso
                                            </button>
                                        )}

                                        <span className="w-24 text-right font-black text-sm sm:text-base text-[var(--success)] tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                                            title="Eliminar ítem"
                                        >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Subtotal */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-accent)]/20 px-4 py-3">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                            Subtotal productos ({items.reduce((s, it) => s + (it.quantity || 1), 0)} ítems):
                        </span>
                        <div className="flex items-center gap-3">
                            {Number(manualAmount) > 0 && (
                                <span className="text-xs text-[var(--text-secondary)]">
                                    + {formatCurrency(manualAmount)} (manual) =
                                </span>
                            )}
                            <span className="text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums">
                                {formatCurrency(totalCartSum + (Number(manualAmount) || 0))}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-accent)]/20 p-4 text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        No hay productos agregados al carrito.
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Escaneá un código de barras o escribí el nombre en el buscador.
                    </p>
                </div>
            )}

            {/* UNREGISTERED BARCODE / NATIONAL DISCOVERY SETUP MODAL */}
            <BarcodeNotFoundModal
                isOpen={isBarcodeNotFoundModalOpen}
                onClose={() => {
                    setIsBarcodeNotFoundModalOpen(false);
                    setUnregisteredBarcode(null);
                }}
                scannedBarcode={unregisteredBarcode}
                products={products}
                categories={categories}
                providers={providers}
                onProductUpdated={onProductUpdated}
                onSelectProduct={handleSelectProduct}
                onCreateNewProduct={onCreateNewProduct}
            />
        </div>
    );
}

export default SaleProductSelector;
