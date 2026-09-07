import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { createStockNote, updateStockNote } from "../../services/business";

function StockNoteModal({
    isOpen,
    onClose,
    note = null,
    products = [],
    onSuccess,
}) {
    const isEditing = Boolean(note && note.id);

    const [noteType, setNoteType] = useState("missing"); // 'missing' | 'customer_request'
    const [itemName, setItemName] = useState("");
    const [productId, setProductId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [notes, setNotes] = useState("");
    const [statusVal, setStatusVal] = useState("pending");
    const [isSaving, setIsSaving] = useState(false);

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    useEffect(() => {
        if (isOpen) {
            if (note) {
                setNoteType(note.note_type || "missing");
                setItemName(note.item_name || "");
                setProductId(note.product ? String(note.product) : "");
                setCustomerName(note.customer_name || "");
                setNotes(note.notes || "");
                setStatusVal(note.status || "pending");
            } else {
                setNoteType("missing");
                setItemName("");
                setProductId("");
                setCustomerName("");
                setNotes("");
                setStatusVal("pending");
            }
        }
    }, [isOpen, note]);

    if (!isOpen) return null;

    function handleProductSelect(selectedId) {
        setProductId(selectedId);
        if (selectedId) {
            const p = products.find((prod) => String(prod.id) === String(selectedId));
            if (p && !itemName) {
                setItemName(p.name);
            }
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!itemName.trim()) {
            toast.error("Ingresá el nombre del artículo o producto pedido.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                item_name: itemName.trim(),
                note_type: noteType,
                product: productId ? Number(productId) : null,
                customer_name: customerName.trim(),
                notes: notes.trim(),
                status: statusVal,
            };

            if (isEditing) {
                await updateStockNote(note.id, payload);
                toast.success("Nota actualizada.");
            } else {
                await createStockNote(payload);
                toast.success("Nota guardada con éxito.");
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error saving stock note:", error);
            toast.error("No se pudo guardar la nota.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
            <div className="flex w-full max-w-lg flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            {isEditing ? "Editar Nota de Stock" : "Nueva Nota de Faltante o Pedido"}
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Anotá mercadería que falta comprar o pedidos especiales de clientes.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    {/* Note Type Toggle */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Tipo de Nota
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setNoteType("missing")}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-bold transition ${
                                    noteType === "missing"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                </svg>
                                <span>Faltante de Stock</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNoteType("customer_request")}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-bold transition ${
                                    noteType === "customer_request"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                                <span>Pedido de Cliente</span>
                            </button>
                        </div>
                    </div>

                    {/* Link Existing Product (Optional) */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Asociar a Producto Existente (Opcional)
                        </label>
                        <div className="relative">
                            <select
                                value={productId}
                                onChange={(e) => handleProductSelect(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-3.5 pr-9 py-2.5 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                            >
                                <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">-- Artículo nuevo / no registrado --</option>
                                {sortedProducts.map((p) => (
                                    <option key={p.id} value={p.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Item Name */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            {noteType === "missing" ? "Artículo / Producto que falta comprar *" : "Artículo o Producto solicitado *"}
                        </label>
                        <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="Ej: Yerba Playadito 1kg, Lavandina..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                            autoFocus
                        />
                    </div>

                    {/* Customer Name if request */}
                    {noteType === "customer_request" && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Nombre del Cliente / Teléfono (Opcional)
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Ej: Doña Carmen, 11-4567-8901..."
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                            />
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Detalles / Observaciones (Opcional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Avisarle apenas llegue, comprar pack de 6..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--primary)] focus:outline-hidden"
                        />
                    </div>

                    {/* Status Toggle if Editing */}
                    {isEditing && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                Estado de la Nota
                            </label>
                            <div className="relative">
                                <select
                                    value={statusVal}
                                    onChange={(e) => setStatusVal(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] pl-3.5 pr-9 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-hidden"
                                >
                                    <option value="pending" className="bg-[var(--surface)] text-[var(--text-primary)]">Pendiente</option>
                                    <option value="bought" className="bg-[var(--surface)] text-[var(--text-primary)]">Comprado / Resuelto</option>
                                    <option value="dismissed" className="bg-[var(--surface)] text-[var(--text-primary)]">Descartado</option>
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                        >
                            {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Nota"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StockNoteModal;

