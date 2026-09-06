import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";

function TransactionExchange({
    exchangeAmount,
    onChangeExchangeAmount,
}) {
    const numericAmount = Number(exchangeAmount) || 0;
    const fee = Math.round(numericAmount * 0.10);
    const clientAmount = Math.max(0, numericAmount - fee);

    return (
        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Cambio de dinero (Virtual a Efectivo)
                </span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                    Comisión 10%
                </span>
            </div>

            <div className="p-4 space-y-3.5">
                <div>
                    <label
                        htmlFor="exchange-amount"
                        className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                    >
                        Monto transferido por el cliente ($)
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
                            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="0"
                        />
                    </div>
                </div>

                {numericAmount > 0 && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">
                                Comisión ganada (10%):
                            </span>
                            <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                                +{formatCurrency(fee)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-t border-sky-500/20 pt-2">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                                    Entregar en efectivo al cliente
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                    Transferencia {formatCurrency(numericAmount)} − Comisión {formatCurrency(fee)}
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
