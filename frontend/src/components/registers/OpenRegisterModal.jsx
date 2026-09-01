import { useState } from "react";
import toast from "react-hot-toast";

import MoneyInput from "../MoneyInput";
import { openRegister } from "../../services/business";

function OpenRegisterModal({ isOpen, onClose, onSuccess }) {
    const [initialCash, setInitialCash] = useState("");
    const [initialBank, setInitialBank] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSubmitting(true);

        const cashNum = Number(initialCash) || 0;
        const bankNum = Number(initialBank) || 0;

        try {
            const newRegister = await openRegister({
                initial_cash: cashNum,
                initial_bank: bankNum,
            });

            toast.success("Caja abierta con éxito.");
            setInitialCash("");
            setInitialBank("");
            onClose();
            if (onSuccess) {
                onSuccess(newRegister);
            }
        } catch (error) {
            console.error(error);
            const msg =
                error.response?.data?.detail || "No se pudo abrir la caja.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Iniciar Jornada
                        </p>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                            Abrir Caja
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Ingresá el dinero inicial disponible para dar cambio y en cuenta bancaria. Si no querés declarar fondos, podés dejarlos en $0.
                    </p>

                    {/* EFECTIVO INICIAL */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Efectivo inicial en caja.
                        </label>
                        <MoneyInput
                            value={initialCash}
                            onChange={(e) => setInitialCash(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-base font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <span className="text-[11px] text-[var(--text-secondary)]">
                            Efectivo disponible en caja.
                        </span>
                    </div>

                    {/* SALDO BANCARIO INICIAL */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Saldo inicial en banco / billetera
                        </label>
                        <MoneyInput
                            value={initialBank}
                            onChange={(e) => setInitialBank(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-base font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <span className="text-[11px] text-[var(--text-secondary)]">
                            Saldo de cuenta bancaria o Mercado Pago al comenzar.
                        </span>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {isSubmitting ? "Abriendo..." : "Abrir caja"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OpenRegisterModal;

