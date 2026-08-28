import { formatCurrency } from "../../utils/formatCurrency";

function TransactionExchange({
    exchangeAmount,
    onChangeExchangeAmount,
}) {
    const numericAmount = Number(exchangeAmount) || 0;
    const fee = Math.round(numericAmount * 0.10);
    const clientAmount = Math.max(0, numericAmount - fee);

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
                    Datos del cambio
                </h3>
                <p className="
                    mt-0.5
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    Indicá el monto sobre el cual se calcula la comisión.
                </p>
            </div>

            <div className="max-w-md p-6">
                <label
                    htmlFor="exchange-amount"
                    className="
                        text-sm
                        font-medium
                        text-[var(--text-primary)]
                    "
                >
                    Monto de cambio
                </label>

                <div className="relative mt-2">
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
                        id="exchange-amount"
                        type="number"
                        min="0"
                        value={exchangeAmount}
                        onChange={(event) =>
                            onChangeExchangeAmount(event.target.value)
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
                            text-sm
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

                {numericAmount > 0 && (
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
                            <span className="text-[var(--text-secondary)]">
                                Comisión de cambio: 10%
                            </span>
                            <strong className="text-[var(--text-primary)]">
                                {formatCurrency(fee)}
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
                                {formatCurrency(clientAmount)}
                            </strong>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default TransactionExchange;
