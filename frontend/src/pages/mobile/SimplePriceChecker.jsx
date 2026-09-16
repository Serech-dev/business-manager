import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import { getProducts, getCategories } from "../../services/business";
import { filterAndRankProducts } from "../../utils/productSearch";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import MobileCameraScanner from "../../components/mobile/MobileCameraScanner";
import { NATIONAL_PRODUCTS } from "../../utils/nationalCatalog";
import ProductModal from "../../components/products/ProductModal";
import { playBeepSuccess, playBeepWarning } from "../../utils/audio";

export function SimplePriceChecker({ onNavigateToPos }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [query, setQuery] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [activeProduct, setActiveProduct] = useState(null);
    const [unregisteredInfo, setUnregisteredInfo] = useState(null);

    // Quick Product Edit / Create Modal
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [newBarcode, setNewBarcode] = useState("");
    const [newName, setNewName] = useState("");

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [prodsData, catsData] = await Promise.all([
                getProducts(),
                getCategories(),
            ]);
            setProducts(Array.isArray(prodsData) ? prodsData : prodsData?.results || []);
            setCategories(Array.isArray(catsData) ? catsData : catsData?.results || []);
        } catch (err) {
            console.error("Error loading products in price checker:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLookupBarcode = useCallback((code) => {
        const barcodeStr = String(code).trim();
        if (!barcodeStr) return;

        const found = products.find(
            p => (p.barcode && String(p.barcode).trim() === barcodeStr) ||
                 (p.sku && String(p.sku).trim() === barcodeStr)
        );

        if (found) {
            setActiveProduct(found);
            setUnregisteredInfo(null);
            playBeepSuccess();
            toast.success(`Producto: ${found.name}`, { id: "checker-found" });
        } else {
            setActiveProduct(null);
            const nat = NATIONAL_PRODUCTS[barcodeStr];
            setUnregisteredInfo({
                barcode: barcodeStr,
                national: nat || null,
            });
            playBeepWarning();
            toast.error("Código no registrado en el catálogo local", { id: "checker-not-found" });
        }
    }, [products]);

    // Hardware Scanner Hook
    useBarcodeScanner(handleLookupBarcode, { enabled: !isScannerOpen });

    // Autocomplete matching list
    const searchMatches = useMemo(() => {
        if (!query.trim()) return [];
        return filterAndRankProducts(products, query.trim()).slice(0, 10);
    }, [products, query]);

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-4 pb-24">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Verificador de Precios</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Consultá precio al público, costo y stock disponible escaneando o buscando por nombre.
                </p>
            </div>

            {/* Search and Camera Trigger */}
            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (activeProduct) setActiveProduct(null);
                            if (unregisteredInfo) setUnregisteredInfo(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && query.trim()) {
                                handleLookupBarcode(query.trim());
                            }
                        }}
                        placeholder="Ingresá nombre o código de barras..."
                        className="w-full pl-9 pr-8 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
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

            {/* Live Autocomplete List when typing */}
            {query.trim() && !activeProduct && (
                <div className="mb-4 bg-[var(--surface)] border border-[var(--border)] rounded-md divide-y divide-[var(--border)]/50 shadow-md">
                    {searchMatches.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                            No se encontraron artículos con ese nombre.
                        </div>
                    ) : (
                        searchMatches.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setActiveProduct(item);
                                    setQuery("");
                                }}
                                className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-[var(--surface-accent)] transition-colors"
                            >
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{item.name}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)]">{item.barcode || item.category_name || "Sin código"}</p>
                                </div>
                                <span className="text-xs font-bold text-[var(--primary)] font-mono">
                                    {formatCurrency(item.sale_price)}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Active Product Details Card */}
            {activeProduct && (
                <div className="bg-[var(--surface)] border-2 border-[var(--primary)] rounded-md p-4 shadow-lg animate-fadeIn">
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3 mb-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary)]">
                                {activeProduct.category_name || "Sin rubro"}
                            </span>
                            <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                                {activeProduct.name}
                            </h3>
                            {activeProduct.barcode && (
                                <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                                    Código: {activeProduct.barcode}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setProductToEdit(activeProduct);
                                setIsProductModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-[var(--surface-accent)] hover:border-[var(--primary)] border border-[var(--border)] rounded-md"
                        >
                            Editar
                        </button>
                    </div>

                    {/* Giant Price Box */}
                    <div className="bg-[var(--surface-accent)] border border-[var(--border)] rounded-md p-4 text-center mb-3">
                        <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">Precio al Público</p>
                        <p className="text-3xl font-black font-mono text-[var(--primary)] tracking-tight">
                            {formatCurrency(activeProduct.sale_price)}
                        </p>
                        {activeProduct.promo_quantity && Number(activeProduct.promo_price) > 0 && (
                            <p className="text-xs text-emerald-400 font-bold mt-1.5">
                                Promo: {activeProduct.promo_quantity}x {formatCurrency(activeProduct.promo_price)}
                            </p>
                        )}
                    </div>

                    {/* Stock & Cost Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-[var(--surface-accent)]/50 border border-[var(--border)] rounded-md">
                            <span className="text-[var(--text-secondary)] block text-[10px]">Stock Disponible:</span>
                            <span className={`font-bold text-sm ${
                                activeProduct.stock <= 0 ? "text-rose-400" : activeProduct.stock <= 3 ? "text-amber-400" : "text-[var(--text-primary)]"
                            }`}>
                                {activeProduct.stock !== null ? `${activeProduct.stock} u.` : "No controlado"}
                            </span>
                        </div>

                        <div className="p-2.5 bg-[var(--surface-accent)]/50 border border-[var(--border)] rounded-md">
                            <span className="text-[var(--text-secondary)] block text-[10px]">Costo Unitario:</span>
                            <span className="font-bold text-sm text-[var(--text-primary)] font-mono">
                                {activeProduct.cost_price ? formatCurrency(activeProduct.cost_price) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Unregistered Code Card */}
            {unregisteredInfo && (
                <div className="bg-[var(--surface)] border border-amber-500/40 rounded-md p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Código no registrado</span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mb-2 font-mono">
                        Código: {unregisteredInfo.barcode}
                    </p>

                    {unregisteredInfo.national ? (
                        <div className="p-2.5 bg-[var(--surface-accent)] border border-[var(--border)] rounded-md mb-3">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                                {unregisteredInfo.national.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                Rubro: {unregisteredInfo.national.category}
                            </p>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => {
                            setNewBarcode(unregisteredInfo.barcode);
                            setNewName(unregisteredInfo.national?.name || "");
                            setProductToEdit(null);
                            setIsProductModalOpen(true);
                        }}
                        className="w-full py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-md shadow-xs"
                    >
                        + Crear Producto en Catálogo
                    </button>
                </div>
            )}

            {/* Empty Helper State */}
            {!activeProduct && !unregisteredInfo && !query.trim() && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-secondary)]">
                    <div className="w-16 h-16 rounded-full bg-[var(--surface-accent)] border border-[var(--border)] flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-[var(--primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Listo para consultar</p>
                    <p className="text-xs max-w-xs mt-1">
                        Tocá el botón de cámara para escanear el código de barras en la góndola o escribí en el buscador.
                    </p>
                </div>
            )}

            {/* Fullscreen Camera Scanner */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <MobileCameraScanner
                        onScan={(code) => {
                            setIsScannerOpen(false);
                            handleLookupBarcode(code);
                        }}
                        onClose={() => setIsScannerOpen(false)}
                        title="Verificador de Precios"
                        subtitle="Apuntá al código para consultar el precio"
                        continuous={false}
                    />
                </div>
            )}

            {/* Product Create / Edit Modal */}
            {isProductModalOpen && (
                <ProductModal
                    isOpen={isProductModalOpen}
                    product={productToEdit}
                    initialBarcode={newBarcode}
                    initialName={newName}
                    categories={categories}
                    providers={[]}
                    onClose={() => {
                        setIsProductModalOpen(false);
                        setProductToEdit(null);
                        setNewBarcode("");
                        setNewName("");
                    }}
                    onSave={(savedProd) => {
                        setProducts(prev => {
                            const exists = prev.some(p => p.id === savedProd.id);
                            return exists ? prev.map(p => p.id === savedProd.id ? savedProd : p) : [savedProd, ...prev];
                        });
                        setActiveProduct(savedProd);
                        setUnregisteredInfo(null);
                        setIsProductModalOpen(false);
                        toast.success("Producto guardado correctamente.");
                    }}
                />
            )}
        </div>
    );
}

export default SimplePriceChecker;

