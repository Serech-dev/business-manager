import { useState, useEffect } from "react";
import { getProviders } from "../../services/business";

function TransactionProvider({
    selectedProvider,
    onSelectProvider,
    required = true,
}) {
    const [providers, setProviders] = useState([]);
    const [providerSearch, setProviderSearch] = useState("");
    const [providerResults, setProviderResults] = useState([]);
    const [isSearchingProviders, setIsSearchingProviders] = useState(false);

    useEffect(() => {
        async function loadProviders() {
            try {
                const results = await getProviders();
                setProviders(results);
            } catch (error) {
                console.error("Error cargando proveedores:", error);
            }
        }

        loadProviders();
    }, []);

    useEffect(() => {
        if (selectedProvider) {
            setProviderSearch(selectedProvider.name || "");
            setProviderResults([]);
            return;
        }

        const search = providerSearch.trim().toLowerCase();
        if (!search) {
            setProviderResults([]);
            return;
        }

        const results = providers.filter((provider) =>
            provider.name.toLowerCase().includes(search)
        );

        setProviderResults(results);
    }, [providerSearch, providers, selectedProvider]);

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
                    Proveedor {required && <span className="text-[var(--danger)]">*</span>}
                </h3>
                <p className="
                    mt-0.5
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    Asociá esta operación a un proveedor.
                </p>
            </div>

            <div className="relative p-6">
                {selectedProvider ? (
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
                                {selectedProvider.name}
                                {!selectedProvider.id && (
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
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                onSelectProvider(null);
                                setProviderSearch("");
                                setProviderResults([]);
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
                            htmlFor="provider-search"
                            className="
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                            "
                        >
                            Buscar proveedor
                        </label>

                        <input
                            id="provider-search"
                            type="text"
                            value={providerSearch}
                            onChange={(event) =>
                                setProviderSearch(event.target.value)
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
                            placeholder="Nombre del proveedor"
                            autoComplete="off"
                        />

                        {providerSearch.trim() && (
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
                                {providerResults.map((provider) => (
                                    <button
                                        key={provider.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectProvider(provider);
                                            setProviderSearch(provider.name);
                                            setProviderResults([]);
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
                                        <span className="
                                            text-sm
                                            font-medium
                                            text-[var(--text-primary)]
                                        ">
                                            {provider.name}
                                        </span>
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectProvider({
                                            id: null,
                                            name: providerSearch.trim(),
                                        });
                                        setProviderResults([]);
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
                                            + Crear "{providerSearch.trim()}"
                                        </span>
                                        <span className="
                                            mt-0.5
                                            block
                                            text-xs
                                            text-[var(--text-secondary)]
                                        ">
                                            Nuevo proveedor (se guardará al registrar)
                                        </span>
                                    </span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

export default TransactionProvider;
