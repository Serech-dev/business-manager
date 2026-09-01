import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";

import {
    reopenLastRegister,
    getTransactions,
    deleteTransaction,
    getCurrentRegister,
} from "../services/business";

import TransactionCard from "../components/transactions/TransactionCard";
import ConfirmDialog from "../components/ConfirmDialog";
import ProviderMovementModal from "../components/providers/ProviderMovementModal";
import OpenRegisterModal from "../components/registers/OpenRegisterModal";
import { formatCurrency } from "../utils/formatCurrency";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

function Dashboard() {
    const navigate = useNavigate();
    const { requireOwnerAccess, isKioskDevice, isUnlocked } = useDeviceSecurity();
    const isOwner = !isKioskDevice || isUnlocked;

    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReopening, setIsReopening] = useState(false);
    const [isOpenRegisterModalOpen, setIsOpenRegisterModalOpen] = useState(false);

    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    const { register, setRegister } = useOutletContext();

    async function handleTransactionUpdate(updatedTransaction) {
        setTransactions((current) =>
            current.map((transaction) =>
                transaction.id === updatedTransaction.id
                    ? updatedTransaction
                    : transaction
            )
        );

        try {
            const currentRegister = await getCurrentRegister();
            setRegister(currentRegister);
        } catch (error) {
            console.error("Error refreshing register on transaction update:", error);
        }
    }

    async function loadDashboard() {
        try {
            const [currentRegister, transactionData] = await Promise.all([
                getCurrentRegister(),
                getTransactions(true),
            ]);

            setRegister(currentRegister);
            setTransactions(transactionData);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cargar la información.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();
    }, []);

    function handleOpenRegisterSuccess(newRegister) {
        setRegister(newRegister);
        loadDashboard();
    }

    async function handleReopenRegister() {
        requireOwnerAccess(async () => {
            setIsReopening(true);
            try {
                const reopened = await reopenLastRegister();
                setRegister(reopened);
                const transactionData = await getTransactions(true);
                setTransactions(transactionData);
                toast.success("Último cierre reabierto con éxito.");
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
    }

    async function handleDelete(id) {
        setIsDeleting(true);

        try {
            await deleteTransaction(id);

            setTransactions((current) =>
                current.filter((transaction) => transaction.id !== id)
            );

            const currentRegister = await getCurrentRegister();
            setRegister(currentRegister);

            toast.success("Operación eliminada.");
            setTransactionToDelete(null);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar la operación.");
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-3">
                    <svg
                        className="h-5 w-5 animate-spin text-[var(--primary)]"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>Cargando panel...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 space-y-8">
            {/* PAGE HEADER */}
                <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Terminal de Caja
                        </p>

                        <div className="mt-1 flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                Dashboard
                            </h1>

                            {register ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                    </span>
                                    Caja abierta
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-accent)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                                    <span className="h-2 w-2 rounded-full bg-[var(--text-secondary)]" />
                                    Caja cerrada
                                </span>
                            )}
                        </div>
                    </div>

                    {register && (
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMovementModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)] shadow-xs transition hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]"
                            >
                                <span className="font-bold">−</span>
                                <span>Gasto / Salida</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/transactions/new")}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"
                            >
                                <span className="font-bold">+</span>
                                <span>Nueva venta</span>
                            </button>
                        </div>
                    )}
                </header>

                {!register ? (
                    /* CLOSED REGISTER STATE */
                    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 shadow-sm">
                        <div className="max-w-xl space-y-5">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]">
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                    />
                                </svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                                    Abrí la caja para comenzar la jornada
                                </h2>
                                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                                    Las ventas, cobros de fiados y pagos a proveedores se registrarán dentro del turno actual y formarán parte del reporte de cierre.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpenRegisterModalOpen(true)}
                                    disabled={isReopening}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                        />
                                    </svg>
                                    <span>Abrir caja</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReopenRegister}
                                    disabled={isReopening}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                                >
                                    {isReopening
                                        ? "Reabriendo..."
                                        : "Reabrir último cierre"}
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    /* OPEN REGISTER ACTIVE */
                    <div className="space-y-8">
                        {/* LIVE FUNDS (EXCLUSIVELY IN OWNER MODE) */}
                        {isOwner && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* EFECTIVO EN CAJA */}
                                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Efectivo en Caja
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                                            En vivo
                                        </span>
                                    </div>

                                    <p className="text-3xl font-bold tabular-nums text-[var(--success)]">
                                        {formatCurrency(register.expected_cash ?? 0)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
                                        <span>Fondo inicial: {formatCurrency(register.initial_cash ?? 0)}</span>
                                        <span>·</span>
                                        <span className="text-[var(--success)] font-semibold">+{formatCurrency(register.cash_in ?? 0)}</span>
                                        <span>·</span>
                                        <span className="text-[var(--danger)] font-semibold">-{formatCurrency(register.cash_out ?? 0)}</span>
                                    </div>
                                </div>

                                {/* SALDO EN BANCO */}
                                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Saldo en Banco / Digital
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bank-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--bank)]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--bank)] animate-pulse" />
                                            En vivo
                                        </span>
                                    </div>

                                    <p className="text-3xl font-bold tabular-nums text-[var(--bank)]">
                                        {formatCurrency(register.expected_bank ?? 0)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
                                        <span>Fondo inicial: {formatCurrency(register.initial_bank ?? 0)}</span>
                                        <span>·</span>
                                        <span className="text-[var(--bank)] font-semibold">+{formatCurrency(register.bank_in ?? 0)}</span>
                                        <span>·</span>
                                        <span className="text-[var(--danger)] font-semibold">-{formatCurrency(register.bank_out ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* OPERATIONS FEED */}
                        <section className="space-y-4">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Actividad del turno
                                    </p>
                                    <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                                        Operaciones de Caja
                                    </h2>
                                </div>

                                <span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                                    {transactions.length}{" "}
                                    {transactions.length === 1 ? "registro" : "registros"}
                                </span>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-4">
                                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-accent)] text-[var(--text-secondary)]">
                                        <svg
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.5"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                            />
                                        </svg>
                                    </div>

                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">
                                            No hay operaciones registradas todavía
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            Las ventas, gastos y cobros que realices aparecerán aquí en tiempo real.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate("/transactions/new")}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
                                    >
                                        <span>Registrar primera venta</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((transaction) => (
                                        <TransactionCard
                                            key={transaction.id}
                                            transaction={transaction}
                                            onDelete={(id) => {
                                                requireOwnerAccess(() => {
                                                    setTransactionToDelete(id);
                                                });
                                            }}
                                            onTransactionUpdate={handleTransactionUpdate}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* MODALS */}
                {transactionToDelete && (
                    <ConfirmDialog
                        title="Eliminar operación"
                        message="¿Querés eliminar esta operación? Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        cancelLabel="Cancelar"
                        isLoading={isDeleting}
                        onCancel={() => {
                            if (!isDeleting) {
                                setTransactionToDelete(null);
                            }
                        }}
                        onConfirm={() => handleDelete(transactionToDelete)}
                    />
                )}

                <ProviderMovementModal
                    isOpen={isMovementModalOpen}
                    onClose={() => setIsMovementModalOpen(false)}
                    onSuccess={loadDashboard}
                />

                <OpenRegisterModal
                    isOpen={isOpenRegisterModalOpen}
                    onClose={() => setIsOpenRegisterModalOpen(false)}
                    onSuccess={handleOpenRegisterSuccess}
                />
        </div>
    );
}

export default Dashboard;