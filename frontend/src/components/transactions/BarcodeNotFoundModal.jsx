import { useState, useMemo, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import { filterAndRankProducts } from "../../utils/productSearch";
import { createProduct, updateProduct, lookupMasterBarcode } from "../../services/business";
import { playBeepSuccess } from "../../utils/audio";
import { findInNationalCatalog } from "../../utils/nationalCatalog";
import { lookupBarcodeDetails } from "../../utils/barcodeLookup";

/**
 * BarcodeNotFoundModal
 * 
 * Pops up when a physical barcode scanner reads a code that is not currently assigned
 * to any active product in the store. Instantly queries the Master National Argentine Catalog
 * (and online fallback), allowing store owners to review / customize Name, Price, Cost, Category,
 * and Supplier in 1 second, or link to an existing product.
 */
function BarcodeNotFoundModal({
    isOpen,
    onClose,
    scannedBarcode,
    products = [],
    categories = [],
    providers = [],
    onProductUpdated,
    onSelectProduct,
    onCreateNewProduct,
}) {
    // Quick-edit form states
    const [nameInput, setNameInput] = useState("");
    const [salePriceInput, setSalePriceInput] = useState("");
    const [costPriceInput, setCostPriceInput] = useState("");
    const [categoryIdInput, setCategoryIdInput] = useState("");
    const [providerIdInput, setProviderIdInput] = useState("");
    const [unitTypeInput, setUnitTypeInput] = useState("unit");

    const [searchQuery, setSearchQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [detectedInfo, setDetectedInfo] = useState(null);
    const [similarStoreProduct, setSimilarStoreProduct] = useState(null);
    const [isNationalMatch, setIsNationalMatch] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);

    const priceInputRef = useRef(null);
    const nameInputRef = useRef(null);
    const searchInputRef = useRef(null);

    // Filter active products in user's store
    const activeProducts = useMemo(() => {
        return products.filter((p) => p.is_active);
    }, [products]);

    // Rank matching products for linking (placing similarStoreProduct first if available)
    const matchingProducts = useMemo(() => {
        if (similarStoreProduct && !searchQuery.trim()) {
            const others = activeProducts.filter((p) => p.id !== similarStoreProduct.id);
            return [similarStoreProduct, ...others.slice(0, 14)];
        }
        if (!searchQuery.trim()) {
            return activeProducts.slice(0, 15);
        }
        return filterAndRankProducts(activeProducts, searchQuery, { maxResults: 15 });
    }, [activeProducts, searchQuery, similarStoreProduct]);

    // Helper: auto-match category ID from category name string
    function findMatchingCategoryId(catName) {
        if (!catName || !categories || categories.length === 0) return "";
        const lower = catName.toLowerCase();
        const found = categories.find((c) =>
            c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
        );
        return found ? String(found.id) : "";
    }

    // Lookup barcode on open
    useEffect(() => {
        if (isOpen && scannedBarcode) {
            setSearchQuery("");
            setDetectedInfo(null);
            setSimilarStoreProduct(null);
            setIsNationalMatch(false);

            // Initial fallback values
            setNameInput("");
            setSalePriceInput("");
            setCostPriceInput("");
            setCategoryIdInput("");
            setProviderIdInput("");
            setUnitTypeInput("unit");

            // 1. Instant local cache check (0ms)
            const localMatch = findInNationalCatalog(scannedBarcode);
            if (localMatch) {
                setDetectedInfo(localMatch);
                setIsNationalMatch(true);
                setNameInput(localMatch.name || "");
                setSalePriceInput(localMatch.sale_price ? String(localMatch.sale_price) : "");
                setCostPriceInput(localMatch.cost_price ? String(localMatch.cost_price) : "");
                setUnitTypeInput(localMatch.unit_type || "unit");
                const matchedCat = findMatchingCategoryId(localMatch.category);
                if (matchedCat) setCategoryIdInput(matchedCat);
            }

            // 2. Query Master Argentine Catalog backend API
            setIsLookingUp(true);
            lookupMasterBarcode(scannedBarcode)
                .then((res) => {
                    if (res?.in_store && res?.product) {
                        // Product already exists in store
                        toast.success(`+1 ${res.product.name}`, { id: "barcode-found-toast" });
                        onSelectProduct?.(res.product);
                        onClose();
                        return;
                    }

                    if (res?.found_in_master && res?.master_product) {
                        const mp = res.master_product;
                        const formatted = {
                            name: mp.name,
                            brand: mp.brand,
                            category: mp.category_name,
                            sale_price: mp.suggested_sale_price ? Number(mp.suggested_sale_price) : (localMatch?.sale_price || 0),
                            cost_price: mp.suggested_cost_price ? Number(mp.suggested_cost_price) : (localMatch?.cost_price || 0),
                            unit_type: mp.unit_type || "unit",
                            source: mp.source || "master_db",
                        };
                        setDetectedInfo(formatted);
                        setIsNationalMatch(true);
                        setNameInput(formatted.name);
                        setSalePriceInput(formatted.sale_price ? String(formatted.sale_price) : "");
                        setCostPriceInput(formatted.cost_price ? String(formatted.cost_price) : "");
                        setUnitTypeInput(formatted.unit_type || "unit");

                        const matchedCat = findMatchingCategoryId(formatted.category);
                        if (matchedCat) setCategoryIdInput(matchedCat);

                        if (res.similar_store_product) {
                            setSimilarStoreProduct(res.similar_store_product);
                        }
                    } else if (!localMatch) {
                        // 3. Fallback online lookup across open databases
                        lookupBarcodeDetails(scannedBarcode).then((info) => {
                            if (info && info.name) {
                                setDetectedInfo(info);
                                setNameInput(info.name);
                                if (info.category) {
                                    const matchedCat = findMatchingCategoryId(info.category);
                                    if (matchedCat) setCategoryIdInput(matchedCat);
                                }
                                if (info.sale_price) setSalePriceInput(String(info.sale_price));
                                if (info.cost_price) setCostPriceInput(String(info.cost_price));
                            }
                        });
                    }
                })
                .catch((err) => {
                    console.warn("Backend barcode lookup error, relying on local master catalog:", err);
                })
                .finally(() => {
                    setIsLookingUp(false);
                });

            // Focus and preselect the sale price input so the merchant can type their exact shelf price in 1 stroke
            const timer = setTimeout(() => {
                if (priceInputRef.current) {
                    priceInputRef.current.focus();
                    priceInputRef.current.select();
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [isOpen, scannedBarcode]);

    if (!isOpen) return null;

    // Save with merchant's custom/confirmed price and add immediately to sale
    async function handleSaveAndAddToSale(e) {
        if (e) e.preventDefault();
        const trimmedName = nameInput.trim();
        if (!trimmedName) {
            toast.error("Por favor, ingresá el nombre del producto.");
            nameInputRef.current?.focus();
            return;
        }

        const numSale = Number(salePriceInput);
        if (isNaN(numSale) || numSale <= 0) {
            toast.error("Por favor, ingresá un precio de venta válido mayor a 0.");
            priceInputRef.current?.focus();
            return;
        }

        const numCost = Number(costPriceInput) || 0;

        setIsSaving(true);
        try {
            const payload = {
                name: trimmedName,
                unit_type: unitTypeInput || "unit",
                sale_price: numSale,
                cost_price: numCost,
                category: categoryIdInput ? Number(categoryIdInput) : null,
                provider: providerIdInput ? Number(providerIdInput) : null,
                barcode: scannedBarcode,
                stock: null,
                min_stock: 1,
                is_active: true,
            };

            // Check if user already has a product with this exact name
            const existing = activeProducts.find(
                (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
            );

            let resultProduct;
            if (existing) {
                resultProduct = await updateProduct(existing.id, {
                    ...existing,
                    name: trimmedName,
                    sale_price: numSale,
                    cost_price: numCost || existing.cost_price,
                    category: categoryIdInput ? Number(categoryIdInput) : existing.category,
                    provider: providerIdInput ? Number(providerIdInput) : existing.provider,
                    barcode: scannedBarcode,
                });
                toast.success(`+1 ${resultProduct.name} (Actualizado a ${formatCurrency(numSale)})`, { id: "instant-add-toast" });
            } else {
                try {
                    resultProduct = await createProduct(payload);
                    toast.success(`+1 ${resultProduct.name} (${formatCurrency(resultProduct.sale_price)})`, { id: "instant-add-toast" });
                } catch (createErr) {
                    const nameErr = createErr.response?.data?.name?.[0] || "";
                    if (nameErr.toLowerCase().includes("ya existe")) {
                        const fallbackExisting = products.find(
                            (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
                        );
                        if (fallbackExisting) {
                            resultProduct = await updateProduct(fallbackExisting.id, {
                                ...fallbackExisting,
                                name: trimmedName,
                                sale_price: numSale,
                                cost_price: numCost || fallbackExisting.cost_price,
                                barcode: scannedBarcode,
                            });
                            toast.success(`+1 ${resultProduct.name} (Código y precio actualizados)`, { id: "instant-add-toast" });
                        } else {
                            throw createErr;
                        }
                    } else {
                        throw createErr;
                    }
                }
            }

            onProductUpdated?.(resultProduct);
            onSelectProduct?.(resultProduct);
            onClose();
        } catch (error) {
            console.error("Error creating product from barcode setup:", error);
            const msg = error.response?.data?.name?.[0] || error.response?.data?.barcode?.[0] || error.response?.data?.detail || "No se pudo guardar el producto.";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setIsSaving(false);
        }
    }

    // Link barcode to an existing store product
    async function handleLinkProduct(product) {
        setIsSaving(true);
        try {
            const payload = {
                name: product.name,
                unit_type: product.unit_type || "unit",
                sale_price: product.sale_price,
                cost_price: product.cost_price || 0,
                category: product.category || null,
                provider: product.provider || null,
                barcode: scannedBarcode,
                stock: product.stock,
                min_stock: product.min_stock,
                is_active: product.is_active,
            };

            const updated = await updateProduct(product.id, payload);
            playBeepSuccess();
            toast.success(`Código vinculado a "${updated.name}"`);

            onProductUpdated?.(updated);
            onSelectProduct?.(updated);
            onClose();
        } catch (error) {
            console.error("Error linking barcode to product:", error);
            const msg = error.response?.data?.barcode || error.response?.data?.detail || "No se pudo vincular el código de barras.";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setIsSaving(false);
        }
    }

    // Live margin calculation
    const numCost = Number(costPriceInput) || 0;
    const numSale = Number(salePriceInput) || 0;
    const profit = numSale - numCost;
    const markupPct = numCost > 0 ? Math.round(((numSale - numCost) / numCost) * 100) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
            <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {/* SCANNER ICON */}
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75ZM6.75 16.5h.008v.008H6.75V16.5ZM16.5 6.75h.008v.008H16.5V6.75ZM13.5 13.5h3v3h-3v-3ZM13.5 19.5h6v-3h-3v3h-3ZM19.5 13.5h.008v.008H19.5V13.5Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">Nuevo Producto Detectado</h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Código de barras: <span className="font-mono font-bold text-[var(--primary)]">{scannedBarcode}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* 1. QUICK-ADD & PRICE CONFIRMATION FORM */}
                    <div
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveAndAddToSale();
                            }
                        }}
                        className="rounded-md border border-[var(--primary)]/30 bg-[var(--surface-accent)]/30 p-4 space-y-3.5 shadow-xs"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                <span>{isNationalMatch ? "Reconocido en Catálogo Nacional" : "Carga Rápida de Producto"}</span>
                            </div>

                            {isLookingUp && (
                                <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                                    <svg className="h-3 w-3 animate-spin text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Consultando...
                                </span>
                            )}
                        </div>

                        {/* PRODUCT NAME (EDITABLE) */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                Nombre del Producto
                            </label>
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Ej: Té de Manzanilla La Virginia x 25u"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>

                        {/* PRICING ROW: SALE PRICE & COST PRICE */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* SALE PRICE (AUTO-FOCUSED) */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--success)] mb-1">
                                    Precio de Venta ($) *
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <input
                                        ref={priceInputRef}
                                        type="number"
                                        step="any"
                                        value={salePriceInput}
                                        onChange={(e) => setSalePriceInput(e.target.value)}
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border-2 border-[var(--primary)]/60 bg-[var(--background)] pl-7 pr-3 text-sm font-extrabold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                            </div>

                            {/* COST PRICE */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Costo ($) <span className="text-[10px] lowercase font-normal">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={costPriceInput}
                                        onChange={(e) => setCostPriceInput(e.target.value)}
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LIVE MARGIN BADGE */}
                        {numSale > 0 && numCost > 0 && (
                            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                                <span>Ganancia: <strong className="text-[var(--success)]">{formatCurrency(profit)}</strong></span>
                                <span>Margen: <strong className={markupPct >= 0 ? "text-[var(--primary)]" : "text-[var(--danger)]"}>{markupPct >= 0 ? `+${markupPct}%` : `${markupPct}%`}</strong></span>
                            </div>
                        )}

                        {/* CATEGORY & PROVIDER ROW */}
                        <div className="grid grid-cols-2 gap-3 pt-0.5">
                            {/* CATEGORY */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Categoría
                                </label>
                                <div className="relative">
                                    <select
                                        value={categoryIdInput}
                                        onChange={(e) => setCategoryIdInput(e.target.value)}
                                        className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 pr-8 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] cursor-pointer"
                                    >
                                        <option value="">Sin categoría</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* PROVIDER */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Proveedor Habitual
                                </label>
                                <div className="relative">
                                    <select
                                        value={providerIdInput}
                                        onChange={(e) => setProviderIdInput(e.target.value)}
                                        className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 pr-8 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] cursor-pointer"
                                    >
                                        <option value="">Sin proveedor</option>
                                        {providers.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="button"
                            onClick={handleSaveAndAddToSale}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-2.5 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] active:scale-98 disabled:opacity-50 mt-2"
                        >
                            <span>+</span>
                            <span>{isSaving ? "Guardando..." : "Guardar y sumar a la venta (Enter)"}</span>
                        </button>
                    </div>

                    {/* 2. LINK TO EXISTING PRODUCT SECTION */}
                    <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            ¿Ya lo tenías creado sin código? Vincular a un producto existente:
                        </label>
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscá en tu catálogo por nombre..."
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* MATCHING PRODUCTS LIST */}
                        <div className="max-h-36 overflow-y-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--background)]">
                            {matchingProducts.length === 0 ? (
                                <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                                    No se encontraron productos en tu negocio.
                                </div>
                            ) : (
                                matchingProducts.map((p) => {
                                    const isDirectNameMatch = similarStoreProduct && p.id === similarStoreProduct.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleLinkProduct(p)}
                                            disabled={isSaving}
                                            className={`w-full flex items-center justify-between p-2.5 text-left transition disabled:opacity-50 group ${
                                                isDirectNameMatch
                                                    ? "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500"
                                                    : "hover:bg-[var(--surface-accent)]"
                                            }`}
                                        >
                                            <div className="min-w-0 pr-3">
                                                {isDirectNameMatch && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                                                        ★ Coincidencia de nombre existente
                                                    </span>
                                                )}
                                                <p className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)]">
                                                    {p.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-secondary)]">
                                                    <span>{p.category_name || "Sin categoría"}</span>
                                                    {p.barcode ? (
                                                        <span>• Código actual: {p.barcode}</span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400 font-medium">• Sin código asignado</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-bold text-[var(--text-primary)] block">
                                                    {formatCurrency(p.sale_price)}
                                                </span>
                                                <span className="text-[10px] font-semibold text-[var(--primary)]">
                                                    {isDirectNameMatch ? "Asignar código →" : "Vincular y agregar →"}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 bg-[var(--surface-accent)]">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onCreateNewProduct?.(scannedBarcode, detectedInfo);
                        }}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                    >
                        Formulario avanzado...
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BarcodeNotFoundModal;
