import { useState, useEffect } from "react";
import { getClients } from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";

function TransactionClient({
    selectedClient,
    onSelectClient,
    required = false,
}) {
    const [clientSearch, setClientSearch] = useState("");
    const [clientResults, setClientResults] = useState([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);

    useEffect(() => {
        if (selectedClient) {
            setClientSearch(selectedClient.name || "");
            setClientResults([]);
            return;
        }

        const trimmed = clientSearch.trim();
        if (!trimmed) {
            setClientResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setIsSearchingClients(true);
            try {
                const results = await getClients(trimmed);
                setClientResults(results);
            } catch (error) {
                console.error("Error buscando clientes:", error);
                setClientResults([]);
            } finally {
                setIsSearchingClients(false);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [clientSearch, selectedClient]);

    return (
        <section className="
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
                <h3 className="
                    text-sm
                    font-semibold
                    text-[var(--text-primary)]
                ">
                    Cliente {required && <span className="text-[var(--danger)]">*</span>}
                </h3>
                <p className="
                    mt-0.5
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    Asociá esta operación a un cliente.
                </p>
            </div>

            <div className="relative p-6">
                {selectedClient ? (
                    <div className="
                        flex
                        items-center
                        justify-between
                        border
                        border-[var(--border)]
                        bg-[var(--surface-muted)]
                        px-4
                        py-3
                    ">
                        <div>
                            <p className="
                                text-sm
                                font-semibold
                                text-[var(--text-primary)]
                            ">
                                {selectedClient.name}
                                {!selectedClient.id && (
                                    <span className="
                                        ml-2
                                        rounded
                                        bg-[var(--primary)]/10
                                        px-2
                                        py-0.5
                                        text-xs
                                        font-medium
                                        text-[var(--primary)]
                                    ">
                                        Nuevo
                                    </span>
                                )}
                            </p>
                            {selectedClient.phone && (
                                <p className="
                                    mt-0.5
                                    text-xs
                                    text-[var(--text-secondary)]
                                ">
                                    {selectedClient.phone}
                                </p>
                            )}
                            {selectedClient.debt !== undefined && (
                                <div className="mt-1 flex items-center gap-2">
                                    {Number(selectedClient.debt) > 0 ? (
                                        <span className="rounded bg-[var(--danger)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
                                            Deuda: {formatCurrency(selectedClient.debt)}
                                        </span>
                                    ) : Number(selectedClient.debt) < 0 ? (
                                        <span className="rounded bg-[var(--success)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                                            ✓ Saldo a favor: {formatCurrency(Math.abs(selectedClient.debt))}
                                        </span>
                                    ) : (
                                        <span className="rounded bg-[var(--surface-accent)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                                            Cuenta al día ($ 0)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                onSelectClient(null);
                                setClientSearch("");
                                setClientResults([]);
                            }}
                            className="
                                text-sm
                                font-medium
                                text-[var(--danger)]
                                transition
                                hover:underline
                            "
                        >
                            Cambiar
                        </button>
                    </div>
                ) : (
                    <>
                        <label
                            htmlFor="client-search"
                            className="
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                            "
                        >
                            Buscar cliente
                        </label>

                        <input
                            id="client-search"
                            type="text"
                            value={clientSearch}
                            onChange={(event) =>
                                setClientSearch(event.target.value)
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
                                text-sm
                                text-[var(--text-primary)]
                                outline-none
                                transition
                                placeholder:text-[var(--text-secondary)]
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                            placeholder="Nombre del cliente"
                            autoComplete="off"
                        />

                        {clientSearch.trim() && (
                            <>
                                {isSearchingClients ? (
                                    <p className="
                                        mt-2
                                        text-xs
                                        text-[var(--text-secondary)]
                                    ">
                                        Buscando clientes...
                                    </p>
                                ) : (
                                    <div className="
                                        absolute
                                        left-6
                                        right-6
                                        top-[100%]
                                        z-20
                                        border
                                        border-[var(--border)]
                                        bg-[var(--surface)]
                                        shadow-lg
                                    ">
                                        {clientResults.map((client) => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    onSelectClient(client);
                                                    setClientSearch(client.name);
                                                    setClientResults([]);
                                                }}
                                                className="
                                                    flex
                                                    w-full
                                                    items-center
                                                    justify-between
                                                    border-b
                                                    border-[var(--border)]
                                                    px-4
                                                    py-3
                                                    text-left
                                                    transition
                                                    hover:bg-[var(--surface-accent)]
                                                "
                                            >
                                                <span>
                                                    <span className="
                                                        block
                                                        text-sm
                                                        font-medium
                                                        text-[var(--text-primary)]
                                                    ">
                                                        {client.name}
                                                    </span>
                                                    {client.phone && (
                                                        <span className="
                                                            mt-1
                                                            block
                                                            text-xs
                                                            text-[var(--text-secondary)]
                                                        ">
                                                            {client.phone}
                                                        </span>
                                                    )}
                                                </span>

                                                {client.debt !== undefined && (
                                                    <span className="shrink-0 text-xs font-semibold">
                                                        {Number(client.debt) > 0 ? (
                                                            <span className="text-[var(--danger)]">Debe {formatCurrency(client.debt)}</span>
                                                        ) : Number(client.debt) < 0 ? (
                                                            <span className="text-[var(--success)]">A favor {formatCurrency(Math.abs(client.debt))}</span>
                                                        ) : (
                                                            <span className="text-[var(--text-secondary)]">Al día</span>
                                                        )}
                                                    </span>
                                                )}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                onSelectClient({
                                                    id: null,
                                                    name: clientSearch.trim(),
                                                });
                                                setClientResults([]);
                                            }}
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                px-4
                                                py-3
                                                text-left
                                                transition
                                                hover:bg-[var(--surface-accent)]
                                            "
                                        >
                                            <span>
                                                <span className="
                                                    block
                                                    text-sm
                                                    font-semibold
                                                    text-[var(--primary)]
                                                ">
                                                    + Crear "{clientSearch.trim()}"
                                                </span>
                                                <span className="
                                                    mt-0.5
                                                    block
                                                    text-xs
                                                    text-[var(--text-secondary)]
                                                ">
                                                    Nuevo cliente (se guardará al registrar)
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

export default TransactionClient;
