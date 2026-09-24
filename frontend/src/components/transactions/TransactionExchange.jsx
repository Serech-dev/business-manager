import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function TransactionExchange({
    exchangeAmount,
    onChangeExchangeAmount,
    currentMethod = "transfer",
}) {
    const { settings, calculateExchangeFee } = useStoreSettings();
    const numericAmount = Number(exchangeAmount) || 0;
    const { fee, clientAmount } = calculateExchangeFee(numericAmount);

    const feeLabel =
        settings.exchange_fee_type === "percentage"
            ? `${Number(settings.exchange_fee_value)}%`
            : formatCurrency(Number(settings.exchange_fee_value));

    const isCashToVirtual = currentMethod === "cash";
    const isCard = currentMethod === "card";
    const isDebt = currentMethod === "debt";

    const headerTitle = isCashToVirtual
        ? "Cambio de dinero (Efectivo a Virtual)"
        : isCard
            ? "Cambio de dinero (Tarjeta a Efectivo)"
            : isDebt
                ? "Cambio de dinero (Fiado)"
                : "Cambio de dinero (Virtual a Efectivo)";

    const inputLabel = isCashToVirtual
        ? "Monto en efectivo recibido del cliente ($)"
        : isCard
            ? "Monto cobrado con tarjeta ($)"
            : isDebt
                ? "Monto a fiar / anotar en cuenta ($)"
                : "Monto transferido por el cliente ($)";

    const actionTitle = isCashToVirtual
        ? "Transferir al cliente (CBU / CVU / Alias)"
        : "Entregar en efectivo al cliente";

    const formulaLabel = isCashToVirtual
        ? `Efectivo recibido ${formatCurrency(numericAmount)} − Comisión ${formatCurrency(fee)}`
        : isCard
            ? `Tarjeta cobrada ${formatCurrency(numericAmount)} − Comisión ${formatCurrency(fee)}`
            : isDebt
                ? `Fiado cargado ${formatCurrency(numericAmount)} − Comisión ${formatCurrency(fee)}`
                : `Transferencia ${formatCurrency(numericAmount)} − Comisión ${formatCurrency(fee)}`;

    return (
        <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {headerTitle}
                </span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                    Comisión {feeLabel}
                </span>
            </div>

            <div className="p-4 space-y-3.5">
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
                                    {actionTitle}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                    {formulaLabel}
                                </span>
                            </div>

                            <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                                {formatCurrency(clientAmount)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default TransactionExchange;
