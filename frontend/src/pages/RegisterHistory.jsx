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


function RegisterHistory() {
    const navigate = useNavigate();

    const [registers, setRegisters] = useState([]);
    const [isLoading, setIsLoading] =
        useState(true);


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
                max-w-4xl
            ">
                <h1 className="
                    mt-4
                    text-3xl
                    font-bold
                    text-[var(--text-primary)]
                ">
                    Historial de cierres
                </h1>

                <p className="
                    mt-2
                    text-[var(--text-secondary)]
                ">
                    Registro de cajas cerradas.
                </p>

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
                        rounded-2xl
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
                        {registers.map((register) => (
                            <button
                                key={register.id}
                                onClick={() =>
                                    navigate(
                                        `/registers/${register.id}`
                                    )
                                }
                                className="
                                    w-full
                                    rounded-2xl
                                    bg-[var(--surface)]
                                    p-5
                                    text-left
                                    transition
                                    hover:shadow-sm
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
                                            Caja #{register.id}
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            {formatDate(
                                                register.closed_at
                                            )}
                                        </p>
                                    </div>

                                    <strong className="
                                        text-lg
                                        text-[var(--text-primary)]
                                    ">
                                        {formatCurrency(
                                            register.total
                                        )}
                                    </strong>
                                </div>

                                <div className="
                                    mt-4
                                    text-sm
                                    text-[var(--text-secondary)]
                                ">
                                    {register.transaction_count}{" "}
                                    {register.transaction_count === 1
                                        ? "operación"
                                        : "operaciones"}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}


export default RegisterHistory;