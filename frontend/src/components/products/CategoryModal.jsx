import { useState } from "react";
import toast from "react-hot-toast";
import { createCategory, deleteCategory } from "../../services/business";

function CategoryModal({ isOpen, onClose, categories, onCategoriesChange }) {
    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    if (!isOpen) return null;

    async function handleCreate(e) {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const newCat = await createCategory({ name: name.trim() });
            toast.success("Categoría creada.");
            setName("");
            onCategoriesChange([...categories, newCat]);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.name?.[0] || "No se pudo crear la categoría.";
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(id) {
        setDeletingId(id);
        try {
            await deleteCategory(id);
            toast.success("Categoría eliminada.");
            onCategoriesChange(categories.filter((c) => c.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar la categoría.");
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

            <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Categorías de Productos
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Organizá tu catálogo por rubros
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

                {/* FORM ADD CATEGORY */}
                <form onSubmit={handleCreate} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre (ej: Bebidas, Golosinas...)"
                        maxLength={100}
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--primary)]"
                    />
                    <button
                        type="submit"
                        disabled={isCreating || !name.trim()}
                        className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                        {isCreating ? "..." : "+ Agregar"}
                    </button>
                </form>

                {/* CATEGORIES LIST */}
                <div className="mt-5 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {categories.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[var(--text-secondary)]">
                            No tenés categorías creadas todavía.
                        </p>
                    ) : (
                        categories.map((cat) => (
                            <div
                                key={cat.id}
                                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-accent)]/50 px-3.5 py-2.5"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                        {cat.name}
                                    </span>
                                    <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
                                        {cat.products_count ?? 0} prods
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(cat.id)}
                                    disabled={deletingId === cat.id}
                                    className="rounded-md p-1 text-xs text-[var(--danger)] transition hover:bg-[var(--danger)]/10 disabled:opacity-50"
                                    title="Eliminar categoría"
                                >
                                    {deletingId === cat.id ? "..." : "Eliminar"}
                                </button>
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

export default CategoryModal;

