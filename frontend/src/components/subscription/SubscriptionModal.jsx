import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useSubscription } from "../../context/SubscriptionContext";

function SubscriptionModal({ isOpen, onClose }) {
    const {
        subscription,
        isExpired,
        isTrial,
        isSuperuser,
        daysRemaining,
        refreshSubscription,
        startCheckout,
        isProcessingCheckout,
    } = useSubscription();

    const [selectedPlan, setSelectedPlan] = useState("yearly");
    const [activeCheckout, setActiveCheckout] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pollIntervalRef = useRef(null);

    // Only initialize plan once when modal opens, never overwrite user's manual selection during polling
    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            if (subscription?.plan === "monthly") {
                setSelectedPlan("monthly");
            } else {
                setSelectedPlan("yearly");
            }
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, subscription?.plan]);

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
            const preference = await startCheckout(selectedPlan, { openInNewTab: false });
            if (preference?.init_point) {
                setActiveCheckout(preference);
                toast.success("Código QR generado.");
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Suscripción & Licencia</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Activación y renovación automática con Mercado Pago</p>
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

                {/* BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider">Estado Actual:</span>
                                    <span className="rounded px-2 py-0.5 text-xs font-black uppercase tracking-wide bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]">
                                        {subscription?.status_display || "Prueba"}
                                    </span>
                                </div>

                                <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                                    {subscription?.status === "suspended" ? (
                                        "Tu cuenta se encuentra suspendida por la administración. Aboná tu plan a continuación o comunicate con soporte para reactivar el acceso."
                                    ) : isExpired ? (
                                        "Tu período de acceso ha finalizado. Aboná tu plan para continuar utilizando el sistema sin interrupciones."
                                    ) : isSuperuser ? (
                                        "Tenés acceso total ilimitado como Administrador del sistema."
                                    ) : isTrial ? (
                                        `Estás en el período de prueba gratuita de 14 días. Te quedan ${daysRemaining ?? 0} días.`
                                    ) : subscription?.plan === "lifetime" ? (
                                        "Tu cuenta cuenta con una Licencia Vitalicia activa sin fecha de vencimiento."
                                    ) : (
                                        `Tu licencia está activa (${subscription?.plan_display}). Vence el ${formatDate(subscription?.expires_at)}.`
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-accent)] disabled:opacity-50"
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

                    {/* PRICING PLANS */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                            1. Seleccioná tu Plan de Suscripción
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* PLAN MENSUAL */}
                            <div
                                onClick={() => setSelectedPlan("monthly")}
                                className={`relative cursor-pointer rounded-md border p-4 transition ${
                                    selectedPlan === "monthly"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">Plan Mensual</span>
                                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan === "monthly" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                        {selectedPlan === "monthly" && <span className="h-2 w-2 rounded-full bg-white" />}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-2xl font-black text-[var(--text-primary)]">$10.000</span>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium"> / mes</span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Renovación por 30 días. Acceso total a stock, caja, métricas y reportes.
                                </p>
                            </div>

                            {/* PLAN ANUAL */}
                            <div
                                onClick={() => setSelectedPlan("yearly")}
                                className={`relative cursor-pointer rounded-md border p-4 transition ${
                                    selectedPlan === "yearly"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                        : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                                }`}
                            >
                                <div className="absolute -top-2.5 right-4 rounded bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                                    2 meses gratis
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">Plan Anual</span>
                                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan === "yearly" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                        {selectedPlan === "yearly" && <span className="h-2 w-2 rounded-full bg-white" />}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-2xl font-black text-[var(--text-primary)]">$100.000</span>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium"> / año</span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Equivale a <strong>$8.333/mes</strong> (ahorrás $20.000). Congelás el precio por 1 año.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AUTOMATED CHECKOUT & QR DISPLAY */}
                    <div className="rounded-md border-2 border-[var(--primary)]/40 bg-[var(--primary)]/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                2. Pago Instantáneo & Activación Automática
                            </h3>
                            <span className="rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Activación Inmediata
                            </span>
                        </div>

                        {activeCheckout ? (
                            <div className="space-y-4 animate-fadeIn">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Se ha generado tu orden de pago para el <strong>{selectedPlan === "yearly" ? "Plan Anual ($100.000)" : "Plan Mensual ($10.000)"}</strong>. Podés escanear el código QR con tu celular o abrir la pasarela en una pestaña nueva.
                                </p>

                                {/* QR CODE CARD */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] text-center space-y-3 shadow-sm">
                                    <div className="bg-white p-3 rounded-md shadow-inner border border-slate-200 inline-block">
                                        <QRCodeSVG
                                            value={activeCheckout.init_point}
                                            size={170}
                                            level="M"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">
                                            Escanear con tu Celular
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                                            Apuntá con la cámara de tu teléfono, la app de <strong>Mercado Pago</strong> o tu billetera bancaria.
                                        </p>
                                    </div>

                                    {/* STATUS PULSE */}
                                    <div className="flex items-center justify-center gap-2 pt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </span>
                                        <span>Esperando acreditación... Se actualizará automáticamente.</span>
                                    </div>
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => window.open(activeCheckout.init_point, "_blank", "noopener,noreferrer")}
                                        className="w-full rounded-md bg-[var(--primary)] py-2.5 px-3 text-xs font-bold text-white shadow hover:bg-[var(--primary-hover)] transition flex items-center justify-center gap-2"
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
                                        ← Cambiar de plan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Aboná de forma segura con tu cuenta de <strong>Mercado Pago</strong>, <strong>Tarjeta de Débito / Crédito</strong>, o transferencia desde <strong>cualquier Banco o Billetera Virtual</strong> (vía QR interoperable / CVU). Al completarse, tu licencia se activa al instante sin esperas.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleAutomatedCheckout}
                                    disabled={isProcessingCheckout}
                                    className="w-full rounded-md bg-[var(--primary)] py-3 text-sm font-bold text-white shadow-md hover:bg-[var(--primary-hover)] disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {isProcessingCheckout ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                            </svg>
                                            <span>Conectando con pasarela de pago...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75ZM6.75 16.5h.008v.008H6.75V16.5ZM16.5 6.75h.008v.008H16.5V6.75ZM13.5 13.5h3v3h-3v-3ZM13.5 19.5h6v-3h-3v3h-3ZM19.5 13.5h.008v.008H19.5V13.5Z" />
                                            </svg>
                                            <span>Generar QR de Pago (${selectedPlan === "yearly" ? "100.000 Plan Anual" : "10.000 Plan Mensual"})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionModal;
