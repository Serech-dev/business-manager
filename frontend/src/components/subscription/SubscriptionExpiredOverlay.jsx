import { useState } from "react";
import toast from "react-hot-toast";
import { logout } from "../../services/auth";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

function SubscriptionExpiredOverlay() {
    const {
        isExpired,
        isSuperuser,
        subscription,
        refreshSubscription,
        startCheckout,
        isProcessingCheckout,
        submitPayment,
        isSubmittingPayment,
        hasPendingPayment,
        myPayments,
    } = useSubscription();

    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState("yearly");
    const [showManualTransfer, setShowManualTransfer] = useState(false);
    const [referenceCode, setReferenceCode] = useState("");
    const [payerNotes, setPayerNotes] = useState("");
    const [copiedField, setCopiedField] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    // Superusers or active users are never locked out
    if (!isExpired || isSuperuser) return null;

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

    async function handleCheckStatus() {
        setIsChecking(true);
        try {
            await refreshSubscription();
            toast.success("Estado verificado.");
        } catch {
            toast.error("No se pudo verificar el estado.");
        } finally {
            setIsChecking(false);
        }
    }

    async function handleAutomatedCheckout() {
        try {
            await startCheckout(selectedPlan);
        } catch {
            // Error toast handled in context
        }
    }

    async function handleLogout() {
        await logout();
        navigate("/login");
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
            // Error handled in context
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col rounded-lg border border-[var(--danger-border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
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
                        Tus datos de productos, clientes, ventas y stock se encuentran totalmente resguardados. Para reactivar tu acceso de inmediato, seleccioná tu plan y aboná a continuación.
                    </p>

                    {/* PENDING NOTIFICATION BANNER */}
                    {hasPendingPayment && (
                        <div className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-xs text-[var(--text-primary)]">
                            <div className="flex items-center gap-2 font-bold text-[var(--warning)]">
                                <span className="h-2 w-2 rounded-full bg-[var(--warning)] animate-ping" />
                                <span>Aviso de pago enviado y en proceso de revisión</span>
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                El administrador está revisando tu comprobante (Ref: {myPayments.find((p) => p.status === "pending")?.reference_code}). Podés pulsar "Verificar Estado" una vez acreditado.
                            </p>
                        </div>
                    )}

                    {/* PLAN SELECTION */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div
                            onClick={() => setSelectedPlan("monthly")}
                            className={`cursor-pointer rounded-md border p-3.5 transition ${
                                selectedPlan === "monthly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                            }`}
                        >
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Mensual</span>
                            <span className="text-xl font-black text-[var(--text-primary)] mt-1 block">$10.000 <span className="text-xs font-medium text-[var(--text-secondary)]">/ mes</span></span>
                        </div>

                        <div
                            onClick={() => setSelectedPlan("yearly")}
                            className={`relative cursor-pointer rounded-md border p-3.5 transition ${
                                selectedPlan === "yearly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                    : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
                            }`}
                        >
                            <div className="absolute -top-2 right-2 rounded bg-[var(--primary)] px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                                2 meses gratis
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Anual</span>
                            <span className="text-xl font-black text-[var(--text-primary)] mt-1 block">$100.000 <span className="text-xs font-medium text-[var(--text-secondary)]">/ año</span></span>
                        </div>
                    </div>

                    {/* 1-CLICK AUTOMATED CHECKOUT */}
                    <div className="rounded-md border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                                Pago Instantáneo (Recomendado)
                            </span>
                            <span className="rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Desbloqueo Automático
                            </span>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Aboná con <strong>Mercado Pago</strong>, <strong>Tarjetas de Débito / Crédito</strong>, o transferencia desde <strong>cualquier Banco o Billetera Virtual</strong> (vía QR / CVU interoperable). Al pagar, tu pantalla se desbloquea al instante.
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
                                    <span>Pagar ${selectedPlan === "yearly" ? "100.000 (Plan Anual)" : "10.000 (Plan Mensual)"} con Mercado Pago</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* MANUAL TRANSFER ACCORDION */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowManualTransfer(!showManualTransfer)}
                            className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-[var(--surface)]"
                        >
                            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                O transferir manualmente e informar comprobante
                            </span>
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
                            <div className="border-t border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
                                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] p-2">
                                    <div>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase">Alias</p>
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

                                <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                            N° de Comprobante / Referencia
                                        </label>
                                        <input
                                            type="text"
                                            value={referenceCode}
                                            onChange={(e) => setReferenceCode(e.target.value)}
                                            placeholder="Ej: 8741295 o Banco Galicia"
                                            required
                                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingPayment}
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-accent)] py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition"
                                    >
                                        {isSubmittingPayment ? "Enviando aviso..." : "Informar Comprobante Manual"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isChecking}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition flex items-center gap-1.5"
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

                    <a
                        href={`mailto:${paymentInfo.email_contact}`}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                    >
                        Ayuda / Contacto
                    </a>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionExpiredOverlay;

