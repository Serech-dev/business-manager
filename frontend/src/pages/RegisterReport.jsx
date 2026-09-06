import { useEffect, useState, useMemo } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
    getMethodLabel,
    getClosedRegister,
    getCurrentRegister,
    reopenLastRegister,
    getTransactionLabel,
    resolveTransfer,
    getClients,
    createClient,
} from "../services/business";

import ConfirmDialog from "../components/ConfirmDialog";
import { formatCurrency } from "../utils/formatCurrency";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatDateLong(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(value));
}

function RegisterReport() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { requireOwnerAccess } = useDeviceSecurity();

    const [register, setRegister] = useState(null);
    const [currentRegister, setCurrentRegister] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReopening, setIsReopening] = useState(false);

    // Active detail tab: 'arqueo' | 'cuentas' | 'operaciones'
    const [activeTab, setActiveTab] = useState("arqueo");

    // Operations search & filter
    const [txSearch, setTxSearch] = useState("");
    const [txTypeFilter, setTxTypeFilter] = useState("all");

    const [transferToVoid, setTransferToVoid] = useState(null);
    const [transferToDebt, setTransferToDebt] = useState(null);
    const [clientSearch, setClientSearch] = useState("");
    const [clientResults, setClientResults] = useState([]);
    const [isResolving, setIsResolving] = useState(false);

    async function loadRegister() {
        try {
            const [data, openReg] = await Promise.all([
                getClosedRegister(id),
                getCurrentRegister(),
            ]);
            setRegister(data);
            setCurrentRegister(openReg);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cargar el cierre.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadRegister();
    }, [id]);

    async function handleResolveTransfer(transfer, action, clientId = null) {
        setIsResolving(true);
        try {
            const res = await resolveTransfer(transfer.amount_id, {
                action,
                clientId,
            });

            toast.success(res.detail || "Transferencia actualizada.");
            setTransferToVoid(null);
            setTransferToDebt(null);
            await loadRegister();
        } catch (error) {
            console.error(error);
            toast.error(
                error.response?.data?.detail || "No se pudo actualizar la transferencia."
            );
        } finally {
            setIsResolving(false);
        }
    }

    async function handleSearchClients(query) {
        setClientSearch(query);
        if (!query.trim()) {
            setClientResults([]);
            return;
        }
        try {
            const results = await getClients(query.trim());
            setClientResults(results);
        } catch (error) {
            console.error(error);
        }
    }

    function handlePrint() {
        window.print();
    }

    // Filter transactions in operations tab
    const filteredTransactions = useMemo(() => {
        if (!register?.transactions) return [];
        let list = (register.transactions || [])
            .slice()
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (txTypeFilter !== "all") {
            list = list.filter((tx) =>
                (tx.operations || []).some((op) => op.type === txTypeFilter)
            );
        }

        if (txSearch.trim()) {
            const q = txSearch.toLowerCase().trim();
            list = list.filter((tx) => {
                const desc = (tx.description || "").toLowerCase();
                const hasParticipant = (tx.operations || []).some(
                    (op) =>
                        (op.client?.name || "").toLowerCase().includes(q) ||
                        (op.provider?.name || "").toLowerCase().includes(q)
                );
                return desc.includes(q) || hasParticipant;
            });
        }

        return list;
    }, [register?.transactions, txSearch, txTypeFilter]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                Cargando informe de caja...
            </div>
        );
    }

    if (!register) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                    No se encontró el cierre de caja.
                </p>
                <button
                    type="button"
                    onClick={() => navigate("/registers")}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)]"
                >
                    Volver al historial
                </button>
            </div>
        );
    }

    const totalsByMethod = register.totals_by_method || {};
    const totalsByType = register.totals_by_type || {};
    const fiado = register.fiado || {
        new_debt: 0,
        payments: 0,
        net: 0,
        clients: [],
    };
    const provider = register.provider || {
        new_debt: 0,
        payments: 0,
        net: 0,
        providers: [],
    };
    const pendingTransfers = register.pending_transfers || [];

    const moneyIn = Number(register.money_in || 0);
    const moneyOut = Number(register.money_out || 0);
    const netMovement = Number(register.net_movement || 0);

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-24 print:p-0">
            {/* HEADER */}
            <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between print:border-none">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Informe de Cierre
                        </p>
                        <span className="rounded-md bg-[var(--surface-accent)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                            {register.transaction_count || 0} operaciones
                        </span>
                    </div>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                        Caja del {formatDateLong(register.opened_at)}
                    </h1>

                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-1.5">
                        <span>Apertura: <strong>{formatDate(register.opened_at)}</strong></span>
                        <span>·</span>
                        <span>Cierre: <strong>{formatDate(register.closed_at)}</strong></span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-accent)]"
                    >
                        <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.19-.37 3.229M6.72 13.829l-1.92 8.32a.75.75 0 0 0 .96.88l3.48-1.16 3.48 1.16a.75.75 0 0 0 .48 0l3.48-1.16 3.48 1.16a.75.75 0 0 0 .96-.88l-1.92-8.32" />
                        </svg>
                        <span>Imprimir Cierre</span>
                    </button>

                    {!currentRegister && (
                        <button
                            type="button"
                            onClick={() => {
                                requireOwnerAccess(async () => {
                                    setIsReopening(true);
                                    try {
                                        await reopenLastRegister();
                                        toast.success("Caja reabierta. Redirigiendo al panel...");
                                        navigate("/");
                                    } catch (error) {
                                        console.error(error);
                                        const msg =
                                            error.response?.data?.detail ||
                                            "No se pudo reabrir la caja.";
                                        toast.error(msg);
                                    } finally {
                                        setIsReopening(false);
                                    }
                                });
                            }}
                            disabled={isReopening}
                            className="rounded-lg bg-[var(--primary)] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isReopening ? "Reabriendo..." : "Reabrir caja para corregir"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate("/registers")}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        Volver
                    </button>
                </div>
            </header>

            {/* EXECUTIVE ARQUEO OVERVIEW (2 MAIN CARDS: PHYSICAL CASH & BANK) */}
            <section className="grid gap-4 sm:grid-cols-2">
                {/* EFECTIVO EN CAJA (FÍSICO) */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold">
                                $
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                                    Dinero Físico
                                </span>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Efectivo en Caja
                                </h3>
                            </div>
                        </div>

                        <span className="text-xl sm:text-2xl font-black text-[var(--success)] tabular-nums">
                            {formatCurrency(register.expected_cash ?? 0)}
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Fondo inicial (Apertura):</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                                {formatCurrency(register.initial_cash ?? 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Cobros en efectivo (+):</span>
                            <span className="font-semibold text-[var(--success)]">
                                +{formatCurrency(register.cash_in ?? 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Salidas en efectivo (−):</span>
                            <span className="font-semibold text-[var(--danger)]">
                                −{formatCurrency(register.cash_out ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BANCO / MERCADO PAGO (DIGITAL) */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                                    Dinero Digital
                                </span>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Banco / Virtual
                                </h3>
                            </div>
                        </div>

                        <span className="text-xl sm:text-2xl font-black text-sky-500 tabular-nums">
                            {formatCurrency(register.expected_bank ?? 0)}
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Saldo inicial (Apertura):</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                                {formatCurrency(register.initial_bank ?? 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Transferencias recibidas (+):</span>
                            <span className="font-semibold text-sky-500">
                                +{formatCurrency(register.bank_in ?? 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Transferencias pagadas (−):</span>
                            <span className="font-semibold text-[var(--danger)]">
                                −{formatCurrency(register.bank_out ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* NET MOVEMENT STRIP (3 STATS) */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Dinero ingresado
                    </span>
                    <p className="mt-1 text-lg font-bold text-[var(--success)] tabular-nums">
                        +{formatCurrency(moneyIn)}
                    </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Dinero salido
                    </span>
                    <p className="mt-1 text-lg font-bold text-[var(--danger)] tabular-nums">
                        −{formatCurrency(moneyOut)}
                    </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Movimiento neto del turno
                    </span>
                    <p className={`mt-1 text-lg font-bold tabular-nums ${netMovement >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                        {netMovement >= 0 ? "+" : ""}{formatCurrency(netMovement)}
                    </p>
                </div>
            </section>

            {/* PENDING TRANSFERS WARNING BANNER */}
            {pendingTransfers.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-amber-500/40 bg-[var(--surface)] shadow-xs">
                    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-[10px] font-bold text-black">
                                !
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Transferencias pendientes ({pendingTransfers.length})
                            </h3>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                            No estaban marcadas como recibidas al momento de cerrar
                        </span>
                    </div>

                    <div className="divide-y divide-[var(--border)]">
                        {pendingTransfers.map((transfer) => {
                            const title =
                                transfer.display_description ||
                                (transfer.client_name
                                    ? `Transferencia de ${transfer.client_name}`
                                    : `Transferencia #${transfer.transaction_id}`);

                            return (
                                <div
                                    key={transfer.amount_id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm text-[var(--text-primary)]">
                                            {title}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)]">
                                            {transfer.created_at && formatDate(transfer.created_at)}
                                            {transfer.client_name && ` · Cliente: ${transfer.client_name}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums mr-2">
                                            {formatCurrency(transfer.amount)}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => handleResolveTransfer(transfer, "confirm")}
                                            disabled={isResolving}
                                            className="rounded-lg bg-[var(--success)]/10 px-2.5 py-1.5 text-xs font-bold text-[var(--success)] hover:bg-[var(--success)]/20 transition disabled:opacity-50"
                                        >
                                            Confirmar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (transfer.client_name) {
                                                    handleResolveTransfer(transfer, "convert_to_debt");
                                                } else {
                                                    setTransferToDebt(transfer);
                                                    setClientSearch("");
                                                    setClientResults([]);
                                                }
                                            }}
                                            disabled={isResolving}
                                            className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                                        >
                                            Pasar a fiado
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTransferToVoid(transfer)}
                                            disabled={isResolving}
                                            className="rounded-lg bg-[var(--danger)]/10 px-2.5 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition disabled:opacity-50"
                                        >
                                            Anular
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* SEGMENTED DRILLDOWN TABS */}
            <div className="space-y-4">
                <div className="flex border-b border-[var(--border)] gap-2 print:hidden">
                    {[
                        { id: "arqueo", label: "Arqueo & Medios de Pago" },
                        { id: "cuentas", label: "Cuentas & Proveedores" },
                        {
                            id: "operaciones",
                            label: `Operaciones (${register.transaction_count || 0})`,
                        },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                                    isActive
                                        ? "border-[var(--primary)] text-[var(--primary)]"
                                        : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: ARQUEO & MEDIOS DE PAGO */}
                {activeTab === "arqueo" && (
                    <div className="space-y-6">
                        {/* Totals by payment method */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Totales por medio de pago
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.entries(totalsByMethod).map(([method, amount]) => (
                                    <div
                                        key={method}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs"
                                    >
                                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                            {getMethodLabel(method)}
                                        </span>
                                        <p className="mt-1 text-lg font-bold text-[var(--text-primary)] tabular-nums">
                                            {formatCurrency(amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Movement by type */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Movimiento por tipo de operación
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(totalsByType).map(([type, amount]) => {
                                    const isOutgoing =
                                        type === "loss" ||
                                        type === "provider" ||
                                        type === "provider_payment" ||
                                        type === "expense";

                                    return (
                                        <div
                                            key={type}
                                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                                    {getTransactionLabel(type)}
                                                </span>
                                                <span className={`text-[10px] font-bold ${isOutgoing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                                                    {isOutgoing ? "Salida" : "Ingreso"}
                                                </span>
                                            </div>
                                            <p className={`mt-1.5 text-base font-bold tabular-nums ${isOutgoing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                                                {isOutgoing ? "-" : "+"}{formatCurrency(amount)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: CUENTAS & PROVEEDORES */}
                {activeTab === "cuentas" && (
                    <div className="space-y-6">
                        {/* FIADO / CUENTAS CORRIENTES */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Cuentas Corrientes (Fiados del día)
                                </h3>
                                <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                                    Neto: {Number(fiado.net) > 0 ? "+" : ""}{formatCurrency(fiado.net)}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase block">Nuevos fiados</span>
                                    <span className="text-sm font-bold text-[var(--warning)]">{formatCurrency(fiado.new_debt)}</span>
                                </div>
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase block">Pagos cobrados</span>
                                    <span className="text-sm font-bold text-[var(--success)]">{formatCurrency(fiado.payments)}</span>
                                </div>
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                    <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase block">Balance neto</span>
                                    <span className={`text-sm font-bold ${Number(fiado.net) > 0 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                                        {Number(fiado.net) > 0 ? "+" : ""}{formatCurrency(fiado.net)}
                                    </span>
                                </div>
                            </div>

                            {fiado.clients.length > 0 && (
                                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs divide-y divide-[var(--border)]">
                                    {fiado.clients.map((c) => (
                                        <div key={c.client_id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                                            <span className="font-semibold text-[var(--text-primary)]">{c.client_name}</span>
                                            <div className="flex items-center gap-4 tabular-nums">
                                                <span className="text-[var(--warning)]">Fiado: {formatCurrency(c.debt)}</span>
                                                <span className="text-[var(--success)]">Pagó: {formatCurrency(c.payments)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PROVEEDORES */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Proveedores del día
                                </h3>
                                <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                                    Pagado: {formatCurrency(provider.payments)}
                                </span>
                            </div>

                            {provider.providers.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs divide-y divide-[var(--border)]">
                                    {provider.providers.map((p) => (
                                        <div key={p.provider_id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                                            <span className="font-semibold text-[var(--text-primary)]">{p.provider_name}</span>
                                            <div className="flex items-center gap-4 tabular-nums">
                                                <span className="text-[var(--warning)]">Deuda: {formatCurrency(p.debt)}</span>
                                                <span className="text-[var(--danger)]">Pagado: {formatCurrency(p.payments)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-secondary)] italic">
                                    No se registraron movimientos de proveedores en esta caja.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: OPERACIONES DEL TURNO */}
                {activeTab === "operaciones" && (
                    <div className="space-y-3">
                        {/* Search & Filter Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                                type="text"
                                value={txSearch}
                                onChange={(e) => setTxSearch(e.target.value)}
                                placeholder="Buscar en operaciones o clientes..."
                                className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                            />

                            <select
                                value={txTypeFilter}
                                onChange={(e) => setTxTypeFilter(e.target.value)}
                                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 pr-7 text-xs font-semibold text-[var(--text-primary)] outline-none"
                            >
                                <option value="all">Todos los tipos</option>
                                <option value="sale">Ventas</option>
                                <option value="sube">Cargas SUBE</option>
                                <option value="phone">Cargas Celular</option>
                                <option value="exchange">Cambios</option>
                                <option value="payment">Pagos a cuenta</option>
                                <option value="provider">Proveedores</option>
                                <option value="expense">Gastos</option>
                                <option value="loss">Pérdidas</option>
                            </select>
                        </div>

                        {/* List */}
                        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs divide-y divide-[var(--border)]">
                            {filteredTransactions.length === 0 ? (
                                <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                                    No hay operaciones que coincidan con los filtros.
                                </div>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const ops = tx.operations || [];
                                    const txTotal = tx.total !== undefined ? tx.total : ops.reduce((s, op) => s + (op.amounts || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0), 0);
                                    const isOutgoing = ops.some((op) => ["loss", "provider", "provider_payment", "expense"].includes(op.type));

                                    return (
                                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-xs transition hover:bg-[var(--surface-accent)]/40">
                                            <div className="space-y-0.5 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[var(--text-primary)] truncate">
                                                        {tx.description || (ops[0] ? getTransactionLabel(ops[0].type) : `Operación #${tx.id}`)}
                                                    </span>
                                                    {tx.created_at && (
                                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                                            · {formatDate(tx.created_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                                                    {ops.map((op, i) => (
                                                        <span key={i} className="rounded bg-[var(--surface-accent)] px-1.5 py-0.2">
                                                            {getTransactionLabel(op.type)}: {(op.amounts || []).map((a) => `${getMethodLabel(a.method)} $${Number(a.amount).toLocaleString("es-AR")}`).join(", ")}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <span className={`text-sm font-bold tabular-nums shrink-0 ${isOutgoing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                                                {isOutgoing ? "-" : "+"}{formatCurrency(txTotal)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* VOID CONFIRMATION DIALOG */}
            {transferToVoid && (
                <ConfirmDialog
                    title="Anular transferencia no recibida"
                    message={`¿Confirmás anular la transferencia de ${formatCurrency(transferToVoid.amount)}? No sumará al dinero ingresado de la caja.`}
                    confirmLabel="Anular transferencia"
                    cancelLabel="Volver"
                    isLoading={isResolving}
                    onCancel={() => setTransferToVoid(null)}
                    onConfirm={() => handleResolveTransfer(transferToVoid, "void")}
                />
            )}

            {/* CONVERT TO DEBT MODAL */}
            {transferToDebt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                            Pasar transferencia a cuenta corriente
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Seleccioná el cliente a quien se le cargará la deuda de <strong>{formatCurrency(transferToDebt.amount)}</strong>.
                        </p>

                        <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => handleSearchClients(e.target.value)}
                            placeholder="Buscar cliente..."
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-primary)] outline-none"
                            autoFocus
                        />

                        <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--background)]">
                            {clientResults.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleResolveTransfer(transferToDebt, "convert_to_debt", c.id)}
                                    disabled={isResolving}
                                    className="flex w-full items-center justify-between p-2.5 text-xs text-left hover:bg-[var(--surface-accent)] transition"
                                >
                                    <span className="font-bold text-[var(--text-primary)]">{c.name}</span>
                                    {c.phone && <span className="text-[var(--text-secondary)]">{c.phone}</span>}
                                </button>
                            ))}

                            {clientSearch.trim() && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsResolving(true);
                                        try {
                                            const newClient = await createClient({ name: clientSearch.trim() });
                                            await handleResolveTransfer(transferToDebt, "convert_to_debt", newClient.id);
                                        } catch (err) {
                                            console.error(err);
                                            toast.error("No se pudo crear el cliente.");
                                            setIsResolving(false);
                                        }
                                    }}
                                    disabled={isResolving}
                                    className="w-full p-2.5 text-xs font-bold text-[var(--primary)] text-left hover:bg-[var(--surface-accent)] transition"
                                >
                                    + Crear &quot;{clientSearch.trim()}&quot; y pasar a fiado
                                </button>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setTransferToDebt(null)}
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RegisterReport;