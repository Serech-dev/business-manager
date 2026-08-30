import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import {
    createTransaction,
    getProviders,
    createProvider,
} from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function ProviderMovementModal({
    isOpen,
    onClose,
    initialProvider = null,
    initialType = null,
    onSuccess,
}) {
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(initialProvider);
    const [providerSearch, setProviderSearch] = useState("");
    const [type, setType] = useState("provider"); // "provider" | "provider_payment" | "expense" | "loss"
    const [cashAmount, setCashAmount] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [debtAmount, setDebtAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedProvider(initialProvider);
            setProviderSearch(initialProvider?.name || "");
            setType(initialType || (initialProvider ? "provider" : "expense"));
            setCashAmount("");
            setTransferAmount("");
            setDebtAmount("");
            setDescription("");
            setIsSubmitting(false);

            loadProviders();
        }
    }, [isOpen, initialProvider, initialType]);

    async function loadProviders() {
        setIsLoadingProviders(true);
        try {
            const data = await getProviders();
            setProviders(data);
        } catch (error) {
            console.error("Error loading providers:", error);
        } finally {
            setIsLoadingProviders(false);
        }
    }

    if (!isOpen) return null;

    const isProviderType = type === "provider" || type === "provider_payment";
    const allowsDebt = type === "provider";
    const allowsTransfer = type !== "loss";

    const totalAmount =
        (Number(cashAmount) || 0) +
        (allowsTransfer ? Number(transferAmount) || 0 : 0) +
        (allowsDebt ? Number(debtAmount) || 0 : 0);

    async function handleSubmit(event) {
        event.preventDefault();

        if (isProviderType && !selectedProvider) {
            toast.error("Seleccioná o creá un proveedor.");
            return;
        }

        const amounts = [];
        if (Number(cashAmount) > 0) {
            amounts.push({ method: "cash", amount: cashAmount });
        }
        if (allowsTransfer && Number(transferAmount) > 0) {
            amounts.push({ method: "transfer", amount: transferAmount });
        }
        if (allowsDebt && Number(debtAmount) > 0) {
            amounts.push({ method: "debt", amount: debtAmount });
        }

        if (amounts.length === 0) {
            toast.error("Ingresá al menos un monto válido.");
            return;
        }

        setIsSubmitting(true);

        try {
            let providerId = selectedProvider?.id;
            if (isProviderType && selectedProvider && !selectedProvider.id && selectedProvider.name) {
                const newProv = await createProvider({ name: selectedProvider.name });
                providerId = newProv.id;
            }

            const payload = {
                description: description.trim(),
                operations: [
                    {
                        type,
                        provider: isProviderType ? providerId : null,
                        amounts,
                    },
                ],
            };

            await createTransaction(payload);

            const successMessage =
                type === "provider"
                    ? "Compra registrada con éxito."
                    : type === "provider_payment"
                        ? "Pago a proveedor registrado con éxito."
                        : type === "expense"
                            ? "Gasto registrado con éxito."
                            : "Pérdida registrada con éxito.";

            toast.success(successMessage);

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            console.error(error);
            const message =
                error.response?.data?.register ||
                error.response?.data?.non_field_errors?.[0] ||
                "No se pudo registrar el movimiento.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/40
            p-4
            backdrop-blur-xs
        ">
            <div className="
                w-full
                max-w-lg
                max-h-[90vh]
                overflow-y-auto
                border
                border-[var(--border)]
                bg-[var(--surface)]
                shadow-2xl
            ">
                {/* MODAL HEADER */}
                <div className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[var(--border)]
                    bg-[var(--surface-accent)]
                    px-6
                    py-4
                ">
                    <div>
                        <p className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--primary)]
                        ">
                            Salidas y gastos
                        </p>
                        <h2 className="
                            mt-0.5
                            text-lg
                            font-bold
                            text-[var(--text-primary)]
                        ">
                            Registrar salida o gasto
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            rounded
                            p-1.5
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-muted)]
                            hover:text-[var(--text-primary)]
                        "
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* MOVEMENT TYPE TOGGLE */}
                    <div>
                        <label className="
                            block
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--text-secondary)]
                        ">
                            Tipo de movimiento
                        </label>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setType("provider");
                                }}
                                className={`
                                    rounded-md
                                    border
                                    p-3
                                    text-left
                                    transition
                                    ${
                                        type === "provider"
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                    }
                                `}
                            >
                                <div className="text-sm">Compra a proveedor</div>
                                <div className="text-xs opacity-75 font-normal">Mercadería o insumos</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("provider_payment");
                                    setDebtAmount("");
                                }}
                                className={`
                                    rounded-md
                                    border
                                    p-3
                                    text-left
                                    transition
                                    ${
                                        type === "provider_payment"
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                    }
                                `}
                            >
                                <div className="text-sm">Pago a proveedor</div>
                                <div className="text-xs opacity-75 font-normal">Pago de deuda</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("expense");
                                    setDebtAmount("");
                                }}
                                className={`
                                    rounded-md
                                    border
                                    p-3
                                    text-left
                                    transition
                                    ${
                                        type === "expense"
                                            ? "border-[var(--primary)] bg-[var(--primary)]/10 font-semibold text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                    }
                                `}
                            >
                                <div className="text-sm">Gasto</div>
                                <div className="text-xs opacity-75 font-normal">Luz, bolsas, limpieza, etc.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setType("loss");
                                    setDebtAmount("");
                                    setTransferAmount("");
                                }}
                                className={`
                                    rounded-md
                                    border
                                    p-3
                                    text-left
                                    transition
                                    ${
                                        type === "loss"
                                            ? "border-[var(--danger)] bg-[var(--danger)]/10 font-semibold text-[var(--danger)] ring-1 ring-[var(--danger)]"
                                            : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                                    }
                                `}
                            >
                                <div className="text-sm">Pérdida</div>
                                <div className="text-xs opacity-75 font-normal">Faltante, rotura, etc.</div>
                            </button>
                        </div>
                    </div>

                    {/* PROVIDER SELECTION (Only when provider operation) */}
                    {isProviderType && (
                        <div>
                            <label className="
                                block
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                            ">
                                Proveedor <span className="text-[var(--danger)]">*</span>
                            </label>

                            {selectedProvider ? (
                                <div className="
                                    mt-1.5
                                    flex
                                    items-center
                                    justify-between
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface-muted)]
                                    px-3.5
                                    py-2.5
                                ">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                                            {selectedProvider.name}
                                        </span>
                                        {!selectedProvider.id && (
                                            <span className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
                                                Nuevo
                                            </span>
                                        )}
                                        {selectedProvider.phone && (
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                · {selectedProvider.phone}
                                            </span>
                                        )}
                                    </div>

                                    {!initialProvider && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedProvider(null);
                                                setProviderSearch("");
                                            }}
                                            className="text-xs font-semibold text-[var(--danger)] hover:underline"
                                        >
                                            Cambiar
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="relative mt-1.5">
                                    <input
                                        type="text"
                                        value={providerSearch}
                                        onChange={(e) => setProviderSearch(e.target.value)}
                                        placeholder="Buscar o escribir nombre del proveedor..."
                                        className="
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
                                            focus:border-[var(--primary)]
                                            focus:ring-2
                                            focus:ring-[var(--primary)]/20
                                        "
                                    />

                                    {providerSearch.trim() && (
                                        <div className="
                                            absolute
                                            left-0
                                            right-0
                                            top-[100%]
                                            z-30
                                            mt-1
                                            max-h-48
                                            overflow-y-auto
                                            border
                                            border-[var(--border)]
                                            bg-[var(--surface)]
                                            shadow-xl
                                        ">
                                            {providers
                                                .filter((p) =>
                                                    p.name.toLowerCase().includes(providerSearch.toLowerCase())
                                                )
                                                .map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProvider(p);
                                                            setProviderSearch(p.name);
                                                        }}
                                                        className="
                                                            flex
                                                            w-full
                                                            items-center
                                                            justify-between
                                                            border-b
                                                            border-[var(--border)]
                                                            px-3.5
                                                            py-2.5
                                                            text-left
                                                            text-sm
                                                            text-[var(--text-primary)]
                                                            hover:bg-[var(--surface-accent)]
                                                        "
                                                    >
                                                        <span className="font-medium">{p.name}</span>
                                                        {p.phone && (
                                                            <span className="text-xs text-[var(--text-secondary)]">
                                                                {p.phone}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProvider({
                                                        id: null,
                                                        name: providerSearch.trim(),
                                                    });
                                                }}
                                                className="
                                                    flex
                                                    w-full
                                                    items-center
                                                    px-3.5
                                                    py-2.5
                                                    text-left
                                                    text-sm
                                                    font-semibold
                                                    text-[var(--primary)]
                                                    hover:bg-[var(--surface-accent)]
                                                "
                                            >
                                                + Crear proveedor "{providerSearch.trim()}"
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAYMENT AMOUNTS BREAKDOWN */}
                    <div className="space-y-3">
                        <label className="
                            block
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-[var(--text-secondary)]
                        ">
                            Formas de pago
                        </label>

                        {/* CASH */}
                        <div className="flex items-center gap-3">
                            <div className="w-40 shrink-0 text-sm text-[var(--text-secondary)]">
                                Efectivo (caja)
                            </div>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    placeholder="0"
                                    className="
                                        w-full
                                        rounded-md
                                        border
                                        border-[var(--border)]
                                        bg-[var(--background)]
                                        py-2
                                        pl-7
                                        pr-3
                                        text-sm
                                        tabular-nums
                                        text-[var(--text-primary)]
                                        outline-none
                                        transition
                                        focus:border-[var(--primary)]
                                        focus:ring-2
                                        focus:ring-[var(--primary)]/20
                                    "
                                />
                            </div>
                        </div>

                        {/* TRANSFER */}
                        {allowsTransfer && (
                            <div className="flex items-center gap-3">
                                <div className="w-40 shrink-0 text-sm text-[var(--text-secondary)]">
                                    Transferencia
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        placeholder="0"
                                        className="
                                            w-full
                                            rounded-md
                                            border
                                            border-[var(--border)]
                                            bg-[var(--background)]
                                            py-2
                                            pl-7
                                            pr-3
                                            text-sm
                                            tabular-nums
                                            text-[var(--text-primary)]
                                            outline-none
                                            transition
                                            focus:border-[var(--primary)]
                                            focus:ring-2
                                            focus:ring-[var(--primary)]/20
                                        "
                                    />
                                </div>
                            </div>
                        )}

                        {/* DEBT / DEBO */}
                        {allowsDebt && (
                            <div className="flex items-center gap-3">
                                <div className="w-40 shrink-0 text-sm font-medium text-[var(--warning)]">
                                    Debo (quedo debiendo)
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                        $
                                    </span>
                                    <MoneyInput
                                        value={debtAmount}
                                        onChange={(e) => setDebtAmount(e.target.value)}
                                        placeholder="0"
                                        className="
                                            w-full
                                            rounded-md
                                            border
                                            border-[var(--warning)]/50
                                            bg-[var(--background)]
                                            py-2
                                            pl-7
                                            pr-3
                                            text-sm
                                            tabular-nums
                                            text-[var(--text-primary)]
                                            outline-none
                                            transition
                                            focus:border-[var(--warning)]
                                            focus:ring-2
                                            focus:ring-[var(--warning)]/20
                                        "
                                    />
                                </div>
                            </div>
                        )}

                        {/* TOTAL SUMMARY */}
                        <div className="
                            flex
                            items-center
                            justify-between
                            rounded-md
                            border
                            border-[var(--border)]
                            bg-[var(--surface-muted)]
                            px-4
                            py-3
                            text-sm
                        ">
                            <span className="font-medium text-[var(--text-secondary)]">
                                Total del movimiento:
                            </span>
                            <span className="text-base font-bold text-[var(--text-primary)]">
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>
                    </div>

                    {/* DETAIL / MOTIVO */}
                    <div>
                        <label
                            htmlFor="movement-description"
                            className="
                                block
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                            "
                        >
                            {type === "expense" || type === "loss"
                                ? "Motivo / Detalle"
                                : "Detalle (opcional)"}
                        </label>
                        <input
                            id="movement-description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                type === "expense"
                                    ? "Ej: Artículos de limpieza, Pago de luz, Bolsas"
                                    : type === "loss"
                                        ? "Ej: Faltante de caja, Mercadería rota"
                                        : "Ej: Pedido semanal, Bebidas"
                            }
                            className="
                                mt-1.5
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
                                placeholder:text-[var(--text-secondary)]/70
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="
                        flex
                        items-center
                        justify-end
                        gap-3
                        border-t
                        border-[var(--border)]
                        pt-4
                    ">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="
                                rounded-md
                                border
                                border-[var(--border)]
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-[var(--text-secondary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                                hover:text-[var(--text-primary)]
                                disabled:opacity-50
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || totalAmount <= 0}
                            className="
                                rounded-md
                                bg-[var(--primary)]
                                px-5
                                py-2
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-[var(--primary-hover)]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {isSubmitting ? "Guardando..." : "Guardar movimiento"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProviderMovementModal;
