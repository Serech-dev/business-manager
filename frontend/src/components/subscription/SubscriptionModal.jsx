import { useState, useEffect } from "react";
import toast from "react-hot-toast";
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
        submitPayment,
        isSubmittingPayment,
        hasPendingPayment,
        myPayments,
    } = useSubscription();

    const [selectedPlan, setSelectedPlan] = useState("yearly");
    const [showManualTransfer, setShowManualTransfer] = useState(false);
    const [referenceCode, setReferenceCode] = useState("");
    const [payerNotes, setPayerNotes] = useState("");
    const [copiedField, setCopiedField] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (subscription?.plan === "monthly") {
            setSelectedPlan("monthly");
        } else {
            setSelectedPlan("yearly");
        }
    }, [subscription]);

    if (!isOpen) return null;

    const paymentInfo = subscription?.payment_info || {
        alias: "gestor.negocios.mp",
        cbu: "0000003100010000000000",
        holder: "Business Manager Payments",
        email_contact: "soporte.businessmanager@gmail.com",
        monthly_price: 10000,
        yearly_price: 100000,
    };

    function copyToClipboard(text, fieldName) {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`${fieldName} copiado al portapapeles.`);
        setTimeout(() => setCopiedField(null), 2500);
    }

    async function handleRefresh() {
        setIsRefreshing(true);
        try {
            await refreshSubscription();
            toast.success("Estado de licencia actualizado.");
        } catch {
            toast.error("No se pudo verificar el estado.");
        } finally {
            setIsRefreshing(false);
        }
    }

    async function handleAutomatedCheckout() {
        try {
            await startCheckout(selectedPlan);
        } catch {
            // Error toast handled in context
        }
    }

    async function handlePaymentSubmit(e) {
        e.preventDefault();
        const amount = selectedPlan === "yearly" ? paymentInfo.yearly_price : paymentInfo.monthly_price;

        try {
            await submitPayment({
                plan: selectedPlan,
                amount,
                reference_code: referenceCode.trim(),
                payer_notes: payerNotes.trim(),
            });
            setReferenceCode("");
            setPayerNotes("");
            setShowManualTransfer(false);
        } catch {
            // Toast handled in context
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
                            <p className="text-xs text-[var(--text-secondary)]">Activación automática o renovación del plan</p>
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
                            isExpired
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
                                    {isExpired ? (
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

                    {/* PENDING PAYMENT NOTICE IF ANY */}
                    {hasPendingPayment && (
                        <div className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--text-primary)] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[var(--warning)] animate-ping" />
                                <span className="font-semibold">
                                    Tenés un aviso de pago pendiente de revisión.
                                </span>
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                                Ref: {myPayments.find((p) => p.status === "pending")?.reference_code || "Enviado"}
                            </span>
                        </div>
                    )}

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

                    {/* 1-CLICK AUTOMATED CHECKOUT */}
                    <div className="rounded-md border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                2. Pago Instantáneo & Activación Automática
                            </h3>
                            <span className="rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Activación Inmediata
                            </span>
                        </div>

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
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                    </svg>
                                    <span>Pagar ${selectedPlan === "yearly" ? "100.000 (Plan Anual)" : "10.000 (Plan Mensual)"} con Mercado Pago / Tarjetas</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* MANUAL TRANSFER ACCORDION */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowManualTransfer(!showManualTransfer)}
                            className="w-full flex items-center justify-between p-4 text-left transition hover:bg-[var(--surface)]"
                        >
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                    O transferir manualmente e informar comprobante
                                </span>
                            </div>
                            <svg
                                className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200 ${showManualTransfer ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {showManualTransfer && (
                            <div className="border-t border-[var(--border)] p-4 space-y-4 bg-[var(--surface)]">
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                                    {/* ALIAS */}
                                    <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5">
                                        <div>
                                            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase">Alias</p>
                                            <p className="font-mono font-bold text-xs text-[var(--text-primary)]">{paymentInfo.alias}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(paymentInfo.alias, "Alias")}
                                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary)] hover:text-white transition"
                                        >
                                            {copiedField === "Alias" ? "Copiado!" : "Copiar"}
                                        </button>
                                    </div>

                                    {/* CBU */}
                                    <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] p-2.5">
                                        <div>
                                            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase">CBU / CVU</p>
                                            <p className="font-mono font-bold text-xs text-[var(--text-primary)]">{paymentInfo.cbu}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(paymentInfo.cbu, "CBU")}
                                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary)] hover:text-white transition"
                                        >
                                            {copiedField === "CBU" ? "Copiado!" : "Copiar"}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                                    <span>Titular: <strong>{paymentInfo.holder}</strong></span>
                                    <span>Contacto: <a href={`mailto:${paymentInfo.email_contact}`} className="text-[var(--primary)] font-medium hover:underline">{paymentInfo.email_contact}</a></span>
                                </div>

                                <form onSubmit={handlePaymentSubmit} className="pt-2 border-t border-[var(--border)] space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                        Informar Transferencia
                                    </h4>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                                N° de Comprobante / Referencia
                                            </label>
                                            <input
                                                type="text"
                                                value={referenceCode}
                                                onChange={(e) => setReferenceCode(e.target.value)}
                                                placeholder="Ej: 98451234 o Banco Galicia"
                                                required
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                                Nota adicional (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={payerNotes}
                                                onChange={(e) => setPayerNotes(e.target.value)}
                                                placeholder="Ej: Transferí desde cuenta de Juan Pérez"
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingPayment}
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-accent)] py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition"
                                    >
                                        {isSubmittingPayment ? "Enviando aviso..." : "Informar Comprobante para Aprobación Manual"}
                                    </button>
                                </form>
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


