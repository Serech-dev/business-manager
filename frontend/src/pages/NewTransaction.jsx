import {
    useEffect,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    createTransaction,
    createClient,
    getClients,
    createProvider,
    getProviders,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";


function NewTransaction() {
    const navigate = useNavigate();

    const [providers, setProviders] = useState([]);
    const [providerSearch, setProviderSearch] = useState("");
    const [providerResults, setProviderResults] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isSearchingProviders, setIsSearchingProviders] = useState(false);

    const [clientSearch, setClientSearch] = useState("");
    const [clientResults, setClientResults] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isSearchingClients, setIsSearchingClients] = useState(false);

    const [type, setType] = useState("sale");
    const [description, setDescription] = useState("");
    const [exchangeAmount, setExchangeAmount] = useState("");

    const [amounts, setAmounts] = useState([
        {
            method: "cash",
            amount: "",
        },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isExchange =
        type === "exchange" ||
        type === "sale_exchange";

    const needsClient =
        type !== "provider" &&
        type !== "loss";


    useEffect(() => {
        async function loadProviders() {
            try {
                const results = await getProviders();
                setProviders(results);
            } catch (error) {
                console.error(error);
            }
        }

        loadProviders();
    }, []);


    useEffect(() => {
        const search = providerSearch.trim().toLowerCase();

        if (!search) {
            setProviderResults([]);
            return;
        }

        const results = providers.filter(
            (provider) =>
                provider.name
                    .toLowerCase()
                    .includes(search)
        );

        setProviderResults(results);
    }, [providerSearch, providers]);


    useEffect(() => {
        if (!needsClient || !clientSearch.trim()) {
            setClientResults([]);
            return;
        }

        const timeout = setTimeout(
            async () => {
                setIsSearchingClients(true);

                try {
                    const results = await getClients(
                        clientSearch.trim()
                    );

                    setClientResults(results);
                } catch (error) {
                    console.error(error);
                    setClientResults([]);
                } finally {
                    setIsSearchingClients(false);
                }
            },
            250
        );

        return () => clearTimeout(timeout);
    }, [clientSearch, needsClient]);


    function updateAmount(index, field, value) {
        setAmounts((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item
            )
        );
    }


    function addAmount() {
        setAmounts((current) => [
            ...current,
            {
                method: "cash",
                amount: "",
            },
        ]);
    }


    function removeAmount(index) {
        setAmounts((current) =>
            current.filter(
                (_, itemIndex) => itemIndex !== index
            )
        );
    }


    function getTotal() {
        return amounts.reduce(
            (total, item) =>
                total + (Number(item.amount) || 0),
            0
        );
    }


    function getExchangeFee() {
        if (!isExchange || !exchangeAmount) {
            return 0;
        }

        return Math.round(Number(exchangeAmount) * 0.10);
    }


    function getExchangeInput() {
        return Number(exchangeAmount) || 0;
    }


    function getExchangeClientAmount() {
        const input = getExchangeInput();

        if (!input) {
            return 0;
        }

        return input - getExchangeFee();
    }


    function handleTypeChange(event) {
        const newType = event.target.value;

        setType(newType);
        setExchangeAmount("");

        setAmounts([
            {
                method: "cash",
                amount: "",
            },
        ]);

        setSelectedClient(null);
        setClientSearch("");
        setClientResults([]);

        setSelectedProvider(null);
        setProviderSearch("");
        setProviderResults([]);
    }


    async function handleSubmit(event) {
        event.preventDefault();

        const validAmounts = amounts
            .filter((item) => item.amount !== "")
            .map((item) => ({
                method: item.method,
                amount: item.amount,
            }));


        if (validAmounts.length === 0) {
            toast.error(
                "Ingresá al menos un monto."
            );

            return;
        }


        if (
            isExchange &&
            (!exchangeAmount ||
                Number(exchangeAmount) <= 0)
        ) {
            toast.error(
                "Ingresá el monto del cambio."
            );

            return;
        }


        let client = selectedClient;

        if (
            needsClient &&
            !client &&
            clientSearch.trim()
        ) {
            try {
                client = await createClient({
                    name: clientSearch.trim(),
                });
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo guardar el cliente."
                );

                return;
            }
        }


        let provider = selectedProvider;

        if (
            type === "provider" &&
            !provider &&
            providerSearch.trim()
        ) {
            try {
                provider = await createProvider({
                    name: providerSearch.trim(),
                });
            } catch (error) {
                console.error(error);

                toast.error(
                    "No se pudo guardar el proveedor."
                );

                return;
            }
        }


        if (
            type === "provider" &&
            !provider
        ) {
            toast.error(
                "Ingresá un proveedor."
            );

            return;
        }


        setIsSubmitting(true);

        try {
            await createTransaction({
                type,

                client:
                    needsClient
                        ? client?.id || null
                        : null,

                provider:
                    provider?.id || null,

                description,

                exchange_amount:
                    isExchange
                        ? getExchangeClientAmount()
                        : null,

                amounts: validAmounts,
            });


            toast.success(
                "Operación registrada."
            );

            navigate("/");
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo registrar la operación."
            );
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <div className="
            min-h-screen
            bg-[var(--background)]
            px-6
            py-5
            lg:px-10
        ">
            <div className="
                mx-auto
                max-w-6xl
            ">

                <header className="
                    border-b
                    border-[var(--border)]
                    pb-4
                ">
                    <div>
                        <p className="
                            text-sm
                            font-medium
                            uppercase
                            tracking-wider
                            text-[var(--primary)]
                        ">
                            Operaciones
                        </p>

                        <h1 className="
                            mt-1
                            text-3xl
                            font-bold
                            tracking-tight
                            text-[var(--text-primary)]
                        ">
                            Nueva operación
                        </h1>

                        <p className="
                            mt-2
                            max-w-2xl
                            text-sm
                            text-[var(--text-secondary)]
                        ">
                            Registrá un movimiento de la caja actual.
                        </p>
                    </div>
                </header>


                <form
                    onSubmit={handleSubmit}
                    className="mt-5"
                >
                    <div className="
                        grid
                        gap-4
                        lg:grid-cols-[minmax(0,1fr)_320px]
                        lg:items-start
                    ">

                        <div className="space-y-4">

                            {/* BASIC INFORMATION */}

                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">
                                <div className="
                                    grid
                                    gap-4
                                    p-5
                                    md:grid-cols-[220px_minmax(0,1fr)]
                                    md:items-end
                                ">
                                    <div>
                                        <label
                                            htmlFor="type"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Tipo de operación
                                        </label>

                                        <select
                                            id="type"
                                            value={type}
                                            onChange={handleTypeChange}
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
                                                transition
                                                focus:border-[var(--primary)]
                                                focus:ring-2
                                                focus:ring-[var(--primary)]/20
                                            "
                                        >
                                            <option value="sale">
                                                Venta
                                            </option>

                                            <option value="sube">
                                                Carga SUBE
                                            </option>

                                            <option value="phone">
                                                Carga de celular
                                            </option>

                                            <option value="exchange">
                                                Cambio
                                            </option>

                                            <option value="sale_exchange">
                                                Venta + Cambio
                                            </option>

                                            <option value="payment">
                                                A cuenta
                                            </option>

                                            <option value="provider">
                                                Proveedor
                                            </option>

                                            <option value="loss">
                                                Pérdida
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="description"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Descripción
                                        </label>

                                        <input
                                            id="description"
                                            value={description}
                                            onChange={(event) =>
                                                setDescription(event.target.value)
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
                                                transition
                                                placeholder:text-[var(--text-secondary)]
                                                focus:border-[var(--primary)]
                                                focus:ring-2
                                                focus:ring-[var(--primary)]/20
                                            "
                                            placeholder="Descripción opcional"
                                        />
                                    </div>
                                </div>
                            </section>


                            {/* PROVIDER */}

                            {type === "provider" && (
                                <section className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                ">
                                    <div className="
                                        border-b
                                        border-[var(--border)]
                                        px-6
                                        py-5
                                    ">
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Proveedor
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
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
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProvider(null);
                                                        setProviderSearch("");
                                                    }}
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-[var(--danger)]
                                                        hover:underline
                                                    "
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <label
                                                    htmlFor="provider"
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-[var(--text-primary)]
                                                    "
                                                >
                                                    Buscar proveedor
                                                </label>

                                                <input
                                                    id="provider"
                                                    value={providerSearch}
                                                    onChange={(event) => {
                                                        setProviderSearch(
                                                            event.target.value
                                                        );
                                                    }}
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
                                                        transition
                                                        focus:border-[var(--primary)]
                                                        focus:ring-2
                                                        focus:ring-[var(--primary)]/20
                                                    "
                                                    placeholder="Nombre del proveedor"
                                                    autoComplete="off"
                                                />

                                                {providerSearch.trim() && (
                                                    <>
                                                        {isSearchingProviders ? (
                                                            <p className="
                                                                mt-2
                                                                text-xs
                                                                text-[var(--text-secondary)]
                                                            ">
                                                                Buscando proveedores...
                                                            </p>
                                                        ) : providerResults.length > 0 ? (
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
                                                                {providerResults.map(
                                                                    (provider) => (
                                                                        <button
                                                                            key={provider.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedProvider(provider);
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
                                                                    )
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="
                                                                mt-2
                                                                text-xs
                                                                text-[var(--warning)]
                                                            ">
                                                                No existe un proveedor con ese nombre. Se creará al registrar la operación.
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}

                                    </div>
                                </section>
                            )}


                            {/* CLIENT */}

                            {needsClient && (
                                <section className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                ">
                                    <div className="
                                        border-b
                                        border-[var(--border)]
                                        px-6
                                        py-5
                                    ">
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Cliente
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
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
                                                    </p>

                                                    {selectedClient.phone && (
                                                        <p className="
                                                            mt-1
                                                            text-xs
                                                            text-[var(--text-secondary)]
                                                        ">
                                                            {selectedClient.phone}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedClient(null);
                                                        setClientSearch("");
                                                    }}
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-[var(--danger)]
                                                        hover:underline
                                                    "
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <label
                                                    htmlFor="client"
                                                    className="
                                                        text-sm
                                                        font-medium
                                                        text-[var(--text-primary)]
                                                    "
                                                >
                                                    Buscar cliente
                                                </label>

                                                <input
                                                    id="client"
                                                    value={clientSearch}
                                                    onChange={(event) => {
                                                        setClientSearch(
                                                            event.target.value
                                                        );
                                                    }}
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
                                                        transition
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
                                                                    onClick={() => {
                                                                        setSelectedClient(client);
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
                                                                </button>
                                                            ))}

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedClient({
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
                                                                        mt-1
                                                                        block
                                                                        text-xs
                                                                        text-[var(--text-secondary)]
                                                                    ">
                                                                        Nuevo cliente
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
                            )}


                            {/* EXCHANGE */}

                            {isExchange && (
                                <section className="
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface)]
                                ">
                                    <div className="
                                        border-b
                                        border-[var(--border)]
                                        px-6
                                        py-5
                                    ">
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Datos del cambio
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Indicá el monto sobre el cual se calcula la comisión.
                                        </p>
                                    </div>

                                    <div className="
                                        max-w-md
                                        p-6
                                    ">
                                        <label
                                            htmlFor="exchangeAmount"
                                            className="
                                                text-sm
                                                font-medium
                                                text-[var(--text-primary)]
                                            "
                                        >
                                            Monto de cambio
                                        </label>

                                        <div className="
                                            relative
                                            mt-2
                                        ">
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

                                            <input
                                                id="exchangeAmount"
                                                type="number"
                                                min="0"
                                                value={exchangeAmount}
                                                onChange={(event) => {
                                                    const value = event.target.value;

                                                    setExchangeAmount(value);

                                                    if (isExchange) {
                                                        setAmounts((current) => [
                                                            {
                                                                ...current[0],
                                                                amount: value,
                                                            },
                                                        ]);
                                                    }
                                                }}
                                                className="
                                                    w-full
                                                    rounded-md
                                                    border
                                                    border-[var(--border)]
                                                    bg-[var(--background)]
                                                    py-2.5
                                                    pl-7
                                                    pr-3
                                                    text-[var(--text-primary)]
                                                    outline-none
                                                    transition
                                                    focus:border-[var(--primary)]
                                                    focus:ring-2
                                                    focus:ring-[var(--primary)]/20
                                                "
                                                placeholder="0"
                                            />
                                        </div>

                                        {exchangeAmount && Number(exchangeAmount) > 0 && (
                                            <div className="
                                                mt-4
                                                border-t
                                                border-[var(--border)]
                                                pt-4
                                                text-sm
                                            ">
                                                <div className="
                                                    flex
                                                    items-center
                                                    justify-between
                                                ">
                                                    <span className="
                                                        text-[var(--text-secondary)]
                                                    ">
                                                        Comisión de cambio: 10%
                                                    </span>

                                                    <strong className="
                                                        text-[var(--text-primary)]
                                                    ">
                                                        {formatCurrency(
                                                            getExchangeFee()
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="
                                                    mt-2
                                                    flex
                                                    items-center
                                                    justify-between
                                                ">
                                                    <span className="
                                                        font-medium
                                                        text-[var(--text-primary)]
                                                    ">
                                                        Cliente recibe
                                                    </span>

                                                    <strong className="
                                                        text-lg
                                                        font-bold
                                                        text-[var(--success)]
                                                    ">
                                                        {formatCurrency(
                                                            getExchangeClientAmount()
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}


                            {/* AMOUNTS */}

                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">
                                <div className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-4
                                    border-b
                                    border-[var(--border)]
                                    px-6
                                    py-5
                                ">
                                    <div>
                                        <h2 className="
                                            font-semibold
                                            text-[var(--text-primary)]
                                        ">
                                            Montos
                                        </h2>

                                        <p className="
                                            mt-1
                                            text-sm
                                            text-[var(--text-secondary)]
                                        ">
                                            Podés dividir la operación entre distintos medios de pago.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addAmount}
                                        className="
                                            shrink-0
                                            rounded-md
                                            border
                                            border-[var(--border)]
                                            px-3
                                            py-2
                                            text-sm
                                            font-medium
                                            text-[var(--primary)]
                                            transition
                                            hover:border-[var(--primary)]
                                            hover:bg-[var(--surface-accent)]
                                        "
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                <div className="
                                    divide-y
                                    divide-[var(--border)]
                                ">
                                    {amounts.map(
                                        (item, index) => (
                                            <div
                                                key={index}
                                                className="
                                                    flex
                                                    items-center
                                                    gap-3
                                                    p-6
                                                "
                                            >
                                                <select
                                                    value={item.method}
                                                    onChange={(event) =>
                                                        updateAmount(
                                                            index,
                                                            "method",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="
                                                        w-48
                                                        shrink-0
                                                        rounded-md
                                                        border
                                                        border-[var(--border)]
                                                        bg-[var(--background)]
                                                        px-3
                                                        py-2.5
                                                        text-sm
                                                        text-[var(--text-primary)]
                                                        outline-none
                                                        focus:border-[var(--primary)]
                                                    "
                                                >
                                                    <option value="cash">
                                                        Efectivo
                                                    </option>

                                                    <option value="transfer">
                                                        Transferencia
                                                    </option>

                                                    <option value="card">
                                                        Tarjeta
                                                    </option>

                                                    <option value="debt">
                                                        Fiado
                                                    </option>
                                                </select>

                                                <div className="
                                                    relative
                                                    min-w-0
                                                    flex-1
                                                ">
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

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0"
                                                        value={item.amount}
                                                        onChange={(event) =>
                                                            updateAmount(
                                                                index,
                                                                "amount",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="
                                                            w-full
                                                            rounded-md
                                                            border
                                                            border-[var(--border)]
                                                            bg-[var(--background)]
                                                            py-2.5
                                                            pl-7
                                                            pr-3
                                                            text-[var(--text-primary)]
                                                            outline-none
                                                            focus:border-[var(--primary)]
                                                            focus:ring-2
                                                            focus:ring-[var(--primary)]/20
                                                        "
                                                        placeholder="0"
                                                    />
                                                </div>

                                                {amounts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeAmount(index)
                                                        }
                                                        className="
                                                            rounded-md
                                                            px-2
                                                            py-2
                                                            text-lg
                                                            text-[var(--danger)]
                                                            transition
                                                            hover:bg-[var(--danger-bg)]
                                                        "
                                                        aria-label="Eliminar monto"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>

                        </div>


                        {/* SUMMARY / ACTIONS */}

                        <aside className="
                            lg:sticky
                            lg:top-6
                        ">
                            <section className="
                                border
                                border-[var(--border)]
                                bg-[var(--surface)]
                            ">
                                <div className="
                                    border-b
                                    border-[var(--border)]
                                    px-6
                                    py-5
                                ">
                                    <p className="
                                        text-xs
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-[var(--text-secondary)]
                                    ">
                                        Resumen
                                    </p>

                                    <p className="
                                        mt-2
                                        text-sm
                                        text-[var(--text-secondary)]
                                    ">
                                        Total de la operación
                                    </p>

                                    <p className="
                                        mt-1
                                        text-3xl
                                        font-bold
                                        tracking-tight
                                        text-[var(--text-primary)]
                                    ">
                                        {formatCurrency(
                                            getTotal()
                                        )}
                                    </p>
                                </div>

                                <div className="
                                    space-y-3
                                    px-6
                                    py-5
                                ">
                                    <div className="
                                        flex
                                        justify-between
                                        text-sm
                                    ">
                                        <span className="
                                            text-[var(--text-secondary)]
                                        ">
                                            Tipo
                                        </span>

                                        <span className="
                                            font-medium
                                            text-[var(--text-primary)]
                                        ">
                                            {{
                                                sale: "Venta",
                                                sube: "Carga SUBE",
                                                phone: "Carga de celular",
                                                exchange: "Cambio",
                                                sale_exchange: "Venta + Cambio",
                                                provider: "Proveedor",
                                                loss: "Pérdida",
                                                payment: "Pago de fiado",
                                            }[type]}
                                        </span>
                                    </div>

                                    {selectedClient && (
                                        <div className="
                                            flex
                                            justify-between
                                            gap-4
                                            text-sm
                                        ">
                                            <span className="
                                                text-[var(--text-secondary)]
                                            ">
                                                Cliente
                                            </span>

                                            <span className="
                                                text-right
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {selectedClient.name}
                                            </span>
                                        </div>
                                    )}

                                    {selectedProvider && (
                                        <div className="
                                            flex
                                            justify-between
                                            gap-4
                                            text-sm
                                        ">
                                            <span className="
                                                text-[var(--text-secondary)]
                                            ">
                                                Proveedor
                                            </span>

                                            <span className="
                                                text-right
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {selectedProvider.name}
                                            </span>
                                        </div>
                                    )}

                                    {isExchange && (
                                        <div className="
                                            flex
                                            justify-between
                                            text-sm
                                        ">
                                            <span className="
                                                text-[var(--text-secondary)]
                                            ">
                                                Comisión
                                            </span>

                                            <span className="
                                                font-medium
                                                text-[var(--text-primary)]
                                            ">
                                                {formatCurrency(
                                                    getExchangeFee()
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="
                                    border-t
                                    border-[var(--border)]
                                    p-6
                                ">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="
                                            w-full
                                            rounded-md
                                            bg-[var(--primary)]
                                            px-4
                                            py-3
                                            font-semibold
                                            text-white
                                            transition
                                            hover:bg-[var(--primary-hover)]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        {isSubmitting
                                            ? "Guardando..."
                                            : "Registrar operación"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => navigate("/")}
                                        className="
                                            mt-2
                                            w-full
                                            rounded-md
                                            px-4
                                            py-2.5
                                            text-sm
                                            font-medium
                                            text-[var(--text-secondary)]
                                            transition
                                            hover:bg-[var(--surface-accent)]
                                            hover:text-[var(--text-primary)]
                                        "
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </section>
                        </aside>

                    </div>
                </form>
            </div>
        </div>
    );
}


export default NewTransaction;