import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { logout } from "../../services/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";
import TermsModal from "./TermsModal";

function SubscriptionExpiredOverlay() {
    const {
        isExpired,
        isSuperuser,
        subscription,
        refreshSubscription,
        clearSubscription,
        startCheckout,
        isProcessingCheckout,
    } = useSubscription();

    const navigate = useNavigate();
    const location = useLocation();
    const [selectedTier, setSelectedTier] = useState("basic");
    const [billingCycle, setBillingCycle] = useState("yearly");
    const [activeCheckout, setActiveCheckout] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [termsTab, setTermsTab] = useState("terms");
    const pollIntervalRef = useRef(null);

    const currentPlanKey = `${selectedTier}_${billingCycle}`;

    const PLAN_PRICES = {
        basic_monthly: { amount: 9900, label: "$9.900", period: "/ mes", title: "Plan Básico Mensual" },
        basic_yearly: { amount: 99000, originalLabel: "$118.800", label: "$99.000", period: "/ año", monthlyEquiv: "$8.250/mes", title: "Plan Básico Anual", discount: "2 meses gratis" },
        premium_monthly: { amount: 19900, label: "$19.900", period: "/ mes", title: "Plan Premium Mensual" },
        premium_yearly: { amount: 199000, originalLabel: "$238.800", label: "$199.000", period: "/ año", monthlyEquiv: "$16.583/mes", title: "Plan Premium Anual", discount: "2 meses gratis" },
    };

    const currentPriceInfo = PLAN_PRICES[currentPlanKey] || PLAN_PRICES.basic_monthly;

    const token = localStorage.getItem("businessManagerAuthToken");
    const isAuthRoute = location.pathname === "/login" || location.pathname === "/register";

    // Auto-polling when waiting for active Mercado Pago checkout confirmation
    useEffect(() => {
        if (!activeCheckout) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        pollIntervalRef.current = setInterval(async () => {
            try {
                const updated = await refreshSubscription();
                const sub = updated?.summary || updated;
                if (sub && sub.is_valid && sub.status !== "expired" && sub.status !== "suspended") {
                    toast.success("¡Pago acreditado! Pantalla desbloqueada con éxito.");
                    setActiveCheckout(null);
                    clearInterval(pollIntervalRef.current);
                }
            } catch {
                // Silently ignore polling errors
            }
        }, 4000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [activeCheckout, refreshSubscription]);

    // Superusers, active users, or unauthenticated / auth pages are never locked out
    if (!token || isAuthRoute || !isExpired || isSuperuser) return null;

    async function handleCheckStatus() {
        setIsChecking(true);
        try {
            const updated = await refreshSubscription();
            const sub = updated?.summary || updated;
            if (sub?.is_valid && sub?.status !== "expired" && sub?.status !== "suspended") {
                toast.success("¡Licencia activa confirmada!");
                setActiveCheckout(null);
            } else if (sub?.status === "suspended") {
                toast.error("Tu cuenta sigue suspendida por la administración.", { allowWhileExpired: true });
            } else {
                toast.success("Estado verificado.");
            }
        } catch {
            toast.error("No se pudo verificar el estado.", { allowWhileExpired: true });
        } finally {
            setIsChecking(false);
        }
    }

    async function handleAutomatedCheckout() {
        try {
            const preference = await startCheckout(currentPlanKey, { openInNewTab: false });
            if (preference?.init_point) {
                setActiveCheckout(preference);
                toast.success("Código QR generado. Escaneá con tu celular o abrí la pasarela en una pestaña nueva.");
            }
        } catch {
            // Error toast handled in context
        }
    }

    async function handleLogout() {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setActiveCheckout(null);
        clearSubscription();
        await logout();
        navigate("/login", { replace: true });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fadeIn">
            <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col rounded-md border border-[var(--danger-border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--danger-bg)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--danger)] text-white shadow-sm">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--danger)]">
                                {subscription?.status === "suspended" ? "Cuenta Suspendida" : "Período de Acceso Finalizado"}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">Activación automática instantánea</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface-muted)] transition"
                    >
                        Cerrar sesión
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {subscription?.status === "suspended"
                            ? "Tu cuenta se encuentra temporalmente suspendida por la administración. Podés reactivarla abonando tu plan a continuación o comunicándote con soporte."
                            : "Tus datos de productos, clientes, ventas y stock se encuentran totalmente resguardados. Para reactivar tu acceso de inmediato, seleccioná tu plan y aboná a continuación."}
                    </p>

                    {/* PLAN SELECTION */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div
                            onClick={() => setSelectedTier("basic")}
                            className={`cursor-pointer rounded-md border p-3.5 transition ${
                                selectedTier === "basic"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                            }`}
                        >
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Básico</span>
                            <div className="mt-1.5">
                                {billingCycle === "yearly" ? (
                                    <div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-[var(--text-secondary)] line-through decoration-red-500/80 decoration-2">
                                                $118.800
                                            </span>
                                            <span className="text-lg font-black text-[var(--text-primary)]">
                                                $99.000
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                / año
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                            $8.250/mes (Ahorro 2 meses)
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-lg font-black text-[var(--text-primary)] block">
                                        $9.900
                                        <span className="text-xs font-medium text-[var(--text-secondary)]"> / mes</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div
                            onClick={() => setSelectedTier("premium")}
                            className={`relative cursor-pointer rounded-md border p-3.5 transition ${
                                selectedTier === "premium"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                            }`}
                        >
                            <div className="absolute -top-2 right-2 rounded-sm bg-[var(--primary)] px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                                Recomendado
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Premium</span>
                            <div className="mt-1.5">
                                {billingCycle === "yearly" ? (
                                    <div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-[var(--text-secondary)] line-through decoration-red-500/80 decoration-2">
                                                $238.800
                                            </span>
                                            <span className="text-lg font-black text-[var(--text-primary)]">
                                                $199.000
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                / año
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                            $16.583/mes (Ahorro 2 meses)
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-lg font-black text-[var(--text-primary)] block">
                                        $19.900
                                        <span className="text-xs font-medium text-[var(--text-secondary)]"> / mes</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BILLING CYCLE SELECTOR */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setBillingCycle("monthly")}
                            className={`flex-1 rounded-md border py-2 px-3 text-xs font-bold transition ${
                                billingCycle === "monthly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                            }`}
                        >
                            Mensual
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("yearly")}
                            className={`flex-1 rounded-md border py-2 px-3 text-xs font-bold transition ${
                                billingCycle === "yearly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                            }`}
                        >
                            Anual (Ahorro 2 meses)
                        </button>
                    </div>

                    {/* AUTOMATED CHECKOUT & QR DISPLAY */}
                    <div className="rounded-md border-2 border-[var(--primary)]/40 bg-[var(--primary)]/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                {currentPriceInfo.title} ({currentPriceInfo.label})
                            </span>
                            <span className="rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Desbloqueo Automático
                            </span>
                        </div>

                        {activeCheckout ? (
                            <div className="space-y-3 animate-fadeIn">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Orden generada para <strong>{currentPriceInfo.title} ({currentPriceInfo.label})</strong>. Podés escanear el QR desde tu celular o continuar en una pestaña nueva.
                                </p>

                                {/* QR CODE CARD */}
                                <div className="flex flex-col items-center justify-center p-3.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-center space-y-2.5 shadow-xs">
                                    <div className="bg-white p-2.5 rounded-md shadow-inner border border-slate-200 inline-block">
                                        <QRCodeSVG
                                            value={activeCheckout.init_point}
                                            size={160}
                                            level="M"
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">
                                            Escanear con Celular
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)]">
                                            Cámara, app de <strong>Mercado Pago</strong> o tu banco favorito (QR interoperable).
                                        </p>
                                    </div>

                                    {/* STATUS PULSE */}
                                    <div className="flex items-center justify-center gap-2 pt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </span>
                                        <span>Esperando acreditación... Se desbloqueará sola.</span>
                                    </div>
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => window.open(activeCheckout.init_point, "_blank", "noopener,noreferrer")}
                                        className="w-full rounded-md bg-[var(--primary)] py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition flex items-center justify-center gap-2"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                        <span>Abrir Mercado Pago</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCheckStatus}
                                        disabled={isChecking}
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-2 px-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <svg className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                        <span>{isChecking ? "Verificando..." : "Verificar ahora"}</span>
                                    </button>
                                </div>

                                <div className="text-center pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCheckout(null)}
                                        className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition"
                                    >
                                        ← Cambiar de plan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Aboná con <strong>Mercado Pago</strong>, <strong>Tarjetas de Débito / Crédito</strong> o <strong>QR Interoperable</strong> desde cualquier banco. Al pagar, tu pantalla se desbloquea al instante.
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
                                            <span>Generar QR ({currentPriceInfo.title} - {currentPriceInfo.label})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <div className="text-[11px] text-[var(--text-secondary)] text-center sm:text-left">
                        <button
                            type="button"
                            onClick={() => {
                                setTermsTab("terms");
                                setIsTermsOpen(true);
                            }}
                            className="font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] hover:underline"
                        >
                            Términos del Servicio & Privacidad
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isChecking}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition flex items-center gap-1.5 shrink-0"
                    >
                        <svg
                            className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>{isChecking ? "Verificando..." : "Verificar Estado"}</span>
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

export default SubscriptionExpiredOverlay;
