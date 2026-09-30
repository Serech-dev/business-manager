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

    // Dynamic high-contrast styling according to modern structured sharp rules
    const theme = isMaintenance
        ? {
              container: "border-b-2 border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/90 dark:border-amber-500/60 dark:text-amber-100 shadow-xs",
              badge: "bg-amber-200 text-amber-950 border-amber-300 dark:bg-amber-500/30 dark:text-amber-200 dark:border-amber-500/40 font-bold",
              iconBg: "bg-amber-200 text-amber-950 border-amber-300 dark:bg-amber-500/30 dark:text-amber-200 dark:border-amber-500/40",
              title: "text-amber-950 dark:text-white font-extrabold",
              message: "text-amber-950 dark:text-amber-100 font-medium",
              eta: "text-amber-900 dark:text-amber-200 font-semibold",
              button: "bg-amber-600 hover:bg-amber-700 text-white font-bold",
              dismiss: "text-amber-950 hover:bg-amber-200/80 dark:text-amber-200 dark:hover:bg-amber-900/50",
          }
        : isUpdate
        ? {
              container: "border-b-2 border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/90 dark:border-indigo-500/60 dark:text-indigo-100 shadow-xs",
              badge: "bg-indigo-200 text-indigo-950 border-indigo-300 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-500/40 font-bold",
              iconBg: "bg-indigo-200 text-indigo-950 border-indigo-300 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-500/40",
              title: "text-indigo-950 dark:text-white font-extrabold",
              message: "text-indigo-950 dark:text-indigo-100 font-medium",
              eta: "text-indigo-900 dark:text-indigo-200 font-semibold",
              button: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold shadow-xs",
              dismiss: "text-indigo-950 hover:bg-indigo-200/80 dark:text-indigo-200 dark:hover:bg-indigo-900/50",
          }
        : {
              container: "border-b-2 border-sky-500 bg-sky-50 text-slate-900 dark:bg-slate-900/90 dark:border-sky-500/60 dark:text-slate-100 shadow-xs",
              badge: "bg-sky-200 text-sky-950 border-sky-300 dark:bg-sky-500/30 dark:text-sky-200 dark:border-sky-500/40 font-bold",
              iconBg: "bg-sky-200 text-sky-950 border-sky-300 dark:bg-sky-500/30 dark:text-sky-200 dark:border-sky-500/40",
              title: "text-slate-950 dark:text-white font-extrabold",
              message: "text-slate-900 dark:text-slate-100 font-medium",
              eta: "text-slate-800 dark:text-slate-200 font-semibold",
              button: "bg-sky-600 hover:bg-sky-700 text-white font-bold",
              dismiss: "text-slate-900 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-slate-800/50",
          };

    return (
        <aside
            role="alert"
            aria-live="polite"
            className={`transition-all duration-200 ${theme.container}`}
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
                                    className={`rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider border ${theme.badge}`}
                                >
                                    {type_display || (isMaintenance ? "Mantenimiento" : isUpdate ? "Actualización" : "Aviso")}
                                </span>

                                <h4 className={`text-xs sm:text-sm ${theme.title} truncate`}>
                                    {title}
                                </h4>

                                {eta_minutes && (
                                    <span className={`inline-flex items-center gap-1 text-[11px] ${theme.eta}`}>
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

                            <p className={`text-xs leading-relaxed break-words whitespace-pre-line ${theme.message}`}>
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
                                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs shadow-xs transition disabled:opacity-50 cursor-pointer ${theme.button}`}
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
                                className={`rounded-md p-1.5 transition cursor-pointer ${theme.dismiss}`}
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
