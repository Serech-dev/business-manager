import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClosedRegister,
    getTransactionLabel,
    getMethodLabel,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";


function formatDate(value) {
    return new Intl.DateTimeFormat(
        "es-AR",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    ).format(new Date(value));
}


function RegisterReport() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [register, setRegister] = useState(null);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        async function loadRegister() {
            try {
                const data = await getClosedRegister(id);
                setRegister(data);
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo cargar el cierre."
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadRegister();
    }, [id]);


    if (isLoading) {
        return (
            <div className="
                min-h-screen
                bg-[var(--background)]
                p-8
                text-[var(--text-secondary)]
            ">
                Cargando...
            </div>
        );
    }


    if (!register) {
        return (
            <div className="
                min-h-screen
                bg-[var(--background)]
                p-8
                text-[var(--text-secondary)]
            ">
                No se encontró el cierre.
            </div>
        );
    }


    const totalsByMethod =
        register.totals_by_method || {};

    const totalsByType =
        register.totals_by_type || {};

    const fiado = register.fiado || {
        new_debt: 0,
        payments: 0,
        net: 0,
        clients: [],
    };

    const transactions =
        register.transactions || [];


    const moneyIn =
        Number(register.money_in ?? register.total_in ?? register.income ?? 0);

    const moneyOut =
        Number(register.money_out ?? register.total_out ?? register.expenses ?? 0);

    const netMovement =
        Number(
            register.net ??
            register.net_movement ??
            moneyIn - moneyOut
        );


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

                {/* HEADER */}

                <header>
                    <p className="
                        text-sm
                        font-medium
                        uppercase
                        tracking-wider
                        text-[var(--primary)]
                    ">
                        Historial de cajas
                    </p>

                    <div className="
                        mt-1
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                    ">
                        <div>
                            <h1 className="
                                text-3xl
                                font-bold
                                tracking-tight
                                text-[var(--text-primary)]
                            ">
                                Cierre de caja #{register.id}
                            </h1>

                            <p className="
                                mt-2
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                {register.transaction_count}{" "}
                                {register.transaction_count === 1
                                    ? "operación"
                                    : "operaciones"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/registers")
                            }
                            className="
                                self-start
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                                sm:self-auto
                            "
                        >
                            Volver al historial
                        </button>
                    </div>


                    <div className="
                        mt-5
                        grid
                        gap-3
                        text-sm
                        sm:grid-cols-2
                    ">
                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            px-4
                            py-3
                        ">
                            <p className="
                                text-xs
                                uppercase
                                tracking-wide
                                text-[var(--text-secondary)]
                            ">
                                Apertura
                            </p>

                            <p className="
                                mt-1
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                {formatDate(
                                    register.opened_at
                                )}
                            </p>
                        </div>

                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            px-4
                            py-3
                        ">
                            <p className="
                                text-xs
                                uppercase
                                tracking-wide
                                text-[var(--text-secondary)]
                            ">
                                Cierre
                            </p>

                            <p className="
                                mt-1
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                {formatDate(
                                    register.closed_at
                                )}
                            </p>
                        </div>
                    </div>
                </header>


                {/* MONEY SUMMARY */}

                <section className="
                    mt-8
                    grid
                    gap-4
                    sm:grid-cols-3
                ">

                    <div className="
                        rounded-2xl
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-6
                    ">
                        <p className="
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Dinero ingresado
                        </p>

                        <p className="
                            mt-2
                            text-3xl
                            font-bold
                            text-[var(--success)]
                        ">
                            +{formatCurrency(moneyIn)}
                        </p>
                    </div>


                    <div className="
                        rounded-2xl
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-6
                    ">
                        <p className="
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Dinero salido
                        </p>

                        <p className="
                            mt-2
                            text-3xl
                            font-bold
                            text-[var(--danger)]
                        ">
                            -{formatCurrency(moneyOut)}
                        </p>
                    </div>


                    <div className="
                        rounded-2xl
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-6
                    ">
                        <p className="
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Movimiento neto
                        </p>

                        <p className={`
                            mt-2
                            text-3xl
                            font-bold
                            ${
                                netMovement >= 0
                                    ? "text-[var(--success)]"
                                    : "text-[var(--danger)]"
                            }
                        `}>
                            {netMovement >= 0 ? "+" : ""}
                            {formatCurrency(netMovement)}
                        </p>

                        <p className="
                            mt-2
                            text-xs
                            text-[var(--text-secondary)]
                        ">
                            Ingresos − salidas
                        </p>
                    </div>

                </section>


                {/* TOTAL */}

                <section className="
                    mt-4
                    rounded-2xl
                    border
                    border-[var(--border)]
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
                                Total registrado
                            </p>

                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Suma de todos los movimientos
                            </p>
                        </div>

                        <p className="
                            text-2xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            {formatCurrency(register.total)}
                        </p>
                    </div>
                </section>


                {/* PAYMENT METHODS */}

                <section className="mt-10">

                    <div>
                        <h2 className="
                            text-xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Por medio de pago
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Distribución del dinero registrado según el medio utilizado.
                        </p>
                    </div>


                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-2
                        lg:grid-cols-4
                    ">
                        {Object.entries(
                            totalsByMethod
                        ).map(
                            ([method, amount]) => (
                                <div
                                    key={method}
                                    className="
                                        rounded-xl
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
                                        {getMethodLabel(method)}
                                    </p>

                                    <p className="
                                        mt-2
                                        text-xl
                                        font-semibold
                                        text-[var(--text-primary)]
                                    ">
                                        {formatCurrency(amount)}
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                </section>


                {/* TRANSACTION TYPES */}

                <section className="mt-10">

                    <div>
                        <h2 className="
                            text-xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Por tipo de operación
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Desglose de los movimientos registrados durante la caja.
                        </p>
                    </div>


                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-2
                        lg:grid-cols-3
                    ">
                        {Object.entries(
                            totalsByType
                        ).map(
                            ([type, amount]) => {
                                const isLoss =
                                    type === "loss";

                                const isProvider =
                                    type === "provider";

                                return (
                                    <div
                                        key={type}
                                        className="
                                            rounded-xl
                                            border
                                            border-[var(--border)]
                                            bg-[var(--surface)]
                                            p-5
                                        "
                                    >
                                        <div className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-3
                                        ">
                                            <p className="
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                {getTransactionLabel(type)}
                                            </p>

                                            {isLoss && (
                                                <span className="
                                                    text-xs
                                                    font-medium
                                                    text-[var(--danger)]
                                                ">
                                                    Salida
                                                </span>
                                            )}

                                            {isProvider && (
                                                <span className="
                                                    text-xs
                                                    font-medium
                                                    text-[var(--danger)]
                                                ">
                                                    Salida
                                                </span>
                                            )}
                                        </div>

                                        <p className={`
                                            mt-2
                                            text-xl
                                            font-semibold
                                            ${
                                                isLoss ||
                                                isProvider
                                                    ? "text-[var(--danger)]"
                                                    : "text-[var(--success)]"
                                            }
                                        `}>
                                            {isLoss ||
                                            isProvider
                                                ? "-"
                                                : "+"}
                                            {formatCurrency(amount)}
                                        </p>
                                    </div>
                                );
                            }
                        )}
                    </div>

                </section>


                {/* FIADO */}

                <section className="mt-10">

                    <div>
                        <h2 className="
                            text-xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Fiado
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Movimientos de deuda durante esta caja. No forman parte
                            del dinero disponible en efectivo.
                        </p>
                    </div>


                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-3
                    ">

                        {/* NEW DEBT */}

                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <p className="
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Nuevos fiados
                            </p>

                            <p className="
                                mt-2
                                text-xl
                                font-semibold
                                text-[var(--warning)]
                            ">
                                {formatCurrency(
                                    fiado.new_debt
                                )}
                            </p>

                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Deuda generada
                            </p>
                        </div>


                        {/* PAYMENTS */}

                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <p className="
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Pagos recibidos
                            </p>

                            <p className="
                                mt-2
                                text-xl
                                font-semibold
                                text-[var(--success)]
                            ">
                                {formatCurrency(
                                    fiado.payments
                                )}
                            </p>

                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Dinero ingresado
                            </p>
                        </div>


                        {/* NET DEBT MOVEMENT */}

                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <p className="
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Variación de deuda
                            </p>

                            <p className="
                                mt-2
                                text-xl
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                {Number(fiado.net) > 0 ? "+" : ""}
                                {formatCurrency(fiado.net)}
                            </p>

                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Deuda generada − pagos
                            </p>
                        </div>

                    </div>


                    {/* CLIENT BREAKDOWN */}

                    {fiado.clients.length > 0 && (
                        <div className="
                            mt-4
                            overflow-hidden
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                        ">

                            <div className="
                                border-b
                                border-[var(--border)]
                                px-5
                                py-4
                            ">
                                <p className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Por cliente
                                </p>
                            </div>


                            <div className="
                                divide-y
                                divide-[var(--border)]
                            ">
                                {fiado.clients.map(
                                    (client) => (
                                        <div
                                            key={client.client_id}
                                            className="
                                                grid
                                                gap-3
                                                px-5
                                                py-4
                                                sm:grid-cols-[1fr_auto_auto_auto]
                                                sm:items-center
                                            "
                                        >

                                            <p className="
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {client.client_name}
                                            </p>


                                            <div className="text-sm">
                                                <span className="
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Fiado:{" "}
                                                </span>

                                                <span className="
                                                    font-medium
                                                    text-[var(--warning)]
                                                ">
                                                    {formatCurrency(
                                                        client.debt
                                                    )}
                                                </span>
                                            </div>


                                            <div className="text-sm">
                                                <span className="
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Pagó:{" "}
                                                </span>

                                                <span className="
                                                    font-medium
                                                    text-[var(--success)]
                                                ">
                                                    {formatCurrency(
                                                        client.payments
                                                    )}
                                                </span>
                                            </div>


                                            <div className="
                                                text-sm
                                                font-semibold
                                                text-[var(--text-primary)]
                                            ">
                                                Deuda neta:{" "}
                                                {Number(client.net) > 0
                                                    ? "+"
                                                    : ""}
                                                {formatCurrency(
                                                    client.net
                                                )}
                                            </div>

                                        </div>
                                    )
                                )}
                            </div>

                        </div>
                    )}

                </section>


                {/* TRANSACTIONS */}

                {transactions.length > 0 && (
                    <section className="mt-10">

                        <div>
                            <h2 className="
                                text-xl
                                font-bold
                                text-[var(--text-primary)]
                            ">
                                Operaciones
                            </h2>

                            <p className="
                                mt-1
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Detalle de todos los movimientos de esta caja.
                            </p>
                        </div>


                        <div className="
                            mt-4
                            overflow-hidden
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                        ">
                            <div className="
                                divide-y
                                divide-[var(--border)]
                            ">
                                {transactions.map(
                                    (transaction) => {
                                        const amount =
                                            Number(
                                                transaction.total ??
                                                transaction.amount ??
                                                0
                                            );

                                        const isOutgoing =
                                            transaction.type === "loss" ||
                                            transaction.type === "provider";

                                        return (
                                            <div
                                                key={transaction.id}
                                                className="
                                                    px-5
                                                    py-4
                                                "
                                            >
                                                <div className="
                                                    flex
                                                    flex-col
                                                    gap-2
                                                    sm:flex-row
                                                    sm:items-center
                                                    sm:justify-between
                                                ">
                                                    <div>
                                                        <p className="
                                                            font-medium
                                                            text-[var(--text-primary)]
                                                        ">
                                                            {getTransactionLabel(
                                                                transaction.type
                                                            )}
                                                        </p>

                                                        <div className="
                                                            mt-1
                                                            flex
                                                            flex-wrap
                                                            gap-x-3
                                                            gap-y-1
                                                            text-xs
                                                            text-[var(--text-secondary)]
                                                        ">
                                                            {transaction.client_name && (
                                                                <span>
                                                                    Cliente:{" "}
                                                                    {transaction.client_name}
                                                                </span>
                                                            )}

                                                            {transaction.provider_name && (
                                                                <span>
                                                                    Proveedor:{" "}
                                                                    {transaction.provider_name}
                                                                </span>
                                                            )}

                                                            {transaction.description && (
                                                                <span>
                                                                    {transaction.description}
                                                                </span>
                                                            )}

                                                            {transaction.created_at && (
                                                                <span>
                                                                    {formatDate(
                                                                        transaction.created_at
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className={`
                                                        text-lg
                                                        font-semibold
                                                        ${
                                                            isOutgoing
                                                                ? "text-[var(--danger)]"
                                                                : "text-[var(--success)]"
                                                        }
                                                    `}>
                                                        {isOutgoing
                                                            ? "-"
                                                            : "+"}
                                                        {formatCurrency(
                                                            amount
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>

                    </section>
                )}


                <div className="
                    mt-10
                    border-t
                    border-[var(--border)]
                    pt-6
                ">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/registers")
                        }
                        className="
                            w-full
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            px-4
                            py-3
                            font-semibold
                            text-[var(--text-primary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                        "
                    >
                        Volver al historial
                    </button>
                </div>

            </div>
        </div>
    );
}


export default RegisterReport;