import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { filterAndRankProducts } from "../../utils/productSearch";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatStockQty, formatUnitType } from "../../utils/formatStock";

/**
 * Reusable Product Select Search Input.
 * - Stays closed by default.
 * - Opens dropdown popup only when the merchant starts typing (matching POS search).
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Esc).
 * - Compact selected state with quick change/clear action.
 */
function ProductSelectSearch({
    products = [],
    value = null, // selected productId
    onChange, // (productId, productObj) => void
    placeholder = "Escribir nombre o código de barras...",
    disabled = false,
    autoFocus = false,
    filterOptions = {},
    showStock = true,
    showPrice = true,
    className = "",
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Selected product object
    const selectedProduct = useMemo(() => {
        if (!value) return null;
        return products.find((p) => String(p.id) === String(value)) || null;
    }, [products, value]);

    // Matching results filtered by search query
    const results = useMemo(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) return [];
        return filterAndRankProducts(products, trimmed, {
            ...filterOptions,
            maxResults: 15,
        });
    }, [products, searchQuery, filterOptions]);

    // Reset index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsEditing(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = useCallback(
        (product) => {
            if (onChange) {
                onChange(product ? product.id : "", product || null);
            }
            setSearchQuery("");
            setIsOpen(false);
            setIsEditing(false);
        },
        [onChange]
    );

    const handleClear = useCallback(() => {
        if (onChange) {
            onChange("", null);
        }
        setSearchQuery("");
        setIsOpen(false);
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 30);
    }, [onChange]);

    function handleStartChange() {
        setIsEditing(true);
        setSearchQuery("");
        setIsOpen(false);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 30);
    }

    function handleKeyDown(e) {
        if (!isOpen || results.length === 0) {
            if (e.key === "Escape") {
                setIsOpen(false);
                setIsEditing(false);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
            setIsEditing(false);
        }
    }

    // If a product is selected and we're not actively editing
    if (selectedProduct && !isEditing) {
        return (
            <div
                className={`flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/50 px-3 py-2 text-xs transition ${className}`}
            >
                <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] truncate">
                            {selectedProduct.name}
                        </span>
                        {selectedProduct.is_bundle && (
                            <span className="shrink-0 rounded-sm bg-[var(--primary)]/15 px-1 py-0.2 text-[9px] font-bold text-[var(--primary)]">
                                Combo
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] mt-0.5 flex-wrap">
                        {selectedProduct.barcode && (
                            <span className="font-mono">{selectedProduct.barcode}</span>
                        )}
                        {showStock && (
                            <span>
                                Stock: <strong className="text-[var(--text-primary)]">{selectedProduct.stock !== null ? `${formatStockQty(selectedProduct.stock, selectedProduct.unit_type)} ${formatUnitType(selectedProduct.unit_type, false, selectedProduct.stock)}` : "Sin seguimiento"}</strong>
                            </span>
                        )}
                        {showPrice && Number(selectedProduct.cost_price) > 0 && (
                            <span>
                                Costo: <strong className="text-[var(--text-primary)]">{formatCurrency(selectedProduct.cost_price)}</strong>
                            </span>
                        )}
                        {showPrice && Number(selectedProduct.sale_price) > 0 && (
                            <span>
                                Venta: <strong className="text-[var(--text-primary)]">{formatCurrency(selectedProduct.sale_price)}</strong>
                            </span>
                        )}
                    </div>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={handleStartChange}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                        >
                            Cambiar
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Quitar selección"
                            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)] transition"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                {/* Search icon */}
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        setIsOpen(Boolean(val.trim()));
                    }}
                    onFocus={() => {
                        if (searchQuery.trim()) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 shadow-xs outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 disabled:opacity-50"
                />

                {/* Clear / Cancel button */}
                {searchQuery ? (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery("");
                            setIsOpen(false);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition"
                    >
                        ✕
                    </button>
                ) : selectedProduct && isEditing ? (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                    >
                        Cancelar
                    </button>
                ) : null}
            </div>

            {/* DROPDOWN RESULTS (ONLY WHEN TYPING) */}
            {isOpen && Boolean(searchQuery.trim()) && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl divide-y divide-[var(--border)] text-xs animate-fadeIn">
                    {results.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                            No se encontraron productos para &quot;{searchQuery}&quot;
                        </div>
                    ) : (
                        results.map((p, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${
                                        isSelected
                                            ? "bg-[var(--primary)]/10 text-[var(--text-primary)]"
                                            : "hover:bg-[var(--surface-accent)] text-[var(--text-primary)]"
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold truncate">{p.name}</span>
                                            {p.is_bundle && (
                                                <span className="shrink-0 rounded-sm bg-[var(--primary)]/15 px-1 py-0.2 text-[9px] font-bold text-[var(--primary)]">
                                                    Combo
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                                            {p.category_name && <span>{p.category_name}</span>}
                                            {p.barcode && <span className="font-mono">{p.barcode}</span>}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        {showPrice && Number(p.sale_price) > 0 && (
                                            <div className="font-bold text-[var(--text-primary)]">
                                                {formatCurrency(p.sale_price)}
                                            </div>
                                        )}
                                        {showStock && (
                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                {p.stock !== null ? `Stock: ${formatStockQty(p.stock, p.unit_type)}` : "Sin seg."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export default ProductSelectSearch;

