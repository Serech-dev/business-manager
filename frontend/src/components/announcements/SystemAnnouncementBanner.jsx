import React from "react";
import { useAnnouncement } from "../../context/AnnouncementContext";

export default function SystemAnnouncementBanner() {
    const {
        activeAnnouncement,
        isDismissed,
        dismissAnnouncement,
        forceAppReload,
        isReloading,
    } = useAnnouncement();

    if (!activeAnnouncement || !activeAnnouncement.is_active || isDismissed) {
        return null;
    }

    const {
        title,
        message,
        announcement_type,
        type_display,
        show_reload_button,
        allow_dismiss,
        eta_minutes,
    } = activeAnnouncement;

    const isMaintenance = announcement_type === "maintenance";
    const isUpdate = announcement_type === "update";

    // Dynamic styling according to modern structured sharp rules
    const theme = isMaintenance
        ? {
              container: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
              badge: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30",
              iconBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
              button: "bg-amber-600 hover:bg-amber-700 text-white",
          }
        : isUpdate
        ? {
              container: "border-indigo-500/40 bg-indigo-500/10 text-indigo-950 dark:text-indigo-100",
              badge: "bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
              iconBg: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
              button: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white",
          }
        : {
              container: "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100",
              badge: "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30",
              iconBg: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30",
              button: "bg-sky-600 hover:bg-sky-700 text-white",
          };

    return (
        <aside
            role="alert"
            aria-live="polite"
            className={`border-b transition-all duration-200 ${theme.container}`}
        >
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* ICON & MESSAGE */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${theme.iconBg}`}
                        >
                            {isMaintenance ? (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                    />
                                </svg>
                            ) : isUpdate ? (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                                    />
                                </svg>
                            )}
                        </div>

                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${theme.badge}`}
                                >
                                    {type_display || (isMaintenance ? "Mantenimiento" : isUpdate ? "Actualización" : "Aviso")}
                                </span>

                                <h4 className="text-xs sm:text-sm font-bold truncate">
                                    {title}
                                </h4>

                                {eta_minutes && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-80">
                                        <svg
                                            className="h-3 w-3"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                            />
                                        </svg>
                                        <span>Estimado: {eta_minutes}</span>
                                    </span>
                                )}
                            </div>

                            <p className="text-xs leading-relaxed opacity-90 break-words whitespace-pre-line">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* ACTIONS: HARD RELOAD & DISMISS */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {show_reload_button && (
                            <button
                                type="button"
                                onClick={forceAppReload}
                                disabled={isReloading}
                                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold shadow-xs transition disabled:opacity-50 ${theme.button}`}
                            >
                                <svg
                                    className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                    />
                                </svg>
                                <span>
                                    {isReloading
                                        ? "Actualizando versión..."
                                        : "Actualizar Ahora (Ctrl + F5)"}
                                </span>
                            </button>
                        )}

                        {allow_dismiss && (
                            <button
                                type="button"
                                onClick={dismissAnnouncement}
                                className="rounded-md p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition"
                                title="Ocultar aviso"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18 18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
