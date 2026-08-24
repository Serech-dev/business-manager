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

    const [register, setRegister] =
        useState(null);

    const [isLoading, setIsLoading] =
        useState(true);


    useEffect(() => {
        async function loadRegister() {
            try {
                const data =
                    await getClosedRegister(id);

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


    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            px-4
            py-8
        ">
            <div className="
                mx-auto
                max-w-4xl
            ">

                <div>

                    <h1 className="
                        text-3xl
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        Cierre de caja #{register.id}
                    </h1>

                    <div className="
                        mt-3
                        space-y-1
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        <p>
                            Apertura:{" "}
                            {formatDate(
                                register.opened_at
                            )}
                        </p>

                        <p>
                            Cierre:{" "}
                            {formatDate(
                                register.closed_at
                            )}
                        </p>
                    </div>

                </div>


                <div className="
                    mt-8
                    rounded-2xl
                    bg-[var(--surface)]
                    p-6
                ">
                    <p className="
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        Total registrado
                    </p>

                    <p className="
                        mt-1
                        text-3xl
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        {formatCurrency(
                            register.total
                        )}
                    </p>

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


                <section className="mt-8">

                    <h2 className="
                        text-xl
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        Por medio de pago
                    </h2>

                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-2
                    ">
                        {Object.entries(
                            register.totals_by_method
                        ).map(
                            ([method, amount]) => (
                                <div
                                    key={method}
                                    className="
                                        rounded-2xl
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
                                        mt-1
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


                <section className="mt-8">

                    <h2 className="
                        text-xl
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        Por tipo de operación
                    </h2>

                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-2
                    ">
                        {Object.entries(
                            register.totals_by_type
                        ).map(
                            ([type, amount]) => (
                                <div
                                    key={type}
                                    className="
                                        rounded-2xl
                                        bg-[var(--surface)]
                                        p-5
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        {getTransactionLabel(type)}
                                    </p>

                                    <p className="
                                        mt-1
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

                {/* FIADO */}

                <section className="mt-8">

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
                        Movimientos de fiado registrados
                        durante esta caja.
                    </p>


                    <div className="
                        mt-4
                        grid
                        gap-3
                        sm:grid-cols-3
                    ">

                        {/* NEW DEBT */}

                        <div className="
                            rounded-2xl
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
                                mt-1
                                text-xl
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                {formatCurrency(
                                    register.fiado.new_debt
                                )}
                            </p>
                        </div>


                        {/* PAYMENTS */}

                        <div className="
                            rounded-2xl
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
                                mt-1
                                text-xl
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                {formatCurrency(
                                    register.fiado.payments
                                )}
                            </p>
                        </div>


                        {/* NET */}

                        <div className="
                            rounded-2xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <p className="
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Movimiento neto
                            </p>

                            <p className="
                                mt-1
                                text-xl
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                {formatCurrency(
                                    register.fiado.net
                                )}
                            </p>
                        </div>

                    </div>


                    {/* CLIENT BREAKDOWN */}

                    {register.fiado.clients.length > 0 && (
                        <div className="
                            mt-4
                            overflow-hidden
                            rounded-2xl
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

                                {register.fiado.clients.map(
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


                                            <div className="
                                                text-sm
                                            ">
                                                <span className="
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Monto fiado:{" "}
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


                                            <div className="
                                                text-sm
                                            ">
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
                                                Neto:  
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


                <button
                    onClick={() =>
                        navigate("/registers")
                    }
                    className="
                        mt-8
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
                    Volver al historial
                </button>

            </div>
        </div>
    );
}


export default RegisterReport;