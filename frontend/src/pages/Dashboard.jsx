import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";

import {
    openRegister,
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

    const {
        register,
        setRegister,
    } = useOutletContext();

    async function handleTransactionUpdate(
        updatedTransaction
    ) {
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
            const [
                currentRegister,
                transactionData,
            ] = await Promise.all([
                getCurrentRegister(),
                getTransactions(true),
            ]);

            setRegister(currentRegister);
            setTransactions(transactionData);
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo cargar la información."
            );
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
                current.filter(
                    (transaction) =>
                        transaction.id !== id
                )
            );

            const currentRegister =
                await getCurrentRegister();

            setRegister(currentRegister);

            toast.success(
                "Operación eliminada."
            );

            setTransactionToDelete(null);

        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo eliminar la operación."
            );
        } finally {
            setIsDeleting(false);
        }
    }


    if (isLoading) {
        return (
            <div className="
                flex
                min-h-screen
                items-center
                justify-center
                bg-[var(--background)]
                text-[var(--text-secondary)]
            ">
                Cargando...
            </div>
        );
    }


    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            text-[var(--text-primary)]
        ">
            <div className="
                mx-auto
                max-w-7xl
                px-8
                py-8
            ">

                    {/* PAGE HEADER */}

                    <header className="
                        flex
                        items-end
                        justify-between
                        gap-6
                        border-b
                        border-[var(--border)]
                        pb-6
                    ">

                        <div>
                            <p className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-wider
                                text-[var(--primary)]
                            ">
                                Panel principal
                            </p>

                            <h2 className="
                                mt-1
                                text-3xl
                                font-bold
                                tracking-tight
                                text-[var(--text-primary)]
                            ">
                                Dashboard
                            </h2>
                        </div>


                        {register && (
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsMovementModalOpen(true)}
                                    className="
                                        rounded-lg
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface-accent)]
                                        px-4
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-[var(--text-primary)]
                                        shadow-xs
                                        transition
                                        hover:bg-[var(--surface-muted)]
                                        hover:border-[var(--primary)]
                                    "
                                >
                                    - Registrar gasto / salida
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/transactions/new"
                                        )
                                    }
                                    className="
                                        rounded-lg
                                        bg-[var(--primary)]
                                        px-5
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-white
                                        shadow-sm
                                        transition
                                        hover:bg-[var(--primary-hover)]
                                    "
                                >
                                    + Nueva venta
                                </button>
                            </div>
                        )}

                    </header>

                    {!register ? (

                        /* CLOSED REGISTER */

                        <section className="
                            mt-8
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-10
                        ">

                            <div className="max-w-xl">

                                <div className="
                                    flex
                                    items-center
                                    gap-3
                                ">
                                    <span className="
                                        h-2
                                        w-2
                                        rounded-full
                                        bg-[var(--danger)]
                                    " />

                                    <p className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-[var(--danger)]
                                    ">
                                        Caja cerrada
                                    </p>
                                </div>


                                <h3 className="
                                    mt-4
                                    text-2xl
                                    font-bold
                                    tracking-tight
                                    text-[var(--text-primary)]
                                ">
                                    Abrí la caja para comenzar
                                </h3>


                                <p className="
                                    mt-2
                                    max-w-lg
                                    leading-6
                                    text-[var(--text-secondary)]
                                ">
                                    Las operaciones se registrarán
                                    dentro de la caja abierta y
                                    formarán parte de su cierre.
                                </p>


                                <div className="mt-7 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpenRegisterModalOpen(true)}
                                        disabled={isReopening}
                                        className="
                                            rounded-lg
                                            bg-[var(--primary)]
                                            px-6
                                            py-3
                                            text-sm
                                            font-semibold
                                            text-white
                                            transition
                                            hover:bg-[var(--primary-hover)]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        Abrir caja
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleReopenRegister}
                                        disabled={isReopening}
                                        className="
                                            rounded-lg
                                            border
                                            border-[var(--border)]
                                            bg-[var(--surface-accent)]
                                            px-5
                                            py-3
                                            text-sm
                                            font-medium
                                            text-[var(--text-primary)]
                                            transition
                                            hover:border-[var(--primary)]
                                            hover:bg-[var(--surface-muted)]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        {isReopening
                                            ? "Reabriendo..."
                                            : "Reabrir último cierre"}
                                    </button>
                                </div>

                            </div>

                        </section>

                    ) : (

                        /* OPEN REGISTER */

                        <section className="mt-8">

                            {/* LIVE FUNDS & DRAWER BALANCE (EXCLUSIVELY IN OWNER MODE) */}
                            {isOwner && (
                                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                                    {/* EFECTIVO EN CAJA */}
                                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                                Efectivo en Caja
                                            </span>
                                            <span className="rounded bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                                En vivo
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-[var(--success)]">
                                            {formatCurrency(register.expected_cash ?? 0)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
                                            <span>Inicial: {formatCurrency(register.initial_cash ?? 0)}</span>
                                            <span>·</span>
                                            <span className="text-[var(--success)]">+{formatCurrency(register.cash_in ?? 0)}</span>
                                            <span>·</span>
                                            <span className="text-[var(--danger)]">-{formatCurrency(register.cash_out ?? 0)}</span>
                                        </div>
                                    </div>

                                    {/* SALDO EN BANCO */}
                                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                                Saldo en Banco / Digital
                                            </span>
                                            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                                                En vivo
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums text-sky-400">
                                            {formatCurrency(register.expected_bank ?? 0)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
                                            <span>Inicial: {formatCurrency(register.initial_bank ?? 0)}</span>
                                            <span>·</span>
                                            <span className="text-sky-400">+{formatCurrency(register.bank_in ?? 0)}</span>
                                            <span>·</span>
                                            <span className="text-[var(--danger)]">-{formatCurrency(register.bank_out ?? 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="
                                flex
                                items-end
                                justify-between
                                gap-4
                            ">

                                <div>
                                    <p className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-[var(--text-secondary)]
                                    ">
                                        Actividad
                                    </p>

                                    <h3 className="
                                        mt-1
                                        text-xl
                                        font-bold
                                        tracking-tight
                                        text-[var(--text-primary)]
                                    ">
                                        Operaciones
                                    </h3>

                                    <p className="
                                        mt-1
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Movimientos registrados
                                        en la caja actual.
                                    </p>
                                </div>


                                <span className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-medium
                                    text-[var(--text-secondary)]
                                ">
                                    {transactions.length} registros
                                </span>

                            </div>


                            {transactions.length === 0 ? (

                                <div className="
                                    mt-5
                                    border
                                    border-dashed
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                    p-12
                                    text-center
                                ">

                                    <p className="
                                        font-semibold
                                        text-[var(--text-primary)]
                                    ">
                                        No hay operaciones
                                    </p>

                                    <p className="
                                        mt-1
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Las operaciones que registres
                                        aparecerán aquí.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate("/transactions/new")
                                        }
                                        className="
                                            mt-5
                                            text-sm
                                            font-semibold
                                            text-[var(--primary)]
                                            transition
                                            hover:text-[var(--control-icon-hover)]
                                        "
                                    >
                                        Registrar primera operación →
                                    </button>

                                </div>

                            ) : (

                                    <div className="
                                        space-y-3
                                    ">
                                        {transactions.map(
                                            (transaction) => (
                                                <TransactionCard
                                                    key={transaction.id}
                                                    transaction={transaction}
                                                    onDelete={(id) => {
                                                        requireOwnerAccess(() => {
                                                            setTransactionToDelete(id);
                                                        });
                                                    }}
                                                    onTransactionUpdate={
                                                        handleTransactionUpdate
                                                    }
                                                />
                                            )
                                        )}
                                    </div>

                            )}

                        </section>

                    )}

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
                            onConfirm={() =>
                                handleDelete(transactionToDelete)
                            }
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
        </div>
    );
}

export default Dashboard;