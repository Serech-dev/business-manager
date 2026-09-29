import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
    getAdminFeedback,
    updateAdminFeedback,
    deleteAdminFeedback,
} from "../../services/feedback";

export default function AdminFeedbackSection() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [actionId, setActionId] = useState(null);

    // Selected feedback detail modal
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const loadFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminFeedback({
                status: statusFilter,
                feedback_type: typeFilter,
                search: searchQuery,
            });
            setFeedbacks(data || []);
        } catch (err) {
            console.error("Error loading feedbacks:", err);
            toast.error("Error al cargar reportes de usuarios.");
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, typeFilter, searchQuery]);

    useEffect(() => {
        loadFeedback();
    }, [loadFeedback]);

    const handleUpdateStatus = async (feedbackId, nextStatus) => {
        setActionId(`status-${feedbackId}`);
        try {
            await updateAdminFeedback(feedbackId, { status: nextStatus });
            toast.success("Estado actualizado.");
            await loadFeedback();
        } catch (err) {
            console.error(err);
            toast.error("Error al actualizar estado.");
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (feedbackId) => {
        if (!window.confirm("¿Seguro que deseás eliminar este reporte?")) return;
        setActionId(`delete-${feedbackId}`);
        try {
            await deleteAdminFeedback(feedbackId);
            toast.success("Reporte eliminado.");
            if (selectedFeedback?.id === feedbackId) setSelectedFeedback(null);
            await loadFeedback();
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar reporte.");
        } finally {
            setActionId(null);
        }
    };

    const handleOpenDetail = (item) => {
        setSelectedFeedback(item);
        setAdminNotes(item.admin_notes || "");
    };

    const handleSaveAdminNotes = async (e) => {
        e.preventDefault();
        if (!selectedFeedback) return;

        setIsSavingNotes(true);
        try {
            await updateAdminFeedback(selectedFeedback.id, {
                admin_notes: adminNotes.trim(),
            });
            toast.success("Notas guardadas correctamente.");
            setSelectedFeedback((prev) => ({ ...prev, admin_notes: adminNotes.trim() }));
            await loadFeedback();
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar notas.");
        } finally {
            setIsSavingNotes(false);
        }
    };

    const pendingCount = feedbacks.filter((f) => f.status === "pending").length;

    return (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
            {/* SECTION HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">
                                Buzón de Reportes, Sugerencias & Dudas
                            </h2>
                            {pendingCount > 0 && (
                                <span className="rounded-sm bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    {pendingCount} pendientes
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Consultas, reporte de bugs y sugerencias enviadas por los usuarios desde la app.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadFeedback}
                    disabled={isLoading}
                    className="self-start sm:self-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                >
                    Refrescar
                </button>
            </div>

            {/* FILTER TOOLBAR */}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] bg-[var(--surface-muted)]/50">
                {/* SEARCH */}
                <div className="relative flex-1 max-w-sm">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por comercio, asunto o texto..."
                        className="h-8.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    />
                    <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                </div>

                {/* FILTERS */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* STATUS PILLS */}
                    <div className="flex items-center gap-1 border border-[var(--border)] p-0.5 rounded-md bg-[var(--surface)]">
                        {[
                            { label: "Todos", value: "" },
                            { label: "Pendientes", value: "pending" },
                            { label: "En Revisión", value: "in_review" },
                            { label: "Resueltos", value: "resolved" },
                        ].map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setStatusFilter(t.value)}
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                    statusFilter === t.value
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* TYPE PILLS */}
                    <div className="flex items-center gap-1 border border-[var(--border)] p-0.5 rounded-md bg-[var(--surface)]">
                        {[
                            { label: "Todo tipo", value: "" },
                            { label: "Bugs", value: "bug" },
                            { label: "Sugerencias", value: "suggestion" },
                            { label: "Consultas", value: "inquiry" },
                        ].map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setTypeFilter(t.value)}
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                    typeFilter === t.value
                                        ? "bg-[var(--surface-accent)] text-[var(--text-primary)] border border-[var(--border)]"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TABLE / EMPTY STATE */}
            {isLoading ? (
                <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Cargando reportes de usuarios...
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                        No hay reportes ni sugerencias con los filtros aplicados
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                        Cuando un comerciante envíe un reporte desde el botón de ayuda aparecerá en esta bandeja.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                            <tr>
                                <th className="px-4 py-2.5">Estado</th>
                                <th className="px-4 py-2.5">Tipo</th>
                                <th className="px-4 py-2.5">Comercio / Usuario</th>
                                <th className="px-4 py-2.5">Detalle del Reporte</th>
                                <th className="px-4 py-2.5">Origen & Dispositivo</th>
                                <th className="px-4 py-2.5">Fecha</th>
                                <th className="px-4 py-2.5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                            {feedbacks.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--surface-accent)]/50 transition">
                                    {/* STATUS */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {item.status === "pending" ? (
                                            <span className="rounded-sm bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                Pendiente
                                            </span>
                                        ) : item.status === "in_review" ? (
                                            <span className="rounded-sm bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                                En Revisión
                                            </span>
                                        ) : item.status === "resolved" ? (
                                            <span className="rounded-sm bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                Resuelto
                                            </span>
                                        ) : (
                                            <span className="rounded-sm bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                                                Descartado
                                            </span>
                                        )}
                                    </td>

                                    {/* TYPE */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                            item.feedback_type === "bug"
                                                ? "text-rose-600 dark:text-rose-400"
                                                : item.feedback_type === "suggestion"
                                                ? "text-[var(--primary)]"
                                                : "text-sky-600 dark:text-sky-400"
                                        }`}>
                                            {item.type_display || item.feedback_type}
                                        </span>
                                    </td>

                                    {/* USER & STORE */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <p className="font-bold text-[var(--text-primary)]">
                                            {item.store_name}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)]">
                                            {item.user_email}
                                        </p>
                                    </td>

                                    {/* MESSAGE */}
                                    <td className="px-4 py-3 max-w-sm">
                                        {item.subject && (
                                            <p className="font-bold text-[var(--text-primary)] truncate">
                                                {item.subject}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                                            {item.message}
                                        </p>
                                    </td>

                                    {/* ORIGIN & DEVICE */}
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--text-secondary)]">
                                        {item.page_url && (
                                            <span className="font-mono bg-[var(--surface-muted)] px-1.5 py-0.5 rounded text-[10px] block w-fit mb-0.5">
                                                {item.page_url}
                                            </span>
                                        )}
                                        <span>{item.device_info || "Web"}</span>
                                    </td>

                                    {/* DATE */}
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--text-secondary)]">
                                        {new Date(item.created_at).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </td>

                                    {/* ACTIONS */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(item)}
                                            className="px-2 py-1 rounded text-[11px] font-semibold border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] transition"
                                        >
                                            Ver & Notas
                                        </button>

                                        {item.status !== "resolved" && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(item.id, "resolved")}
                                                disabled={actionId === `status-${item.id}`}
                                                className="px-2 py-1 rounded text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/10 transition"
                                            >
                                                Resolver
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item.id)}
                                            disabled={actionId === `delete-${item.id}`}
                                            className="p-1 rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                            title="Eliminar reporte"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* DETAIL & ADMIN NOTES MODAL */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--surface-accent)]">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Detalle del Reporte #{selectedFeedback.id}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Enviado por {selectedFeedback.store_name} ({selectedFeedback.user_email})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFeedback(null)}
                                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto text-xs">
                            <div className="flex items-center justify-between">
                                <span className={`font-bold ${
                                    selectedFeedback.feedback_type === "bug"
                                        ? "text-rose-600"
                                        : selectedFeedback.feedback_type === "suggestion"
                                        ? "text-[var(--primary)]"
                                        : "text-sky-600"
                                }`}>
                                    Tipo: {selectedFeedback.type_display}
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-[var(--text-secondary)]">Cambiar estado:</span>
                                    <select
                                        value={selectedFeedback.status}
                                        onChange={(e) => {
                                            handleUpdateStatus(selectedFeedback.id, e.target.value);
                                            setSelectedFeedback((prev) => ({ ...prev, status: e.target.value }));
                                        }}
                                        className="h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-semibold text-[var(--text-primary)] outline-none"
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_review">En Revisión</option>
                                        <option value="resolved">Resuelto</option>
                                        <option value="dismissed">Descartado</option>
                                    </select>
                                </div>
                            </div>

                            {selectedFeedback.subject && (
                                <div>
                                    <span className="font-bold text-[var(--text-secondary)] block text-[11px] uppercase">
                                        Asunto
                                    </span>
                                    <p className="font-bold text-sm text-[var(--text-primary)]">
                                        {selectedFeedback.subject}
                                    </p>
                                </div>
                            )}

                            <div>
                                <span className="font-bold text-[var(--text-secondary)] block text-[11px] uppercase mb-1">
                                    Mensaje del Usuario
                                </span>
                                <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                                    {selectedFeedback.message}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
                                <div>
                                    <span className="font-bold">Pantalla origen: </span>
                                    <span className="font-mono">{selectedFeedback.page_url || "/"}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Dispositivo: </span>
                                    <span>{selectedFeedback.device_info || "N/A"}</span>
                                </div>
                            </div>

                            {/* ADMIN NOTES */}
                            <form onSubmit={handleSaveAdminNotes} className="border-t border-[var(--border)] pt-3 space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Notas Internas del Administrador
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Ej: Error reproducido en iOS. Solucionado en commit X. Respondido por WhatsApp..."
                                    rows={3}
                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingNotes}
                                        className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
                                    >
                                        {isSavingNotes ? "Guardando notas..." : "Guardar Notas"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
