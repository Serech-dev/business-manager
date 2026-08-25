import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getProvider,
    getTransactions,
    updateProvider,
    createProvider,
    getTransactionLabel,
    getMethodLabel,
} from "../services/business";

import { formatCurrency } from "../utils/formatCurrency";


function ProviderDetail({ isNewProvider = false }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [provider, setProvider] = useState(
        isNewProvider ? {} : null
    );

    const [transactions, setTransactions] = useState([]);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        async function loadProvider() {
            if (isNewProvider) {
                setIsLoading(false);
                return;
            }

            try {
                const [
                    providerData,
                    transactionData,
                ] = await Promise.all([
                    getProvider(id),
                    getTransactions(),
                ]);

                setProvider(providerData);

                setTransactions(
                    transactionData.filter(
                        (transaction) =>
                            transaction.provider === Number(id)
                    )
                );

                setName(providerData.name);
                setPhone(providerData.phone || "");
                setNotes(providerData.notes || "");
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo cargar el proveedor."
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadProvider();
    }, [id, isNewProvider]);


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
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                notes: notes.trim(),
            };

            const savedProvider = isNewProvider
                ? await createProvider(data)
                : await updateProvider(id, data);

            setProvider(savedProvider);

            toast.success(
                isNewProvider
                    ? "Proveedor creado."
                    : "Proveedor actualizado."
            );

            if (isNewProvider) {
                navigate("/providers");
            }
        } catch (error) {
            console.error(error);

            toast.error(
                isNewProvider
                    ? "No se pudo crear el proveedor."
                    : "No se pudo actualizar el proveedor."
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
                Cargando proveedor...
            </div>
        );
    }


    if (!provider) {
        return null;
    }


    const totalAmount = transactions.reduce(
        (total, transaction) =>
            total +
            Number(transaction.total || 0),
        0
    );


    const cashTotal = transactions.reduce(
        (total, transaction) =>
            total +
            (transaction.amounts || []).reduce(
                (amountTotal, amount) =>
                    amountTotal +
                    (
                        amount.method === "cash"
                            ? Number(amount.amount) || 0
                            : 0
                    ),
                0
            ),
        0
    );


    const transferTotal = transactions.reduce(
        (total, transaction) =>
            total +
            (transaction.amounts || []).reduce(
                (amountTotal, amount) =>
                    amountTotal +
                    (
                        amount.method === "transfer"
                            ? Number(amount.amount) || 0
                            : 0
                    ),
                0
            ),
        0
    );


    const owedTotal = transactions.reduce(
        (total, transaction) =>
            total +
            (transaction.amounts || []).reduce(
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
                    Proveedor
                </p>

                <h1 className="
                    mt-1
                    text-3xl
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                ">
                    {isNewProvider
                        ? "Nuevo proveedor"
                        : provider.name}
                </h1>

            </header>


            {/* INFORMATION */}

            <section className="
                mt-8
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
                        Datos guardados del proveedor.
                    </p>
                </div>


                <form
                    onSubmit={handleSave}
                    className="
                        space-y-5
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
                            rows={2}
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
                                text-sm
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                            placeholder="Notas opcionales"
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


            {/* TRANSACTION HISTORY */}

            <section className="mt-8">

                <div className="
                    border-b
                    border-[var(--border)]
                    pb-4
                ">

                    <p className="
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wider
                        text-[var(--text-secondary)]
                    ">
                        Historial
                    </p>

                    <div className="
                        mt-1
                        flex
                        items-baseline
                        justify-between
                        gap-4
                    ">

                        <h2 className="
                            text-xl
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Operaciones
                        </h2>

                        <span className="
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            {transactions.length}{" "}
                            {transactions.length === 1
                                ? "operación"
                                : "operaciones"}
                        </span>

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
                            Este proveedor todavía no tiene operaciones asociadas.
                        </p>

                    </div>

                ) : (

                    <div className="
                        mt-4
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
                                            px-6
                                            py-4
                                        "
                                    >

                                        <div className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-6
                                        ">

                                            <div className="
                                                min-w-0
                                                flex-1
                                            ">

                                                <p className="
                                                    truncate
                                                    font-medium
                                                    text-[var(--text-primary)]
                                                ">
                                                    {transaction.description}
                                                </p>

                                                <div className="
                                                    mt-1
                                                    flex
                                                    flex-wrap
                                                    items-center
                                                    gap-x-3
                                                    gap-y-1
                                                    text-xs
                                                    text-[var(--text-secondary)]
                                                ">

                                                    <span>
                                                        {new Date(
                                                            transaction.created_at
                                                        ).toLocaleString(
                                                            "es-AR"
                                                        )}
                                                    </span>

                                                    <span>
                                                        {transaction.amounts
                                                            ?.map(
                                                                (amount) =>
                                                                    getMethodLabel(
                                                                        amount.method
                                                                    )
                                                            )
                                                            .join(" · ")}
                                                    </span>

                                                </div>

                                            </div>


                                            <p className="
                                                shrink-0
                                                text-right
                                                font-semibold
                                                text-[var(--text-primary)]
                                            ">
                                                {formatCurrency(
                                                    transaction.total
                                                )}
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


export default ProviderDetail;