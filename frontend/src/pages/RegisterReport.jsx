import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClosedRegister,
} from "../services/business";


const methodLabels = {
    cash: "Efectivo",
    transfer: "Transferencia",
    card: "Tarjeta",
    debt: "Fiado",
};


const typeLabels = {
    sale: "Ventas",
    service: "Servicios",
    exchange: "Cambios",
    sale_exchange: "Venta + Cambio",
    provider: "Proveedores",
    expense: "Gastos",
    loss: "Pérdidas",
};


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

                <button
                    onClick={() =>
                        navigate("/registers")
                    }
                    className="
                        text-sm
                        font-medium
                        text-[var(--primary)]
                    "
                >
                    ← Historial
                </button>


                <div className="mt-6">

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
                        $
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
                                        {
                                            methodLabels[
                                                method
                                            ] || method
                                        }
                                    </p>

                                    <p className="
                                        mt-1
                                        text-xl
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
                                        {
                                            typeLabels[
                                                type
                                            ] || type
                                        }
                                    </p>

                                    <p className="
                                        mt-1
                                        text-xl
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