import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    closeRegister,
    deleteTransaction,
    getCurrentRegister,
    getTransactions,
    openRegister,
} from "../services/business";

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


function getMethodLabel(method) {
    const labels = {
        cash: "Efectivo",
        transfer: "Transferencia",
        card: "Tarjeta",
        debt: "Fiado",
    };

    return labels[method] || method;
}


function Dashboard() {
    const navigate = useNavigate();

    const [register, setRegister] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);


    async function loadDashboard() {
        try {
            const [
                currentRegister,
                transactionData,
            ] = await Promise.all([
                getCurrentRegister(),
                getTransactions(),
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


    async function handleCloseRegister() {
        const confirmed = window.confirm(
            "¿Querés cerrar la caja?"
        );

        if (!confirmed) {
            return;
        }

        setIsClosing(true);

        try {
            await closeRegister();

            setRegister(null);

            toast.success(
                "Caja cerrada."
            );
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo cerrar la caja."
            );
        } finally {
            setIsClosing(false);
        }
    }


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

            const currentRegister =
                await getCurrentRegister();

            setRegister(currentRegister);

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

        toast.success(
            "Sesión cerrada."
        );

        navigate(
            "/login",
            { replace: true }
        );
    }


    if (isLoading) {
        return (
            <div className="
                min-h-screen
                bg-[var(--background)]
                p-8
                text-center
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
                            Gestión del negocio
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


                {!register ? (
                    <div className="
                        mt-8
                        rounded-2xl
                        bg-[var(--surface)]
                        p-8
                        text-center
                    ">
                        <h2 className="
                            text-2xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Caja cerrada
                        </h2>

                        <p className="
                            mt-2
                            text-[var(--text-secondary)]
                        ">
                            Abrí la caja para comenzar
                            a registrar operaciones.
                        </p>

                        <button
                            onClick={handleOpenRegister}
                            disabled={isOpening}
                            className="
                                mt-6
                                rounded-xl
                                bg-[var(--primary)]
                                px-6
                                py-3
                                font-semibold
                                text-white
                                disabled:opacity-50
                            "
                        >
                            {isOpening
                                ? "Abriendo..."
                                : "Abrir caja"}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="
                            mt-8
                            rounded-2xl
                            bg-[var(--surface)]
                            p-6
                        ">
                            <div className="
                                flex
                                items-center
                                justify-between
                                gap-4
                            ">
                                <div>
                                    <p className="
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Caja abierta
                                    </p>

                                    <h2 className="
                                        mt-1
                                        text-2xl
                                        font-bold
                                        text-[var(--text-primary)]
                                    ">
                                        $
                                        {formatCurrency(
                                            register.total
                                        )}
                                    </h2>
                                </div>

                                <button
                                    onClick={
                                        handleCloseRegister
                                    }
                                    disabled={isClosing}
                                    className="
                                        rounded-xl
                                        border
                                        border-[var(--danger)]
                                        px-4
                                        py-2
                                        text-sm
                                        font-semibold
                                        text-[var(--danger)]
                                        disabled:opacity-50
                                    "
                                >
                                    {isClosing
                                        ? "Cerrando..."
                                        : "Cerrar caja"}
                                </button>
                            </div>


                            <div className="
                                mt-6
                                grid
                                gap-3
                                sm:grid-cols-3
                            ">
                                {Object.entries(
                                    register.totals_by_method
                                ).map(
                                    ([
                                        method,
                                        amount,
                                    ]) => (
                                        <div
                                            key={method}
                                            className="
                                                rounded-xl
                                                bg-[var(--surface-muted)]
                                                p-4
                                            "
                                        >
                                            <p className="
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                {
                                                    getMethodLabel(
                                                        method
                                                    )
                                                }
                                            </p>

                                            <p className="
                                                mt-1
                                                font-semibold
                                                text-[var(--text-primary)]
                                            ">
                                                $
                                                {formatCurrency(
                                                    amount
                                                )}
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
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

                        <button
                            onClick={() =>
                                navigate("/registers")
                            }
                            className="
                                mt-3
                                w-full
                                rounded-xl
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                px-4
                                py-3
                                font-semibold
                                text-[var(--text-primary)]
                            "
                        >
                            Historial de cierres
                        </button>

                        <div className="mt-8">

                            <h2 className="
                                text-xl
                                font-bold
                                text-[var(--text-primary)]
                            ">
                                Operaciones
                            </h2>

                            {transactions.length === 0 ? (
                                <div className="
                                    mt-4
                                    rounded-2xl
                                    bg-[var(--surface)]
                                    p-8
                                    text-center
                                    text-[var(--text-secondary)]
                                ">
                                    No hay operaciones
                                    registradas.
                                </div>
                            ) : (
                                <div className="
                                    mt-4
                                    space-y-3
                                ">
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
                                                        <h3 className="
                                                            font-semibold
                                                            text-[var(--text-primary)]
                                                        ">
                                                            {
                                                                getTransactionLabel(
                                                                    transaction.type
                                                                )
                                                            }
                                                        </h3>

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
                                                        (
                                                            amount
                                                        ) => (
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
                                                                    getMethodLabel(
                                                                        amount.method
                                                                    )
                                                                }

                                                                {" "}

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
                    </>
                )}

            </div>
        </div>
    );
}


export default Dashboard;