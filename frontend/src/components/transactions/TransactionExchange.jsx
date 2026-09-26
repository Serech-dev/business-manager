import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function TransactionExchange({
    exchangeAmount,
    onChangeExchangeAmount,
    exchangeMode = "payout",
    onChangeExchangeMode,
}) {
    const { settings, calculateExchangeFee } = useStoreSettings();
    const numericAmount = Number(exchangeAmount) || 0;
    const { fee, clientAmount, totalToCharge } = calculateExchangeFee(
        numericAmount,
        exchangeMode
    );

    const feeLabel =
        settings.exchange_fee_type === "percentage"
            ? `${Number(settings.exchange_fee_value)}%`
            : formatCurrency(Number(settings.exchange_fee_value));

    const isPayoutMode = exchangeMode === "payout";

    const inputLabel = isPayoutMode
        ? "Efectivo que retira / se entrega al cliente ($)"
        : "Monto total transferido / recibido del cliente ($)";

    const formulaLabel = isPayoutMode
        ? `Efectivo ${formatCurrency(clientAmount)} + Comisión ${formatCurrency(fee)}`
        : `Transferencia ${formatCurrency(numericAmount)} − Comisión ${formatCurrency(fee)}`;

    return (
        <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Cambio de dinero (Efectivo / Transferencia)
                </span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                    Comisión {feeLabel}
                </span>
            </div>

            <div className="p-4 space-y-3.5">
                {/* MODE TOGGLE */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Modalidad de cálculo
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => onChangeExchangeMode?.("payout")}
                            className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition cursor-pointer ${
                                isPayoutMode
                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                            }`}
                        >
                            <span className="text-xs font-bold">Monto a entregar</span>
                            <span
                                className={`text-[10px] sm:text-[11px] mt-0.5 ${
                                    isPayoutMode
                                        ? "text-white/80"
                                        : "text-[var(--text-secondary)]"
                                }`}
                            >
                                El cliente retira este monto
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onChangeExchangeMode?.("received")}
                            className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition cursor-pointer ${
                                !isPayoutMode
                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                            }`}
                        >
                            <span className="text-xs font-bold">Monto recibido</span>
                            <span
                                className={`text-[10px] sm:text-[11px] mt-0.5 ${
                                    !isPayoutMode
                                        ? "text-white/80"
                                        : "text-[var(--text-secondary)]"
                                }`}
                            >
                                El cliente abona este total
                            </span>
                        </button>
                    </div>
                </div>

                {/* AMOUNT INPUT */}
                <div>
                    <label
                        htmlFor="exchange-amount"
                        className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                    >
                        {inputLabel}
                    </label>

                    <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                            $
                        </span>

                        <MoneyInput
                            id="exchange-amount"
                            value={exchangeAmount}
                            onChange={(event) =>
                                onChangeExchangeAmount(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* BREAKDOWN CARD */}
                {numericAmount > 0 && (
                    <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">
                                Comisión ganada ({feeLabel}):
                            </span>
                            <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                                +{formatCurrency(fee)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-t border-sky-500/20 pt-2">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                                    {isPayoutMode
                                        ? "Total a cobrar / transferir"
                                        : "Entregar en efectivo al cliente"}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                    {formulaLabel}
                                </span>
                            </div>

                            <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                                {formatCurrency(
                                    isPayoutMode ? totalToCharge : clientAmount
                                )}
                            </span>
                        </div>

                        <div className="rounded bg-sky-500/10 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] flex items-center justify-between">
                            <span>
                                {isPayoutMode
                                    ? "Efectivo que sale de caja:"
                                    : "Monto que ingresa por transferencia:"}
                            </span>
                            <strong className="text-[var(--text-primary)] tabular-nums font-semibold">
                                {formatCurrency(
                                    isPayoutMode ? clientAmount : totalToCharge
                                )}
                            </strong>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default TransactionExchange;
