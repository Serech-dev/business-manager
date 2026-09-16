import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/auth";
import ThemeSelector from "../ThemeSelector";
import ChangePinModal from "../ChangePinModal";
import GuideModal from "../GuideModal";
import TermsModal from "../subscription/TermsModal";
import { APP_VERSION } from "../../utils/version";
import { useSubscription } from "../../context/SubscriptionContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useDeviceMode } from "../../hooks/useDeviceMode";

export function SimpleMoreHub() {
    const navigate = useNavigate();
    const { toggleMode } = useDeviceMode();
    const { settings, openSettingsModal } = useStoreSettings();
    const {
        subscription,
        tier,
        isPremium,
        isExpired,
        isTrial,
        daysRemaining,
        isSuperuser,
        openSubscriptionModal,
    } = useSubscription();

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    let user = null;
    const storedUser = localStorage.getItem("businessManagerAuthUser");
    if (storedUser) {
        try {
            user = JSON.parse(storedUser);
        } catch {
            user = null;
        }
    }

    async function handleLogout() {
        await logout();
        navigate("/login", { replace: true });
    }

    const isSuspended = subscription?.status === "suspended";
    const isUserSuper = !isSuspended && (isSuperuser || user?.is_superuser);
    const storeInitial = (settings?.store_name || user?.email || "M").charAt(0).toUpperCase();

    // Dynamic tier-based avatar gradient
    const avatarGradient = isUserSuper
        ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-800 text-white shadow-sm border border-purple-400/30"
        : isSuspended || isExpired
        ? "bg-gradient-to-br from-rose-600 to-red-800 text-white shadow-sm border border-rose-400/30"
        : isPremium
        ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-sm border border-amber-400/40"
        : isTrial
        ? "bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm border border-emerald-400/30"
        : "bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-sm border border-sky-400/30";

    const planLabel = isSuspended
        ? "Cuenta Suspendida"
        : isExpired
        ? "Licencia Vencida"
        : isUserSuper
        ? "Acceso Total / Admin"
        : isTrial
        ? `Prueba (${daysRemaining ?? 0}d restantes)`
        : subscription?.plan === "lifetime"
        ? "Licencia Vitalicia"
        : `Plan Activo (${daysRemaining ?? 0}d)`;

    return (
        <div className="p-4 space-y-4 max-w-lg mx-auto animate-fadeIn pb-6">
            {/* MODALS */}
            <ChangePinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
            />
            <GuideModal
                isOpen={isGuideModalOpen}
                onClose={() => setIsGuideModalOpen(false)}
            />
            <TermsModal
                isOpen={isTermsModalOpen}
                onClose={() => setIsTermsModalOpen(false)}
            />

            {/* 1. HERO MERCHANT & LICENSE CARD */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-lg shadow-sm ring-2 ring-white/10 ${avatarGradient}`}>
                        {storeInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="font-extrabold text-base text-[var(--text-primary)] truncate">
                                {settings?.store_name || "Mi Negocio"}
                            </h2>
                            {isPremium ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                                    PRO
                                </span>
                            ) : isTrial ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
                                    TRIAL
                                </span>
                            ) : null}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5" title={user?.email}>
                            {user?.email || "comercio@admin"}
                        </p>
                    </div>
                </div>

                {/* SUBSCRIPTION STATUS STRIP */}
                <div className="mt-3.5 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Estado del Plan
                        </span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                            {planLabel}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={openSubscriptionModal}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border flex items-center gap-1.5 active:scale-95 ${
                            isSuspended || isExpired
                                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-90"
                                : isTrial
                                ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] hover:opacity-90"
                                : "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)] hover:opacity-90"
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{isSuspended ? "Reactivar" : isExpired ? "Renovar" : "Ver Planes"}</span>
                    </button>
                </div>
            </div>

            {/* 2. SUPERADMIN / OWNER CONTROL BANNER */}
            {isUserSuper && (
                <button
                    type="button"
                    onClick={() => navigate("/admin-panel")}
                    className="w-full bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-900/30 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-3.5 text-left flex items-center justify-between shadow-sm transition active:scale-[0.99] group"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-sm text-[var(--text-primary)] block">
                                Panel de Dueño / Admin
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                                Gestión global de licencias y comercios
                            </span>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-purple-400 group-hover:translate-x-0.5 transition-transform">
                        →
                    </span>
                </button>
            )}

            {/* 3. MÓDULOS DE GESTIÓN (GRID 2x3) */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 px-0.5">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                        Módulos de Gestión
                    </h3>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                        Accesos rápidos
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {/* PRODUCTOS */}
                    <button
                        type="button"
                        onClick={() => navigate("/products")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Productos</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Catálogo y precios</span>
                        </div>
                    </button>

                    {/* STOCK */}
                    <button
                        type="button"
                        onClick={() => navigate("/stock")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Control Stock</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Alertas y faltantes</span>
                        </div>
                    </button>

                    {/* CLIENTES & A CUENTA */}
                    <button
                        type="button"
                        onClick={() => navigate("/clients")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Clientes & Fiados</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Cuentas y saldos</span>
                        </div>
                    </button>

                    {/* PROVEEDORES */}
                    <button
                        type="button"
                        onClick={() => navigate("/providers")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Proveedores</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Compras y gastos</span>
                        </div>
                    </button>

                    {/* MÉTRICAS & REPORTES */}
                    <button
                        type="button"
                        onClick={() => navigate("/analytics")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Métricas & Caja</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Balances y ventas</span>
                        </div>
                    </button>

                    {/* HISTORIAL DE CAJAS */}
                    <button
                        type="button"
                        onClick={() => navigate("/registers")}
                        className="p-3 bg-[var(--surface-accent)]/60 hover:bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-xl text-left transition-all active:scale-[0.98] flex flex-col gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xs text-[var(--text-primary)] block">Historial Cajas</span>
                            <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">Cierres previos</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* 4. CONFIGURACIÓN DEL NEGOCIO & HERRAMIENTAS */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-[var(--surface-accent)]/40 border-b border-[var(--border)]">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                        Configuración & Ajustes
                    </h3>
                </div>

                <div className="divide-y divide-[var(--border)]">
                    {/* STORE SETTINGS */}
                    <button
                        type="button"
                        onClick={openSettingsModal}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)]/50 transition active:bg-[var(--surface-accent)] group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    Datos del Comercio
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Nombre, tickets, comisiones y recargos
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                            →
                        </span>
                    </button>

                    {/* PIN MODAL */}
                    <button
                        type="button"
                        onClick={() => setIsPinModalOpen(true)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)]/50 transition active:bg-[var(--surface-accent)] group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    PIN de Seguridad
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Proteger caja y operaciones críticas
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                            →
                        </span>
                    </button>

                    {/* THEME TOGGLE */}
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    Tema Visual
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Claro, Oscuro o Automático
                                </span>
                            </div>
                        </div>
                        <div className="w-28 shrink-0">
                            <ThemeSelector />
                        </div>
                    </div>

                    {/* DESKTOP MODE SWITCH */}
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)]/50 transition active:bg-[var(--surface-accent)] group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    Modo Escritorio
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Cambiar a la vista completa de PC
                                </span>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-[var(--primary)] group-hover:translate-x-0.5 transition-transform">
                            Activar →
                        </span>
                    </button>
                </div>
            </div>

            {/* 5. AYUDA & LEGAL */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
                <div className="divide-y divide-[var(--border)]">
                    {/* GUIDE */}
                    <button
                        type="button"
                        onClick={() => setIsGuideModalOpen(true)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)]/50 transition active:bg-[var(--surface-accent)] group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    Guía del Sistema
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Tutorial interactivo y preguntas frecuentes
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                            →
                        </span>
                    </button>

                    {/* TERMS */}
                    <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[var(--surface-accent)]/50 transition active:bg-[var(--surface-accent)] group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0 border border-slate-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">
                                    Términos & Privacidad
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Políticas del servicio y condiciones
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition">
                            →
                        </span>
                    </button>
                </div>
            </div>

            {/* 6. CERRAR SESIÓN */}
            <div className="pt-1">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full p-3.5 bg-[var(--danger-bg)]/80 hover:bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] rounded-2xl flex items-center justify-between font-bold text-xs sm:text-sm transition-all active:scale-[0.99] shadow-xs group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--danger)]/15 text-[var(--danger)] flex items-center justify-center border border-[var(--danger-border)] shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <span className="block text-xs sm:text-sm font-bold">Cerrar Sesión</span>
                            <span className="block text-[10px] text-[var(--danger)]/80 font-normal">Salir del sistema en este dispositivo</span>
                        </div>
                    </div>
                    <span className="text-sm transition-transform group-hover:translate-x-0.5">
                        →
                    </span>
                </button>
            </div>

            {/* 7. FOOTER APP VERSION */}
            <div className="text-center pt-2 pb-4">
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    Business Manager {APP_VERSION}
                </p>
                <p className="text-[9px] text-[var(--text-secondary)]/60 uppercase tracking-widest mt-0.5">
                    Modo Simple • PWA BETA
                </p>
            </div>
        </div>
    );
}

export default SimpleMoreHub;
