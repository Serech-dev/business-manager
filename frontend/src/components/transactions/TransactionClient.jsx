import { useState, useEffect, useRef } from "react";
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        if (selectedClient) {
            setClientSearch(selectedClient.name || "");
            setClientResults([]);
            setIsDropdownOpen(false);
            return;
        }

        const trimmed = clientSearch.trim();
        if (!trimmed) {
            setClientResults([]);
            setIsDropdownOpen(false);
            return;
        }

        const timeout = setTimeout(async () => {
            setIsSearchingClients(true);
            try {
                const results = await getClients(trimmed);
                setClientResults(results);
                setIsDropdownOpen(true);
            } catch (error) {
                console.error("Error buscando clientes:", error);
                setClientResults([]);
            } finally {
                setIsSearchingClients(false);
            }
        }, 200);

        return () => clearTimeout(timeout);
    }, [clientSearch, selectedClient]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (selectedClient) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/5 px-3 py-2 text-xs transition">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 font-bold text-[var(--primary)]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </span>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                {selectedClient.name}
                            </span>
                            {!selectedClient.id && (
                                <span className="rounded bg-[var(--primary)]/15 px-1.5 py-0.2 text-[10px] font-bold text-[var(--primary)]">
                                    Nuevo
                                </span>
                            )}
                        </div>

                        {selectedClient.debt !== undefined && (
                            <div className="flex items-center gap-1 text-[11px] mt-0.5">
                                {Number(selectedClient.debt) > 0 ? (
                                    <span className="font-semibold text-[var(--danger)]">
                                        Deuda: {formatCurrency(selectedClient.debt)}
                                    </span>
                                ) : Number(selectedClient.debt) < 0 ? (
                                    <span className="font-semibold text-[var(--success)]">
                                        A favor: {formatCurrency(Math.abs(selectedClient.debt))}
                                    </span>
                                ) : (
                                    <span className="text-[var(--text-secondary)]">Al día ($0)</span>
                                )}
                                {selectedClient.phone && (
                                    <span className="text-[var(--text-secondary)]">· {selectedClient.phone}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        onSelectClient(null);
                        setClientSearch("");
                        setClientResults([]);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                    title="Quitar cliente"
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-secondary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                        setClientSearch(e.target.value);
                        if (!isDropdownOpen) setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                        if (clientSearch.trim()) setIsDropdownOpen(true);
                    }}
                    placeholder={
                        required
                            ? "Cliente obligatorio para a cuenta..."
                            : "Asignar o buscar cliente (opcional)..."
                    }
                    className={`h-11 w-full rounded-lg border bg-[var(--background)] pl-9 pr-3 text-xs sm:text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)]/60 ${
                        required && !selectedClient
                            ? "border-[var(--danger)]/60 focus:border-[var(--danger)]"
                            : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    }`}
                />
            </div>

            {/* DROPDOWN RESULTS */}
            {isDropdownOpen && clientSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl divide-y divide-[var(--border)] animate-in fade-in duration-100">
                    {isSearchingClients ? (
                        <div className="p-3 text-center text-xs text-[var(--text-secondary)]">
                            Buscando clientes...
                        </div>
                    ) : (
                        <>
                            {clientResults.map((client) => (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectClient(client);
                                        setClientSearch("");
                                        setIsDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-[var(--surface-accent)]"
                                >
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                                            {client.name}
                                        </p>
                                        {client.phone && (
                                            <p className="text-[11px] text-[var(--text-secondary)]">
                                                {client.phone}
                                            </p>
                                        )}
                                    </div>

                                    {client.debt !== undefined && (
                                        <span className="shrink-0 font-bold tabular-nums">
                                            {Number(client.debt) > 0 ? (
                                                <span className="text-[var(--danger)]">
                                                    Debe {formatCurrency(client.debt)}
                                                </span>
                                            ) : Number(client.debt) < 0 ? (
                                                <span className="text-[var(--success)]">
                                                    A favor {formatCurrency(Math.abs(client.debt))}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-secondary)]">Al día</span>
                                            )}
                                        </span>
                                    )}
                                </button>
                            ))}

                            {/* Create New Client Option */}
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectClient({
                                        id: null,
                                        name: clientSearch.trim(),
                                    });
                                    setClientSearch("");
                                    setIsDropdownOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition text-[var(--primary)]"
                            >
                                <div>
                                    <span className="font-bold text-sm block">
                                        + Crear &quot;{clientSearch.trim()}&quot;
                                    </span>
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                        Nuevo cliente (se guardará con la venta)
                                    </span>
                                </div>
                                <span className="font-bold text-xs uppercase">Nuevo</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default TransactionClient;
