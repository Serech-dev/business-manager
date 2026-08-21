import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { createTransaction } from "../services/business";


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
            px-4
            py-8
        ">
            <div className="
                mx-auto
                max-w-2xl
            ">

                <h1 className="
                    text-3xl
                    font-bold
                    text-[var(--text-primary)]
                ">
                    Nueva operación
                </h1>


                <form
                    onSubmit={handleSubmit}
                    className="
                        mt-6
                        space-y-6
                        rounded-2xl
                        bg-[var(--surface)]
                        p-6
                    "
                >

                    {/* TYPE */}

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
                            onChange={(event) => {
                                setType(
                                    event.target.value
                                );

                                setExchangeAmount("");

                                setAmounts([
                                    {
                                        method: "cash",
                                        amount: "",
                                    },
                                ]);
                            }}
                            className="
                                mt-1
                                w-full
                                rounded-xl
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                px-4
                                py-3
                                text-[var(--text-primary)]
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


                    {/* DESCRIPTION */}

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
                                mt-1
                                w-full
                                rounded-xl
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                px-4
                                py-3
                                text-[var(--text-primary)]
                            "
                            placeholder="Opcional"
                        />
                    </div>


                    {/* EXCHANGE */}

                    {isExchange && (
                        <div className="
                            rounded-xl
                            border
                            border-[var(--border)]
                            bg-[var(--surface-muted)]
                            p-4
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
                                    mt-1
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                    px-4
                                    py-3
                                    text-[var(--text-primary)]
                                "
                                placeholder="$ 0.00"
                            />

                            {exchangeAmount && (
                                <div className="
                                    mt-3
                                    flex
                                    justify-between
                                    text-sm
                                ">
                                    <span>
                                        Comisión de cambio
                                    </span>

                                    <strong>
                                        $
                                        {getExchangeFee()}
                                    </strong>
                                </div>
                            )}
                        </div>
                    )}


                    {/* AMOUNTS */}

                    <div>

                        <div className="
                            flex
                            items-center
                            justify-between
                        ">
                            <h2 className="
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                Montos
                            </h2>

                            <button
                                type="button"
                                onClick={addAmount}
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--primary)]
                                "
                            >
                                + Agregar
                            </button>
                        </div>


                        <div className="
                            mt-3
                            space-y-3
                        ">

                            {amounts.map(
                                (item, index) => (
                                    <div
                                        key={index}
                                        className="
                                            flex
                                            gap-2
                                        "
                                    >

                                        <select
                                            value={
                                                item.method
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateAmount(
                                                    index,
                                                    "method",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="
                                                rounded-xl
                                                border
                                                border-[var(--border)]
                                                bg-[var(--surface)]
                                                px-3
                                                py-3
                                                text-[var(--text-primary)]
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


                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={
                                                item.amount
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateAmount(
                                                    index,
                                                    "amount",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="
                                                min-w-0
                                                flex-1
                                                rounded-xl
                                                border
                                                border-[var(--border)]
                                                bg-[var(--surface)]
                                                px-4
                                                py-3
                                                text-[var(--text-primary)]
                                            "
                                            placeholder="$ 0.00"
                                        />


                                        {amounts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeAmount(
                                                        index
                                                    )
                                                }
                                                className="
                                                    px-3
                                                    text-[var(--danger)]
                                                "
                                            >
                                                ×
                                            </button>
                                        )}

                                    </div>
                                )
                            )}

                        </div>

                    </div>

                    {/* TOTAL */}

                    <div className="
                        rounded-xl
                        bg-[var(--surface-muted)]
                        p-4
                    ">

                        <div className="
                            flex
                            justify-between
                        ">
                            <span>
                                Total
                            </span>

                            <strong>
                                $
                                {getTotal()}
                            </strong>
                        </div>


                        {isExchange && (
                            <div className="
                                mt-2
                                flex
                                justify-between
                                text-sm
                            ">
                                <span>
                                    Comisión de cambio
                                </span>

                                <strong>
                                    $
                                    {getExchangeFee()}
                                </strong>
                            </div>
                        )}

                    </div>


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="
                            w-full
                            rounded-xl
                            bg-[var(--primary)]
                            px-4
                            py-3
                            font-semibold
                            text-white
                            disabled:opacity-50
                        "
                    >
                        {isSubmitting
                            ? "Guardando..."
                            : "Registrar operación"}
                    </button>

                </form>

            </div>
        </div>
    );
}


export default NewTransaction;