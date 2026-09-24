import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";

export function DebtLimitAuthorizeModal({
    isOpen,
    onClose,
    onAuthorize,
    clientName = "Cliente",
    currentDebt = 0,
    saleDebt = 0,
    projectedDebt = 0,
    effectiveLimit = 0,
    isSubmitting = false,
}) {
    const [showBreakdown, setShowBreakdown] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setShowBreakdown(true);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const excessAmount = Math.max(0, projectedDebt - effectiveLimit);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
            <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">Límite de Fiado Superado</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Confirmación de crédito al cliente</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    {/* Informative Alert */}
                    <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                            <svg className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                                    Esta venta superará el límite de fiado fijado para <span className="text-amber-700 dark:text-amber-400 font-bold underline decoration-amber-500/40">{clientName}</span>.
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    ¿Deseás autorizar la operación de todas formas?
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Toggle Button */}
                    <div className="flex items-center justify-between pt-0.5">
                        <button
                            type="button"
                            onClick={() => setShowBreakdown((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer transition select-none"
                        >
                            <span>{showBreakdown ? "Ocultar desglose" : "Ver desglose"}</span>
                            <svg
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${showBreakdown ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {excessAmount > 0 && !showBreakdown && (
                            <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                Exceso: +{formatCurrency(excessAmount)}
                            </span>
                        )}
                    </div>

                    {/* Breakdown Card (Collapsible) */}
                    {showBreakdown && (
                        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/40 p-3.5 space-y-2 animate-fadeIn">
                            <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                <span>Deuda actual acumulada:</span>
                                <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(currentDebt)}</span>
                            </div>

                            <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                <span>Monto de esta venta a cuenta:</span>
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">+{formatCurrency(saleDebt)}</span>
                            </div>

                            <div className="h-px bg-[var(--border)] my-1" />

                            <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                                <span>Deuda proyectada:</span>
                                <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(projectedDebt)}</span>
                            </div>

                            <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                <span>Límite de fiado autorizado:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(effectiveLimit)}</span>
                            </div>

                            {excessAmount > 0 && (
                                <div className="flex items-center justify-between font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-[var(--border)]">
                                    <span>Excedente por encima del límite:</span>
                                    <span className="font-mono font-bold tabular-nums">+{formatCurrency(excessAmount)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] bg-[var(--surface-accent)] px-5 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={onAuthorize}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Autorizando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                <span>Autorizar Venta Fiada</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DebtLimitAuthorizeModal;

