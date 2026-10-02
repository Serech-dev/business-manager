import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MoneyInput from "../MoneyInput";
import { createEmployee, updateEmployee, deleteEmployee } from "../../services/business";

function EmployeeModal({ isOpen, onClose, employee, onSuccess }) {
    const isEditing = Boolean(employee?.id);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [salaryType, setSalaryType] = useState("monthly");
    const [baseSalary, setBaseSalary] = useState("");
    const [discountPercentage, setDiscountPercentage] = useState("0");
    const [isActive, setIsActive] = useState(true);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        if (employee) {
            setName(employee.name || "");
            setPhone(employee.phone || "");
            setEmail(employee.email || "");
            setRole(employee.role || "");
            setSalaryType(employee.salary_type || "monthly");
            setBaseSalary(employee.base_salary ? String(Math.round(Number(employee.base_salary))) : "");
            setDiscountPercentage(employee.discount_percentage ? String(Number(employee.discount_percentage)) : "0");
            setIsActive(employee.is_active !== undefined ? employee.is_active : true);
            setNotes(employee.notes || "");
        } else {
            setName("");
            setPhone("");
            setEmail("");
            setRole("");
            setSalaryType("monthly");
            setBaseSalary("");
            setDiscountPercentage("0");
            setIsActive(true);
            setNotes("");
        }
    }, [isOpen, employee]);

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

        if (!name.trim()) {
            toast.error("El nombre del empleado es obligatorio.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                role: role.trim(),
                salary_type: salaryType,
                base_salary: baseSalary !== "" ? Number(baseSalary) : 0,
                discount_percentage: discountPercentage !== "" ? Number(discountPercentage) : 0,
                is_active: isActive,
                notes: notes.trim(),
            };

            let saved;
            if (isEditing) {
                saved = await updateEmployee(employee.id, payload);
                toast.success("Empleado actualizado con éxito.");
            } else {
                saved = await createEmployee(payload);
                toast.success("Empleado registrado con éxito.");
            }

            onSuccess?.(saved);
            onClose();
        } catch (error) {
            console.error("Error guardando empleado:", error);
            const msg = error.response?.data?.detail || "No se pudo guardar la información del empleado.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!window.confirm(`¿Eliminar al empleado ${name || employee?.name}? Esta acción eliminará su ficha y registros asociados.`)) {
            return;
        }
        setIsSubmitting(true);
        try {
            await deleteEmployee(employee.id);
            toast.success("Empleado eliminado con éxito.");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error al eliminar empleado:", error);
            toast.error("No se pudo eliminar el empleado.");
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
            aria-labelledby="employee-modal-title"
        >
            <div
                className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            {isEditing ? "Modificar Ficha" : "Nuevo Registro"}
                        </p>
                        <h2 id="employee-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                            {isEditing ? "Editar Empleado" : "Registrar Empleado"}
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
                    {/* Basic details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Nombre completo *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Lucas González"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Puesto / Rol
                            </label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="Ej: Cajero turno tarde"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Teléfono / WhatsApp
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej: 11 2345-6789"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="empleado@correo.com"
                                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Salary & Discounts */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                            Sueldo & Descuentos de Empleado
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                                    Forma de Pago
                                </label>
                                <div className="relative">
                                    <select
                                        value={salaryType}
                                        onChange={(e) => setSalaryType(e.target.value)}
                                        className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-7 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value="monthly">Mensual</option>
                                        <option value="daily">Por día / Jornal</option>
                                        <option value="hourly">Por hora</option>
                                        <option value="fixed">Monto fijo / Por turno</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                                    Sueldo Acordado ($)
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        value={baseSalary}
                                        onChange={(e) => setBaseSalary(e.target.value)}
                                        placeholder="0"
                                        className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-6 pr-2.5 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                                    Descuento en compras (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discountPercentage}
                                        onChange={(e) => setDiscountPercentage(e.target.value)}
                                        placeholder="0"
                                        className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-6 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    />
                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                        %
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                            El porcentaje de descuento se aplica automáticamente cuando el empleado consume del negocio en la caja.
                        </p>
                    </div>

                    {/* Status & Notes */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="h-4 w-4 rounded-sm border border-[var(--border)] bg-[var(--background)] peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] flex items-center justify-center transition">
                                {isActive && (
                                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                Empleado activo (disponible para asignación de turnos en caja)
                            </span>
                        </label>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Notas u observaciones internas
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Días pactados, horarios habituales, etc."
                                className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                        <div>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="text-xs font-semibold text-[var(--danger)]/80 hover:text-[var(--danger)] transition cursor-pointer"
                                >
                                    Eliminar empleado
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
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
                                    <span>{isEditing ? "Guardar Cambios" : "Crear Empleado"}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeModal;
