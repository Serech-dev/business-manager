import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { deleteTransaction, getTransactions } from "../services/business";
import { logout } from "../services/auth";


function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}


function getTransactionLabel(type) {
    const labels = {
        sale: "Venta",
        service: "Servicio",
        exchange: "Cambio",
        sale_exchange: "Venta + Cambio",
        provider: "Proveedor",
        expense: "Gasto",
        loss: "Pérdida",
    };

    return labels[type] || type;
}


function Dashboard() {
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    async function fetchTransactions() {
        try {
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudieron cargar las operaciones."
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function handleDelete(id) {
        const confirmed = window.confirm(
            "¿Querés eliminar esta operación?"
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteTransaction(id);

            setTransactions((current) =>
                current.filter(
                    (transaction) =>
                        transaction.id !== id
                )
            );

            toast.success(
                "Operación eliminada."
            );
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo eliminar la operación."
            );
        }
    }

    function handleLogout() {
        logout();

        toast.success("Sesión cerrada.");
        navigate("/login", { replace: true });
    }

    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            px-4
            py-8
        ">
            <div className="
                mx-auto
                max-w-5xl
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    gap-4
                ">
                    <div>
                        <h1 className="
                            text-3xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Business Manager
                        </h1>

                        <p className="
                            mt-1
                            text-[var(--text-secondary)]
                        ">
                            Operaciones
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface)]
                        "
                    >
                        Cerrar sesión
                    </button>
                </div>


                <button
                    onClick={() =>
                        navigate(
                            "/transactions/new"
                        )
                    }
                    className="
                        mt-6
                        w-full
                        rounded-xl
                        bg-[var(--primary)]
                        px-4
                        py-3
                        font-semibold
                        text-white
                        transition
                        hover:bg-[var(--primary-hover)]
                    "
                >
                    + Nueva operación
                </button>


                <div className="mt-8">

                    {isLoading ? (
                        <div className="
                            rounded-2xl
                            bg-[var(--surface)]
                            p-6
                            text-center
                            text-[var(--text-secondary)]
                        ">
                            Cargando operaciones...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="
                            rounded-2xl
                            bg-[var(--surface)]
                            p-8
                            text-center
                            text-[var(--text-secondary)]
                        ">
                            Todavía no hay operaciones.
                        </div>
                    ) : (
                        <div className="space-y-3">

                            {transactions.map(
                                (transaction) => (
                                    <div
                                        key={
                                            transaction.id
                                        }
                                        className="
                                            rounded-2xl
                                            bg-[var(--surface)]
                                            p-5
                                        "
                                    >

                                        <div className="
                                            flex
                                            items-start
                                            justify-between
                                            gap-4
                                        ">
                                            <div>
                                                <h2 className="
                                                    font-semibold
                                                    text-[var(--text-primary)]
                                                ">
                                                    {
                                                        getTransactionLabel(
                                                            transaction.type
                                                        )
                                                    }
                                                </h2>

                                                {transaction.description && (
                                                    <p className="
                                                        mt-1
                                                        text-sm
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        {
                                                            transaction.description
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <strong className="
                                                text-lg
                                                text-[var(--text-primary)]
                                            ">
                                                $
                                                {formatCurrency(
                                                    transaction.total
                                                )}
                                            </strong>
                                        </div>


                                        <div className="
                                            mt-4
                                            flex
                                            flex-wrap
                                            gap-2
                                        ">
                                            {transaction.amounts.map(
                                                (amount) => (
                                                    <span
                                                        key={
                                                            amount.id
                                                        }
                                                        className="
                                                            rounded-lg
                                                            bg-[var(--surface-muted)]
                                                            px-3
                                                            py-1
                                                            text-sm
                                                            text-[var(--text-secondary)]
                                                        "
                                                    >
                                                        {
                                                            amount.method
                                                        }{" "}
                                                        $
                                                        {formatCurrency(
                                                            amount.amount
                                                        )}
                                                    </span>
                                                )
                                            )}
                                        </div>


                                        <div className="
                                            mt-4
                                            flex
                                            justify-end
                                        ">
                                            <button
                                                onClick={() =>
                                                    handleDelete(
                                                        transaction.id
                                                    )
                                                }
                                                className="
                                                    text-sm
                                                    font-medium
                                                    text-[var(--danger)]
                                                "
                                            >
                                                Eliminar
                                            </button>
                                        </div>

                                    </div>
                                )
                            )}

                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}


export default Dashboard;