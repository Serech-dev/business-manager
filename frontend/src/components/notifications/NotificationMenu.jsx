import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

export function NotificationMenu({ align = "right" }) {
    const {
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        dismissNotification,
        markAllAsRead,
        openSubscriptionModal,
    } = useNotifications();

    const navigate = useNavigate();
    const menuRef = useRef(null);

    // Close on click outside and escape
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, setIsOpen]);

    const handleAction = (notif) => {
        dismissNotification(notif.id);
        setIsOpen(false);

        if (notif.actionType === "modal") {
            openSubscriptionModal();
        } else if (notif.actionRoute) {
            navigate(notif.actionRoute);
        }
    };

    return (
        <div ref={menuRef} className="relative inline-block">
            {/* BELL TRIGGER BUTTON */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-md border transition ${
                    isOpen
                        ? "border-[var(--primary)] bg-[var(--surface-accent)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--text-primary)]"
                }`}
                title={unreadCount > 0 ? `${unreadCount} notificaciones no leídas` : "Notificaciones"}
                aria-label="Abrir panel de notificaciones"
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
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* NOTIFICATIONS DROPDOWN POPOVER */}
            {isOpen && (
                <div className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full z-50 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden animate-fadeIn`}>
                    {/* HEADER */}
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-accent)]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                Notificaciones
                            </h3>
                            {unreadCount > 0 && (
                                <span className="rounded-sm bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                            >
                                Marcar como leídas
                            </button>
                        )}
                    </div>

                    {/* NOTIFICATIONS LIST */}
                    <div className="max-h-[70vh] overflow-y-auto divide-y divide-[var(--border)]">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                </div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                    ¡Estás al día!
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    No tenés alertas pendientes de stock, licencia o caja.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isCritical = notif.severity === "critical";
                                const isWarning = notif.severity === "warning";

                                return (
                                    <div
                                        key={notif.id}
                                        className={`relative p-3.5 transition flex gap-3 ${
                                            notif.isRead
                                                ? "bg-[var(--surface)] opacity-75"
                                                : "bg-[var(--surface-accent)]/30 hover:bg-[var(--surface-accent)]/50"
                                        }`}
                                    >
                                        {/* CATEGORY ICON */}
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                                                isCritical
                                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                                    : isWarning
                                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                    : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                            }`}
                                        >
                                            {notif.category === "stock" && (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                                </svg>
                                            )}
                                            {notif.category === "license" && (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                                </svg>
                                            )}
                                            {notif.category === "register" && (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v8.25m0 0a60.114 60.114 0 0 0 18.75 0m0 0V6a.75.75 0 0 0-.75-.75h-.75m0 0V4.5m0 0h.75M3 4.5h.75m0 0a60.07 60.07 0 0 1 15.797-2.101c.727-.198 1.453.342 1.453 1.096V4.5" />
                                                </svg>
                                            )}
                                        </div>

                                        {/* DETAILS */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                                                    {notif.title}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => dismissNotification(notif.id)}
                                                    className="rounded-sm p-0.5 text-[var(--text-secondary)]/60 hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                                                    title="Descartar"
                                                    aria-label="Descartar notificación"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                                {notif.message}
                                            </p>

                                            {/* ACTION CTA BUTTON */}
                                            {notif.actionLabel && (
                                                <div className="pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAction(notif)}
                                                        className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-xs ${
                                                            isCritical
                                                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                                                : isWarning
                                                                ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                                                                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                                                        }`}
                                                    >
                                                        <span>{notif.actionLabel}</span>
                                                        <span className="text-[10px]">→</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationMenu;

