import { useState } from "react";
import toast from "react-hot-toast";

import { createTransaction } from "../../services/business";
import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function ClientPaymentModal({
    isOpen,
    onClose,
    client,
    currentDebt = 0,
    onSuccess,
}) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !client) return null;

    const rawDebt = Number(currentDebt) || 0;

    function handlePayFull() {
        if (rawDebt > 0) {
            setAmount(String(rawDebt));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const cleanAmount = Number(amount) || 0;

        if (cleanAmount <= 0) {
            toast.error("Ingresá un monto válido a cobrar.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                client: client.id,
                description: description.trim(),
                operations: [
                    {
                        type: "payment",
                        amounts: [
                            {
                                method: method,
                                amount: cleanAmount,
                            },
                        ],
                    },
                ],
            };

            await createTransaction(payload);
            toast.success(`Pago a cuenta de ${formatCurrency(cleanAmount)} registrado.`);
            setAmount("");
            setDescription("");
            setMethod("cash");
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            const serverMsg =
                error.response?.data?.register ||
                error.response?.data?.detail ||
                error.response?.data?.non_field_errors?.[0];
            toast.error(serverMsg || "No se pudo registrar el pago. Verificá que la caja esté abierta.");
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
            bg-black/60
            p-4
        ">
            <div className="
                w-full
                max-w-md
                border
                border-[var(--border)]
                bg-[var(--surface)]
                p-6
                shadow-2xl
            ">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Pago / Ingreso a Cuenta
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                            {client.name}
                        </h2>
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-[var(--text-secondary)]">
                            {rawDebt > 0 ? "Deuda actual" : rawDebt < 0 ? "Saldo a favor" : "Estado"}
                        </span>
                        <p className={`text-lg font-bold tabular-nums ${
                            rawDebt > 0 ? "text-[var(--danger)]" : rawDebt < 0 ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                        }`}>
                            {rawDebt > 0 ? formatCurrency(rawDebt) : rawDebt < 0 ? formatCurrency(Math.abs(rawDebt)) : "$ 0"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* QUICK SETTLE BUTTON */}
                    {rawDebt > 0 && (
                        <div className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-accent)]/50 p-2.5">
                            <span className="text-xs text-[var(--text-secondary)]">
                                ¿Paga la totalidad de la deuda?
                            </span>
                            <button
                                type="button"
                                onClick={handlePayFull}
                                className="
                                    rounded-sm
                                    border
                                    border-[var(--primary)]
                                    bg-[var(--primary)]/10
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-bold
                                    text-[var(--primary)]
                                    transition
                                    hover:bg-[var(--primary)]
                                    hover:text-white
                                "
                            >
                                Saldar total ({formatCurrency(rawDebt)})
                            </button>
                        </div>
                    )}

                    {/* AMOUNT */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            Monto cobrado
                        </label>
                        <div className="relative mt-1">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
                                $
                            </span>
                            <MoneyInput
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                autoFocus
                                className="
                                    w-full
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    bg-[var(--background)]
                                    py-2.5
                                    pl-8
                                    pr-3
                                    text-base
                                    font-bold
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

                    {/* PAYMENT METHOD */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            Medio de cobro
                        </label>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                            {[
                                { id: "cash", label: "Efectivo" },
                                { id: "transfer", label: "Transferencia" },
                                { id: "card", label: "Tarjeta" },
                            ].map((m) => {
                                const isSelected = method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMethod(m.id)}
                                        className={`
                                            rounded-md
                                            border
                                            py-2
                                            text-xs
                                            font-semibold
                                            transition
                                            ${
                                                isSelected
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                            }
                                        `}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* NOTE */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            Nota u observación (opcional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Entrega semanal, pago cuenta"
                            className="
                                mt-1
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--background)]
                                px-3
                                py-2
                                text-sm
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-6 flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="
                                flex-1
                                rounded-md
                                border
                                border-[var(--border)]
                                py-2.5
                                text-xs
                                font-medium
                                text-[var(--text-secondary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                                hover:text-[var(--text-primary)]
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || !amount || Number(amount) <= 0}
                            className="
                                flex-1
                                rounded-md
                                bg-[var(--primary)]
                                py-2.5
                                text-xs
                                font-bold
                                text-white
                                transition
                                hover:bg-[var(--primary-hover)]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {isSubmitting ? "Registrando..." : "Registrar cobro"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClientPaymentModal;

