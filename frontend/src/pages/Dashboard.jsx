import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";

import {
    openRegister,
    getTransactions,
    deleteTransaction,
    getCurrentRegister,
} from "../services/business";

import TransactionCard from "../components/TransactionCard";
import ConfirmDialog from "../components/ConfirmDialog";


function Dashboard() {
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isOpening, setIsOpening] = useState(false);

    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        setRegister,
    } = useOutletContext();

    function handleTransactionUpdate(
        updatedTransaction
    ) {
        setTransactions((current) =>
            current.map((transaction) =>
                transaction.id === updatedTransaction.id
                    ? updatedTransaction
                    : transaction
            )
        );
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

    async function handleOpenRegister() {
        setIsOpening(true);

        try {
            const newRegister =
                await openRegister();

            setRegister(newRegister);

            toast.success(
                "Caja abierta."
            );
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo abrir la caja."
            );
        } finally {
            setIsOpening(false);
        }
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
                                    transition
                                    hover:bg-[var(--primary-hover)]
                                "
                            >
                                + Nueva operación
                            </button>
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


                                <button
                                    onClick={handleOpenRegister}
                                    disabled={isOpening}
                                    className="
                                        mt-7
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
                                    {isOpening
                                        ? "Abriendo..."
                                        : "Abrir caja"}
                                </button>

                            </div>

                        </section>

                    ) : (

                        /* OPEN REGISTER */

                        <section className="mt-10">

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
                                                        setTransactionToDelete(id);
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

                 </div>
        </div>
    );
}


export default Dashboard;