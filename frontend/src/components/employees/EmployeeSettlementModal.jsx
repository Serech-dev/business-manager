import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { settleEmployeeSalary, getCurrentShift, getEmployeeSummary } from "../../services/business";

function formatCurrency(val) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(Number(val) || 0);
}

function EmployeeSettlementModal({ isOpen, onClose, employee, summary: initialSummary, onSuccess }) {
    const [periodLabel, setPeriodLabel] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [payFromRegister, setPayFromRegister] = useState(true);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeShift, setActiveShift] = useState(null);
    const [currentSummary, setCurrentSummary] = useState(initialSummary || null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const now = new Date();
        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        setPeriodLabel(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
        setPaymentMethod("cash");
        setPayFromRegister(true);
        setNotes("");

        if (initialSummary) {
            setCurrentSummary(initialSummary);
            setAmount(initialSummary?.net_payable !== undefined ? String(Math.max(0, Number(initialSummary.net_payable))) : "");
        } else if (employee?.id) {
            setIsLoadingSummary(true);
            getEmployeeSummary(employee.id)
                .then((data) => {
                    setCurrentSummary(data);
                    setAmount(data?.net_payable !== undefined ? String(Math.max(0, Number(data.net_payable))) : "");
                })
                .catch((err) => {
                    console.error("Error loading employee summary:", err);
                    setCurrentSummary(null);
                })
                .finally(() => setIsLoadingSummary(false));
        }

        getCurrentShift()
            .then((data) => {
                if (data?.active_shift) {
                    setActiveShift(data.active_shift);
                } else {
                    setActiveShift(null);
                    setPayFromRegister(false);
                }
            })
            .catch(() => setActiveShift(null));
    }, [isOpen, initialSummary, employee]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !employee) return null;

    const baseEarnings = Number(currentSummary?.base_earnings) || 0;
    const bonuses = Number(currentSummary?.bonuses_total) || 0;
    const advances = Number(currentSummary?.advances_total) || 0;
    const consumptions = Number(currentSummary?.consumptions_total) || 0;
    const deductions = Number(currentSummary?.deductions_total) || 0;
    const calculatedNet = Number(currentSummary?.net_payable) || 0;

    async function handleSubmit(e) {
        e.preventDefault();
        const amtNum = Number(amount) || 0;
        if (amtNum < 0) {
            toast.error("El monto a liquidar no puede ser negativo.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                amount: amtNum,
                payment_method: paymentMethod,
                pay_from_register: paymentMethod === "cash" && payFromRegister,
                period_label: periodLabel.trim(),
                notes: notes.trim(),
            };

            await settleEmployeeSalary(employee.id, payload);
            toast.success("Liquidación completada. El balance pendiente se reinició a $0.");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error liquidando sueldo:", error);
            const msg = error.response?.data?.detail || "No se pudo procesar la liquidación.";
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
            aria-labelledby="settlement-modal-title"
        >
            <div
                className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            {employee.name} &bull; {employee.role || "Personal general"}
                        </p>
                        <h2 id="settlement-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                            Liquidar & Pagar Sueldo
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
                    {/* Period Input */}
                    <div>
                        <label htmlFor="period-input" className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                            Período de Liquidación
                        </label>
                        <input
                            id="period-input"
                            type="text"
                            value={periodLabel}
                            onChange={(e) => setPeriodLabel(e.target.value)}
                            placeholder="Ej. Septiembre 2026, Quincena 1..."
                            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Breakdown Receipt Summary */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/40 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">
                            <span>Concepto</span>
                            <span>Monto</span>
                        </div>

                        <div className="flex items-center justify-between text-[var(--text-primary)]">
                            <span>Sueldo Base acordado</span>
                            <span className="font-bold tabular-nums">+{formatCurrency(baseEarnings)}</span>
                        </div>

                        {bonuses > 0 && (
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Bonos & Premios acumulados</span>
                                <span className="font-bold tabular-nums">+{formatCurrency(bonuses)}</span>
                            </div>
                        )}

                        {advances > 0 && (
                            <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                                <span>Adelantos entregados</span>
                                <span className="font-bold tabular-nums">-{formatCurrency(advances)}</span>
                            </div>
                        )}

                        {consumptions > 0 && (
                            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                <span>Consumos en local</span>
                                <span className="font-bold tabular-nums">-{formatCurrency(consumptions)}</span>
                            </div>
                        )}

                        {deductions > 0 && (
                            <div className="flex items-center justify-between text-[var(--danger)]">
                                <span>Otros descuentos / faltantes</span>
                                <span className="font-bold tabular-nums">-{formatCurrency(deductions)}</span>
                            </div>
                        )}

                        <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between font-black text-sm text-[var(--primary)]">
                            <span>Total Neto Calculado</span>
                            <span className="tabular-nums">{formatCurrency(calculatedNet)}</span>
                        </div>
                    </div>

                    {/* Final Payment Amount Input */}
                    <div>
                        <label htmlFor="settlement-amount-input" className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                            Monto a Entregar / Liquidar ($)
                        </label>
                        <MoneyInput
                            id="settlement-amount-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="h-10 w-full rounded-md border-2 border-[var(--primary)] bg-[var(--background)] px-3 text-base font-black tabular-nums text-[var(--primary)] outline-none"
                            autoFocus
                        />
                        <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                            Podés ajustar el monto final si hubo redondeo o acuerdo particular.
                        </span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">
                            Medio de Pago
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("cash")}
                                className={`flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-bold transition ${
                                    paymentMethod === "cash"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                <span>Efectivo</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod("transfer")}
                                className={`flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-bold transition ${
                                    paymentMethod === "transfer"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.25 19.5Z" />
                                </svg>
                                <span>Transferencia</span>
                            </button>
                        </div>
                    </div>

                    {/* Pay from Register Option (Themed Custom SVG Checkbox) */}
                    {paymentMethod === "cash" && (
                        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={payFromRegister && !!activeShift}
                                    disabled={!activeShift}
                                    onClick={() => activeShift && setPayFromRegister(!payFromRegister)}
                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition ${
                                        payFromRegister && activeShift
                                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                            : "border-[var(--border)] bg-[var(--background)]"
                                    } ${!activeShift ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {payFromRegister && activeShift && (
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    )}
                                </button>
                                <div className="text-xs">
                                    <span className="font-bold text-[var(--text-primary)]">
                                        Registrar salida de dinero en caja
                                    </span>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                        {activeShift
                                            ? `Descontará ${formatCurrency(amount)} del Turno de Caja actual (#${activeShift.id}) como egreso.`
                                            : "No hay una caja abierta en este momento. El pago se registrará únicamente en la ficha del empleado."}
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Notes Input */}
                    <div>
                        <label htmlFor="settlement-notes-input" className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                            Notas u Observaciones (Opcional)
                        </label>
                        <input
                            id="settlement-notes-input"
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Entregado en mano con recibo firmado..."
                            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Reset Notice */}
                    <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5 text-[11px] text-sky-700 dark:text-sky-300 flex items-start gap-2">
                        <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        <span>
                            Al confirmar, todos los adelantos, consumos y jornadas del período se marcarán como liquidados y el saldo pendiente del empleado se reiniciará a <strong>$0 (Al día)</strong>.
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-5 py-2 text-xs font-bold text-[var(--primary-text)] hover:opacity-90 transition disabled:opacity-50 shadow-xs"
                        >
                            {isSubmitting ? (
                                <span>Procesando...</span>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                    <span>Confirmar y Liquidar {formatCurrency(amount)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeSettlementModal;

