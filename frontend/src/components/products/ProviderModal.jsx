import { useState } from "react";
import toast from "react-hot-toast";
import { createProvider, deleteProvider } from "../../services/business";

function ProviderModal({ isOpen, onClose, providers = [], onProvidersChange }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    if (!isOpen) return null;

    async function handleCreate(e) {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const newProv = await createProvider({
                name: name.trim(),
                phone: phone.trim() || undefined,
            });
            toast.success("Proveedor creado.");
            setName("");
            setPhone("");
            onProvidersChange?.([...providers, newProv]);
        } catch (error) {
            console.error(error);
            const msg =
                error.response?.data?.name?.[0] ||
                error.response?.data?.detail ||
                "No se pudo crear el proveedor.";
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(id, providerName) {
        if (!window.confirm(`¿Eliminar proveedor "${providerName}"?`)) {
            return;
        }

        setDeletingId(id);
        try {
            await deleteProvider(id);
            toast.success("Proveedor eliminado.");
            onProvidersChange?.(providers.filter((p) => p.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el proveedor.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Proveedores
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Gestioná tus proveedores de mercadería
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        ✕
                    </button>
                </div>

                {/* FORM ADD PROVIDER */}
                <form onSubmit={handleCreate} className="mt-4 space-y-2.5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre (ej: Distribuidora Norte, Arcor...)"
                            maxLength={150}
                            required
                            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)]"
                        />
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Tel / WhatsApp (opc.)"
                            maxLength={50}
                            className="w-40 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)]"
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !name.trim()}
                            className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isCreating ? "..." : "+ Agregar"}
                        </button>
                    </div>
                </form>

                {/* PROVIDERS LIST */}
                <div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {providers.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
                            No tenés proveedores registrados todavía.
                        </p>
                    ) : (
                        providers.map((prov) => (
                            <div
                                key={prov.id}
                                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/50 px-3.5 py-2.5"
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                        {prov.name}
                                    </span>
                                    {prov.phone && (
                                        <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                                            {prov.phone}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(prov.id, prov.name)}
                                        disabled={deletingId === prov.id}
                                        className="rounded-md px-2 py-1 text-xs text-[var(--danger)] transition hover:bg-[var(--danger)]/10 disabled:opacity-50"
                                        title="Eliminar proveedor"
                                    >
                                        {deletingId === prov.id ? "..." : "Eliminar"}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProviderModal;

