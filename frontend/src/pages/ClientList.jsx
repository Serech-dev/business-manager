import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getClients,
} from "../services/business";


function ClientList() {
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState("");
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


    const filteredClients = clients.filter(
        (client) =>
            client.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            client.phone?.includes(search)
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
                    Gestión
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
                    Clientes registrados para operaciones y seguimiento.
                </p>

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
                        placeholder="Buscar cliente..."
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
                    {filteredClients.length}{" "}
                    {filteredClients.length === 1
                        ? "cliente"
                        : "clientes"}
                </span>

            </div>


            {/* CLIENTS */}

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
                        {search
                            ? "No se encontraron clientes"
                            : "No hay clientes registrados"}
                    </p>

                    <p className="
                        mt-1
                        text-sm
                        text-[var(--text-secondary)]
                    ">
                        {search
                            ? "Probá con otro nombre o teléfono."
                            : "Los clientes aparecerán aquí cuando sean utilizados en una operación."}
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

                                    <span className="
                                        shrink-0
                                        text-lg
                                        text-[var(--text-secondary)]
                                    ">
                                        →
                                    </span>

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
