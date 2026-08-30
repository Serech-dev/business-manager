import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getProviders,
} from "../services/business";

import ProviderMovementModal from "../components/providers/ProviderMovementModal";
import { formatCurrency } from "../utils/formatCurrency";


function ProviderList() {
    const navigate = useNavigate();

    const [providers, setProviders] = useState([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    async function loadProviders() {
        try {
            const data = await getProviders();
            setProviders(data);
        } catch (error) {
            console.error(error);
            toast.error("No se pudieron cargar los proveedores.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadProviders();
    }, []);


    const filteredProviders = providers.filter(
        (provider) =>
            provider.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            provider.phone?.includes(search)
    );


    if (isLoading) {
        return (
            <div className="
                flex
                min-h-screen
                items-center
                justify-center
                text-[var(--text-secondary)]
            ">
                Cargando proveedores...
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
                        Proveedores
                    </p>

                    <h1 className="
                        mt-1
                        text-3xl
                        font-bold
                        tracking-tight
                        text-[var(--text-primary)]
                    ">
                        Proveedores
                    </h1>

                    <p className="
                        mt-2
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        Proveedores y movimientos de la caja actual.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/providers/new")
                        }
                        className="
                            rounded-lg
                            border
                            border-[var(--border)]
                            bg-[var(--surface-accent)]
                            px-4
                            py-3
                            text-sm
                            font-semibold
                            text-[var(--text-primary)]
                            transition
                            hover:bg-[var(--surface-muted)]
                        "
                    >
                        + Nuevo proveedor
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsMovementModalOpen(true)}
                        className="
                            rounded-lg
                            bg-[var(--primary)]
                            px-5
                            py-3
                            text-sm
                            font-semibold
                            text-white
                            shadow-sm
                            transition
                            hover:bg-[var(--primary-hover)]
                        "
                    >
                        + Registrar compra / pago
                    </button>
                </div>
            </header>


            {/* SEARCH */}

            <div className="
                mt-8
                flex
                items-center
                justify-between
                gap-4
            ">
                <div className="
                    relative
                    max-w-md
                    flex-1
                ">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Buscar proveedor..."
                        className="
                            w-full
                            rounded-md
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            px-4
                            py-3
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

                <span className="
                    shrink-0
                    text-sm
                    text-[var(--text-secondary)]
                ">
                    {filteredProviders.length}{" "}
                    {filteredProviders.length === 1
                        ? "proveedor"
                        : "proveedores"}
                </span>
            </div>


            {/* PROVIDERS */}

            {filteredProviders.length === 0 ? (

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
                        {search
                            ? "No se encontraron proveedores"
                            : "No hay proveedores registrados"}
                    </p>

                    <p className="
                        mt-1
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        {search
                            ? "Probá con otro nombre o teléfono."
                            : "Creá un proveedor para asociarlo a operaciones."}
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

                        {filteredProviders.map(
                            (provider) => (
                                <button
                                    key={provider.id}
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/providers/${provider.id}`
                                        )
                                    }
                                    className="
                                        w-full
                                        px-6
                                        py-5
                                        text-left
                                        transition
                                        hover:bg-[var(--surface-accent)]
                                    "
                                >

                                    <div className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-6
                                    ">

                                        {/* PROVIDER */}

                                        <div className="
                                            min-w-0
                                            flex-1
                                        ">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <p className="
                                                    truncate
                                                    font-bold
                                                    text-[var(--text-primary)]
                                                ">
                                                    {provider.name}
                                                </p>

                                                {Number(provider.outstanding_debt) > 0 && (
                                                    <span className="
                                                        inline-flex
                                                        items-center
                                                        rounded
                                                        border
                                                        border-[var(--warning)]/40
                                                        bg-[var(--warning)]/10
                                                        px-2
                                                        py-0.5
                                                        text-xs
                                                        font-bold
                                                        tabular-nums
                                                        text-[var(--warning)]
                                                    ">
                                                        Debo: {formatCurrency(provider.outstanding_debt)}
                                                    </span>
                                                )}
                                            </div>

                                            {provider.phone && (
                                                <p className="
                                                    mt-1
                                                    text-sm
                                                    text-[var(--text-secondary)]
                                                ">
                                                    {provider.phone}
                                                </p>
                                            )}
                                        </div>


                                        {/* CURRENT REGISTER */}

                                        <div className="
                                            shrink-0
                                            text-right
                                        ">
                                            {provider.current_register_transactions > 0 ? (
                                                <>
                                                    <p className="
                                                        text-sm
                                                        font-semibold
                                                        text-[var(--text-primary)]
                                                    ">
                                                        {formatCurrency(
                                                            provider.current_register_total
                                                        )}
                                                    </p>

                                                    <p className="
                                                        mt-1
                                                        text-xs
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        {provider.current_register_transactions}{" "}
                                                        {provider.current_register_transactions === 1
                                                            ? "movimiento"
                                                            : "movimientos"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="
                                                    text-xs
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Sin movimientos
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                </button>
                            )
                        )}

                    </div>
                </section>

            )}

            <ProviderMovementModal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                onSuccess={loadProviders}
            />

        </div>
    );
}

export default ProviderList;