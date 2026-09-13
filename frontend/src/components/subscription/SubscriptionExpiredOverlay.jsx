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
        submitPayment,
        isSubmittingPayment,
        hasPendingPayment,
        myPayments,
    } = useSubscription();

    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState("yearly");
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
        } catch {
            // Error handled in context
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--danger-border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--danger-bg)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)] text-white shadow-sm">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--danger)]">
                                {subscription?.status === "suspended" ? "Cuenta Suspendida" : "Período de Acceso Vencido"}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">Renová tu suscripción para continuar operando</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface-muted)] transition"
                    >
                        Cerrar sesión
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Tus datos de productos, clientes, ventas y stock se encuentran seguros. Para continuar registrando movimientos y consultando información, transferí el importe de tu plan y notificanos a continuación.
                    </p>

                    {/* PENDING NOTIFICATION BANNER */}
                    {hasPendingPayment && (
                        <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-xs text-[var(--text-primary)]">
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
                            className={`cursor-pointer rounded-xl border p-3.5 transition ${
                                selectedPlan === "monthly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/30"
                                    : "border-[var(--border)] bg-[var(--background)]"
                            }`}
                        >
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Mensual</span>
                            <span className="text-xl font-extrabold text-[var(--text-primary)] mt-1 block">$10.000 <span className="text-xs font-medium text-[var(--text-secondary)]">/ mes</span></span>
                        </div>

                        <div
                            onClick={() => setSelectedPlan("yearly")}
                            className={`relative cursor-pointer rounded-xl border p-3.5 transition ${
                                selectedPlan === "yearly"
                                    ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/30"
                                    : "border-[var(--border)] bg-[var(--background)]"
                            }`}
                        >
                            <div className="absolute -top-2 right-2 rounded-full bg-[var(--primary)] px-2 py-0.2 text-[9px] font-bold text-white uppercase">
                                2 meses gratis
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">Plan Anual</span>
                            <span className="text-xl font-extrabold text-[var(--text-primary)] mt-1 block">$100.000 <span className="text-xs font-medium text-[var(--text-secondary)]">/ año</span></span>
                        </div>
                    </div>

                    {/* TRANSFER DATA */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-primary)]">Datos para transferir:</span>
                            <span className="font-bold text-[var(--primary)]">${selectedPlan === "yearly" ? "100.000" : "10.000"} ARS</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                            <div>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase">Alias Mercado Pago / Banco</p>
                                <p className="font-mono font-bold text-xs text-[var(--text-primary)]">{paymentInfo.alias}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(paymentInfo.alias, "Alias")}
                                className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--primary)] hover:text-white transition"
                            >
                                {copiedField === "Alias" ? "Copiado!" : "Copiar"}
                            </button>
                        </div>
                    </div>

                    {/* NOTIFY FORM */}
                    <form onSubmit={handlePaymentSubmit} className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                N° de Comprobante / Referencia de Transferencia
                            </label>
                            <input
                                type="text"
                                value={referenceCode}
                                onChange={(e) => setReferenceCode(e.target.value)}
                                placeholder="Ej: 8741295 o Banco Galicia"
                                required
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingPayment}
                            className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
                        >
                            {isSubmittingPayment ? "Enviando aviso..." : "Notificar Pago Realizado"}
                        </button>
                    </form>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isChecking}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition flex items-center gap-1.5"
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

