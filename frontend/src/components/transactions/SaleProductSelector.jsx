import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { filterAndRankProducts } from "../../utils/productSearch";

/**
 * SaleProductSelector
 * Allows fast search, arrow-key navigation, barcode scanning, weight calculation (kg / 100g),
 * and quantity selection (by unit) for sales transactions.
 */
function SaleProductSelector({
    products = [],
    categories = [],
    items = [],
    onItemsChange,
    manualAmount = "",
    onManualAmountChange,
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);

    // Weight / Quantity Modal Dialog State
    const [activeProductForWeight, setActiveProductForWeight] = useState(null);
    const [weightInputMode, setWeightInputMode] = useState("weight"); // 'weight' | 'money'
    const [weightGrams, setWeightGrams] = useState("");
    const [targetMoney, setTargetMoney] = useState("");
    const [editingItemIndex, setEditingItemIndex] = useState(null);

    const searchInputRef = useRef(null);
    const searchContainerRef = useRef(null);

    // Filter active products
    const activeProducts = useMemo(() => {
        return products.filter((p) => p.is_active);
    }, [products]);

    // Search results matching query and category with precision relevance ranking
    const searchResults = useMemo(() => {
        return filterAndRankProducts(activeProducts, searchQuery, {
            categoryId: selectedCategory,
            maxResults: 20,
        });
    }, [activeProducts, searchQuery, selectedCategory]);

    // Reset selected result index when results change
    useEffect(() => {
        setSelectedResultIndex(0);
    }, [searchResults]);

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

    // Open weight/quantity dialog or add unit product directly to cart
    const handleSelectProduct = useCallback(
        (product) => {
            setIsSearchOpen(false);
            setSearchQuery("");

            if (product.unit_type === "unit") {
                // For unit products, check if already in cart
                const existingIndex = items.findIndex(
                    (it) => it.product.id === product.id
                );
                if (existingIndex >= 0) {
                    // Increment existing item quantity
                    const updated = [...items];
                    const item = updated[existingIndex];
                    const newQty = item.quantity + 1;
                    updated[existingIndex] = {
                        ...item,
                        quantity: newQty,
                        subtotal: Math.round(newQty * Number(product.sale_price)),
                    };
                    onItemsChange(updated);
                } else {
                    // Add new unit item
                    const newItem = {
                        product,
                        unitType: "unit",
                        quantity: 1,
                        grams: null,
                        unitPrice: Number(product.sale_price),
                        subtotal: Math.round(Number(product.sale_price)),
                    };
                    onItemsChange([...items, newItem]);
                }
            } else {
                // Open weight dialog for kg or 100g
                setActiveProductForWeight(product);
                setEditingItemIndex(null);
                setWeightInputMode("weight");
                // Default preset: 500g for kg, 150g for 100g
                setWeightGrams(product.unit_type === "kg" ? "500" : "150");
                setTargetMoney("");
            }
        },
        [items, onItemsChange]
    );

    // Global keyboard listener for search shortcuts ('/' or 'F2') and hardware barcode scanners
    useEffect(() => {
        let barcodeBuffer = "";
        let lastKeyTime = Date.now();

        function handleGlobalKeyDown(e) {
            const targetTag = e.target?.tagName;
            const isEditingInput =
                targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT";

            // Shortcut '/' or 'F2' to focus search input from anywhere
            if ((e.key === "/" || e.key === "F2") && !isEditingInput) {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsSearchOpen(true);
                return;
            }

            // If user is manually typing inside modal inputs, ignore barcode buffer
            if (e.target !== searchInputRef.current && isEditingInput) {
                return;
            }

            // If searchInput is already focused, its onKeyDown handles it
            if (e.target === searchInputRef.current) {
                return;
            }

            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime;
            lastKeyTime = currentTime;

            if (e.key === "Enter") {
                if (barcodeBuffer.trim().length >= 3) {
                    const query = barcodeBuffer.trim().toLowerCase();
                    const matched =
                        activeProducts.find((p) => p.barcode && p.barcode.toLowerCase() === query) ||
                        activeProducts.find((p) => p.barcode && p.barcode.toLowerCase().includes(query)) ||
                        activeProducts.find((p) => p.name.toLowerCase() === query);

                    if (matched) {
                        e.preventDefault();
                        handleSelectProduct(matched);
                    }
                }
                barcodeBuffer = "";
            } else if (e.key.length === 1) {
                // Buffer printable character if coming rapidly from hardware scanner (< 100ms between chars)
                if (timeDiff > 100) {
                    barcodeBuffer = e.key;
                } else {
                    barcodeBuffer += e.key;
                }
            }
        }

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [activeProducts, handleSelectProduct]);

    // Search input keyboard navigation (Up, Down, Enter, Escape)
    function handleSearchKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (searchResults.length > 0) {
                setSelectedResultIndex((prev) => (prev + 1) % searchResults.length);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (searchResults.length > 0) {
                setSelectedResultIndex((prev) =>
                    prev === 0 ? searchResults.length - 1 : prev - 1
                );
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchResults.length > 0) {
                const targetProd = searchResults[selectedResultIndex] || searchResults[0];
                handleSelectProduct(targetProd);
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
                // 100g
                finalSubtotal = Math.round((finalGrams / 100) * salePrice);
            }
        } else {
            // Target money mode
            const money = Number(targetMoney) || 0;
            if (money <= 0) return;
            finalSubtotal = money;

            if (activeProductForWeight.unit_type === "kg") {
                finalGrams = Math.round((money / salePrice) * 1000);
            } else {
                // 100g
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
        updated[index] = {
            ...item,
            quantity: newQty,
            subtotal: Math.round(newQty * item.unitPrice),
        };
        onItemsChange(updated);
    }

    // Direct quantity input change
    function handleDirectQuantityChange(index, value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) return;
        const updated = [...items];
        const item = updated[index];
        updated[index] = {
            ...item,
            quantity: parsed,
            subtotal: Math.round(parsed * item.unitPrice),
        };
        onItemsChange(updated);
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
            if (salePrice <= 0) return 0;
            if (activeProductForWeight.unit_type === "kg") {
                return Math.round((money / salePrice) * 1000);
            } else {
                return Math.round((money / salePrice) * 100);
            }
        }
    }, [activeProductForWeight, weightInputMode, weightGrams, targetMoney]);

    const totalCartSum = items.reduce((sum, item) => sum + item.subtotal, 0);

    return (
        <div className="space-y-3">
            {/* SEARCH AND QUICK SELECT BAR */}
            <div ref={searchContainerRef} data-tour="sale-product-search" className="relative">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Search input with Barcode & Magnifier icon */}
                    <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-secondary)]">
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </div>

                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Buscar producto o escanear código de barras..."
                            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-10 pr-24 text-xs sm:text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />

                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        ) : (
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <span className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                                    /
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quick Category Filter */}
                    {categories.length > 0 && (
                        <div className="relative shrink-0 sm:w-48">
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setIsSearchOpen(true);
                                }}
                                className="h-11 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3.5 pr-8 text-xs sm:text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            >
                                <option value="all">Todas las categorías</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* SEARCH DROPDOWN POPUP */}
                {isSearchOpen && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl divide-y divide-[var(--border)]">
                        {searchResults.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                                No se encontraron productos para &quot;{searchQuery}&quot;
                            </div>
                        ) : (
                            searchResults.map((p, idx) => {
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
                                                {isKg && (
                                                    <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                        Por Kilo
                                                    </span>
                                                )}
                                                {is100g && (
                                                    <span className="shrink-0 rounded bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                        Por 100g
                                                    </span>
                                                )}
                                                {p.stock !== null && p.stock !== undefined && (
                                                    <span className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold ${
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
                            })
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
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
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                        onClick={() => setActiveProductForWeight(null)}
                    />

                    {/* Dialog Card */}
                    <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
                        {/* Header */}
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

                        {/* MODE TABS */}
                        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--surface-accent)]/50 p-1">
                            <button
                                type="button"
                                onClick={() => setWeightInputMode("weight")}
                                className={`rounded-md py-1.5 text-xs font-bold transition ${
                                    weightInputMode === "weight"
                                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Por Peso (gramos)
                            </button>
                            <button
                                type="button"
                                onClick={() => setWeightInputMode("money")}
                                className={`rounded-md py-1.5 text-xs font-bold transition ${
                                    weightInputMode === "money"
                                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Por Monto ($)
                            </button>
                        </div>

                        {/* INPUT FIELDS & QUICK PRESETS */}
                        {weightInputMode === "weight" ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Gramos (g)
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

                                {/* PRESET WEIGHT BUTTONS */}
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
                                            className={`rounded-lg border px-1.5 py-1.5 text-xs font-bold transition ${
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

                                {/* PRESET MONEY BUTTONS */}
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[1000, 1500, 2000, 3000].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTargetMoney(String(amt))}
                                            className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
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

                        {/* LIVE CALCULATION BANNER */}
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

                        {/* ACTIONS */}
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

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm transition hover:bg-[var(--surface-accent)]/60"
                                >
                                    {/* Left: Name and weight/unit details */}
                                    <div className="flex flex-col pr-2 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                                {item.product.name}
                                            </span>
                                            {item.unitType === "kg" && (
                                                <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    kg
                                                </span>
                                            )}
                                            {item.unitType === "100g" && (
                                                <span className="shrink-0 rounded bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                    100g
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                                            {isWeight ? (
                                                <span>
                                                    {item.grams >= 1000
                                                        ? `${(item.grams / 1000).toFixed(3).replace(/\.?0+$/, "")} kg`
                                                        : `${item.grams} g`}{" "}
                                                    × {formatCurrency(item.unitPrice)}
                                                    {item.unitType === "kg" ? "/kg" : "/100g"}
                                                </span>
                                            ) : (
                                                <span>
                                                    {formatCurrency(item.unitPrice)} c/u
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Quantity Stepper / Weight Edit, Subtotal, Delete */}
                                    <div className="flex items-center gap-3 shrink-0">
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
                    <p className="text-[11px] text-[var(--text-secondary)]/70 mt-0.5">
                        Escaneá un código de barras o buscá con <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.2 font-mono text-[10px] text-[var(--text-primary)]">/</kbd>.
                    </p>
                </div>
            )}
        </div>
    );
}

export default SaleProductSelector;
