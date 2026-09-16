import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useSubscription } from "../../context/SubscriptionContext";
import PlanComparisonTable from "./PlanComparisonTable";
import TermsModal from "./TermsModal";

function SubscriptionModal({ isOpen, onClose }) {
    const {
        subscription,
        tier,
        isPremium,
        isExpired,
        isTrial,
        isSuperuser,
        daysRemaining,
        premiumDaysRemaining,
        basicDaysRemaining,
        refreshSubscription,
        startCheckout,
        isProcessingCheckout,
    } = useSubscription();

    const [activeTab, setActiveTab] = useState("checkout"); // "checkout" | "comparison"
    const [selectedTier, setSelectedTier] = useState("basic"); // "basic" | "premium"
    const [billingCycle, setBillingCycle] = useState("yearly"); // "monthly" | "yearly"
    const [activeCheckout, setActiveCheckout] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [termsTab, setTermsTab] = useState("terms");
    const pollIntervalRef = useRef(null);

    // Derive active plan key
    const currentPlanKey = `${selectedTier}_${billingCycle}`;

    // Pricing dictionary
    const PLAN_PRICES = {
        basic_monthly: { amount: 9900, label: "$9.900", period: "/ mes", title: "Plan Básico Mensual" },
        basic_yearly: { amount: 99000, label: "$99.000", period: "/ año", monthlyEquiv: "$8.250/mes", title: "Plan Básico Anual", discount: "2 meses gratis" },
        premium_monthly: { amount: 19900, label: "$19.900", period: "/ mes", title: "Plan Premium Mensual" },
        premium_yearly: { amount: 199000, label: "$199.000", period: "/ año", monthlyEquiv: "$16.583/mes", title: "Plan Premium Anual", discount: "2 meses gratis" },
    };

    const currentPriceInfo = PLAN_PRICES[currentPlanKey] || PLAN_PRICES.basic_monthly;

    // Initialize defaults when modal opens
    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setActiveTab("checkout");
            if (isPremium && tier === "premium") {
                setSelectedTier("premium");
            } else {
                setSelectedTier("basic");
            }
            setBillingCycle("yearly");
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, isPremium, tier]);

    // Auto-polling when waiting for active Mercado Pago checkout confirmation
    useEffect(() => {
        if (!activeCheckout) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        const initialDays = subscription?.days_remaining ?? 0;
        const initialStatus = subscription?.status;

        pollIntervalRef.current = setInterval(async () => {
            try {
                const updated = await refreshSubscription();
                if (
                    updated &&
                    (updated.status === "active" ||
                        (updated.days_remaining ?? 0) > initialDays ||
                        (initialStatus === "expired" && updated.is_valid))
                ) {
                    toast.success("¡Pago confirmado! Licencia acreditada con éxito.");
                    setActiveCheckout(null);
                    clearInterval(pollIntervalRef.current);
                }
            } catch {
                // Silently ignore background polling network errors
            }
        }, 4000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [activeCheckout, subscription, refreshSubscription]);

    const token = localStorage.getItem("businessManagerAuthToken");
    if (!token || !isOpen) return null;

    async function handleRefresh() {
        setIsRefreshing(true);
        try {
            const updated = await refreshSubscription();
            const sub = updated?.summary || updated;
            if (sub?.is_valid && sub?.status === "active") {
                toast.success("¡Licencia activa confirmada!");
                setActiveCheckout(null);
            } else if (sub?.status === "suspended") {
                toast.error("Tu cuenta continúa suspendida.");
            } else {
                toast.success("Estado de licencia actualizado.");
            }
        } catch {
            toast.error("No se pudo verificar el estado.");
        } finally {
            setIsRefreshing(false);
        }
    }

    async function handleAutomatedCheckout() {
        try {
            const preference = await startCheckout(currentPlanKey, { openInNewTab: false });
            if (preference?.init_point) {
                setActiveCheckout(preference);
                toast.success("Código QR de pago generado.");
            }
        } catch {
            // Error toast handled in context
        }
    }

    const formatDate = (isoString) => {
        if (!isoString) return "Indefinido";
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return isoString;
        }
    };

    function handleSelectFromTable(planKey) {
        if (planKey.startsWith("premium")) {
            setSelectedTier("premium");
        } else {
            setSelectedTier("basic");
        }
        if (planKey.endsWith("yearly")) {
            setBillingCycle("yearly");
        } else {
            setBillingCycle("monthly");
        }
        setActiveTab("checkout");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                                Suscripción & Planes
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Gestión de licencia, renovación automática y comparativa de funciones
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                        aria-label="Cerrar modal"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex border-b border-[var(--border)] bg-[var(--surface)] px-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab("checkout")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
                            activeTab === "checkout"
                                ? "border-[var(--primary)] text-[var(--primary)]"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                        <span>Mi Suscripción & Pago</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("comparison")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
                            activeTab === "comparison"
                                ? "border-[var(--primary)] text-[var(--primary)]"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                        <span>Comparativa de Planes</span>
                    </button>
                </div>

                {/* BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === "comparison" ? (
                        <PlanComparisonTable
                            currentTier={tier}
                            onSelectPlan={handleSelectFromTable}
                        />
                    ) : (
                        <>
                            {/* CURRENT STATUS BANNER */}
                            <div
                                className={`rounded-md border p-4 transition ${
                                    subscription?.status === "suspended" || isExpired
                                        ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]"
                                        : isTrial
                                        ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]"
                                        : "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold uppercase tracking-wider">Estado Actual:</span>
                                            <span className="rounded-sm px-2 py-0.5 text-xs font-black uppercase tracking-wide bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]">
                                                {subscription?.status_display || "Prueba"}
                                            </span>
                                            <span className={`rounded-sm px-2 py-0.5 text-xs font-black uppercase tracking-wide ${
                                                tier === "premium" || tier === "trial"
                                                    ? "badge-gold"
                                                    : "bg-[var(--primary)] text-white shadow-xs"
                                            }`}>
                                                {subscription?.tier_display || (tier === "premium" ? "Plan Premium" : tier === "trial" ? "Prueba Total" : "Plan Básico")}
                                            </span>
                                        </div>

                                        <p className="text-sm font-medium text-[var(--text-primary)] pt-1">
                                            {subscription?.status === "suspended" ? (
                                                "Tu cuenta se encuentra suspendida por la administración. Aboná tu plan a continuación para reactivar el acceso."
                                            ) : isExpired ? (
                                                "Tu período de acceso ha finalizado. Aboná tu plan para continuar utilizando el sistema sin interrupciones."
                                            ) : isSuperuser ? (
                                                "Tenés acceso total ilimitado como Administrador del sistema."
                                            ) : isTrial ? (
                                                `Estás en el período de prueba gratuita de 14 días con acceso total a funciones Premium. Te quedan ${daysRemaining ?? 0} días.`
                                            ) : subscription?.plan === "lifetime" ? (
                                                "Tu cuenta cuenta con una Licencia Vitalicia Premium activa sin fecha de vencimiento."
                                            ) : (
                                                `Tu licencia está activa (${subscription?.plan_display}). Vence el ${formatDate(subscription?.expires_at)}.`
                                            )}
                                        </p>

                                        {/* Breakdown of days if user has stacked times */}
                                        {!isSuperuser && subscription?.plan !== "lifetime" && (premiumDaysRemaining > 0 || basicDaysRemaining > 0) && (
                                            <div className="flex items-center gap-4 pt-1.5 text-xs text-[var(--text-secondary)]">
                                                {premiumDaysRemaining > 0 && (
                                                    <span className="flex items-center gap-1 font-semibold text-[var(--primary)]">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                                                        Días Premium restantes: {premiumDaysRemaining} días
                                                    </span>
                                                )}
                                                {basicDaysRemaining > 0 && (
                                                    <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                        Días Básico acumulados: {basicDaysRemaining} días
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-xs hover:bg-[var(--surface-accent)] disabled:opacity-50"
                                        title="Verificar estado actual con el servidor"
                                    >
                                        <svg
                                            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                        <span>{isRefreshing ? "Verificando..." : "Actualizar"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* TIER SELECTION CARDS */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        1. Seleccioná el Nivel de Plan
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("comparison")}
                                        className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                                    >
                                        <span>Ver tabla comparativa</span>
                                        <span>→</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* PLAN BÁSICO CARD */}
                                    <div
                                        onClick={() => setSelectedTier("basic")}
                                        className={`relative cursor-pointer rounded-md border p-4 transition ${
                                            selectedTier === "basic"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-[var(--text-primary)]">Plan Básico</span>
                                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedTier === "basic" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                                {selectedTier === "basic" && <span className="h-2 w-2 rounded-full bg-white" />}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-[var(--text-primary)]">
                                                {billingCycle === "yearly" ? "$99.000" : "$9.900"}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                {billingCycle === "yearly" ? "/ año" : "/ mes"}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                            Punto de venta, control de caja, catálogo, combos/ofertas y libreta de fiados.
                                        </p>
                                    </div>

                                    {/* PLAN PREMIUM CARD */}
                                    <div
                                        onClick={() => setSelectedTier("premium")}
                                        className={`relative cursor-pointer rounded-md border p-4 transition ${
                                            selectedTier === "premium"
                                                ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30"
                                                : "border-[var(--border)] bg-[var(--background)] hover:border-amber-500/30"
                                        }`}
                                    >
                                        <div className="badge-gold absolute -top-2.5 right-4 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm">
                                            Recomendado
                                        </div>

                                        <div className="flex items-center justify-between">
                                             <span className="text-sm font-bold text-amber-500 dark:text-amber-400">Plan Premium</span>
                                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedTier === "premium" ? "border-amber-500 bg-amber-500 text-white" : "border-[var(--border)]"}`}>
                                                {selectedTier === "premium" && <span className="h-2 w-2 rounded-full bg-white" />}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-[var(--text-primary)]">
                                                {billingCycle === "yearly" ? "$199.000" : "$19.900"}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                {billingCycle === "yearly" ? "/ año" : "/ mes"}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                            Todo lo Básico + Empleados/Roles, Reportes de Ganancia Neta, Excel y Libreta de Proveedores.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* BILLING CYCLE SELECTOR */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                                    2. Modalidad de Facturación
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle("monthly")}
                                        className={`rounded-md border p-3 text-left transition flex items-center justify-between ${
                                            billingCycle === "monthly"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text-primary)]"
                                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                                        }`}
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-primary)]">Pago Mensual (30 días)</p>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                {selectedTier === "premium" ? "$19.900 / mes" : "$9.900 / mes"}
                                            </p>
                                        </div>
                                        <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${billingCycle === "monthly" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                            {billingCycle === "monthly" && <span className="h-2 w-2 rounded-full bg-white" />}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle("yearly")}
                                        className={`rounded-md border p-3 text-left transition flex items-center justify-between relative ${
                                            billingCycle === "yearly"
                                                ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text-primary)]"
                                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                                        }`}
                                    >
                                        <span className="absolute -top-2 right-3 rounded-sm bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2">
                                            Ahorro 2 meses
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-primary)]">Pago Anual (365 días)</p>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                {selectedTier === "premium" ? "$199.000 / año ($16.583/mes)" : "$99.000 / año ($8.250/mes)"}
                                            </p>
                                        </div>
                                        <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${billingCycle === "yearly" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                            {billingCycle === "yearly" && <span className="h-2 w-2 rounded-full bg-white" />}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* CHECKOUT BOX */}
                            <div className="rounded-md border-2 border-[var(--primary)]/40 bg-[var(--primary)]/5 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                            3. Pago Instantáneo & Activación Automática
                                        </h3>
                                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                            Selección actual: <strong>{currentPriceInfo.title} ({currentPriceInfo.label})</strong>
                                        </p>
                                    </div>
                                    <span className="rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                        Activación Inmediata
                                    </span>
                                </div>

                                {activeCheckout ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                            Orden de pago generada para <strong>{currentPriceInfo.title}</strong> por <strong>{currentPriceInfo.label}</strong>. Podés escanear con tu celular o abrir la pasarela en una pestaña nueva.
                                        </p>

                                        {/* QR CODE CARD */}
                                        <div className="flex flex-col items-center justify-center p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] text-center space-y-3 shadow-xs">
                                            <div className="bg-white p-3 rounded-md shadow-inner border border-slate-200 inline-block">
                                                <QRCodeSVG
                                                    value={activeCheckout.init_point}
                                                    size={170}
                                                    level="M"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                                    Escanear con Celular / Billetera Virtual
                                                </p>
                                                <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                                                    Apuntá con la cámara de tu teléfono, la app de <strong>Mercado Pago</strong> o tu aplicación bancaria (QR interoperable).
                                                </p>
                                            </div>

                                            {/* STATUS PULSE */}
                                            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                                <span>Esperando acreditación... Se activará automáticamente.</span>
                                            </div>
                                        </div>

                                        {/* ACTION BUTTONS */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => window.open(activeCheckout.init_point, "_blank", "noopener,noreferrer")}
                                                className="w-full rounded-md bg-[var(--primary)] py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                </svg>
                                                <span>Abrir Mercado Pago</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleRefresh}
                                                disabled={isRefreshing}
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-2.5 px-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <svg className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                </svg>
                                                <span>{isRefreshing ? "Verificando..." : "Verificar acreditación"}</span>
                                            </button>
                                        </div>

                                        <div className="text-center pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setActiveCheckout(null)}
                                                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition"
                                            >
                                                ← Cambiar selección de plan
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                            Aboná con <strong>Mercado Pago</strong>, <strong>Tarjetas de Débito / Crédito</strong> o <strong>QR Interoperable</strong> desde cualquier banco. Al confirmarse la operación, los días se suman instantáneamente a tu cuenta.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={handleAutomatedCheckout}
                                            disabled={isProcessingCheckout}
                                            className="w-full rounded-md bg-[var(--primary)] py-3 text-sm font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] disabled:opacity-50 transition flex items-center justify-center gap-2"
                                        >
                                            {isProcessingCheckout ? (
                                                <>
                                                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                    </svg>
                                                    <span>Conectando con Mercado Pago...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75ZM6.75 16.5h.008v.008H6.75V16.5ZM16.5 6.75h.008v.008H16.5V6.75ZM13.5 13.5h3v3h-3v-3ZM13.5 19.5h6v-3h-3v3h-3ZM19.5 13.5h.008v.008H19.5V13.5Z" />
                                                    </svg>
                                                    <span>Generar QR de Pago ({currentPriceInfo.title} - {currentPriceInfo.label})</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <div className="text-[11px] text-[var(--text-secondary)] space-x-1.5 text-center sm:text-left">
                        <span>Acumulación inteligente: el tiempo Premium se consume primero.</span>
                        <span>·</span>
                        <button
                            type="button"
                            onClick={() => {
                                setTermsTab("terms");
                                setIsTermsOpen(true);
                            }}
                            className="font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] hover:underline"
                        >
                            Términos & Privacidad
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition shrink-0"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* LEGAL TERMS & CANCELLATION MODAL */}
            <TermsModal
                isOpen={isTermsOpen}
                onClose={() => setIsTermsOpen(false)}
                initialTab={termsTab}
            />
        </div>
    );
}

export default SubscriptionModal;
