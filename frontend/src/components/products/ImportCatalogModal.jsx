import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { importStarterCatalog } from "../../services/business";

const PRESET_OPTIONS = [
    {
        id: "kiosco_bebidas",
        name: "Kiosco, Bebidas & Golosinas",
        count: "220+ productos",
        hasBarcodes: true,
        description: "Gaseosas, cervezas, alfajores, chocolates, snacks, golosinas y cigarrillos.",
        highlights: "Coca-Cola, Quilmes, Branca, Speed, Guaymallén, Lays, Marlboro...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
        ),
    },
    {
        id: "almacen_despensa",
        name: "Almacén & Despensa",
        count: "120+ productos",
        hasBarcodes: true,
        description: "Yerbas, aceites, harinas, fideos, arroz, condimentos, café y conservas.",
        highlights: "Playadito, Taragüi, Natura, Lucchetti, Pureza, La Campagnola, Dolca...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        ),
    },
    {
        id: "fiambreria_lacteos",
        name: "Fiambrería & Lácteos",
        count: "100+ productos",
        hasWeight: true,
        description: "Quesos y fiambres por peso (100g y kg), leches, manteca, yogures y tapas.",
        highlights: "Queso Cremoso, Barra Tybo, Jamón Cocido/Crudo, Leches, DDL, Tapas...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
            </svg>
        ),
    },
    {
        id: "verduleria_fruteria",
        name: "Verdulería & Frutería",
        count: "75 productos",
        hasWeight: true,
        description: "Papas, cebollas, tomates, bananas, manzanas y cítricos por kilo.",
        highlights: "Papa Negra, Tomate Redondo, Banana Ecuador, Manzanas, Lechuga, Palta...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
        ),
    },
    {
        id: "panaderia_confiteria",
        name: "Panadería & Confitería",
        count: "80 productos",
        hasWeight: true,
        description: "Pan francés, criollos, facturas, medialunas, chipá y sándwiches de miga.",
        highlights: "Pan Francés, Criollo/Mignon, Facturas, Medialunas, Chipá, Sándwiches...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        id: "limpieza_perfumeria",
        name: "Limpieza & Perfumería",
        count: "100+ productos",
        hasBarcodes: true,
        description: "Lavandinas, detergentes, skip, papel higiénico, desodorantes y shampoo.",
        highlights: "Ayudín, Magistral, Skip, Higienol, Rexona, Sedal, Colgate...",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
        ),
    },
];

function ImportCatalogModal({ isOpen, onClose, onSuccess }) {
    const [selectedPresets, setSelectedPresets] = useState(() =>
        PRESET_OPTIONS.map((p) => p.id)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedPresets(PRESET_OPTIONS.map((p) => p.id));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function handleTogglePreset(id) {
        setSelectedPresets((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    }

    function handleSelectAll() {
        setSelectedPresets(PRESET_OPTIONS.map((p) => p.id));
    }

    function handleDeselectAll() {
        setSelectedPresets([]);
    }

    async function handleConfirm() {
        if (selectedPresets.length === 0) {
            toast.error("Seleccioná al menos un rubro para importar.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await importStarterCatalog(selectedPresets);
            toast.success(
                `Catálogo importado: ${res.created_products} productos creados en ${res.created_categories} categorías.`
            );
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error importing starter catalog:", error);
            toast.error("No se pudo importar el catálogo base.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const allSelected = selectedPresets.length === PRESET_OPTIONS.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                                Cargar Catálogo Base por Rubro
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Importá listas de productos pre-configuradas con precios sugeridos y códigos de barras.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        ✕
                    </button>
                </div>

                {/* CONTROLS TOOLBAR */}
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">
                        {selectedPresets.length} de {PRESET_OPTIONS.length} rubros seleccionados
                    </span>
                    <div className="flex items-center gap-2">
                        {allSelected ? (
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="font-semibold text-[var(--primary)] hover:underline"
                            >
                                Deseleccionar todos
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="font-semibold text-[var(--primary)] hover:underline"
                            >
                                Seleccionar todos
                            </button>
                        )}
                    </div>
                </div>

                {/* PRESETS LIST / GRID */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {PRESET_OPTIONS.map((preset) => {
                            const isSelected = selectedPresets.includes(preset.id);

                            return (
                                <div
                                    key={preset.id}
                                    onClick={() => handleTogglePreset(preset.id)}
                                    className={`
                                        group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition select-none
                                        ${
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30"
                                                : "border-[var(--border)] bg-[var(--surface-accent)]/30 hover:border-[var(--border)] hover:bg-[var(--surface-accent)]/60"
                                        }
                                    `}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className={`
                                                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition
                                                        ${
                                                            isSelected
                                                                ? "bg-[var(--primary)] text-white"
                                                                : "bg-[var(--surface-accent)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                                                        }
                                                    `}
                                                >
                                                    {preset.icon}
                                                </span>
                                                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                                                    {preset.name}
                                                </h4>
                                            </div>

                                            {/* Custom Checkbox */}
                                            <span
                                                className={`
                                                    flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition
                                                    ${
                                                        isSelected
                                                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                                            : "border-[var(--border)] bg-[var(--surface)]"
                                                    }
                                                `}
                                            >
                                                {isSelected && (
                                                    <svg className="h-3 w-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </span>
                                        </div>

                                        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                            {preset.description}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]/50">
                                        <span className="rounded bg-[var(--surface-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-primary)]">
                                            {preset.count}
                                        </span>
                                        {preset.hasBarcodes && (
                                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                                                Códigos EAN-13
                                            </span>
                                        )}
                                        {preset.hasWeight && (
                                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                                                Venta por peso / kg
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SAFETY NOTICE */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3 text-[11px] text-[var(--text-secondary)] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--primary)]">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            <span>Importación segura y no destructiva</span>
                        </div>
                        <p>
                            No sobrescribe ni duplica productos que ya tengas creados. Podés cargar un rubro hoy y sumar otros cuando quieras sin perder tus precios personalizados.
                        </p>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmitting || selectedPresets.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            "Importando catálogo..."
                        ) : (
                            <>
                                <span>Importar {selectedPresets.length} rubro{selectedPresets.length === 1 ? "" : "s"}</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImportCatalogModal;
