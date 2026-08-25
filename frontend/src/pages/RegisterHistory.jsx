import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClosedRegisters,
} from "../services/business";


function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}


function formatDate(value) {
    return new Intl.DateTimeFormat(
        "es-AR",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    ).format(new Date(value));
}

function formatDateLong(value) {
    return new Intl.DateTimeFormat(
        "es-AR",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    ).format(new Date(value));
}

function RegisterHistory() {
    const navigate = useNavigate();

    const [registers, setRegisters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        async function loadRegisters() {
            try {
                const data =
                    await getClosedRegisters();

                setRegisters(data);
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo cargar el historial."
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadRegisters();
    }, []);


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

                <header>
                    <p className="
                        text-sm
                        font-medium
                        uppercase
                        tracking-wider
                        text-[var(--primary)]
                    ">
                        Historial
                    </p>

                    <h1 className="
                        mt-1
                        text-3xl
                        font-bold
                        tracking-tight
                        text-[var(--text-primary)]
                    ">
                        Cierres de caja
                    </h1>

                    <p className="
                        mt-2
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        Resumen de las cajas cerradas.
                    </p>
                </header>


                {isLoading ? (
                    <div className="
                        mt-8
                        text-[var(--text-secondary)]
                    ">
                        Cargando...
                    </div>
                ) : registers.length === 0 ? (
                    <div className="
                        mt-8
                        rounded-0
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-8
                        text-center
                        text-[var(--text-secondary)]
                    ">
                        Todavía no hay cierres registrados.
                    </div>
                ) : (
                    <div className="
                        mt-8
                        space-y-3
                    ">
                        {registers.map((register) => {

                            const moneyIn =
                                Number(
                                    register.money_in ??
                                    register.total_in ??
                                    register.income ??
                                    0
                                );

                            const moneyOut =
                                Number(
                                    register.money_out ??
                                    register.total_out ??
                                    register.expenses ??
                                    0
                                );

                            const net =
                                Number(
                                    register.net ??
                                    register.net_movement ??
                                    moneyIn - moneyOut
                                );


                            return (
                                <button
                                    key={register.id}
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/registers/${register.id}`
                                        )
                                    }
                                    className="
                                        w-full
                                        rounded-0
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                        p-5
                                        text-left
                                        transition
                                        hover:bg-[var(--surface-accent)]
                                    "
                                >

                                    {/* HEADER */}

                                    <div className="
                                        flex
                                        flex-col
                                        gap-2
                                        sm:flex-row
                                        sm:items-start
                                        sm:justify-between
                                    ">
                                        <div>
                                            <h2 className="
                                                font-semibold
                                                text-[var(--text-primary)]
                                            ">
                                                Caja del {formatDateLong(register.opened_at)}
                                            </h2>

                                            <p className="
                                                mt-1
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                {formatDate(
                                                    register.opened_at
                                                )}
                                                {" → "}
                                                {formatDate(
                                                    register.closed_at
                                                )}
                                            </p>
                                        </div>

                                        <span className="
                                            text-sm
                                            font-medium
                                            text-[var(--text-secondary)]
                                        ">
                                            {register.transaction_count}{" "}
                                            {register.transaction_count === 1
                                                ? "operación"
                                                : "operaciones"}
                                        </span>
                                    </div>


                                    {/* MONEY */}

                                    <div className="
                                        mt-5
                                        grid
                                        gap-3
                                        sm:grid-cols-3
                                    ">

                                        <div>
                                            <p className="
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                Ingresos
                                            </p>

                                            <p className="
                                                mt-1
                                                font-semibold
                                                text-[var(--success)]
                                            ">
                                                +{formatCurrency(
                                                    moneyIn
                                                )}
                                            </p>
                                        </div>


                                        <div>
                                            <p className="
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                Salidas
                                            </p>

                                            <p className="
                                                mt-1
                                                font-semibold
                                                text-[var(--danger)]
                                            ">
                                                -{formatCurrency(
                                                    moneyOut
                                                )}
                                            </p>
                                        </div>


                                        <div>
                                            <p className="
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                Movimiento neto
                                            </p>

                                            <p className={`
                                                mt-1
                                                font-semibold
                                                ${
                                                    net >= 0
                                                        ? "text-[var(--success)]"
                                                        : "text-[var(--danger)]"
                                                }
                                            `}>
                                                {net >= 0
                                                    ? "+"
                                                    : ""}
                                                {formatCurrency(net)}
                                            </p>
                                        </div>

                                    </div>


                                    {/* TOTAL */}

                                    <div className="
                                        mt-5
                                        flex
                                        items-center
                                        justify-between
                                        border-t
                                        border-[var(--border)]
                                        pt-4
                                    ">
                                        <span className="
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Total registrado
                                        </span>

                                        <strong className="
                                            text-lg
                                            text-[var(--text-primary)]
                                        ">
                                            {formatCurrency(
                                                register.total
                                            )}
                                        </strong>
                                    </div>

                                </button>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
}


export default RegisterHistory;