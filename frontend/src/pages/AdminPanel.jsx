import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    getAdminStores,
    manageAdminSubscription,
    getAdminPayments,
    reviewAdminPayment,
} from "../services/auth";
import { useSubscription } from "../context/SubscriptionContext";

function AdminPanel() {
    const navigate = useNavigate();
    const { isSuperuser, refreshSubscription } = useSubscription();

    const [stores, setStores] = useState([]);
    const [summary, setSummary] = useState(null);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [processingAction, setProcessingAction] = useState(null);

    // Manual Edit Modal State
    const [editingStore, setEditingStore] = useState(null);
    const [manualDate, setManualDate] = useState("");
    const [manualNotes, setManualNotes] = useState("");
    const [isSavingManual, setIsSavingManual] = useState(false);

    const loadAdminData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [storesData, paymentsData] = await Promise.all([
                getAdminStores(searchQuery, statusFilter),
                getAdminPayments("pending").catch(() => []),
            ]);

            setStores(storesData.stores || []);
            setSummary(storesData.summary || null);
            setPayments(paymentsData || []);
        } catch (error) {
            console.error("Error cargando panel de dueño:", error);
            toast.error("No se pudo cargar la información del panel de administración.");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        const storedUser = localStorage.getItem("businessManagerAuthUser");
        let isUserSuper = isSuperuser;
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (u.is_superuser) isUserSuper = true;
            } catch {
                // ignore
            }
        }

        if (!isUserSuper && !isLoading) {
            toast.error("Acceso restringido exclusivamente a administradores.");
            navigate("/");
            return;
        }

        loadAdminData();
    }, [isSuperuser, navigate, loadAdminData]);

    async function handleQuickAction(userId, action, payload = {}) {
        setProcessingAction(`${userId}-${action}`);
        try {
            await manageAdminSubscription(userId, { action, ...payload });
            toast.success("Licencia actualizada con éxito.");
            await loadAdminData();
            await refreshSubscription();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar la licencia.");
        } finally {
            setProcessingAction(null);
        }
    }

    async function handleReviewPayment(paymentId, decision) {
        setProcessingAction(`payment-${paymentId}-${decision}`);
        try {
            await reviewAdminPayment(paymentId, { decision });
            toast.success(decision === "approve" ? "Pago aprobado y licencia extendida." : "Pago rechazado.");
            await loadAdminData();
            await refreshSubscription();
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar el pago.");
        } finally {
            setProcessingAction(null);
        }
    }

    function openManualEdit(store) {
        setEditingStore(store);
        const sub = store.subscription;
        if (sub.expires_at) {
            const d = new Date(sub.expires_at);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            setManualDate(`${yyyy}-${mm}-${dd}`);
        } else {
            setManualDate("");
        }
        setManualNotes(sub.notes || "");
    }

    async function handleSaveManual(e) {
        e.preventDefault();
        if (!editingStore) return;

        setIsSavingManual(true);
        try {
            if (manualDate) {
                await manageAdminSubscription(editingStore.user_id, {
                    action: "set_expiration",
                    expires_at: new Date(manualDate).toISOString(),
                    notes: manualNotes,
                });
            } else {
                await manageAdminSubscription(editingStore.user_id, {
                    action: "custom_extend",
                    days: 30,
                    notes: manualNotes,
                });
            }
            toast.success("Licencia y notas actualizadas.");
            setEditingStore(null);
            await loadAdminData();
        } catch (error) {
            console.error(error);
            toast.error("No se pudo guardar la modificación.");
        } finally {
            setIsSavingManual(false);
        }
    }

    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
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
        <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 space-y-6">
            {/* TOP BAR */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[var(--primary)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--primary)] uppercase tracking-wider border border-[var(--primary)]/30">
                            Superadmin
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                            Panel de Control de Comercios
                        </h1>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Gestión de clientes, licencias, cobros y monitoreo general de uso.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadAdminData}
                        disabled={isLoading}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-sm flex items-center gap-2"
                    >
                        <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>Actualizar datos</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[var(--primary-hover)] transition"
                    >
                        Ir al Sistema →
                    </button>
                </div>
            </div>

            {/* HIGH-LEVEL METRICS */}
            {summary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Comercios</p>
                        <p className="mt-1 text-2xl font-extrabold text-[var(--text-primary)]">{summary.total_stores}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">Licencias Activas</p>
                        <p className="mt-1 text-2xl font-extrabold text-[var(--success)]">{summary.active_count}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">Pruebas Activas</p>
                        <p className="mt-1 text-2xl font-extrabold text-[var(--warning)]">{summary.trial_count}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)]">Vencidos / Suspendidos</p>
                        <p className="mt-1 text-2xl font-extrabold text-[var(--danger)]">{summary.expired_count + summary.suspended_count}</p>
                    </div>

                    <div className={`rounded-xl border p-4 shadow-sm ${summary.pending_payments_count > 0 ? "border-[var(--warning-border)] bg-[var(--warning-bg)] animate-pulse" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pagos Pendientes</p>
                        <p className="mt-1 text-2xl font-extrabold text-[var(--primary)]">{summary.pending_payments_count}</p>
                    </div>
                </div>
            )}

            {/* PENDING PAYMENTS QUEUE */}
            {payments.length > 0 && (
                <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--surface)] shadow-md overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3 bg-[var(--warning-bg)]">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)] animate-ping" />
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">
                                Avisos de Pago Pendientes de Aprobación ({payments.length})
                            </h2>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">Revisá y aprobá para extender la suscripción al instante</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                                <tr>
                                    <th className="px-5 py-3">Comercio</th>
                                    <th className="px-4 py-3">Plan Solicitado</th>
                                    <th className="px-4 py-3">Importe</th>
                                    <th className="px-4 py-3">N° Referencia</th>
                                    <th className="px-4 py-3">Fecha de Aviso</th>
                                    <th className="px-4 py-3">Nota Cliente</th>
                                    <th className="px-5 py-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-[var(--surface-accent)] transition">
                                        <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">{p.user_email}</td>
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{p.plan_display}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-[var(--success)]">${Number(p.amount).toLocaleString("es-AR")}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-[var(--primary)]">{p.reference_code || "Sin ref"}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(p.created_at)}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)] italic max-w-xs truncate">{p.payer_notes || "-"}</td>
                                        <td className="px-5 py-3 text-right space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => handleReviewPayment(p.id, "approve")}
                                                disabled={Boolean(processingAction)}
                                                className="rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                                            >
                                                Aprobar Pago
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReviewPayment(p.id, "reject")}
                                                disabled={Boolean(processingAction)}
                                                className="rounded-lg border border-[var(--danger-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] disabled:opacity-50 transition"
                                            >
                                                Rechazar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STORES LIST & MANAGEMENT */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md overflow-hidden space-y-4">
                {/* FILTER CONTROLS */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por email o usuario..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <svg className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: "Todos", value: "" },
                            { label: "Activos", value: "active" },
                            { label: "Pruebas", value: "trial" },
                            { label: "Vencidos", value: "expired" },
                            { label: "Suspendidos", value: "suspended" },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setStatusFilter(tab.value)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                    statusFilter === tab.value
                                        ? "bg-[var(--primary)] text-white shadow-sm"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                            <tr>
                                <th className="px-5 py-3">Comercio</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Vencimiento</th>
                                <th className="px-4 py-3">Uso (Ventas / Prods)</th>
                                <th className="px-4 py-3">Última Actividad</th>
                                <th className="px-5 py-3 text-right">Acciones Rápidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {stores.map((store) => {
                                const sub = store.subscription;
                                const isBusy = processingAction?.startsWith(`${store.user_id}-`);

                                return (
                                    <tr key={store.user_id} className="hover:bg-[var(--surface-accent)] transition">
                                        <td className="px-5 py-3.5">
                                            <div className="font-bold text-[var(--text-primary)]">{store.email || store.username}</div>
                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                Registrado: {formatDate(store.date_joined)}
                                                {store.is_superuser && <span className="ml-1 text-[var(--primary)] font-bold">(Admin)</span>}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                    sub.status === "active"
                                                        ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                                                        : sub.status === "trial"
                                                        ? "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]"
                                                        : "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]"
                                                }`}
                                            >
                                                {sub.status_display}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5 font-medium text-[var(--text-primary)]">
                                            {sub.plan_display}
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <div className="font-semibold text-[var(--text-primary)]">
                                                {sub.plan === "lifetime" ? "Vitalicio" : formatDate(sub.expires_at)}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                {sub.plan === "lifetime" ? "Sin expiración" : `${sub.days_remaining} días restantes`}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="font-semibold text-[var(--text-primary)]">
                                                {store.metrics.transactions_count} ventas
                                            </span>
                                            <span className="text-[var(--text-secondary)]"> · {store.metrics.products_count} prods</span>
                                        </td>

                                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                                            {formatDate(store.metrics.last_activity)}
                                        </td>

                                        <td className="px-5 py-3.5 text-right space-x-1.5">
                                            {/* EXTEND +1 MONTH */}
                                            <button
                                                type="button"
                                                onClick={() => handleQuickAction(store.user_id, "extend_30")}
                                                disabled={isBusy}
                                                className="rounded-lg border border-[var(--success-border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--success)] hover:bg-[var(--success-bg)] disabled:opacity-50 transition"
                                                title="Extender 30 días (Plan Mensual $10k)"
                                            >
                                                +1 Mes
                                            </button>

                                            {/* EXTEND +1 YEAR */}
                                            <button
                                                type="button"
                                                onClick={() => handleQuickAction(store.user_id, "extend_365")}
                                                disabled={isBusy}
                                                className="rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 transition"
                                                title="Extender 365 días (Plan Anual $100k)"
                                            >
                                                +1 Año
                                            </button>

                                            {/* TRIAL 14 */}
                                            <button
                                                type="button"
                                                onClick={() => handleQuickAction(store.user_id, "activate_trial")}
                                                disabled={isBusy}
                                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition"
                                                title="Reiniciar prueba gratuita de 14 días"
                                            >
                                                14d
                                            </button>

                                            {/* SUSPEND / REACTIVATE */}
                                            {sub.status === "suspended" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAction(store.user_id, "reactivate")}
                                                    disabled={isBusy}
                                                    className="rounded-lg bg-[var(--success)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
                                                >
                                                    Reactivar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAction(store.user_id, "suspend")}
                                                    disabled={isBusy}
                                                    className="rounded-lg border border-[var(--danger-border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] disabled:opacity-50 transition"
                                                    title="Suspender acceso temporalmente"
                                                >
                                                    Suspender
                                                </button>
                                            )}

                                            {/* MANUAL EDIT */}
                                            <button
                                                type="button"
                                                onClick={() => openManualEdit(store)}
                                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                                                title="Editar fecha exacta o notas"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MANUAL EDIT MODAL */}
            {editingStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                Modificar Licencia: {editingStore.email || editingStore.username}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingStore(null)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                    Fecha de Vencimiento Manual
                                </label>
                                <input
                                    type="date"
                                    value={manualDate}
                                    onChange={(e) => setManualDate(e.target.value)}
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                                    Notas Internas de Administración
                                </label>
                                <textarea
                                    rows="3"
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    placeholder="Ej: Pago realizado en efectivo el 10/09..."
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                                />
                            </div>

                            <div className="flex justify-between gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleQuickAction(editingStore.user_id, "lifetime")}
                                    className="rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                                >
                                    Licencia Vitalicia
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingStore(null)}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingManual}
                                        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;

