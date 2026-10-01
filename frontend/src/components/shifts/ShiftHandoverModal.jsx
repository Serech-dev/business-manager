import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { getEmployees, handoverShift } from "../../services/business";
import { useShift } from "../../context/ShiftContext";

function ShiftHandoverModal({ isOpen, onClose }) {
    const { activeShift, refreshActiveShift } = useShift();
    const [employees, setEmployees] = useState([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    const [declaredCash, setDeclaredCash] = useState("");
    const [nextEmployeeId, setNextEmployeeId] = useState("");
    const [nextInitialCash, setNextInitialCash] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refresh shift data as soon as modal opens
    useEffect(() => {
        if (isOpen) {
            refreshActiveShift();
        }
    }, [isOpen, refreshActiveShift]);

    // Load active employees and set initial fields on open or when activeShift loads
    useEffect(() => {
        if (!isOpen) return;

        setIsLoadingEmployees(true);
        getEmployees(true)
            .then((data) => {
                setEmployees(data || []);
                // If there's only one employee, or none, default accordingly
                if (data && data.length > 0) {
                    // Default next employee to someone different from active if possible
                    const other = data.find((e) => e.id !== activeShift?.employee);
                    setNextEmployeeId(other ? String(other.id) : String(data[0].id));
                }
            })
            .catch((err) => {
                console.error("Error cargando lista de empleados:", err);
            })
            .finally(() => {
                setIsLoadingEmployees(false);
            });

        // Pre-fill declared cash with expected if available
        if (activeShift?.expected_cash !== undefined && activeShift?.expected_cash !== null) {
            const exp = String(Math.round(Number(activeShift.expected_cash) || 0));
            setDeclaredCash(exp);
            setNextInitialCash(exp);
        } else {
            setDeclaredCash("");
            setNextInitialCash("");
        }
        setNotes("");
    }, [isOpen, activeShift]);

    // Handle Escape key
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    const expectedCashNum = Number(activeShift?.expected_cash) || 0;
    const declaredCashNum = declaredCash !== "" ? Number(declaredCash) : expectedCashNum;
    const diff = declaredCashNum - expectedCashNum;

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                declared_cash: declaredCash !== "" ? Number(declaredCash) : expectedCashNum,
                next_employee_id: nextEmployeeId ? Number(nextEmployeeId) : null,
                next_initial_cash: nextInitialCash !== "" ? Number(nextInitialCash) : (declaredCash !== "" ? Number(declaredCash) : 0),
                notes: notes.trim(),
            };

            await handoverShift(payload);
            await refreshActiveShift();

            if (diff === 0) {
                toast.success("Turno entregado. Caja exacta sin diferencias.");
            } else if (diff > 0) {
                toast.success(`Turno entregado con sobrante de ${formatCurrency(diff)}.`);
            } else {
                toast.error(`Turno entregado con faltante de ${formatCurrency(Math.abs(diff))}.`, {
                    duration: 5000,
                });
            }

            onClose();
        } catch (error) {
            console.error("Error en cambio de turno:", error);
            const msg = error.response?.data?.detail || "No se pudo realizar el cambio de turno.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-handover-title"
        >
            <div
                className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--surface-accent)] border border-[var(--border)] text-[var(--primary)]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                                Control de Caja
                            </p>
                            <h2 id="shift-handover-title" className="text-lg font-bold text-[var(--text-primary)]">
                                Control & Cambio de Turno
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] transition"
                        aria-label="Cerrar ventana"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Active shift summary */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                                    Cajero saliente
                                </span>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                    {activeShift?.employee_name || "General (Sin asignar)"}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                                    Ventas en turno
                                </span>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                    {formatCurrency(Number(activeShift?.total_sales) || 0)}
                                    <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">
                                        ({activeShift?.transaction_count || 0} tickets)
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                            <div>
                                <span className="text-[10px] text-[var(--text-secondary)] block">Fondo inicial:</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                    {formatCurrency(Number(activeShift?.initial_cash) || 0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-[var(--text-secondary)] block">Efectivo cobrado:</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                    {formatCurrency(Number(activeShift?.cash_sales) || 0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-[var(--text-secondary)] block font-bold">Esperado en caja:</span>
                                <span className="font-bold text-[var(--primary)]">
                                    {formatCurrency(expectedCashNum)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Step 1: Conteo de caja */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Efectivo contado en caja
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                $
                            </span>
                            <MoneyInput
                                value={declaredCash}
                                onChange={(e) => {
                                    setDeclaredCash(e.target.value);
                                    if (nextInitialCash === declaredCash) {
                                        setNextInitialCash(e.target.value);
                                    }
                                }}
                                placeholder={String(expectedCashNum)}
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-base font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        {/* Discrepancy indicator */}
                        <div
                            className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold ${
                                diff === 0
                                    ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
                                    : diff > 0
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]"
                            }`}
                        >
                            <span>Diferencia en caja:</span>
                            <span className="font-bold tabular-nums">
                                {diff === 0
                                    ? "Caja exacta ($0)"
                                    : diff > 0
                                    ? `Sobrante: +${formatCurrency(diff)}`
                                    : `Faltante: -${formatCurrency(Math.abs(diff))}`}
                            </span>
                        </div>
                    </div>

                    {/* Step 2: Next Cashier Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Cajero entrante
                            </label>
                            <div className="relative">
                                <select
                                    value={nextEmployeeId}
                                    onChange={(e) => setNextEmployeeId(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                >
                                    <option value="">General (Sin asignar)</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} {emp.role ? `(${emp.role})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Fondo inicial nuevo turno
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    value={nextInitialCash}
                                    onChange={(e) => setNextInitialCash(e.target.value)}
                                    placeholder="0"
                                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Notas del cambio de turno (opcional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Se retiraron $10.000 para cambio chico, etc."
                            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span>Cambiando turno...</span>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                    <span>Confirmar Cambio de Turno</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ShiftHandoverModal;
