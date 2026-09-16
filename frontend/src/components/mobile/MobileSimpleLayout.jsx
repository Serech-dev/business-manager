import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import SimplePos from "../../pages/mobile/SimplePos";
import SimplePriceChecker from "../../pages/mobile/SimplePriceChecker";
import SimpleCashRegister from "../../pages/mobile/SimpleCashRegister";
import MobileCameraScanner from "./MobileCameraScanner";
import SimpleMoreHub from "./SimpleMoreHub";
import NotificationMenu from "../notifications/NotificationMenu";
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
                            <h1 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-xs">
                                {settings?.store_name || "Mi Negocio"}
                            </h1>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                BETA
                            </span>
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
            <main className="flex-1 pb-20">
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
                            <div className="h-[calc(100vh-130px)]">
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
                            <SimpleMoreHub />
                        )}
                    </>
                )}
            </main>

            {/* Bottom Tab Navigation Bar with Center Elevated Main Button */}
            <nav className="fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)] px-1 py-1.5 flex items-center justify-around shadow-xl safe-area-bottom">
                {/* 1. Cash Register */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("cash");
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
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

                {/* 2. Price Checker */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("prices");
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
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

                {/* 3. CENTER HIGHLIGHTED MAIN BUTTON: VENDER */}
                <div className="relative -top-3 px-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (isSubRoute) navigate("/");
                            setActiveTab("pos");
                        }}
                        className={`w-13 h-13 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-[var(--background)] ring-2 ring-[var(--primary)]/30 active:scale-95 transition-all ${
                            !isSubRoute && activeTab === "pos"
                                ? "bg-[var(--primary)] text-white scale-105"
                                : "bg-[var(--primary)] text-white hover:opacity-95"
                        }`}
                        title="Nueva Venta / Operación"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* 4. Camera Scanner */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("scanner");
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                        !isSubRoute && activeTab === "scanner"
                            ? "text-[var(--primary)] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] tracking-tight">Escanear</span>
                </button>

                {/* 5. More / Settings */}
                <button
                    type="button"
                    onClick={() => {
                        if (isSubRoute) navigate("/");
                        setActiveTab("more");
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
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
