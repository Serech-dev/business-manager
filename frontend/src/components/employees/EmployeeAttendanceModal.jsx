import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { createEmployeeAttendance } from "../../services/business";

function EmployeeAttendanceModal({ isOpen, onClose, employeeId, employeeName, employees = [], defaultStatus = "absent", onSuccess }) {
    const todayStr = new Date().toISOString().split("T")[0];
    const [selectedEmpId, setSelectedEmpId] = useState(employeeId || (employees[0]?.id || ""));
    const [date, setDate] = useState(todayStr);
    const [status, setStatus] = useState(defaultStatus);
    const [hoursWorked, setHoursWorked] = useState(defaultStatus === "absent" ? "0" : "8");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedEmpId(employeeId || (employees[0]?.id || ""));
        setDate(todayStr);
        setStatus(defaultStatus);
        setHoursWorked(defaultStatus === "absent" ? "0" : (defaultStatus === "late" ? "6" : "8"));
        setNotes("");
    }, [isOpen, employeeId, employees, defaultStatus, todayStr]);

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
        const targetId = employeeId || selectedEmpId;
        if (!targetId) {
            toast.error("Seleccioná un empleado.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                date,
                status,
                hours_worked: hoursWorked !== "" ? Number(hoursWorked) : null,
                notes: notes.trim(),
            };

            await createEmployeeAttendance(targetId, payload);
            const successMsg = status === "absent" || status === "justified"
                ? "Falta registrada en el historial del empleado."
                : status === "late"
                ? "Llegada tarde registrada con éxito."
                : "Asistencia registrada correctamente.";
            toast.success(successMsg);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error registrando asistencia o falta:", error);
            const msg = error.response?.data?.detail || "No se pudo registrar la novedad.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    const titleMap = {
        absent: "Anotar Falta del Empleado",
        justified: "Anotar Falta Justificada (con aviso)",
        late: "Anotar Llegada Tarde",
        present: "Registrar Día Trabajado",
        day_off: "Anotar Franco / Descanso",
    };
    const title = titleMap[status] || "Control de Asistencia";

    const currentEmployeeLabel = employeeName || employees.find((e) => String(e.id) === String(selectedEmpId))?.name || "Personal";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-modal-title"
        >
            <div
                className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            {currentEmployeeLabel}
                        </p>
                        <h2 id="attendance-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                            {title}
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
                    {/* Employee Selector if not preselected */}
                    {!employeeId && employees.length > 0 && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Empleado *
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={selectedEmpId}
                                    onChange={(e) => setSelectedEmpId(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="" disabled>Seleccionar empleado...</option>
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
                    )}

                    {/* Date */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Fecha *
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Estado de Jornada
                        </label>
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => {
                                    const nextStatus = e.target.value;
                                    setStatus(nextStatus);
                                    if (nextStatus === "absent" || nextStatus === "day_off") {
                                        setHoursWorked("0");
                                    } else if (nextStatus === "late" && (hoursWorked === "0" || hoursWorked === "8")) {
                                        setHoursWorked("6");
                                    } else if (nextStatus === "present" && (hoursWorked === "0" || hoursWorked === "6")) {
                                        setHoursWorked("8");
                                    }
                                }}
                                className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            >
                                <option value="absent">Falta injustificada (no vino)</option>
                                <option value="late">Llegada tarde</option>
                                <option value="justified">Falta justificada (con aviso / certificado)</option>
                                <option value="present">Presente / Día trabajado</option>
                                <option value="day_off">Franco / Descanso</option>
                            </select>
                            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Hours worked */}
                    {status !== "absent" && status !== "day_off" && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Horas trabajadas
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={hoursWorked}
                                onChange={(e) => setHoursWorked(e.target.value)}
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Observaciones (opcional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Llegada 15 min tarde, certificado médico presentado, etc."
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
                            {isSubmitting ? (
                                <span>Guardando...</span>
                            ) : (
                                <span>
                                    {status === "absent" || status === "justified"
                                        ? "Registrar Falta"
                                        : status === "late"
                                        ? "Registrar Llegada Tarde"
                                        : "Guardar Asistencia"}
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeAttendanceModal;
