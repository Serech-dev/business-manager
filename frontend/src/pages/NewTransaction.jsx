import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { createTransaction } from "../services/business";


function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}


function NewTransaction() {
    const navigate = useNavigate();

    const [type, setType] = useState("sale");
    const [description, setDescription] = useState("");
    const [exchangeAmount, setExchangeAmount] = useState("");

    const [amounts, setAmounts] = useState([
        {
            method: "cash",
            amount: "",
        },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isExchange =
        type === "exchange" ||
        type === "sale_exchange";


    function updateAmount(index, field, value) {
        setAmounts((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item
            )
        );
    }


    function addAmount() {
        setAmounts((current) => [
            ...current,
            {
                method: "cash",
                amount: "",
            },
        ]);
    }


    function removeAmount(index) {
        setAmounts((current) =>
            current.filter(
                (_, itemIndex) => itemIndex !== index
            )
        );
    }


    function getTotal() {
        return amounts.reduce(
            (total, item) =>
                total + (Number(item.amount) || 0),
            0
        );
    }


    function getExchangeFee() {
        if (!isExchange || !exchangeAmount) {
            return 0;
        }

        return Number(exchangeAmount) * 0.10;
    }


    function handleTypeChange(event) {
        setType(event.target.value);
        setExchangeAmount("");

        setAmounts([
            {
                method: "cash",
                amount: "",
            },
        ]);
    }


    async function handleSubmit(event) {
        event.preventDefault();

        const validAmounts = amounts
            .filter((item) => item.amount !== "")
            .map((item) => ({
                method: item.method,
                amount: item.amount,
            }));

        if (validAmounts.length === 0) {
            toast.error(
                "Ingresá al menos un monto."
            );
            return;
        }

        if (
            isExchange &&
            (!exchangeAmount ||
                Number(exchangeAmount) <= 0)
        ) {
            toast.error(
                "Ingresá el monto del cambio."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            await createTransaction({
                type,
                description,
                exchange_amount:
                    isExchange
                        ? exchangeAmount
                        : null,
                amounts: validAmounts,
            });

            toast.success(
                "Operación registrada."
            );

            navigate("/");
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo registrar la operación."
            );
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            px-6
            py-8
            lg:px-10
        ">
            <div className="
                mx-auto
                max-w-6xl
            ">

                {/* HEADER */}

                <header className="
                    border-b
                    border-[var(--border)]
                    pb-6
                ">

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="
                            mb-5
                            inline-flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:text-[var(--text-primary)]
                        "
                    >
                        <span aria-hidden="true">
                            ←
                        </span>

                        Volver al inicio
                    </button>


                    <div>
                        <p className="
                            text-sm
                            font-medium
                            uppercase
                            tracking-wider
                            text-[var(--primary)]
                        ">
                            Operaciones
                        </p>

                        <h1 className="
                            mt-1
                            text-3xl
                            font-bold
                            tracking-tight
                            text-[var(--text-primary)]
                        ">
                            Nueva operación
                        </h1>

                        <p className="
                            mt-2
                            max-w-2xl
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Registrá un movimiento de la caja actual.
                        </p>
                    </div>

                </header>


                <form
                    onSubmit={handleSubmit}
                    className="
                        mt-8
                    "
                >

                    <div className="
                        grid
                        gap-6
                        lg:grid-cols-[minmax(0,1fr)_320px]
                        lg:items-start
                    ">

                        {/* MAIN FORM */}

                        <div className="
                            space-y-6
                        ">

                            {/* BASIC INFORMATION */}

                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">

                                <div className="
                                    border-b
                                    border-[var(--border)]
                                    px-6
                                    py-5
                                ">
                                    <h2 className="
                                        font-semibold
                                        text-[var(--text-primary)]
                                    ">
                                        Información de la operación
                                    </h2>

                                    <p className="
                                        mt-1
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Indicá qué tipo de movimiento estás registrando.
                                    </p>
                                </div>


                                <div className="
                                    grid
                                    gap-6
                                    p-6
                                    md:grid-cols-2
                                ">

                                    <div>
                                        <label
                                            htmlFor="type"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Tipo de operación
                                        </label>

                                        <select
                                            id="type"
                                            value={type}
                                            onChange={handleTypeChange}
                                            className="
                                                mt-2
                                                w-full
                                                rounded-md
                                                border
                                                border-[var(--border)]
                                                bg-[var(--background)]
                                                px-3
                                                py-2.5
                                                text-[var(--text-primary)]
                                                outline-none
                                                transition
                                                focus:border-[var(--primary)]
                                                focus:ring-2
                                                focus:ring-[var(--primary)]/20
                                            "
                                        >
                                            <option value="sale">
                                                Venta
                                            </option>

                                            <option value="service">
                                                Servicio
                                            </option>

                                            <option value="exchange">
                                                Cambio
                                            </option>

                                            <option value="sale_exchange">
                                                Venta + Cambio
                                            </option>

                                            <option value="provider">
                                                Proveedor
                                            </option>

                                            <option value="expense">
                                                Gasto
                                            </option>

                                            <option value="loss">
                                                Pérdida
                                            </option>
                                        </select>
                                    </div>


                                    <div>
                                        <label
                                            htmlFor="description"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Descripción
                                        </label>

                                        <input
                                            id="description"
                                            value={description}
                                            onChange={(event) =>
                                                setDescription(
                                                    event.target.value
                                                )
                                            }
                                            className="
                                                mt-2
                                                w-full
                                                rounded-md
                                                border
                                                border-[var(--border)]
                                                bg-[var(--background)]
                                                px-3
                                                py-2.5
                                                text-[var(--text-primary)]
                                                outline-none
                                                transition
                                                placeholder:text-[var(--text-secondary)]
                                                focus:border-[var(--primary)]
                                                focus:ring-2
                                                focus:ring-[var(--primary)]/20
                                            "
                                            placeholder="Opcional"
                                        />
                                    </div>

                                </div>

                            </section>


                            {/* EXCHANGE */}

                            {isExchange && (
                                <section className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                ">

                                    <div className="
                                        border-b
                                        border-[var(--border)]
                                        px-6
                                        py-5
                                    ">
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Datos del cambio
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Indicá el monto sobre el cual se calcula la comisión.
                                        </p>
                                    </div>


                                    <div className="
                                        max-w-md
                                        p-6
                                    ">
                                        <label
                                            htmlFor="exchangeAmount"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Monto de cambio
                                        </label>

                                        <div className="
                                            relative
                                            mt-2
                                        ">
                                            <span className="
                                                pointer-events-none
                                                absolute
                                                left-3
                                                top-1/2
                                                -translate-y-1/2
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                $
                                            </span>

                                            <input
                                                id="exchangeAmount"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={exchangeAmount}
                                                onChange={(event) =>
                                                    setExchangeAmount(
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    w-full
                                                    rounded-md
                                                    border
                                                    border-[var(--border)]
                                                    bg-[var(--background)]
                                                    py-2.5
                                                    pl-7
                                                    pr-3
                                                    text-[var(--text-primary)]
                                                    outline-none
                                                    transition
                                                    focus:border-[var(--primary)]
                                                    focus:ring-2
                                                    focus:ring-[var(--primary)]/20
                                                "
                                                placeholder="0"
                                            />
                                        </div>


                                        {exchangeAmount && (
                                            <div className="
                                                mt-4
                                                flex
                                                items-center
                                                justify-between
                                                border-t
                                                border-[var(--border)]
                                                pt-4
                                                text-sm
                                            ">
                                                <span className="
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Comisión de cambio
                                                </span>

                                                <strong className="
                                                    text-[var(--text-primary)]
                                                ">
                                                    $
                                                    {formatCurrency(
                                                        getExchangeFee()
                                                    )}
                                                </strong>
                                            </div>
                                        )}

                                    </div>

                                </section>
                            )}


                            {/* AMOUNTS */}

                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">

                                <div className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-4
                                    border-b
                                    border-[var(--border)]
                                    px-6
                                    py-5
                                ">

                                    <div>
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Montos
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Podés dividir la operación entre distintos medios de pago.
                                        </p>
                                    </div>


                                    <button
                                        type="button"
                                        onClick={addAmount}
                                        className="
                                            shrink-0
                                            rounded-md
                                            border
                                            border-[var(--border)]
                                            px-3
                                            py-2
                                            text-sm
                                            font-medium
                                            text-[var(--primary)]
                                            transition
                                            hover:border-[var(--primary)]
                                            hover:bg-[var(--surface-accent)]
                                        "
                                    >
                                        + Agregar
                                    </button>

                                </div>


                                <div className="
                                    divide-y
                                    divide-[var(--border)]
                                ">
                                    {amounts.map(
                                        (item, index) => (
                                            <div
                                                key={index}
                                                className="
                                                    flex
                                                    items-center
                                                    gap-3
                                                    p-6
                                                "
                                            >

                                                <select
                                                    value={item.method}
                                                    onChange={(event) =>
                                                        updateAmount(
                                                            index,
                                                            "method",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="
                                                        w-48
                                                        shrink-0
                                                        rounded-md
                                                        border
                                                        border-[var(--border)]
                                                        bg-[var(--background)]
                                                        px-3
                                                        py-2.5
                                                        text-sm
                                                        text-[var(--text-primary)]
                                                        outline-none
                                                        focus:border-[var(--primary)]
                                                    "
                                                >
                                                    <option value="cash">
                                                        Efectivo
                                                    </option>

                                                    <option value="transfer">
                                                        Transferencia
                                                    </option>

                                                    <option value="card">
                                                        Tarjeta
                                                    </option>

                                                    <option value="debt">
                                                        Fiado
                                                    </option>
                                                </select>


                                                <div className="
                                                    relative
                                                    min-w-0
                                                    flex-1
                                                ">
                                                    <span className="
                                                        pointer-events-none
                                                        absolute
                                                        left-3
                                                        top-1/2
                                                        -translate-y-1/2
                                                        text-sm
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        $
                                                    </span>

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.amount}
                                                        onChange={(event) =>
                                                            updateAmount(
                                                                index,
                                                                "amount",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="
                                                            w-full
                                                            rounded-md
                                                            border
                                                            border-[var(--border)]
                                                            bg-[var(--background)]
                                                            py-2.5
                                                            pl-7
                                                            pr-3
                                                            text-[var(--text-primary)]
                                                            outline-none
                                                            focus:border-[var(--primary)]
                                                            focus:ring-2
                                                            focus:ring-[var(--primary)]/20
                                                        "
                                                        placeholder="0"
                                                    />
                                                </div>


                                                {amounts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeAmount(index)
                                                        }
                                                        className="
                                                            rounded-md
                                                            px-2
                                                            py-2
                                                            text-lg
                                                            text-[var(--danger)]
                                                            transition
                                                            hover:bg-[var(--danger-bg)]
                                                        "
                                                        aria-label="Eliminar monto"
                                                    >
                                                        ×
                                                    </button>
                                                )}

                                            </div>
                                        )
                                    )}
                                </div>

                            </section>

                        </div>


                        {/* SUMMARY / ACTIONS */}

                        <aside className="
                            lg:sticky
                            lg:top-6
                        ">

                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">

                                <div className="
                                    border-b
                                    border-[var(--border)]
                                    px-6
                                    py-5
                                ">
                                    <p className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-[var(--text-secondary)]
                                    ">
                                        Resumen
                                    </p>

                                    <p className="
                                        mt-2
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Total de la operación
                                    </p>

                                    <p className="
                                        mt-1
                                        text-3xl
                                        font-bold
                                        tracking-tight
                                        text-[var(--text-primary)]
                                    ">
                                        $
                                        {formatCurrency(
                                            getTotal()
                                        )}
                                    </p>
                                </div>


                                <div className="
                                    space-y-3
                                    px-6
                                    py-5
                                ">

                                    <div className="
                                        flex
                                        justify-between
                                        text-sm
                                    ">
                                        <span className="
                                            text-[var(--text-secondary)]
                                        ">
                                            Tipo
                                        </span>

                                        <span className="
                                            font-medium
                                            text-[var(--text-primary)]
                                        ">
                                            {{
                                                sale: "Venta",
                                                service: "Servicio",
                                                exchange: "Cambio",
                                                sale_exchange: "Venta + Cambio",
                                                provider: "Proveedor",
                                                expense: "Gasto",
                                                loss: "Pérdida",
                                            }[type]}
                                        </span>
                                    </div>


                                    {isExchange && (
                                        <div className="
                                            flex
                                            justify-between
                                            text-sm
                                        ">
                                            <span className="
                                                text-[var(--text-secondary)]
                                            ">
                                                Comisión
                                            </span>

                                            <span className="
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                $
                                                {formatCurrency(
                                                    getExchangeFee()
                                                )}
                                            </span>
                                        </div>
                                    )}

                                </div>


                                <div className="
                                    border-t
                                    border-[var(--border)]
                                    p-6
                                ">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="
                                            w-full
                                            rounded-md
                                            bg-[var(--primary)]
                                            px-4
                                            py-3
                                            font-semibold
                                            text-white
                                            transition
                                            hover:bg-[var(--primary-hover)]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        {isSubmitting
                                            ? "Guardando..."
                                            : "Registrar operación"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => navigate("/")}
                                        className="
                                            mt-2
                                            w-full
                                            rounded-md
                                            px-4
                                            py-2.5
                                            text-sm
                                            font-medium
                                            text-[var(--text-secondary)]
                                            transition
                                            hover:bg-[var(--surface-accent)]
                                            hover:text-[var(--text-primary)]
                                        "
                                    >
                                        Cancelar
                                    </button>
                                </div>

                            </section>

                        </aside>

                    </div>

                </form>

            </div>
        </div>
    );
}


export default NewTransaction;