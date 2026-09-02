import { useEffect, useState, useCallback } from "react";
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
import MoneyInput from "../components/MoneyInput";
import ClientPaymentModal from "../components/clients/ClientPaymentModal";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";


function ClientDetail({ isNewClient = false }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        isKioskDevice,
        isUnlocked,
        requireOwnerAccess,
    } = useDeviceSecurity();

    const [client, setClient] = useState(
        isNewClient ? {} : null
    );

    const [transactions, setTransactions] = useState([]);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [initialDebt, setInitialDebt] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);


    const loadClient = useCallback(async () => {
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
                        transaction.client === Number(id) ||
                        transaction.client?.id === Number(id)
                )
            );

            setName(clientData.name);
            setPhone(clientData.phone || "");
            setNotes(clientData.notes || "");
            const rawDebt = clientData.initial_debt !== undefined && clientData.initial_debt !== null
                ? Math.round(Number(clientData.initial_debt))
                : 0;
            setInitialDebt(rawDebt > 0 ? String(rawDebt) : "");
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo cargar el cliente."
            );
        } finally {
            setIsLoading(false);
        }
    }, [id, isNewClient]);

    useEffect(() => {
        loadClient();
    }, [loadClient]);


    async function handleSave(event) {
        event.preventDefault();

        if (!name.trim()) {
            toast.error(
                "El nombre es obligatorio."
            );
            return;
        }

        const currentInitialDebt = client?.initial_debt ? Number(client.initial_debt) : 0;
        const newInitialDebt = initialDebt ? Number(initialDebt) : 0;
        const isEditingDebt = currentInitialDebt !== newInitialDebt || (isNewClient && newInitialDebt > 0);

        if (isEditingDebt && isKioskDevice && !isUnlocked) {
            requireOwnerAccess(() => executeSave());
            return;
        }

        await executeSave();
    }

    async function executeSave() {
        setIsSaving(true);

        try {
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                notes: notes.trim(),
                initial_debt: initialDebt ? Number(initialDebt) : 0,
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

    function requestDelete() {
        if (isKioskDevice && !isUnlocked) {
            requireOwnerAccess(() => setShowDeleteDialog(true));
            return;
        }
        setShowDeleteDialog(true);
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
        (tx.operations || []).map((op) => ({
            ...op,
            transactionId: tx.id,
            created_at: tx.created_at,
        }))
    );

    const debtTotal =
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
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="
                                    rounded-md
                                    bg-[var(--primary)]
                                    px-4
                                    py-2
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-[var(--primary-hover)]
                                "
                            >
                                {debtTotal > 0 ? "+ Registrar pago a cuenta" : "+ Ingresar a cuenta"}
                            </button>

                            <button
                                type="button"
                                onClick={requestDelete}
                                disabled={isDeleting}
                                className="
                                    rounded-md
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
                        </div>
                    )}

                </div>

            </header>


            {/* CLIENT OVERVIEW */}

            <div className="
                mt-8
                space-y-6
            ">

                {!isNewClient && (
                    <div className="
                        grid
                        gap-4
                        sm:grid-cols-2
                    ">
                        <div className="
                            flex
                            flex-col
                            justify-between
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <div>
                                <p className="
                                    text-xs
                                    font-semibold
                                    uppercase
                                    tracking-wider
                                    text-[var(--text-secondary)]
                                ">
                                    {debtTotal > 0 ? "Deuda actual" : debtTotal < 0 ? "Saldo a favor" : "Estado de cuenta"}
                                </p>

                                <p className={`
                                    mt-2
                                    text-2xl
                                    font-bold
                                    ${
                                        debtTotal > 0
                                            ? "text-[var(--danger)]"
                                            : debtTotal < 0
                                                ? "text-[var(--success)]"
                                                : "text-[var(--text-primary)]"
                                    }
                                `}>
                                    {debtTotal > 0 ? formatCurrency(debtTotal) : debtTotal < 0 ? formatCurrency(Math.abs(debtTotal)) : "$ 0"}
                                </p>

                                <p className="
                                    mt-1
                                    text-xs
                                    text-[var(--text-secondary)]
                                ">
                                    {debtTotal > 0
                                        ? "Saldo pendiente de cobro"
                                        : debtTotal < 0
                                            ? "Tiene saldo a favor para sus compras"
                                            : "Cuenta al día (sin deuda)"}
                                </p>
                            </div>

                            <div className="mt-4 border-t border-[var(--border)] pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="
                                        w-full
                                        rounded-md
                                        bg-[var(--primary)]
                                        py-2
                                        text-xs
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-[var(--primary-hover)]
                                    "
                                >
                                    {debtTotal > 0 ? "Registrar cobro / pago a cuenta" : "Ingresar dinero a cuenta"}
                                </button>
                            </div>
                        </div>

                        <div className="
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-5
                        ">
                            <p className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-wider
                                text-[var(--text-secondary)]
                            ">
                                Operaciones registradas
                            </p>

                            <p className="
                                mt-2
                                text-2xl
                                font-bold
                                text-[var(--text-primary)]
                            ">
                                {clientOperations.length}
                            </p>

                            <p className="
                                mt-1
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Movimientos asociados al cliente
                            </p>
                        </div>
                    </div>
                )}

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


                        {/* SALDO INICIAL / LIBRETA */}

                        <div className="sm:col-span-2">

                            <label
                                htmlFor="initialDebt"
                                className="
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                    inline-flex
                                    items-center
                                    gap-2
                                "
                            >
                                <span>Saldo inicial / Deuda previa en libreta</span>
                                {isKioskDevice && !isUnlocked && (
                                    <span className="rounded bg-[var(--warning)]/10 px-2 py-0.5 text-xs text-[var(--warning)] font-semibold">
                                        🔒 Requiere PIN de dueño
                                    </span>
                                )}
                            </label>

                            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                Registrá la deuda acumulada si venís migrando de anotaciones en papel.
                            </p>

                            <div className="relative mt-2">
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

                                <MoneyInput
                                    id="initialDebt"
                                    value={initialDebt}
                                    onChange={(event) =>
                                        setInitialDebt(event.target.value)
                                    }
                                    placeholder="0"
                                    className="
                                        w-full
                                        rounded-md
                                        border
                                        border-[var(--border)]
                                        bg-[var(--background)]
                                        py-2.5
                                        pl-8
                                        pr-3
                                        text-sm
                                        tabular-nums
                                        text-[var(--text-primary)]
                                        outline-none
                                        focus:border-[var(--primary)]
                                        focus:ring-2
                                        focus:ring-[var(--primary)]/20
                                    "
                                />
                            </div>

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
                                (op) => {
                                    const hasDebt = (op.amounts || []).some(
                                        (a) => a.method === "debt"
                                    );
                                    const isPayment = op.type === "payment";

                                    const opTotal =
                                        op.total !== undefined
                                            ? op.total
                                            : (op.amounts || []).reduce(
                                                (sum, a) =>
                                                    sum +
                                                    (Number(a.amount) || 0),
                                                0
                                            );

                                    return (
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

                                                <p className={`
                                                    font-medium
                                                    ${
                                                        isPayment
                                                            ? "text-[var(--success)]"
                                                            : "text-[var(--text-primary)]"
                                                    }
                                                `}>
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

                                            <div className="
                                                flex
                                                flex-wrap
                                                items-center
                                                gap-1.5
                                                text-xs
                                                text-[var(--text-secondary)]
                                            ">
                                                {op.amounts?.map(
                                                    (amount, aIdx) => {
                                                        const isDebtMethod =
                                                            amount.method === "debt";
                                                        return (
                                                            <span
                                                                key={aIdx}
                                                                className={
                                                                    isDebtMethod
                                                                        ? "rounded bg-[var(--warning)]/10 px-1.5 py-0.5 font-semibold text-[var(--warning)]"
                                                                        : ""
                                                                }
                                                            >
                                                                {getMethodLabel(
                                                                    amount.method
                                                                )}
                                                                {op.amounts.length > 1 &&
                                                                    ` ($${Number(
                                                                        amount.amount || 0
                                                                    ).toLocaleString("es-AR")})`}
                                                            </span>
                                                        );
                                                    }
                                                )}
                                            </div>


                                            {/* TOTAL */}

                                            <p className={`
                                                text-sm
                                                font-semibold
                                                sm:text-right
                                                ${
                                                    hasDebt
                                                        ? "text-[var(--warning)]"
                                                        : isPayment
                                                            ? "text-[var(--success)]"
                                                            : "text-[var(--text-primary)]"
                                                }
                                            `}>
                                                {isPayment ? "-" : ""}
                                                {formatCurrency(opTotal)}
                                            </p>

                                        </div>
                                    );
                                }
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

            {/* PAYMENT MODAL */}
            {!isNewClient && client && (
                <ClientPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    client={client}
                    currentDebt={debtTotal}
                    onSuccess={loadClient}
                />
            )}

        </div>
    );
}


export default ClientDetail;