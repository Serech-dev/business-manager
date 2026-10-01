import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { createEmployeeMovement } from "../../services/business";

function EmployeeMovementModal({ isOpen, onClose, employeeId, employeeName, defaultType = "advance", onSuccess }) {
    const [type, setType] = useState(defaultType);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setType(defaultType);
        setAmount("");
        setNotes("");
    }, [isOpen, defaultType]);

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

    async function handleSubmit(e) {
        e.preventDefault();
        const amtNum = Number(amount) || 0;
        if (amtNum <= 0) {
            toast.error("Ingresá un monto válido mayor a $0.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                type,
                amount: amtNum,
                notes: notes.trim(),
            };

            await createEmployeeMovement(employeeId, payload);
            toast.success("Movimiento registrado en la cuenta del empleado.");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error registrando movimiento:", error);
            const msg = error.response?.data?.detail || "No se pudo registrar el movimiento.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    const typeTitle = {
        advance: "Registrar Adelanto de Sueldo",
        consumption: "Registrar Consumo en Local",
        bonus: "Registrar Bono o Premio",
        deduction: "Registrar Descuento o Sanción",
    }[type] || "Nuevo Movimiento";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="movement-modal-title"
        >
            <div
                className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            {employeeName}
                        </p>
                        <h2 id="movement-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                            {typeTitle}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] transition"
                        aria-label="Cerrar modal"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Movement type selector */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Tipo de Movimiento
                        </label>
                        <div className="relative">
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            >
                                <option value="advance">Adelanto (se descuenta del sueldo)</option>
                                <option value="consumption">Consumo interno (se descuenta del sueldo)</option>
                                <option value="bonus">Bono / Premio (se suma al sueldo)</option>
                                <option value="deduction">Descuento / Sanción (se descuenta del sueldo)</option>
                            </select>
                            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Monto ($) *
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                $
                            </span>
                            <MoneyInput
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-base font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Detalle / Concepto
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Adelanto para viáticos quincenales, golosinas, etc."
                            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Actions */}
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
                            {isSubmitting ? <span>Guardando...</span> : <span>Registrar</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeMovementModal;
