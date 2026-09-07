import { useState } from "react";
import toast from "react-hot-toast";
import { bulkAssignProductProvider } from "../../services/business";

function AssignProviderModal({
    isOpen,
    onClose,
    selectedIds = [],
    providers = [],
    onSuccess,
    onOpenProviderModal,
}) {
    const [selectedProviderId, setSelectedProviderId] = useState(
        providers.length > 0 ? String(providers[0].id) : ""
    );
    const [actionType, setActionType] = useState("assign"); // "assign" | "unassign"
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        if (selectedIds.length === 0) {
            toast.error("No hay productos seleccionados.");
            return;
        }

        if (actionType === "assign" && !selectedProviderId) {
            toast.error("Seleccioná un proveedor.");
            return;
        }

        setIsSubmitting(true);
        try {
            const providerIdToSend = actionType === "assign" ? Number(selectedProviderId) : null;
            const res = await bulkAssignProductProvider(selectedIds, providerIdToSend);
            toast.success(res.message || "Proveedor actualizado correctamente.");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error bulk assigning provider:", error);
            toast.error("Error al asignar proveedor.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.199l-4.228-4.228a4.5 4.5 0 1 0-1.06 1.06l4.228 4.228zm-8.08-4.228A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1-4.228 6.992z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">
                                Asignar Proveedor en Lote
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {selectedIds.length} producto{selectedIds.length === 1 ? "" : "s"} seleccionado{selectedIds.length === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* Action mode radio options */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setActionType("assign")}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center text-xs font-semibold transition ${
                                actionType === "assign"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Asignar Proveedor</span>
                            <span className="text-[10px] font-normal opacity-70">
                                Vincular a un distribuidor
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActionType("unassign")}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center text-xs font-semibold transition ${
                                actionType === "unassign"
                                    ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)] ring-1 ring-[var(--danger)]"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Desvincular</span>
                            <span className="text-[10px] font-normal opacity-70">
                                Dejar sin proveedor
                            </span>
                        </button>
                    </div>

                    {actionType === "assign" && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="assign-provider-select"
                                    className="text-xs font-semibold text-[var(--text-primary)]"
                                >
                                    Seleccionar Proveedor
                                </label>
                                {onOpenProviderModal && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            onOpenProviderModal();
                                        }}
                                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                                    >
                                        + Nuevo Proveedor
                                    </button>
                                )}
                            </div>

                            {providers.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        No tenés proveedores registrados aún.
                                    </p>
                                    {onOpenProviderModal && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onOpenProviderModal();
                                            }}
                                            className="mt-2 text-xs font-bold text-[var(--primary)] hover:underline"
                                        >
                                            Crear primer proveedor
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <select
                                    id="assign-provider-select"
                                    value={selectedProviderId}
                                    onChange={(e) => setSelectedProviderId(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.phone ? `(${p.phone})` : ""}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {actionType === "unassign" && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/50 p-3.5 text-xs text-[var(--text-secondary)]">
                            Se removerá el proveedor asignado a los <span className="font-bold text-[var(--text-primary)]">{selectedIds.length}</span> productos seleccionados. Los productos seguirán existiendo en tu catálogo.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (actionType === "assign" && providers.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Guardando...</span>
                                </>
                            ) : actionType === "assign" ? (
                                `Asignar a ${selectedIds.length} producto${selectedIds.length === 1 ? "" : "s"}`
                            ) : (
                                `Desvincular ${selectedIds.length} producto${selectedIds.length === 1 ? "" : "s"}`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AssignProviderModal;
