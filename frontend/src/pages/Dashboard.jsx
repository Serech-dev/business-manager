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

import AccountMenu from "../components/AccountMenu";


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

            {/* SIDEBAR */}

            <aside className="
                fixed
                inset-y-0
                left-0
                z-30
                flex
                w-64
                flex-col
                overflow-y-auto
                border-r
                border-[var(--border)]
                bg-[var(--surface)]
            ">

                {/* BRAND */}

                <div className="
                    border-b
                    border-[var(--border)]
                    px-6
                    py-5
                ">
                    <h1 className="
                        text-xl
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        Business Manager
                    </h1>

                    <p className="
                        mt-1
                        text-xs
                        text-[var(--text-secondary)]
                    ">
                        Gestión del negocio
                    </p>
                </div>


                {/* NAVIGATION */}

                <nav className="
                    flex-1
                    space-y-1
                    px-3
                    py-5
                ">

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="
                            flex
                            w-full
                            items-center
                            rounded-xl
                            bg-[var(--surface-accent)]
                            px-4
                            py-3
                            text-left
                            text-sm
                            font-medium
                            text-[var(--text-primary)]
                        "
                    >
                        Dashboard
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                            register
                                ? navigate("/transactions/new")
                                : toast.error(
                                    "Abrí la caja primero."
                                )
                        }
                        className="
                            flex
                            w-full
                            items-center
                            rounded-xl
                            px-4
                            py-3
                            text-left
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        Nueva operación
                    </button>


                    <button
                        type="button"
                        onClick={() =>
                            navigate("/registers")
                        }
                        className="
                            flex
                            w-full
                            items-center
                            rounded-xl
                            px-4
                            py-3
                            text-left
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        Historial de cierres
                    </button>

                </nav>


                {/* REGISTER STATUS */}

                <div className="
                    border-t
                    border-[var(--border)]
                    p-4
                ">

                    <div className="
                        rounded-xl
                        bg-[var(--surface-muted)]
                        p-4
                    ">
                        <div className="
                            flex
                            items-center
                            justify-between
                            gap-3
                        ">
                            <span className="
                                text-xs
                                font-medium
                                text-[var(--text-secondary)]
                            ">
                                Caja
                            </span>

                            <span className={`
                                h-2
                                w-2
                                rounded-full
                                ${register
                                    ? "bg-[var(--success)]"
                                    : "bg-[var(--danger)]"
                                }
                            `} />
                        </div>

                        <p className="
                            mt-1
                            text-sm
                            font-semibold
                            text-[var(--text-primary)]
                        ">
                            {register
                                ? "Abierta"
                                : "Cerrada"}
                        </p>

                        {register && (
                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                $
                                {formatCurrency(
                                    register.total
                                )}
                            </p>
                        )}
                    </div>

                </div>


                {/* ACCOUNT */}

                <div className="
                    border-t
                    border-[var(--border)]
                    p-4
                ">
                    <AccountMenu />
                </div>

            </aside>


            {/* MAIN CONTENT */}

            <main className="
                ml-64
                min-h-screen
            ">

                <div className="
                    mx-auto
                    max-w-7xl
                    px-8
                    py-8
                ">

                    {/* PAGE HEADER */}

                    <div className="
                        flex
                        items-center
                        justify-between
                        gap-6
                    ">
                        <div>
                            <p className="
                                text-sm
                                font-medium
                                text-[var(--text-secondary)]
                            ">
                                Panel principal
                            </p>

                            <h2 className="
                                mt-1
                                text-3xl
                                font-bold
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
                                    rounded-xl
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
                    </div>


                    {!register ? (

                        /* CLOSED REGISTER */

                        <div className="
                            mt-8
                            rounded-2xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-10
                        ">

                            <div className="
                                max-w-xl
                            ">
                                <p className="
                                    text-sm
                                    font-medium
                                    text-[var(--warning)]
                                ">
                                    Caja cerrada
                                </p>

                                <h3 className="
                                    mt-2
                                    text-2xl
                                    font-bold
                                    text-[var(--text-primary)]
                                ">
                                    Abrí la caja para comenzar
                                </h3>

                                <p className="
                                    mt-2
                                    text-[var(--text-secondary)]
                                ">
                                    Las operaciones se registrarán
                                    dentro de la caja abierta y
                                    formarán parte de su cierre.
                                </p>

                                <button
                                    onClick={
                                        handleOpenRegister
                                    }
                                    disabled={isOpening}
                                    className="
                                        mt-6
                                        rounded-xl
                                        bg-[var(--primary)]
                                        px-6
                                        py-3
                                        font-semibold
                                        text-white
                                        transition
                                        hover:bg-[var(--primary-hover)]
                                        disabled:opacity-50
                                    "
                                >
                                    {isOpening
                                        ? "Abriendo..."
                                        : "Abrir caja"}
                                </button>
                            </div>

                        </div>

                    ) : (

                        /* OPEN REGISTER */

                        <>

                            {/* REGISTER SUMMARY */}

                            <section className="
                                mt-8
                                grid
                                gap-4
                                lg:grid-cols-4
                            ">

                                <div className="
                                    rounded-2xl
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                    p-5
                                    lg:col-span-2
                                ">
                                    <p className="
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Caja actual
                                    </p>

                                    <div className="
                                        mt-2
                                        flex
                                        items-end
                                        justify-between
                                        gap-4
                                    ">
                                        <div>
                                            <p className="
                                                text-3xl
                                                font-bold
                                                text-[var(--text-primary)]
                                            ">
                                                $
                                                {formatCurrency(
                                                    register.total
                                                )}
                                            </p>

                                            <p className="
                                                mt-1
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                {
                                                    register.transaction_count
                                                }{" "}
                                                operaciones
                                            </p>
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
                                                transition
                                                hover:bg-[var(--danger-bg)]
                                                disabled:opacity-50
                                            "
                                        >
                                            {isClosing
                                                ? "Cerrando..."
                                                : "Cerrar caja"}
                                        </button>
                                    </div>
                                </div>


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
                                                rounded-2xl
                                                border
                                                border-[var(--border)]
                                                bg-[var(--surface)]
                                                p-5
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
                                                mt-2
                                                text-xl
                                                font-bold
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

                            </section>


                            {/* TRANSACTIONS */}

                            <section className="mt-10">

                                <div className="
                                    flex
                                    items-center
                                    justify-between
                                ">
                                    <div>
                                        <h3 className="
                                            text-xl
                                            font-bold
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
                                            en el sistema.
                                        </p>
                                    </div>

                                    <span className="
                                        rounded-lg
                                        bg-[var(--surface-muted)]
                                        px-3
                                        py-1.5
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        {transactions.length}
                                    </span>
                                </div>


                                {transactions.length === 0 ? (

                                    <div className="
                                        mt-4
                                        rounded-2xl
                                        border
                                        border-dashed
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                        p-10
                                        text-center
                                    ">
                                        <p className="
                                            font-medium
                                            text-[var(--text-primary)]
                                        ">
                                            No hay operaciones
                                        </p>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Las operaciones que
                                            registres aparecerán aquí.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    "/transactions/new"
                                                )
                                            }
                                            className="
                                                mt-5
                                                text-sm
                                                font-semibold
                                                text-[var(--primary)]
                                            "
                                        >
                                            Registrar primera operación
                                        </button>
                                    </div>

                                ) : (

                                    <div className="
                                        mt-4
                                        overflow-hidden
                                        rounded-2xl
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                    ">

                                        <div className="
                                            divide-y
                                            divide-[var(--border)]
                                        ">

                                            {transactions.map(
                                                (transaction) => (
                                                    <div
                                                        key={
                                                            transaction.id
                                                        }
                                                        className="
                                                            p-5
                                                            transition
                                                            hover:bg-[var(--surface-accent)]
                                                        "
                                                    >

                                                        <div className="
                                                            flex
                                                            items-start
                                                            justify-between
                                                            gap-6
                                                        ">

                                                            <div className="
                                                                min-w-0
                                                            ">
                                                                <div className="
                                                                    flex
                                                                    items-center
                                                                    gap-3
                                                                ">
                                                                    <h4 className="
                                                                        font-semibold
                                                                        text-[var(--text-primary)]
                                                                    ">
                                                                        {
                                                                            getTransactionLabel(
                                                                                transaction.type
                                                                            )
                                                                        }
                                                                    </h4>

                                                                    <span className="
                                                                        text-xs
                                                                        text-[var(--text-secondary)]
                                                                    ">
                                                                        #
                                                                        {
                                                                            transaction.id
                                                                        }
                                                                    </span>
                                                                </div>

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
                                                                shrink-0
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
                                                            items-center
                                                            justify-between
                                                            gap-4
                                                        ">

                                                            <div className="
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
                                                                                py-1.5
                                                                                text-xs
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


                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        transaction.id
                                                                    )
                                                                }
                                                                className="
                                                                    shrink-0
                                                                    text-sm
                                                                    font-medium
                                                                    text-[var(--danger)]
                                                                    transition
                                                                    hover:underline
                                                                "
                                                            >
                                                                Eliminar
                                                            </button>

                                                        </div>

                                                    </div>
                                                )
                                            )}

                                        </div>

                                    </div>

                                )}

                            </section>

                        </>
                    )}

                </div>

            </main>

        </div>
    );
}


export default Dashboard;