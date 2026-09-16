import { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { formatCurrency } from "../../utils/formatCurrency";
import { getProducts, createProduct, updateProduct, lookupMasterBarcode } from "../../services/business";
import { playBeepSuccess } from "../../utils/audio";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";

import { findInNationalCatalog } from "../../utils/nationalCatalog";
import { lookupBarcodeDetails } from "../../utils/barcodeLookup";
import { filterAndRankProducts } from "../../utils/productSearch";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";

function ProductModal({
    isOpen,
    onClose,
    product,
    initialBarcode = "",
    initialName = "",
    initialSalePrice = "",
    initialCostPrice = "",
    initialUnitType = "unit",
    categories = [],
    providers = [],
    onSuccess,
    onOpenCategoryModal,
    onOpenProviderModal,
}) {
    const isEditing = Boolean(product && product.id);
    const { isPremium, hasFeature, openSubscriptionModal } = useSubscriptionTier();

    const [name, setName] = useState("");
    const [unitType, setUnitType] = useState("unit"); // 'unit' | 'kg' | '100g'
    const [salePrice, setSalePrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [providerId, setProviderId] = useState("");
    const [barcode, setBarcode] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Quantity Promo States (e.g. 3x $1500)
    const [hasPromo, setHasPromo] = useState(false);
    const [promoQuantity, setPromoQuantity] = useState("3");
    const [promoPrice, setPromoPrice] = useState("");

    // Combo / Multi-product Bundle States
    const [isBundle, setIsBundle] = useState(false);
    const [bundleItems, setBundleItems] = useState([]);
    const [storeProducts, setStoreProducts] = useState([]);
    const [bundleSearchQuery, setBundleSearchQuery] = useState("");
    const [isBundleSearchOpen, setIsBundleSearchOpen] = useState(false);
    const [highlightedBundleIndex, setHighlightedBundleIndex] = useState(0);

    const nameInputRef = useRef(null);
    const salePriceInputRef = useRef(null);
    const bundleSearchInputRef = useRef(null);
    const bundleSearchContainerRef = useRef(null);

    // Fetch store products for combo builder when opened
    useEffect(() => {
        if (isOpen) {
            getProducts()
                .then((prods) => {
                    const filtered = (prods || []).filter(
                        (p) => p.is_active && (!product || p.id !== product.id) && !p.is_bundle
                    );
                    setStoreProducts(filtered);
                })
                .catch(() => {});
        }
    }, [isOpen, product]);

    async function applyBarcodeData(scannedCode) {
        if (!scannedCode) return;
        setBarcode(scannedCode);
        setShowAdvanced(true);

        const local = findInNationalCatalog(scannedCode);
        if (local) {
            if (!name) setName(local.name);
            if (!salePrice && local.sale_price) setSalePrice(String(local.sale_price));
            if (!costPrice && local.cost_price) setCostPrice(String(local.cost_price));
            if (local.unit_type) setUnitType(local.unit_type);
            if (local.category && categories.length > 0 && !categoryId) {
                const matchCat = categories.find((c) =>
                    c.name.toLowerCase().includes(local.category.toLowerCase()) ||
                    local.category.toLowerCase().includes(c.name.toLowerCase())
                );
                if (matchCat) setCategoryId(String(matchCat.id));
            }
        }

        try {
            const res = await lookupMasterBarcode(scannedCode);
            if (res?.found_in_master && res?.master_product) {
                const mp = res.master_product;
                setName(mp.name);
                if (mp.suggested_sale_price && !salePrice) setSalePrice(String(mp.suggested_sale_price));
                if (mp.suggested_cost_price && !costPrice) setCostPrice(String(mp.suggested_cost_price));
                if (mp.unit_type) setUnitType(mp.unit_type);
                if (mp.category_name && categories.length > 0 && !categoryId) {
                    const matchCat = categories.find((c) =>
                        c.name.toLowerCase().includes(mp.category_name.toLowerCase()) ||
                        mp.category_name.toLowerCase().includes(c.name.toLowerCase())
                    );
                    if (matchCat) setCategoryId(String(matchCat.id));
                }
                toast.success(`Producto reconocido: ${mp.name}`, { id: "product-modal-recognize" });
                salePriceInputRef.current?.focus();
            } else if (!local) {
                const detected = await lookupBarcodeDetails(scannedCode);
                if (detected?.name) {
                    setName(detected.name);
                    toast.success(`Producto detectado: ${detected.name}`);
                    salePriceInputRef.current?.focus();
                }
            }
        } catch {
            // ignore network lookup failures
        }
    }

    // Auto-capture barcode scans while the modal is open
    useBarcodeScanner(async (scannedCode) => {
        playBeepSuccess();
        await applyBarcodeData(scannedCode);
    }, { enabled: isOpen });

    useEffect(() => {
        if (product && isEditing) {
            setName(product.name || "");
            setUnitType(product.unit_type || "unit");
            setSalePrice(product.sale_price ? String(product.sale_price) : "");
            setCostPrice(product.cost_price && Number(product.cost_price) > 0 ? String(product.cost_price) : "");
            setCategoryId(product.category ? String(product.category) : "");
            setProviderId(product.provider ? String(product.provider) : "");
            setBarcode(product.barcode || "");
            setStock(product.stock !== null && product.stock !== undefined ? String(product.stock) : "");
            setMinStock(product.min_stock !== null && product.min_stock !== undefined ? String(product.min_stock) : "");
            setIsActive(product.is_active ?? true);

            // Promo states
            const hasPromoConfig = Boolean(
                product.promo_quantity && Number(product.promo_quantity) >= 2 &&
                product.promo_price && Number(product.promo_price) > 0
            );
            setHasPromo(hasPromoConfig);
            setPromoQuantity(product.promo_quantity ? String(product.promo_quantity) : "3");
            setPromoPrice(product.promo_price ? String(product.promo_price) : "");

            // Bundle states
            setIsBundle(Boolean(product.is_bundle));
            setBundleItems(
                (product.bundle_items || []).map((bi) => ({
                    product: bi.product_id,
                    product_name: bi.product_name,
                    product_unit_type: bi.product_unit_type,
                    product_sale_price: Number(bi.product_sale_price) || 0,
                    product_cost_price: Number(bi.product_cost_price) || 0,
                    product_stock: bi.product_stock !== null ? Number(bi.product_stock) : null,
                    quantity: Number(bi.quantity) || 1,
                }))
            );

            if (product.barcode || (product.stock && Number(product.stock) > 0) || hasPromoConfig) {
                setShowAdvanced(true);
            }
        } else {
            const startBarcode = product?.barcode || initialBarcode || "";
            const nat = startBarcode ? findInNationalCatalog(startBarcode) : null;
            const startName = initialName || nat?.name || "";
            const startSalePrice = initialSalePrice || (nat?.sale_price ? String(nat.sale_price) : "");
            const startCostPrice = initialCostPrice || (nat?.cost_price ? String(nat.cost_price) : "");
            const startUnitType = initialUnitType && initialUnitType !== "unit" ? initialUnitType : (nat?.unit_type || "unit");

            setName(startName);
            setUnitType(startUnitType);
            setSalePrice(startSalePrice);
            setCostPrice(startCostPrice);
            setCategoryId("");
            setProviderId("");
            setBarcode(startBarcode);
            setStock("");
            setMinStock("1");
            setIsActive(true);
            setHasPromo(false);
            setPromoQuantity("3");
            setPromoPrice("");
            setIsBundle(false);
            setBundleItems([]);
            setBundleSearchQuery("");
            setIsBundleSearchOpen(false);
            setHighlightedBundleIndex(0);
            setShowAdvanced(Boolean(startBarcode));

            if (startBarcode && !startName) {
                applyBarcodeData(startBarcode);
            }
        }
    }, [product, isEditing, isOpen, initialBarcode, initialName, initialSalePrice, initialCostPrice, initialUnitType]);

    // Close bundle search dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (bundleSearchContainerRef.current && !bundleSearchContainerRef.current.contains(e.target)) {
                setIsBundleSearchOpen(false);
            }
        }
        if (isBundleSearchOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isBundleSearchOpen]);

    // Auto-select newly created category or provider when added via quick modal
    const prevCategoriesRef = useRef(categories);
    const prevProvidersRef = useRef(providers);

    useEffect(() => {
        if (isOpen && categories.length > prevCategoriesRef.current.length) {
            const prevIds = new Set(prevCategoriesRef.current.map((c) => c.id));
            const newlyAdded = categories.find((c) => !prevIds.has(c.id));
            if (newlyAdded) {
                setCategoryId(String(newlyAdded.id));
            }
        }
        prevCategoriesRef.current = categories;
    }, [categories, isOpen]);

    useEffect(() => {
        if (isOpen && providers.length > prevProvidersRef.current.length) {
            const prevIds = new Set(prevProvidersRef.current.map((p) => p.id));
            const newlyAdded = providers.find((p) => !prevIds.has(p.id));
            if (newlyAdded) {
                setProviderId(String(newlyAdded.id));
            }
        }
        prevProvidersRef.current = providers;
    }, [providers, isOpen]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (name.trim()) {
                    salePriceInputRef.current?.focus();
                } else {
                    nameInputRef.current?.focus();
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Live calculations for standard item
    const numCost = Number(costPrice) || 0;
    const numSale = Number(salePrice) || 0;
    const profit = numSale - numCost;
    const markupPct = numCost > 0 ? Math.round(((numSale - numCost) / numCost) * 100) : null;

    // Live calculations for quantity promo
    const numPromoQty = parseInt(promoQuantity, 10) || 0;
    const numPromoPrice = Number(promoPrice) || 0;
    const regularPromoSum = numPromoQty * numSale;
    const promoSavings = hasPromo && numPromoQty >= 2 && numPromoPrice > 0 && regularPromoSum > numPromoPrice
        ? regularPromoSum - numPromoPrice
        : 0;
    const promoUnitCost = numPromoQty > 0 ? numPromoPrice / numPromoQty : 0;
    const promoDiscountPct = regularPromoSum > 0 ? Math.round((promoSavings / regularPromoSum) * 100) : 0;

    // Live calculations for combo / bundle
    const bundleRegularSum = bundleItems.reduce(
        (sum, it) => sum + (it.product_sale_price || 0) * (it.quantity || 1),
        0
    );
    const bundleCostSum = bundleItems.reduce(
        (sum, it) => sum + (it.product_cost_price || 0) * (it.quantity || 1),
        0
    );
    const bundleSavings = numSale > 0 && bundleRegularSum > numSale ? bundleRegularSum - numSale : 0;
    const bundleDiscountPct = bundleRegularSum > 0 ? Math.round((bundleSavings / bundleRegularSum) * 100) : 0;

    // Calculate available combo stock
    const calculatedBundleStock = useMemo(() => {
        if (!isBundle || bundleItems.length === 0) return null;
        let minPossible = null;
        let hasTracked = false;
        for (const it of bundleItems) {
            if (it.product_stock !== null && it.product_stock !== undefined) {
                hasTracked = true;
                const qty = it.quantity || 1;
                if (qty > 0) {
                    const possible = Math.floor(it.product_stock / qty);
                    if (minPossible === null || possible < minPossible) {
                        minPossible = Math.max(0, possible);
                    }
                }
            }
        }
        return hasTracked ? minPossible : null;
    }, [isBundle, bundleItems]);

    // Filter store products for searchable combo item selector
    // Filter store products for searchable combo item selector (only when typing)
    const filteredStoreProducts = useMemo(() => {
        if (!isBundle) return [];
        const query = bundleSearchQuery.trim();
        if (!query) return [];
        return filterAndRankProducts(storeProducts, query, { maxResults: 30 });
    }, [storeProducts, bundleSearchQuery, isBundle]);

    function handleSelectProductForBundle(prod) {
        if (!prod) return;

        const existingIdx = bundleItems.findIndex((it) => String(it.product) === String(prod.id));
        if (existingIdx >= 0) {
            const updated = [...bundleItems];
            updated[existingIdx].quantity = (Number(updated[existingIdx].quantity) || 1) + 1;
            setBundleItems(updated);
        } else {
            setBundleItems((prev) => [
                ...prev,
                {
                    product: prod.id,
                    product_name: prod.name,
                    product_unit_type: prod.unit_type,
                    product_sale_price: Number(prod.sale_price) || 0,
                    product_cost_price: Number(prod.cost_price) || 0,
                    product_stock: prod.stock !== null && prod.stock !== undefined ? Number(prod.stock) : null,
                    quantity: 1,
                },
            ]);
        }

        // Auto-fill category from constituent product if not set
        if (!categoryId && prod.category) {
            setCategoryId(String(prod.category));
        }

        // Auto-fill provider from constituent product if not set
        if (!providerId && prod.provider) {
            setProviderId(String(prod.provider));
        }

        // Auto-suggest name if empty
        if (!name.trim()) {
            setName(`Oferta ${prod.name}`);
        }

        // Auto-suggest sale price if empty
        if (!salePrice) {
            setSalePrice(String(prod.sale_price));
        }

        setBundleSearchQuery("");
        setIsBundleSearchOpen(false);
        bundleSearchInputRef.current?.focus();
    }

    function handleBundleSearchKeyDown(e) {
        if (!isBundleSearchOpen || filteredStoreProducts.length === 0) {
            if (e.key === "Escape") {
                setBundleSearchQuery("");
                setIsBundleSearchOpen(false);
            }
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedBundleIndex((prev) => (prev + 1) % filteredStoreProducts.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedBundleIndex((prev) => (prev - 1 + filteredStoreProducts.length) % filteredStoreProducts.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredStoreProducts[highlightedBundleIndex]) {
                handleSelectProductForBundle(filteredStoreProducts[highlightedBundleIndex]);
            }
        } else if (e.key === "Escape") {
            setIsBundleSearchOpen(false);
            setBundleSearchQuery("");
        }
    }

    function handleRemoveBundleItem(idx) {
        setBundleItems((prev) => prev.filter((_, i) => i !== idx));
    }

    function handleUpdateBundleItemQty(idx, delta) {
        const item = bundleItems[idx];
        if (!item) return;
        const newQty = (Number(item.quantity) || 1) + delta;
        if (newQty <= 0) {
            handleRemoveBundleItem(idx);
            return;
        }
        const updated = [...bundleItems];
        updated[idx] = { ...item, quantity: newQty };
        setBundleItems(updated);
    }

    function handleDirectBundleItemQty(idx, value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) return;
        const updated = [...bundleItems];
        if (!updated[idx]) return;
        updated[idx] = { ...updated[idx], quantity: parsed };
        setBundleItems(updated);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("El nombre del producto es obligatorio.");
            return;
        }

        if (!salePrice || Number(salePrice) <= 0) {
            toast.error("Ingresá un precio de venta válido.");
            return;
        }

        if (isBundle && bundleItems.length === 0) {
            toast.error("Un combo debe tener al menos 1 producto asociado.");
            return;
        }

        if (hasPromo) {
            if (!numPromoQty || numPromoQty < 2) {
                toast.error("La cantidad de la promo debe ser de al menos 2 unidades.");
                return;
            }
            if (!numPromoPrice || numPromoPrice <= 0) {
                toast.error("Ingresá un precio de promo válido.");
                return;
            }
        }

        setIsSaving(true);
        try {
            const data = {
                name: name.trim(),
                unit_type: isBundle ? "unit" : unitType,
                sale_price: Number(salePrice),
                cost_price: isBundle ? bundleCostSum : costPrice ? Number(costPrice) : 0,
                category: categoryId ? Number(categoryId) : null,
                provider: providerId ? Number(providerId) : null,
                barcode: barcode.trim() || null,
                stock: isBundle ? null : stock !== "" ? Number(stock) : null,
                min_stock: minStock !== "" ? Number(minStock) : 1,
                is_active: isActive,
                promo_quantity: hasPromo && !isBundle ? numPromoQty : null,
                promo_price: hasPromo && !isBundle ? numPromoPrice : null,
                is_bundle: isBundle,
                bundle_items: isBundle
                    ? bundleItems.map((bi) => ({
                          product_id: bi.product,
                          quantity: bi.quantity,
                      }))
                    : [],
            };

            let saved;
            try {
                saved = isEditing
                    ? await updateProduct(product.id, data)
                    : await createProduct(data);
            } catch (saveError) {
                const nameErrMsg = saveError.response?.data?.name?.[0] || "";
                if (!isEditing && nameErrMsg.toLowerCase().includes("ya existe")) {
                    const allProds = await getProducts();
                    const existing = allProds.find(
                        (p) => p.name.trim().toLowerCase() === data.name.toLowerCase()
                    );
                    if (existing) {
                        saved = await updateProduct(existing.id, data);
                        toast.success(`Producto "${existing.name}" actualizado.`);
                        onSuccess(saved);
                        onClose();
                        return;
                    }
                }
                throw saveError;
            }

            toast.success(isEditing ? "Producto actualizado." : "Producto creado.");
            onSuccess(saved);
            onClose();
        } catch (error) {
            console.error(error);
            const msg =
                error.response?.data?.name?.[0] ||
                error.response?.data?.barcode?.[0] ||
                "No se pudo guardar el producto.";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setIsSaving(false);
        }
    }

    const unitLabelSuffix =
        unitType === "kg" ? "($/kg)" : unitType === "100g" ? "($/100g)" : "";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface)] shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            {isEditing ? (isBundle ? "Editar Combo / Oferta" : "Editar Producto") : (isBundle ? "Nuevo Combo / Oferta Especial" : "Nuevo Producto")}
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {isEditing ? "Modificá precios, promociones y detalles" : isBundle ? "Creá combos u ofertas especiales vinculadas al stock de tus productos" : "Cargá productos individuales a tu catálogo"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] transition"
                    >
                        ✕
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        {/* MODE SELECTOR: STANDARD PRODUCT VS COMBO */}
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-md bg-[var(--surface-accent)]/50 border border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setIsBundle(false)}
                                className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition ${
                                    !isBundle
                                        ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                </svg>
                                <span>Producto Estándar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsBundle(true)}
                                className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition ${
                                    isBundle
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                </svg>
                                <span>Combo / Oferta Especial</span>
                            </button>
                        </div>

                        {/* NAME */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                {isBundle ? "Nombre del Combo u Oferta" : "Nombre del producto"} <span className="text-[var(--danger)]">*</span>
                            </label>
                            <input
                                ref={nameInputRef}
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={isBundle ? "Ej: Oferta Coca Cola 2.25L, Promo 2x1 Alfajores, Combo Previa..." : "Ej: Milanesas de Pollo, Coca Cola 500ml..."}
                                maxLength={150}
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>

                        {/* UNIT TYPE (ONLY FOR STANDARD PRODUCT) */}
                        {!isBundle && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Tipo de venta / Unidad
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUnitType("unit")}
                                        className={`flex flex-col items-center justify-center gap-0.5 rounded-md border p-2 text-center text-xs font-semibold transition ${
                                            unitType === "unit"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                                : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        <span>Por Unidad</span>
                                        <span className="text-[10px] font-normal opacity-70">x unidad (u.)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUnitType("kg")}
                                        className={`flex flex-col items-center justify-center gap-0.5 rounded-md border p-2 text-center text-xs font-semibold transition ${
                                            unitType === "kg"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                                : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        <span>Por Kilo</span>
                                        <span className="text-[10px] font-normal opacity-70">$/kg (al peso)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUnitType("100g")}
                                        className={`flex flex-col items-center justify-center gap-0.5 rounded-md border p-2 text-center text-xs font-semibold transition ${
                                            unitType === "100g"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                                : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        <span>Por 100g</span>
                                        <span className="text-[10px] font-normal opacity-70">$/100g (fracción)</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* COMBO CONSTITUENT ITEMS BUILDER (ONLY WHEN IS_BUNDLE) */}
                        {isBundle && (
                            <div className="rounded-md border border-[var(--primary)]/30 bg-[var(--surface-accent)]/30 p-3.5 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                        </svg>
                                        <span>Productos que integran el combo</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                        {bundleItems.length} {bundleItems.length === 1 ? "artículo agregado" : "artículos agregados"}
                                    </span>
                                </div>

                                {/* SEARCH BAR (DROPDOWN ONLY ON TYPING) */}
                                <div className="relative" ref={bundleSearchContainerRef}>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                            </svg>
                                        </span>
                                        <input
                                            ref={bundleSearchInputRef}
                                            type="text"
                                            value={bundleSearchQuery}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setBundleSearchQuery(val);
                                                setIsBundleSearchOpen(val.trim().length > 0);
                                                setHighlightedBundleIndex(0);
                                            }}
                                            onFocus={() => {
                                                if (bundleSearchQuery.trim().length > 0) {
                                                    setIsBundleSearchOpen(true);
                                                }
                                            }}
                                            onKeyDown={handleBundleSearchKeyDown}
                                            placeholder="Buscar producto para sumar a la oferta..."
                                            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                                        />
                                        {bundleSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBundleSearchQuery("");
                                                    setIsBundleSearchOpen(false);
                                                    bundleSearchInputRef.current?.focus();
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                                                title="Limpiar búsqueda"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* DROPDOWN RESULTS (ONLY WHEN TYPING) */}
                                    {isBundleSearchOpen && bundleSearchQuery.trim().length > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl divide-y divide-[var(--border)]/40 text-xs">
                                            {filteredStoreProducts.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                                                    No se encontraron productos coincidentes.
                                                </div>
                                            ) : (
                                                filteredStoreProducts.map((p, idx) => {
                                                    const isHighlighted = idx === highlightedBundleIndex;
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => handleSelectProductForBundle(p)}
                                                            onMouseEnter={() => setHighlightedBundleIndex(idx)}
                                                            className={`flex items-center justify-between p-2.5 cursor-pointer transition ${
                                                                isHighlighted
                                                                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                                                    : "hover:bg-[var(--surface-accent)] text-[var(--text-primary)]"
                                                            }`}
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <div className="font-bold truncate">{p.name}</div>
                                                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                                    {p.category_name && <span>{p.category_name}</span>}
                                                                    {p.barcode && <span className="font-mono">{p.barcode}</span>}
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <div className="font-bold text-[var(--success)]">{formatCurrency(p.sale_price)}</div>
                                                                <div className="text-[10px] text-[var(--text-secondary)]">
                                                                    {p.stock !== null ? `Stock: ${p.stock}` : "Sin control"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* LIST OF INCLUDED ITEMS */}
                                {bundleItems.length === 0 ? (
                                    <div className="rounded-md border border-dashed border-[var(--border)] p-3.5 text-center text-xs text-[var(--text-secondary)] bg-[var(--background)]/50">
                                        Escribí en el buscador para sumar los productos que componen esta oferta.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--background)] max-h-48 overflow-y-auto">
                                        {bundleItems.map((it, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-bold text-[var(--text-primary)] truncate">
                                                        {it.product_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                                                        <span>{formatCurrency(it.product_sale_price)} c/u</span>
                                                        {it.product_stock !== null && it.product_stock !== undefined && (
                                                            <span>Stock: {it.product_stock} u.</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2.5 shrink-0">
                                                    {/* STEPPER */}
                                                    <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateBundleItemQty(idx, -1)}
                                                            className="h-7 w-7 flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition rounded-l-md"
                                                            title="Restar 1"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={it.quantity}
                                                            onChange={(e) => handleDirectBundleItemQty(idx, e.target.value)}
                                                            className="w-8 text-center font-bold text-xs tabular-nums text-[var(--text-primary)] bg-transparent outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateBundleItemQty(idx, 1)}
                                                            className="h-7 w-7 flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition rounded-r-md"
                                                            title="Sumar 1"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <span className="w-18 text-right font-bold text-xs text-[var(--text-primary)] tabular-nums">
                                                        {formatCurrency((it.product_sale_price || 0) * (it.quantity || 1))}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBundleItem(idx)}
                                                        className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                                                        title="Eliminar producto"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* BUNDLE LIVE STATS */}
                                {bundleItems.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[var(--text-secondary)] border-t border-[var(--border)]">
                                        <div>
                                            Suma individual: <strong className="text-[var(--text-primary)]">{formatCurrency(bundleRegularSum)}</strong>
                                        </div>
                                        {calculatedBundleStock !== null && (
                                            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                Stock combo: {calculatedBundleStock} disponibles
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PRICES GRID */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {/* SALE PRICE */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    {isBundle ? "Precio del Combo ($)" : `Precio de Venta ${unitLabelSuffix}`} <span className="text-[var(--danger)]">*</span>
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        ref={salePriceInputRef}
                                        required
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border-2 border-[var(--primary)]/60 bg-[var(--background)] pl-7 pr-3 text-sm font-extrabold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                            </div>

                            {/* COST PRICE */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    {isBundle ? "Costo total de componentes" : `Precio Costo ${unitLabelSuffix}`} <span className="text-[10px] text-[var(--text-secondary)]/70">(Opcional)</span>
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        value={isBundle ? String(bundleCostSum || "") : costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        disabled={isBundle}
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)] disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LIVE MARGIN & SAVINGS BADGE */}
                        {isBundle && bundleSavings > 0 && (
                            <div className="flex items-center justify-between rounded-md border border-[var(--success)]/30 bg-emerald-500/10 px-3.5 py-2 text-xs">
                                <span className="text-[var(--text-secondary)]">
                                    Ahorro para el cliente: <strong className="text-[var(--success)]">{formatCurrency(bundleSavings)}</strong>
                                </span>
                                <span className="font-bold text-[var(--success)]">
                                    {bundleDiscountPct}% OFF
                                </span>
                            </div>
                        )}

                        {!isBundle && numCost > 0 && numSale > 0 && (
                            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/60 px-3.5 py-2 text-xs">
                                <span className="text-[var(--text-secondary)]">
                                    Ganancia estimada: <strong className="text-[var(--text-primary)]">{formatCurrency(profit)}</strong>
                                </span>
                                <span className={`font-bold ${markupPct >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                    Margen: {markupPct >= 0 ? `+${markupPct}%` : `${markupPct}%`}
                                </span>
                            </div>
                        )}

                        {/* QUANTITY PROMO SECTION (PACK / 3x2) */}
                        {!isBundle && unitType === "unit" && (
                            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386l5.242-3.145c.826-.486 1.05-1.542.486-2.292L11.159 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                                            </svg>
                                            <p className="text-xs font-bold text-[var(--text-primary)]">
                                                Promoción por Cantidad (Pack / 2x / 3x)
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                            Aplica un precio especial cuando el cliente lleva varias unidades
                                        </p>
                                    </div>

                                    {/* TOGGLE SWITCH */}
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={hasPromo}
                                        onClick={() => setHasPromo(!hasPromo)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                                            hasPromo ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                            hasPromo ? "translate-x-4.5" : "translate-x-0.5"
                                        }`} />
                                    </button>
                                </div>

                                {hasPromo && (
                                    <div className="space-y-2.5 pt-1">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                    Llevando (unidades)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    value={promoQuantity}
                                                    onChange={(e) => setPromoQuantity(e.target.value)}
                                                    placeholder="3"
                                                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--success)] mb-1">
                                                    Precio total de la promo ($)
                                                </label>
                                                <div className="relative">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                        $
                                                    </span>
                                                    <MoneyInput
                                                        value={promoPrice}
                                                        onChange={(e) => setPromoPrice(e.target.value)}
                                                        placeholder="0"
                                                        className="h-9 w-full rounded-md border-2 border-[var(--primary)]/60 bg-[var(--background)] pl-7 pr-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* PROMO LIVE SAVINGS */}
                                        {numPromoQty >= 2 && numPromoPrice > 0 && numSale > 0 && (
                                            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs space-y-1">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-[var(--text-secondary)]">Precio unitario en promo:</span>
                                                    <span className="font-bold text-[var(--primary)]">{formatCurrency(promoUnitCost)} c/u</span>
                                                </div>
                                                {promoSavings > 0 && (
                                                    <div className="flex justify-between text-[11px] font-semibold text-[var(--success)]">
                                                        <span>Ahorro del cliente:</span>
                                                        <span>{formatCurrency(promoSavings)} ({promoDiscountPct}% OFF)</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CATEGORY & PROVIDER */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {/* CATEGORY */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Categoría
                                    </label>
                                    {onOpenCategoryModal && (
                                        <button
                                            type="button"
                                            onClick={onOpenCategoryModal}
                                            className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                                        >
                                            + Gestionar
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] cursor-pointer"
                                    >
                                        <option value="">Sin categoría</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* PROVIDER */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Proveedor Habitual
                                        </label>
                                        {!isPremium && !hasFeature("provider_debts") && (
                                            <span className="badge-gold px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider">
                                                PRO
                                            </span>
                                        )}
                                    </div>
                                    {!isPremium && !hasFeature("provider_debts") ? (
                                        <button
                                            type="button"
                                            onClick={openSubscriptionModal}
                                            className="text-[11px] font-bold text-amber-500 dark:text-amber-400 hover:underline"
                                        >
                                            Ver Plan PRO
                                        </button>
                                    ) : (
                                        onOpenProviderModal && (
                                            <button
                                                type="button"
                                                onClick={onOpenProviderModal}
                                                className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                                            >
                                                + Gestionar
                                            </button>
                                        )
                                    )}
                                </div>
                                <div className="relative">
                                    <select
                                        value={providerId}
                                        onChange={(e) => {
                                            if (!isPremium && !hasFeature("provider_debts")) {
                                                openSubscriptionModal();
                                                return;
                                            }
                                            setProviderId(e.target.value);
                                        }}
                                        disabled={!isPremium && !hasFeature("provider_debts")}
                                        className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {!isPremium && !hasFeature("provider_debts")
                                                ? "Plan Premium: Seguimiento de proveedores"
                                                : "Sin proveedor asignado"}
                                        </option>
                                        {providers.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLLAPSIBLE ADVANCED FIELDS (BARCODE & STOCK) */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/40 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                    </svg>
                                    <span>Código de barra y control de stock</span>
                                </div>
                                <svg className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>

                            {showAdvanced && (
                                <div className="mt-2 space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/20 p-3.5">
                                    {/* BARCODE */}
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                            Código de Barras / SKU
                                        </label>
                                        <input
                                            type="text"
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="Escaneá con tu lector o escribí el código..."
                                            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    {/* STOCK & MIN STOCK (DISABLED/DYNAMIC FOR BUNDLE) */}
                                    {!isBundle ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                    Stock actual {unitType === "kg" ? "(kg)" : "(u.)"}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={stock}
                                                    onChange={(e) => setStock(e.target.value)}
                                                    placeholder="Sin control"
                                                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                    Alerta mínimo {unitType === "kg" ? "(kg)" : "(u.)"}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={minStock}
                                                    onChange={(e) => setMinStock(e.target.value)}
                                                    placeholder="1"
                                                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-2.5 rounded-md bg-[var(--surface)] text-xs text-[var(--text-secondary)] border border-[var(--border)]">
                                            El stock del combo se calcula automáticamente a partir del stock individual de sus componentes ({calculatedBundleStock !== null ? `${calculatedBundleStock} combos disponibles` : "según inventario disponible"}).
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CUSTOM ACTIVE TOGGLE SWITCH */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => setIsActive(!isActive)}
                            className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/50 px-3.5 py-2.5 text-left transition hover:bg-[var(--surface-accent)]"
                        >
                            <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                    Producto Activo
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    {isActive ? "Disponible para seleccionar y vender" : "Oculto en las listas de venta"}
                                </p>
                            </div>

                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                                isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            }`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                    isActive ? "translate-x-4.5" : "translate-x-0.5"
                                }`} />
                            </div>
                        </button>
                    </div>

                    {/* ACTIONS FOOTER */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3.5 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-md bg-[var(--primary)] px-6 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSaving ? "Guardando..." : isEditing ? (isBundle ? "Guardar Combo / Oferta" : "Guardar cambios") : isBundle ? "Crear Combo / Oferta" : "Crear producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductModal;
