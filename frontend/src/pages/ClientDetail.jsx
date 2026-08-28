import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClient,
    getTransactions,
    updateClient,
    createClient,
    deleteClient,
    getTransactionLabel,
    getMethodLabel,
} from "../services/business";

import ConfirmDialog from "../components/ConfirmDialog";
import { formatCurrency } from "../utils/formatCurrency";


function ClientDetail({ isNewClient = false }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState(
        isNewClient ? {} : null
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
        async function loadClient() {
            if (isNewClient) {
                setIsLoading(false);
                return;
            }

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
                            (transaction.operations || []).some(
                                (op) =>
                                    op.client === Number(id) ||
                                    op.client?.id === Number(id)
                            )
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
    }, [id, isNewClient]);


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

            const savedClient = isNewClient
                ? await createClient(data)
                : await updateClient(id, data);

            setClient(savedClient);

            toast.success(
                isNewClient
                    ? "Cliente creado."
                    : "Cliente actualizado."
            );

            if (isNewClient) {
                navigate("/clients");
            }
        } catch (error) {
            console.error(error);

            toast.error(
                isNewClient
                    ? "No se pudo crear el cliente."
                    : "No se pudo actualizar el cliente."
            );
        } finally {
            setIsSaving(false);
        }
    }


    async function handleDelete() {
        setIsDeleting(true);

        try {
            await deleteClient(id);

            toast.success(
                "Cliente eliminado."
            );

            navigate("/clients");
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo eliminar el cliente."
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
                Cargando cliente...
            </div>
        );
    }


    if (!client) {
        return null;
    }


    const clientOperations = transactions.flatMap((tx) =>
        (tx.operations || [])
            .filter(
                (op) =>
                    op.client === Number(id) ||
                    op.client?.id === Number(id)
            )
            .map((op) => ({
                ...op,
                transactionId: tx.id,
                created_at: tx.created_at,
            }))
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
        client.debt !== undefined
            ? Number(client.debt)
            : clientOperations.reduce((total, op) => {
                if (op.type === "payment") {
                    return (
                        total -
                        (op.amounts || []).reduce(
                            (sum, a) => sum + (Number(a.amount) || 0),
                            0
                        )
                    );
                }
                return (
                    total +
                    (op.amounts || []).reduce(
                        (sum, a) =>
                            sum +
                            (a.method === "debt"
                                ? Number(a.amount) || 0
                                : 0),
                        0
                    )
                );
            }, 0);


    return (
        <div className="
            mx-auto
            max-w-7xl
            px-6
            py-8
        ">

            {/* HEADER */}

            <header className="
                border-b
                border-[var(--border)]
                pb-6
            ">

                <div className="
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-end
                    sm:justify-between
                ">

                    <div>

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
                            {isNewClient
                                ? "Nuevo cliente"
                                : client.name}
                        </h1>

                    </div>


                    {!isNewClient && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowDeleteDialog(true)
                            }
                            disabled={isDeleting}
                            className="
                                border
                                border-[var(--danger-border)]
                                px-4
                                py-2
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
                                : "Eliminar cliente"}
                        </button>
                    )}

                </div>

            </header>


            {/* CLIENT OVERVIEW */}

            <div className="
                mt-8
            ">

                {/* INFORMATION */}

                <section className="
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

                        <h2 className="
                            font-semibold
                            text-[var(--text-primary)]
                        ">
                            Información
                        </h2>

                        <p className="
                            mt-1
                            text-xs
                            text-[var(--text-secondary)]
                        ">
                            Datos del cliente.
                        </p>

                    </div>


                    <form
                        onSubmit={handleSave}
                        className="
                            grid
                            gap-5
                            p-5
                            sm:grid-cols-2
                        "
                    >

                        {/* NAME */}

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


                        {/* PHONE */}

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


                        {/* NOTES */}

                        <div className="
                            sm:col-span-2
                        ">

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
                                placeholder="Información adicional..."
                            />

                        </div>


                        {/* ACTIONS */}

                        <div className="
                            flex
                            items-center
                            gap-3
                            sm:col-span-2
                        ">

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="
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
                                    : isNewClient
                                        ? "Crear cliente"
                                        : "Guardar cambios"}
                            </button>

                        </div>

                    </form>

                </section>

            </div>


            {/* TRANSACTION HISTORY */}

            <section className="
                mt-8
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


                {clientOperations.length === 0 ? (

                    <div className="
                        mt-4
                        border
                        border-dashed
                        border-[var(--border)]
                        bg-[var(--surface)]
                        px-6
                        py-8
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
                        mt-4
                        overflow-hidden
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                    ">

                        {/* TABLE HEADER */}

                        <div className="
                            hidden
                            border-b
                            border-[var(--border)]
                            bg-[var(--surface-muted)]
                            px-5
                            py-3
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wide
                            text-[var(--text-secondary)]
                            sm:grid
                            sm:grid-cols-[1fr_auto_auto]
                            sm:gap-6
                        ">

                            <span>
                                Operación
                            </span>

                            <span>
                                Medio
                            </span>

                            <span className="text-right">
                                Total
                            </span>

                        </div>


                        <div className="
                            divide-y
                            divide-[var(--border)]
                        ">

                            {clientOperations.map(
                                (op) => (
                                    <div
                                        key={op.id}
                                        className="
                                            grid
                                            gap-3
                                            px-5
                                            py-4
                                            sm:grid-cols-[1fr_auto_auto]
                                            sm:items-center
                                            sm:gap-6
                                        "
                                    >

                                        {/* OPERATION */}

                                        <div>

                                            <p className="
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {getTransactionLabel(
                                                    op.type
                                                )}
                                            </p>

                                            <p className="
                                                mt-1
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                {new Date(
                                                    op.created_at
                                                ).toLocaleString(
                                                    "es-AR"
                                                )}
                                            </p>

                                        </div>


                                        {/* METHODS */}

                                        <p className="
                                            text-xs
                                            text-[var(--text-secondary)]
                                        ">
                                            {op.amounts
                                                ?.map(
                                                    (amount) =>
                                                        getMethodLabel(
                                                            amount.method
                                                        )
                                                )
                                                .join(" · ")}
                                        </p>


                                        {/* TOTAL */}

                                        <p className="
                                            text-sm
                                            font-semibold
                                            text-[var(--text-primary)]
                                            sm:text-right
                                        ">
                                            {formatCurrency(
                                                op.total !== undefined
                                                    ? op.total
                                                    : (op.amounts || []).reduce(
                                                        (sum, a) =>
                                                            sum +
                                                            (Number(a.amount) ||
                                                                0),
                                                        0
                                                    )
                                            )}
                                        </p>

                                    </div>
                                )
                            )}

                        </div>

                    </div>

                )}

            </section>


            {/* DELETE CONFIRMATION */}

            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar cliente"
                    message={
                        <div>
                            <div>
                                ¿Querés eliminar a {client.name}?
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
                    confirmLabel="Eliminar"
                    cancelLabel="Cancelar"
                    onConfirm={handleDelete}
                    onCancel={() =>
                        setShowDeleteDialog(false)
                    }
                    isLoading={isDeleting}
                />
            )}

        </div>
    );
}


export default ClientDetail;