import { logout } from "../services/auth";
import ThemeSelector from "./ThemeSelector";
import ChangePinModal from "./ChangePinModal";
import GuideModal from "./GuideModal";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../utils/version";
import { useSubscription } from "../context/SubscriptionContext";
import { useStoreSettings } from "../context/StoreSettingsContext";

function AccountMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const menuRef = useRef(null);

    const navigate = useNavigate();
    const { settings, openSettingsModal } = useStoreSettings();
    const {
        subscription,
        isExpired,
        isTrial,
        daysRemaining,
        isSuperuser,
        openSubscriptionModal,
    } = useSubscription();

    let user = null;
    const storedUser = localStorage.getItem("businessManagerAuthUser");
    if (storedUser) {
        try {
            user = JSON.parse(storedUser);
        } catch {
            user = null;
        }
    }

    // Click outside and escape key handler
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
    }, [isOpen]);

    async function handleLogout() {
        setIsOpen(false);
        await logout();
        navigate("/login", { replace: true });
    }

    const isUserSuper = isSuperuser || user?.is_superuser;
    const storeInitial = (settings?.store_name || user?.email || "M").charAt(0).toUpperCase();

    return (
        <>
            <ChangePinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
            />

            <GuideModal
                isOpen={isGuideModalOpen}
                onClose={() => setIsGuideModalOpen(false)}
            />

            <div ref={menuRef} className="relative">
                {isOpen && (
                    <div
                        className="
                            absolute
                            bottom-full
                            left-0
                            z-50
                            mb-3
                            w-80
                            sm:w-84
                            max-h-[85vh]
                            overflow-y-auto
                            rounded-2xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            shadow-2xl
                            ring-1
                            ring-black/10
                            dark:ring-white/10
                            animate-in
                            fade-in
                            slide-in-from-bottom-2
                            duration-150
                        "
                    >
                        {/* USER & LICENSE HERO BANNER */}
                        <div className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-indigo-700 text-white font-black text-base shadow-sm ring-2 ring-white/15">
                                    {storeInitial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                                        {settings?.store_name || "Mi Negocio"}
                                    </h3>
                                    <p className="truncate text-xs text-[var(--text-secondary)]" title={user?.email}>
                                        {user?.email || "comercio@admin"}
                                    </p>
                                </div>
                            </div>

                            {/* LICENSE STATUS CARD */}
                            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Estado de Licencia
                                        </span>
                                        <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                                            {isExpired
                                                ? "Licencia Vencida"
                                                : isUserSuper
                                                ? "Acceso Total / Admin"
                                                : isTrial
                                                ? `Prueba (${daysRemaining ?? 0}d restantes)`
                                                : subscription?.plan === "lifetime"
                                                ? "Licencia Vitalicia"
                                                : `Plan Activo (${daysRemaining ?? 0}d)`}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            openSubscriptionModal();
                                        }}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                                            isExpired
                                                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-90"
                                                : isTrial
                                                ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] hover:opacity-90"
                                                : "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)] hover:opacity-90"
                                        }`}
                                    >
                                        {isExpired ? "Renovar" : "Ver Plan"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SUPERADMIN OWNER PANEL (IF SUPERUSER) */}
                        {isUserSuper && (
                            <div className="p-2 border-b border-[var(--border)] bg-[var(--primary)]/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate("/admin-panel");
                                    }}
                                    className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-[var(--primary)]/10 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-xs">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-[var(--primary)] block">
                                                Panel de Dueño
                                            </span>
                                            <span className="text-[11px] text-[var(--text-secondary)]">
                                                Gestión de comercios y pagos
                                            </span>
                                        </div>
                                    </div>
                                    <span className="rounded-md bg-[var(--primary)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                                        Admin
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* MENU ACTIONS LIST */}
                        <div className="p-2 space-y-1">
                            {/* STORE SETTINGS */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    openSettingsModal();
                                }}
                                className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-[var(--surface-accent)] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] block">
                                            Configuración del Comercio
                                        </span>
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                            Nombre, comisiones, fiado y tickets
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                                    →
                                </span>
                            </button>

                            {/* OWNER PIN */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsPinModalOpen(true);
                                }}
                                className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-[var(--surface-accent)] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] block">
                                            PIN de Seguridad
                                        </span>
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                            Proteger operaciones y caja
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                                    →
                                </span>
                            </button>

                            {/* SYSTEM GUIDE */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsGuideModalOpen(true);
                                }}
                                className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-[var(--surface-accent)] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] block">
                                            Guía del Sistema
                                        </span>
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                            Tutorial interactivo y atajos
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                                    →
                                </span>
                            </button>

                            {/* THEME SELECTOR */}
                            <div className="flex items-center justify-between rounded-xl p-2.5 transition hover:bg-[var(--surface-accent)]">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] block">
                                            Tema Visual
                                        </span>
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                            Modo Claro / Oscuro
                                        </span>
                                    </div>
                                </div>
                                <div className="w-28 shrink-0">
                                    <ThemeSelector />
                                </div>
                            </div>
                        </div>

                        {/* LOGOUT */}
                        <div className="p-2 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center justify-between rounded-xl p-2.5 text-left text-[var(--danger)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm font-bold block">
                                            Cerrar Sesión
                                        </span>
                                        <span className="text-[11px] text-[var(--danger)]/80">
                                            Salir del sistema
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold transition">
                                    →
                                </span>
                            </button>
                        </div>

                        {/* FOOTER APP VERSION */}
                        <div className="border-t border-[var(--border)] px-4 py-2 text-center text-[10px] text-[var(--text-secondary)]/60 bg-[var(--surface-accent)]/20">
                            Business Manager {APP_VERSION}
                        </div>
                    </div>
                )}

                {/* ACCOUNT TOGGLE TRIGGER BUTTON */}
                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-2.5
                        rounded-xl
                        border
                        p-2.5
                        text-left
                        transition-all
                        ${
                            isOpen
                                ? "border-[var(--primary)] bg-[var(--surface-accent)] shadow-sm ring-1 ring-[var(--primary)]/20"
                                : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-accent)]"
                        }
                    `}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-indigo-700 text-white font-bold text-xs shadow-xs">
                            {storeInitial}
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                                    {settings?.store_name || "Mi Negocio"}
                                </p>
                            </div>
                            <p
                                className="truncate text-[11px] text-[var(--text-secondary)]"
                                title={user?.email}
                            >
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {subscription && (
                            <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    isExpired
                                        ? "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]"
                                        : isTrial
                                        ? "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]"
                                        : "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                                }`}
                            >
                                {isExpired ? "Vencida" : isUserSuper ? "Admin" : isTrial ? `${daysRemaining ?? 0}d` : "Activa"}
                            </span>
                        )}

                        <svg
                            className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-150 ${
                                isOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                    </div>
                </button>
            </div>
        </>
    );
}

export default AccountMenu;