import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import SimplePos from "../../pages/mobile/SimplePos";
import SimplePriceChecker from "../../pages/mobile/SimplePriceChecker";
import SimpleCashRegister from "../../pages/mobile/SimpleCashRegister";
import MobileCameraScanner from "./MobileCameraScanner";
import NotificationMenu from "../notifications/NotificationMenu";
import AccountMenu from "../AccountMenu";
import { useDeviceMode } from "../../hooks/useDeviceMode";
import { useSubscription } from "../../context/SubscriptionContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { getCurrentRegister } from "../../services/business";

export function MobileSimpleLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toggleMode, modePreference } = useDeviceMode();
    const { settings, openSettingsModal } = useStoreSettings();
    const { tier, isPremium, isTrial, openSubscriptionModal } = useSubscription();

    const [activeTab, setActiveTab] = useState("pos"); // 'pos' | 'scanner' | 'prices' | 'cash' | 'more'
    const [register, setRegister] = useState(null);

    const isSubRoute = location.pathname !== "/" && location.pathname !== "/transactions/new";

    useEffect(() => {
        async function fetchReg() {
            try {
                const reg = await getCurrentRegister();
                setRegister(reg);
            } catch (err) {
                console.error("Error fetching register in MobileSimpleLayout:", err);
            }
        }
        fetchReg();
    }, []);

    const tierBadge = isPremium ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
            PRO
        </span>
    ) : isTrial ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            Trial
        </span>
    ) : (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-500 border border-sky-500/30">
            Básico
        </span>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            {/* Mobile Top Header */}
            <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] px-3 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {(settings?.store_name || "M").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[130px] sm:max-w-xs">
                                {settings?.store_name || "Mi Negocio"}
                            </h1>
                            {tierBadge}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] block truncate">
                            Modo Simple (PWA)
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {isSubRoute ? (
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="px-2.5 py-1 text-xs font-semibold text-[var(--primary)] bg-[var(--surface-accent)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-muted)] transition-colors flex items-center gap-1"
                        >
                            <span>← Venta</span>
                        </button>
                    ) : (
                        <>
                            {/* Notification Bell */}
                            <NotificationMenu />

                            {/* Switch to Desktop Back-office */}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-accent)] border border-[var(--border)] rounded-md transition-colors text-xs flex items-center gap-1"
                                title="Cambiar a Modo Escritorio / Back-office"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden sm:inline text-[10px] font-semibold">Escritorio</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Tab Content / Subroute */}
            <main className="flex-1 pb-16">
                {isSubRoute ? (
                    <div className="p-3">
                        <Outlet
                            context={{
                                register,
                                setRegister,
                            }}
                        />
                    </div>
                ) : (
                    <>
                        {activeTab === "pos" && (
                            <SimplePos
                                register={register}
                                onOpenRegister={(reg) => setRegister(reg)}
                            />
                        )}

                        {activeTab === "scanner" && (
                            <div className="h-[calc(100vh-120px)]">
                                <MobileCameraScanner
                                    onScan={(code) => {
                                        setActiveTab("prices");
                                    }}
                                    title="Lector de Códigos Móvil"
                                    subtitle="Escaneá para sumar ventas o verificar precios"
                                />
                            </div>
                        )}

                        {activeTab === "prices" && (
                            <SimplePriceChecker
                                onNavigateToPos={() => setActiveTab("pos")}
                            />
                        )}

                        {activeTab === "cash" && (
                            <SimpleCashRegister />
                        )}

                        {activeTab === "more" && (
                            <div className="p-4 space-y-4 max-w-md mx-auto">
                                <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xs">
                                    <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Módulos de Gestión</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => navigate("/products")}
                                            className="p-3 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-md text-left font-medium transition-colors flex flex-col gap-1"
                                        >
                                            <span className="font-bold text-[var(--text-primary)]">📦 Productos</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Catálogo completo</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/stock")}
                                            className="p-3 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-md text-left font-medium transition-colors flex flex-col gap-1"
                                        >
                                            <span className="font-bold text-[var(--text-primary)]">📋 Control Stock</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Alertas y reposición</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/clients")}
                                            className="p-3 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-md text-left font-medium transition-colors flex flex-col gap-1"
                                        >
                                            <span className="font-bold text-[var(--text-primary)]">👥 Clientes & Libreta</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Cuentas corrientes</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/analytics")}
                                            className="p-3 bg-[var(--surface-accent)] border border-[var(--border)] hover:border-[var(--primary)] rounded-md text-left font-medium transition-colors flex flex-col gap-1"
                                        >
                                            <span className="font-bold text-[var(--text-primary)]">📊 Métricas & Caja</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Reportes mensuales</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Account Menu embedded */}
                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 shadow-xs">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-2 px-1">
                                        Mi Cuenta & Ajustes
                                    </p>
                                    <AccountMenu />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bottom Tab Navigation Bar */}
            <nav className="fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-bottom">
                {/* 1. POS */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("pos");
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
                        !isSubRoute && activeTab === "pos"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Vender</span>
                </button>

                {/* 2. Camera Scanner */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("scanner");
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
                        !isSubRoute && activeTab === "scanner"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Escanear</span>
                </button>

                {/* 3. Price Checker */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("prices");
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
                        !isSubRoute && activeTab === "prices"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Precios</span>
                </button>

                {/* 4. Cash Register */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("cash");
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
                        !isSubRoute && activeTab === "cash"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Caja</span>
                </button>

                {/* 5. More / Settings */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("more");
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors ${
                        !isSubRoute && activeTab === "more"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Más</span>
                </button>
            </nav>
        </div>
    );
}

export default MobileSimpleLayout;
