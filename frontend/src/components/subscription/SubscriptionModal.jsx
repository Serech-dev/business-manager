import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSubscription } from "../../context/SubscriptionContext";

function SubscriptionModal({ isOpen, onClose }) {
    const {
        subscription,
        isExpired,
        isTrial,
        daysRemaining,
        refreshSubscription,
        submitPayment,
        isSubmittingPayment,
        hasPendingPayment,
        myPayments,
    } = useSubscription();

    const [selectedPlan, setSelectedPlan] = useState("yearly");
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
        } catch {
            // Toast is handled in context
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
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Suscripción & Licencia</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Administración de tu plan de servicio</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
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
                        className={`rounded-xl border p-4 transition ${
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
                                        "Tu período de acceso ha vencido. Para continuar utilizando el sistema, seleccioná un plan y transferí el importe."
                                    ) : isTrial ? (
                                        `Estás en el período de prueba gratuita de 14 días. Te quedan ${daysRemaining} días.`
                                    ) : (
                                        `Tu licencia está activa (${subscription?.plan_display}). Vence el ${formatDate(subscription?.expires_at)}.`
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-accent)] disabled:opacity-50"
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
                        <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--text-primary)] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[var(--warning)] animate-ping" />
                                <span className="font-semibold">
                                    Tenés un aviso de pago pendiente de revisión por el administrador.
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
                            Seleccioná tu Plan de Renovación
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* PLAN MENSUAL */}
                            <div
                                onClick={() => setSelectedPlan("monthly")}
                                className={`relative cursor-pointer rounded-xl border p-4 transition ${
                                    selectedPlan === "monthly"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/30"
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
                                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$10.000</span>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium"> / mes</span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Flexibilidad mes a mes. Acceso completo a stock, caja, métricas y reportes.
                                </p>
                            </div>

                            {/* PLAN ANUAL */}
                            <div
                                onClick={() => setSelectedPlan("yearly")}
                                className={`relative cursor-pointer rounded-xl border p-4 transition ${
                                    selectedPlan === "yearly"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/30"
                                        : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                                }`}
                            >
                                <div className="absolute -top-2.5 right-4 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                                    Ahorrás $20.000
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">Plan Anual</span>
                                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan === "yearly" ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>
                                        {selectedPlan === "yearly" && <span className="h-2 w-2 rounded-full bg-white" />}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">$100.000</span>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium"> / año</span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Equivale a <strong>$8.333/mes</strong> (2 meses bonificados). Congelás el precio por 1 año.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT INSTRUCTIONS / TRANSFER DETAILS */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Datos para Transferencia Bancaria / MP
                            </h4>
                            <span className="text-[11px] font-semibold text-[var(--primary)]">
                                Importe a transferir: ${selectedPlan === "yearly" ? "100.000" : "10.000"} ARS
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                            {/* ALIAS */}
                            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                                <div>
                                    <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase">Alias Mercado Pago / Banco</p>
                                    <p className="font-mono font-bold text-sm text-[var(--text-primary)]">{paymentInfo.alias}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(paymentInfo.alias, "Alias")}
                                    className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary)] hover:text-white transition"
                                >
                                    {copiedField === "Alias" ? "Copiado!" : "Copiar"}
                                </button>
                            </div>

                            {/* CBU */}
                            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                                <div>
                                    <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase">CBU / CVU</p>
                                    <p className="font-mono font-bold text-xs text-[var(--text-primary)]">{paymentInfo.cbu}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(paymentInfo.cbu, "CBU")}
                                    className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary)] hover:text-white transition"
                                >
                                    {copiedField === "CBU" ? "Copiado!" : "Copiar"}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[var(--text-secondary)]">
                            <span>Titular: <strong>{paymentInfo.holder}</strong></span>
                            <span>Contacto por email: <a href={`mailto:${paymentInfo.email_contact}`} className="text-[var(--primary)] font-medium hover:underline">{paymentInfo.email_contact}</a></span>
                        </div>
                    </div>

                    {/* PAYMENT REPORT FORM */}
                    <form onSubmit={handlePaymentSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Ya transferiste? Notificá tu pago aquí
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Ingresá el número de operación de tu comprobante. Nuestro panel lo revisará para habilitar tu cuenta al instante.
                        </p>

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
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
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
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingPayment}
                            className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50 transition flex items-center justify-center gap-2"
                        >
                            {isSubmittingPayment ? (
                                <span>Enviando notificación...</span>
                            ) : (
                                <span>Notificar Pago de ${selectedPlan === "yearly" ? "100.000 (Plan Anual)" : "10.000 (Plan Mensual)"}</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionModal;

