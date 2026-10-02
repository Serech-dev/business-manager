import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClosedRegisters,
    deleteClosedRegister,
} from "../services/business";
import ConfirmDialog from "../components/ConfirmDialog";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

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
    const { requireOwnerAccess } = useDeviceSecurity();

    const [registers, setRegisters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [registerToDelete, setRegisterToDelete] = useState(null);
    const [isDeletingRegister, setIsDeletingRegister] = useState(false);

    async function loadRegisters() {
        try {
            const data = await getClosedRegisters();
            setRegisters(data);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cargar el historial.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadRegisters();
    }, []);

    async function handleDeleteRegister() {
        if (!registerToDelete) return;
        setIsDeletingRegister(true);
        try {
            await deleteClosedRegister(registerToDelete.id);
            setRegisters((prev) => prev.filter((r) => r.id !== registerToDelete.id));
            toast.success("Caja eliminada correctamente");
            setRegisterToDelete(null);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.detail || "No se pudo eliminar la caja.";
            toast.error(msg);
        } finally {
            setIsDeletingRegister(false);
        }
    }


    return (
        <div className="
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
                        rounded-md
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
                                <div
                                    key={register.id}
                                    onClick={() =>
                                        navigate(
                                            `/registers/${register.id}`
                                        )
                                    }
                                    className="
                                        w-full
                                        rounded-md
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                        p-5
                                        text-left
                                        transition
                                        hover:bg-[var(--surface-accent)]
                                        cursor-pointer
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

                                        <div className="flex items-center gap-3">
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

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requireOwnerAccess(() => {
                                                        setRegisterToDelete(register);
                                                    });
                                                }}
                                                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]/10 transition"
                                                title="Eliminar caja"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
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

                                </div>
                            );
                        })}
                    </div>
                )}

                {registerToDelete && (
                    <ConfirmDialog
                        title="Eliminar caja cerrada"
                        message={`¿Estás seguro de que deseas eliminar el registro de caja del ${formatDateLong(registerToDelete.opened_at)}? Se eliminarán todas las transacciones asociadas. Esta acción no se puede deshacer.`}
                        confirmLabel="Eliminar caja"
                        cancelLabel="Cancelar"
                        isLoading={isDeletingRegister}
                        onConfirm={handleDeleteRegister}
                        onCancel={() => setRegisterToDelete(null)}
                    />
                )}
            </div>
        </div>
    );
}


export default RegisterHistory;