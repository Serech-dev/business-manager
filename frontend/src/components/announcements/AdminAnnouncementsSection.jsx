import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
    getAdminAnnouncements,
    createAdminAnnouncement,
    updateAdminAnnouncement,
    deleteAdminAnnouncement,
} from "../../services/announcements";
import { useAnnouncement } from "../../context/AnnouncementContext";

export default function AdminAnnouncementsSection() {
    const { refreshAnnouncement } = useAnnouncement();
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [actionId, setActionId] = useState(null);

    // Custom announcement form state
    const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [announcementType, setAnnouncementType] = useState("update");
    const [etaMinutes, setEtaMinutes] = useState("");
    const [showReloadButton, setShowReloadButton] = useState(true);
    const [allowDismiss, setAllowDismiss] = useState(true);
    const [autoDismissOnReload, setAutoDismissOnReload] = useState(true);

    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminAnnouncements();
            setAnnouncements(data || []);
        } catch (err) {
            console.error("Error loading announcements:", err);
            toast.error("Error al cargar el historial de avisos.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    const activeAnnouncement = announcements.find((a) => a.is_active);

    const handleDeactivate = async (announcement) => {
        setActionId(`deactivate-${announcement.id}`);
        try {
            await updateAdminAnnouncement(announcement.id, { is_active: false });
            toast.success("Aviso desactivado. Ya no se mostrará a los comercios.");
            await loadAnnouncements();
            await refreshAnnouncement();
        } catch (err) {
            console.error(err);
            toast.error("Error al desactivar el aviso.");
        } finally {
            setActionId(null);
        }
    };

    const handleReactivate = async (announcement) => {
        setActionId(`reactivate-${announcement.id}`);
        try {
            await updateAdminAnnouncement(announcement.id, { is_active: true });
            toast.success("Aviso reactivado y transmitiéndose a los comercios.");
            await loadAnnouncements();
            await refreshAnnouncement();
        } catch (err) {
            console.error(err);
            toast.error("Error al reactivar el aviso.");
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseás eliminar este aviso del historial?")) return;
        setActionId(`delete-${id}`);
        try {
            await deleteAdminAnnouncement(id);
            toast.success("Aviso eliminado correctamente.");
            await loadAnnouncements();
            await refreshAnnouncement();
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar el aviso.");
        } finally {
            setActionId(null);
        }
    };

    const handlePublishPreset = async (presetKey) => {
        setIsPublishing(true);
        try {
            let payload = {};
            if (presetKey === "maintenance") {
                payload = {
                    title: "Mantenimiento del servidor en curso",
                    message: "Estamos aplicando mejoras en el servidor. El sistema podría no responder durante 2 a 5 minutos. Asegurate de guardar tus ventas pendientes.",
                    announcement_type: "maintenance",
                    is_active: true,
                    show_reload_button: false,
                    allow_dismiss: false,
                    auto_dismiss_on_reload: false,
                    eta_minutes: "2 a 5 min",
                };
            } else if (presetKey === "update") {
                payload = {
                    title: "Nueva versión disponible",
                    message: "¡Hemos actualizado el sistema con nuevas mejoras! Hacé clic en 'Actualizar Ahora' o presioná Ctrl + F5 para cargar la última versión.",
                    announcement_type: "update",
                    is_active: true,
                    show_reload_button: true,
                    allow_dismiss: true,
                    auto_dismiss_on_reload: true,
                    eta_minutes: null,
                };
            }

            await createAdminAnnouncement(payload);
            toast.success("¡Aviso emitido a todos los comercios conectados!");
            await loadAnnouncements();
            await refreshAnnouncement();
        } catch (err) {
            console.error(err);
            toast.error("Error al emitir el aviso.");
        } finally {
            setIsPublishing(false);
        }
    };

    const handlePublishCustom = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error("Completá el título y el mensaje del aviso.");
            return;
        }

        setIsPublishing(true);
        try {
            await createAdminAnnouncement({
                title: title.trim(),
                message: message.trim(),
                announcement_type: announcementType,
                eta_minutes: etaMinutes.trim() || null,
                show_reload_button: showReloadButton,
                allow_dismiss: allowDismiss,
                auto_dismiss_on_reload: autoDismissOnReload,
                is_active: true,
            });

            toast.success("¡Aviso personalizado publicado con éxito!");
            setTitle("");
            setMessage("");
            setEtaMinutes("");
            setIsCustomFormOpen(false);
            await loadAnnouncements();
            await refreshAnnouncement();
        } catch (err) {
            console.error(err);
            toast.error("Error al publicar el aviso.");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
            {/* SECTION HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.38-.09-2.08-.09H7.5a4.5 4.5 0 1 1 0-9h.76c.7 0 1.392-.03 2.08-.09M10.34 15.84a44.403 44.403 0 0 0 6.646-.867A2.25 2.25 0 0 0 18.75 12.78v-1.56a2.25 2.25 0 0 0-1.764-2.193 44.403 44.403 0 0 0-6.646-.867m0 7.68V8.16m-4.5 8.34H4.5a2.25 2.25 0 0 1-2.25-2.25v-4.5A2.25 2.25 0 0 1 4.5 7.5h1.34" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">
                            Avisos Globales, Mantenimiento & Actualizaciones (Broadcast)
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Notificá a todos los comercios en tiempo real sobre caídas programadas, nuevas versiones y recordatorios de Ctrl + F5.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadAnnouncements}
                    disabled={isLoading}
                    className="self-start sm:self-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                >
                    Refrescar
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* ACTIVE BROADCAST CARD */}
                {activeAnnouncement ? (
                    <div className="rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/5 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--primary)]" />
                                </span>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                    Aviso Activo en Pantallas de Comercios
                                </h3>
                                <span className="rounded-sm bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] border border-[var(--primary)]/30">
                                    {activeAnnouncement.type_display || activeAnnouncement.announcement_type}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleDeactivate(activeAnnouncement)}
                                disabled={actionId === `deactivate-${activeAnnouncement.id}`}
                                className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                                </svg>
                                <span>{actionId === `deactivate-${activeAnnouncement.id}` ? "Desactivando..." : "Desactivar Transmisión"}</span>
                            </button>
                        </div>

                        {/* LIVE PREVIEW BOX */}
                        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                                <span>{activeAnnouncement.title}</span>
                                {activeAnnouncement.eta_minutes && (
                                    <span className="text-[11px] font-normal text-[var(--text-secondary)]">
                                        (Duración: {activeAnnouncement.eta_minutes})
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {activeAnnouncement.message}
                            </p>
                            <div className="pt-2 flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-medium">
                                <span>Botón de Recargar: {activeAnnouncement.show_reload_button ? "Habilitado (Ctrl + F5)" : "Oculto"}</span>
                                <span>·</span>
                                <span>Permitir Ocultar: {activeAnnouncement.allow_dismiss ? "Sí (Guardado en navegador)" : "No (Fijo en pantalla)"}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </div>
                        <div className="text-xs">
                            <span className="font-bold text-[var(--text-primary)]">Sin avisos activos: </span>
                            <span className="text-[var(--text-secondary)]">
                                Todos los comercios están operando normalmente sin banners en pantalla.
                            </span>
                        </div>
                    </div>
                )}

                {/* 1-CLICK QUICK PRESETS */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                        Emitir Nuevo Aviso (1 Clic)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* PRESET 1: MANTENIMIENTO */}
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-xs text-[var(--text-primary)]">
                                        Mantenimiento en Breve
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    Avisa que se aplicarán tareas en el servidor y el sistema puede no responder de 2 a 5 min. Banner fijo de advertencia.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handlePublishPreset("maintenance")}
                                disabled={isPublishing}
                                className="w-full rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                                <span>Emitir Mantenimiento (2-5 min)</span>
                            </button>
                        </div>

                        {/* PRESET 2: ACTUALIZACION / CTRL+F5 */}
                        <div className="rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-[var(--primary)]/15 text-[var(--primary)]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-xs text-[var(--text-primary)]">
                                        Nueva Versión Lista
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    Informa que la actualización terminó e incluye el botón directo "Actualizar Ahora (Ctrl + F5)" para limpiar caché.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handlePublishPreset("update")}
                                disabled={isPublishing}
                                className="w-full rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3 py-2 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                                <span>Emitir Nueva Versión (Ctrl + F5)</span>
                            </button>
                        </div>

                        {/* PRESET 3: PERSONALIZADO */}
                        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)]/50 p-4 flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-xs text-[var(--text-primary)]">
                                        Aviso Personalizado
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    Escribí un texto a medida para comunicar cambios específicos, horarios de atención o noticias especiales.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomFormOpen(!isCustomFormOpen)}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] px-3 py-2 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                            >
                                <span>{isCustomFormOpen ? "Cerrar Editor" : "Redactar Aviso..."}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CUSTOM ANNOUNCEMENT FORM */}
                {isCustomFormOpen && (
                    <form
                        onSubmit={handlePublishCustom}
                        className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4 space-y-4 animate-in fade-in duration-150"
                    >
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Redactar Aviso Personalizado
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Título del Aviso *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Mantenimiento programado hoy a las 23:00"
                                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Tipo de Aviso
                                </label>
                                <div className="relative">
                                    <select
                                        value={announcementType}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setAnnouncementType(next);
                                            if (next === "update") {
                                                setShowReloadButton(true);
                                                setAllowDismiss(true);
                                                setAutoDismissOnReload(true);
                                            } else if (next === "maintenance") {
                                                setShowReloadButton(false);
                                                setAllowDismiss(false);
                                                setAutoDismissOnReload(false);
                                            } else if (next === "info") {
                                                setShowReloadButton(false);
                                                setAllowDismiss(true);
                                                setAutoDismissOnReload(false);
                                            }
                                        }}
                                        className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] pr-8"
                                    >
                                        <option value="update">Actualización (Azul/Violeta)</option>
                                        <option value="maintenance">Mantenimiento (Ámbar/Alerta)</option>
                                        <option value="info">Informativo (Cian/Neutral)</option>
                                    </select>
                                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                Mensaje para los Comercios *
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribí detalladamente qué cambios se están realizando, si el sistema estará inaccesible por unos minutos, o qué deben hacer..."
                                rows={3}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Duración Estimada (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={etaMinutes}
                                    onChange={(e) => setEtaMinutes(e.target.value)}
                                    placeholder="Ej: 2 a 5 min, 10 min..."
                                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowReloadButton(!showReloadButton)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        showReloadButton ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            showReloadButton ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                                <span className="text-xs text-[var(--text-primary)] select-none">
                                    Mostrar botón "Actualizar Ahora"
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setAllowDismiss(!allowDismiss)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        allowDismiss ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            allowDismiss ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                                <span className="text-xs text-[var(--text-primary)] select-none">
                                    Permitir que el comerciante lo cierre
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setAutoDismissOnReload(!autoDismissOnReload)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        autoDismissOnReload ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            autoDismissOnReload ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                                <span className="text-xs text-[var(--text-primary)] select-none">
                                    Ocultar al recargar (Ctrl + F5)
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setIsCustomFormOpen(false)}
                                className="px-3.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPublishing}
                                className="px-4 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition shadow-xs"
                            >
                                {isPublishing ? "Publicando..." : "Publicar y Emitir Ahora"}
                            </button>
                        </div>
                    </form>
                )}

                {/* PAST BROADCASTS HISTORY */}
                {announcements.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Historial de Avisos Emitidos ({announcements.length})
                        </h3>

                        <div className="overflow-x-auto rounded-md border border-[var(--border)]">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                                    <tr>
                                        <th className="px-4 py-2.5">Estado</th>
                                        <th className="px-4 py-2.5">Tipo</th>
                                        <th className="px-4 py-2.5">Título y Mensaje</th>
                                        <th className="px-4 py-2.5">Fecha</th>
                                        <th className="px-4 py-2.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                                    {announcements.map((item) => (
                                        <tr key={item.id} className="hover:bg-[var(--surface-accent)]/50 transition">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {item.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        En el aire
                                                    </span>
                                                ) : (
                                                    <span className="rounded-sm bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                                                        Finalizado
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                                    {item.type_display || item.announcement_type}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 max-w-md">
                                                <p className="font-bold text-[var(--text-primary)] truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                                    {item.message}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[var(--text-secondary)]">
                                                {new Date(item.created_at).toLocaleDateString("es-AR", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                                                {item.is_active ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeactivate(item)}
                                                        disabled={actionId === `deactivate-${item.id}`}
                                                        className="px-2 py-1 rounded text-[11px] font-semibold text-amber-600 hover:bg-amber-500/10 transition"
                                                    >
                                                        Bajar
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReactivate(item)}
                                                        disabled={actionId === `reactivate-${item.id}`}
                                                        className="px-2 py-1 rounded text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                                                    >
                                                        Reactivar
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={actionId === `delete-${item.id}`}
                                                    className="p-1 rounded text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                                    title="Eliminar del historial"
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
                    </div>
                )}
            </div>
        </div>
    );
}
