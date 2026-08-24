import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClient,
    getTransactions,
    updateClient,
    getTransactionLabel,
    getMethodLabel,
} from "../services/business";

import { formatCurrency } from "../utils/formatCurrency";


function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadClient() {
            try {
                const [
                    clientData,
                    transactionData,
                ] = await Promise.all([
                    getClient(id),
                    getTransactions(),
                ]);

                setClient(clientData);
                setTransactions(
                    transactionData.filter(
                        (transaction) =>
                            transaction.client === Number(id)
                    )
                );

                setName(clientData.name);
                setPhone(clientData.phone || "");
                setNotes(clientData.notes || "");
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo cargar el cliente."
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadClient();
    }, [id]);


    async function handleSave(event) {
        event.preventDefault();

        if (!name.trim()) {
            toast.error(
                "El nombre es obligatorio."
            );

            return;
        }

        setIsSaving(true);

        try {
            const updatedClient =
                await updateClient(id, {
                    name: name.trim(),
                    phone: phone.trim(),
                    notes: notes.trim(),
                });

            setClient(updatedClient);

            toast.success(
                "Cliente actualizado."
            );
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo actualizar el cliente."
            );
        } finally {
            setIsSaving(false);
        }
    }


    if (isLoading) {
        return (
            <div className="
                flex
                min-h-screen
                items-center
                justify-center
                text-[var(--text-secondary)]
            ">
                Cargando cliente...
            </div>
        );
    }


    if (!client) {
        return null;
    }


    const debtTransactions =
        transactions.filter(
            (transaction) =>
                transaction.amounts?.some(
                    (amount) =>
                        amount.method === "debt"
                )
        );


    const debtTotal =
        debtTransactions.reduce(
            (total, transaction) =>
                total +
                transaction.amounts.reduce(
                    (amountTotal, amount) =>
                        amountTotal +
                        (
                            amount.method === "debt"
                                ? Number(amount.amount) || 0
                                : 0
                        ),
                    0
                ),
            0
        );


    return (
        <div className="
            mx-auto
            max-w-7xl
            px-8
            py-8
        ">

            {/* HEADER */}

            <header className="
                border-b
                border-[var(--border)]
                pb-6
            ">

                <p className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-[var(--primary)]
                ">
                    Cliente
                </p>

                <h1 className="
                    mt-1
                    text-3xl
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                ">
                    {client.name}
                </h1>

            </header>


            <div className="
                mt-8
                grid
                gap-6
                lg:grid-cols-[minmax(0,1fr)_320px]
                lg:items-start
            ">

                {/* CLIENT INFORMATION */}

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
                            Información
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Datos guardados del cliente.
                        </p>
                    </div>


                    <form
                        onSubmit={handleSave}
                        className="
                            space-y-6
                            p-6
                        "
                    >

                        <div>
                            <label
                                htmlFor="name"
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                "
                            >
                                Nombre
                            </label>

                            <input
                                id="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
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
                                    focus:border-[var(--primary)]
                                    focus:ring-2
                                    focus:ring-[var(--primary)]/20
                                "
                            />
                        </div>


                        <div>
                            <label
                                htmlFor="phone"
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                "
                            >
                                Teléfono
                            </label>

                            <input
                                id="phone"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
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
                                    focus:border-[var(--primary)]
                                    focus:ring-2
                                    focus:ring-[var(--primary)]/20
                                "
                            />
                        </div>


                        <div>
                            <label
                                htmlFor="notes"
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                "
                            >
                                Notas
                            </label>

                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                rows={4}
                                className="
                                    mt-2
                                    w-full
                                    resize-none
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    bg-[var(--background)]
                                    px-3
                                    py-2.5
                                    text-[var(--text-primary)]
                                    outline-none
                                    focus:border-[var(--primary)]
                                    focus:ring-2
                                    focus:ring-[var(--primary)]/20
                                "
                            />
                        </div>


                        <button
                            type="submit"
                            disabled={isSaving}
                            className="
                                rounded-md
                                bg-[var(--primary)]
                                px-5
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-[var(--primary-hover)]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {isSaving
                                ? "Guardando..."
                                : "Guardar cambios"}
                        </button>

                    </form>

                </section>


                {/* SUMMARY */}

                <aside className="
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
                    </div>


                    <div className="p-6">

                        <p className="
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Operaciones
                        </p>

                        <p className="
                            mt-1
                            text-2xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            {transactions.length}
                        </p>


                        {debtTotal > 0 && (
                            <div className="
                                mt-6
                                border-t
                                border-[var(--border)]
                                pt-5
                            ">
                                <p className="
                                    text-sm
                                    text-[var(--text-secondary)]
                                ">
                                    Fiado registrado
                                </p>

                                <p className="
                                    mt-1
                                    text-xl
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    ${formatCurrency(debtTotal)}
                                </p>

                                <p className="
                                    mt-1
                                    text-xs
                                    text-[var(--text-secondary)]
                                ">
                                    Pendiente de implementar el pago.
                                </p>
                            </div>
                        )}

                    </div>

                </aside>

            </div>


            {/* TRANSACTION HISTORY */}

            <section className="mt-8">

                <div className="
                    flex
                    items-end
                    justify-between
                    gap-4
                ">

                    <div>
                        <p className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--text-secondary)]
                        ">
                            Historial
                        </p>

                        <h2 className="
                            mt-1
                            text-xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Operaciones
                        </h2>
                    </div>

                </div>


                {transactions.length === 0 ? (

                    <div className="
                        mt-5
                        border
                        border-dashed
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-10
                        text-center
                    ">
                        <p className="
                            font-semibold
                            text-[var(--text-primary)]
                        ">
                            Sin operaciones
                        </p>

                        <p className="
                            mt-1
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Este cliente todavía no tiene operaciones asociadas.
                        </p>
                    </div>

                ) : (

                    <div className="
                        mt-5
                        overflow-hidden
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
                                        key={transaction.id}
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-4
                                            px-6
                                            py-4
                                        "
                                    >

                                        <div>
                                            <p className="
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {getTransactionLabel(
                                                    transaction.type
                                                )}
                                            </p>

                                            <p className="
                                                mt-1
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                {new Date(
                                                    transaction.created_at
                                                ).toLocaleString(
                                                    "es-AR"
                                                )}
                                            </p>
                                        </div>


                                        <div className="
                                            text-right
                                        ">
                                            <p className="
                                                font-semibold
                                                text-[var(--text-primary)]
                                            ">
                                                {formatCurrency(
                                                    transaction.total
                                                )}
                                            </p>

                                            <p className="
                                                mt-1
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                {transaction.amounts
                                                    ?.map(
                                                        (amount) =>
                                                            getMethodLabel(
                                                                amount.method
                                                            )
                                                    )
                                                    .join(" · ")}
                                            </p>
                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                    </div>

                )}

            </section>

        </div>
    );
}


export default ClientDetail;