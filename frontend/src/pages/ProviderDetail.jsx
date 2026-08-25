import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
    getProvider,
    getTransactions,
    updateProvider,
    createProvider,
    deleteProvider,
    getTransactionLabel,
    getMethodLabel,
} from "../services/business";

import ConfirmDialog from "../components/ConfirmDialog";
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

    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

    async function handleDelete() {
        setIsDeleting(true);

        try {
            await deleteProvider(id);

            toast.success(
                "Proveedor eliminado."
            );

            navigate("/providers");

        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo eliminar el proveedor."
            );
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
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


    const sortedTransactions = [
        ...transactions,
    ].sort(
        (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
    );


    function getProviderMovement(transaction) {
        const debtAmount = (
            transaction.amounts || []
        ).reduce(
            (total, amount) =>
                total +
                (
                    amount.method === "debt"
                        ? Number(amount.amount) || 0
                        : 0
                ),
            0
        );

        const paidAmount = (
            transaction.amounts || []
        ).reduce(
            (total, amount) =>
                total +
                (
                    amount.method !== "debt"
                        ? Number(amount.amount) || 0
                        : 0
                ),
            0
        );

        if (debtAmount > 0) {
            return {
                label: "Deuda",
                amount: debtAmount,
                sign: "+",
                className: "text-[var(--danger)]",
            };
        }

        return {
            label: "Pago a Proveedor",
            amount: paidAmount,
            sign: "",
            className: "text-[var(--text-primary)]",
        };
    }


    return (
        <div className="
            mx-auto
            max-w-5xl
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
                mt-6
                border
                border-[var(--border)]
                bg-[var(--surface)]
            ">

                <div className="
                    border-b
                    border-[var(--border)]
                    px-6
                    py-4
                ">
                    <h2 className="
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        Información
                    </h2>
                </div>


                <form
                    onSubmit={handleSave}
                    className="
                        grid
                        gap-5
                        p-6
                        sm:grid-cols-2
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


                    <div className="sm:col-span-2">
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
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>


                    <div className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        sm:col-span-2
                    ">
                        <button
                            type="submit"
                            disabled={isSaving || isDeleting}
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

                        {!isNewProvider && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isSaving || isDeleting}
                                className="
                                    rounded-md
                                    border
                                    border-[var(--danger-border)]
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-[var(--danger)]
                                    transition
                                    hover:bg-[var(--danger-bg)]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {isDeleting
                                    ? "Eliminando..."
                                    : "Eliminar proveedor"}
                            </button>
                        )}
                    </div>

                </form>

            </section>


            {/* TRANSACTION HISTORY */}

            {!isNewProvider && (
                <section className="mt-10">

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

                        <div className="
                            mt-1
                            flex
                            items-baseline
                            justify-between
                            gap-4
                        ">
                            <h2 className="
                                text-2xl
                                font-bold
                                text-[var(--text-primary)]
                            ">
                                Movimientos
                            </h2>

                            <span className="
                                shrink-0
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                {transactions.length}{" "}
                                {transactions.length === 1
                                    ? "movimiento"
                                    : "movimientos"}
                            </span>
                        </div>
                    </div>


                    {sortedTransactions.length === 0 ? (

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
                                Sin movimientos
                            </p>

                            <p className="
                                mt-1
                                text-sm
                                text-[var(--text-secondary)]
                            ">
                                Este proveedor todavía no tiene movimientos registrados.
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

                                {sortedTransactions.map(
                                    (transaction) => {
                                        const movement =
                                            getProviderMovement(
                                                transaction
                                            );

                                        return (
                                            <div
                                                key={transaction.id}
                                                className="
                                                    flex
                                                    items-center
                                                    justify-between
                                                    gap-6
                                                    px-6
                                                    py-5
                                                "
                                            >

                                                <div className="
                                                    min-w-0
                                                    flex-1
                                                ">

                                                    <p className="
                                                        font-semibold
                                                        text-[var(--text-primary)]
                                                    ">
                                                        {movement.label}
                                                    </p>

                                                    <p className="
                                                        mt-1
                                                        text-sm
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        {new Date(
                                                            transaction.created_at
                                                        ).toLocaleString(
                                                            "es-AR"
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


                                                <div className="
                                                    shrink-0
                                                    text-right
                                                ">

                                                    <p className={`
                                                        text-lg
                                                        font-bold
                                                        ${movement.className}
                                                    `}>
                                                        {movement.sign}
                                                        {formatCurrency(
                                                            movement.amount
                                                        )}
                                                    </p>

                                                    <p className="
                                                        mt-1
                                                        text-xs
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        {getTransactionLabel(
                                                            transaction.type
                                                        )}
                                                    </p>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        </div>

                    )}

                </section>
            )}

            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar proveedor"
                    message={
                        <div>
                            <div>
                                ¿Querés eliminar al proveedor "{provider.name}"?
                            </div>

                            <div className="
                                mt-2
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Esta acción no se puede deshacer.
                            </div>
                        </div>
                    }
                    confirmLabel="Eliminar proveedor"
                    cancelLabel="Cancelar"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteDialog(false)}
                    isLoading={isDeleting}
                />
            )}

        </div>
    );
}


export default ProviderDetail;