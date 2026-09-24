import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClients,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import { useStoreSettings } from "../context/StoreSettingsContext";


function ClientList() {
    const navigate = useNavigate();
    const { getClientDebtLimit } = useStoreSettings();

    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState("");
    const [debtFilter, setDebtFilter] = useState("all"); // 'all' | 'with_debt'
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadClients() {
            try {
                const data = await getClients();

                setClients(data);
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudieron cargar los clientes."
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadClients();
    }, []);

    const totalCount = clients.length;
    const debtClients = clients.filter((c) => Number(c.debt || 0) > 0);
    const debtCount = debtClients.length;
    const totalDebtAmount = debtClients.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);

    const filteredClients = clients.filter((client) => {
        if (debtFilter === "with_debt" && Number(client.debt || 0) <= 0) {
            return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            client.name.toLowerCase().includes(q) ||
            client.phone?.includes(search)
        );
    });


    if (isLoading) {
        return (
            <div className="
                flex
                min-h-screen
                items-center
                justify-center
                text-[var(--text-secondary)]
            ">
                Cargando clientes...
            </div>
        );
    }


    return (
        <div className="
            mx-auto
            max-w-7xl
            px-8
            py-8
        ">

            {/* HEADER */}

            <header className="
                flex
                items-end
                justify-between
                gap-6
                border-b
                border-[var(--border)]
                pb-6
            ">
                <div>
                    <p className="
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wider
                        text-[var(--primary)]
                    ">
                        Clientes
                    </p>

                    <h1 className="
                        mt-1
                        text-3xl
                        font-bold
                        tracking-tight
                        text-[var(--text-primary)]
                    ">
                        Clientes
                    </h1>

                    <p className="
                        mt-2
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        Clientes registrados y estado de cuenta.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/clients/new")}
                    className="
                        shrink-0
                        rounded-lg
                        bg-[var(--primary)]
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        transition
                        hover:bg-[var(--primary-hover)]
                    "
                >
                    + Nuevo cliente
                </button>
            </header>


            {/* SEARCH & FILTERS BAR */}
            <div className="mt-8 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* SEARCH */}
                    <div className="relative max-w-md flex-1">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Buscar por nombre o teléfono..."
                            className="
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                                px-4
                                py-2.5
                                text-sm
                                text-[var(--text-primary)]
                                outline-none
                                transition
                                placeholder:text-[var(--text-secondary)]
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>

                    {/* FILTER PILLS */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setDebtFilter("all")}
                            className={`
                                inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition border
                                ${
                                    debtFilter === "all"
                                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/40"
                                }
                            `}
                        >
                            <span>Todos</span>
                            <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                    debtFilter === "all"
                                        ? "bg-white/20 text-white"
                                        : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                                }`}
                            >
                                {totalCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setDebtFilter("with_debt")}
                            className={`
                                inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition border
                                ${
                                    debtFilter === "with_debt"
                                        ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40"
                                }
                            `}
                        >
                            <span>Con deuda</span>
                            <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                    debtFilter === "with_debt"
                                        ? "bg-white/25 text-white"
                                        : debtCount > 0
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                                }`}
                            >
                                {debtCount}
                            </span>
                        </button>
                    </div>
                </div>

                {/* DEBT TOTAL BANNER (WHEN ACTIVE) */}
                {debtFilter === "with_debt" && debtCount > 0 && (
                    <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs">
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                            Total fiado pendiente de cobro ({debtCount} {debtCount === 1 ? "cliente" : "clientes"}):
                        </span>
                        <span className="font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatCurrency(totalDebtAmount)}
                        </span>
                    </div>
                )}
            </div>


            {/* CLIENTS LIST */}
            {filteredClients.length === 0 ? (
                <section className="
                    mt-5
                    border
                    border-dashed
                    border-[var(--border)]
                    bg-[var(--surface)]
                    p-12
                    text-center
                ">
                    <p className="
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        {debtFilter === "with_debt"
                            ? search
                                ? "No se encontraron clientes con deuda para esa búsqueda"
                                : "¡Al día! No hay clientes con deuda pendiente"
                            : search
                            ? "No se encontraron clientes"
                            : "No hay clientes registrados"}
                    </p>

                    <p className="
                        mt-1
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        {debtFilter === "with_debt"
                            ? search
                                ? "Probá buscando con otro término."
                                : "Ningún cliente tiene saldo deudor acumulado en su libreta."
                            : search
                            ? "Probá con otro nombre o teléfono."
                            : "Los clientes aparecerán aquí cuando sean registrados o utilizados en una operación."}
                    </p>
                </section>

            ) : (

                <section className="
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

                        {filteredClients.map(
                            (client) => (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/clients/${client.id}`
                                        )
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between
                                        gap-4
                                        px-6
                                        py-5
                                        text-left
                                        transition
                                        hover:bg-[var(--surface-accent)]
                                    "
                                >

                                    <div className="
                                        min-w-0
                                    ">
                                        <p className="
                                            truncate
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            {client.name}
                                        </p>

                                        {client.phone && (
                                            <p className="
                                                mt-1
                                                text-sm
                                                text-[var(--text-secondary)]
                                            ">
                                                {client.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {(() => {
                                            const clientDebt = Number(client.debt || 0);
                                            const limit = getClientDebtLimit(client);
                                            const isOver = limit !== null && limit > 0 && clientDebt > limit;

                                            return (
                                                <>
                                                    {limit !== null && limit > 0 && clientDebt <= 0 && (
                                                        <span
                                                            className="hidden sm:inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                                                            title={`Límite: ${formatCurrency(limit)}`}
                                                        >
                                                            Límite: {formatCurrency(limit)}
                                                        </span>
                                                    )}

                                                    {clientDebt > 0 && (
                                                        <span
                                                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums ${
                                                                isOver
                                                                    ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
                                                                    : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                                                            }`}
                                                            title={isOver ? "Límite de fiado superado" : limit ? `Límite: ${formatCurrency(limit)}` : "Sin límite fijado"}
                                                        >
                                                            Debe: {formatCurrency(clientDebt)} / {limit !== null && limit > 0 ? formatCurrency(limit) : "Sin límite"}
                                                        </span>
                                                    )}
                                                    {clientDebt < 0 && (
                                                        <span className="rounded-md border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--success)] tabular-nums">
                                                            A favor: {formatCurrency(Math.abs(client.debt))}
                                                        </span>
                                                    )}
                                                    {clientDebt === 0 && (
                                                        <span className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                                                            Al día
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        <span className="
                                            text-lg
                                            text-[var(--text-secondary)]
                                        ">
                                            →
                                        </span>
                                    </div>

                                </button>
                            )
                        )}

                    </div>

                </section>

            )}

        </div>
    );
}


export default ClientList;
