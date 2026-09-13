import { formatCurrency } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function TransactionRecharge({
    type = "sube", // "sube" | "phone"
    rechargeAmount = "",
    onChangeRechargeAmount,
}) {
    const { settings, calculateSubeFee, calculatePhoneFee } = useStoreSettings();
    const isSube = type === "sube";

    const feeInfo = isSube
        ? calculateSubeFee(rechargeAmount)
        : calculatePhoneFee(rechargeAmount);

    const feeType = isSube ? settings.sube_fee_type : settings.phone_fee_type;
    const feeValue = isSube ? settings.sube_fee_value : settings.phone_fee_value;

    const feeLabel =
        feeType === "percentage"
            ? `${Number(feeValue)}%`
            : formatCurrency(Number(feeValue));

    const presets = isSube
        ? [1000, 2000, 3000, 5000, 10000]
        : [1000, 1500, 2000, 3000, 5000];

    const title = isSube ? "Carga de Tarjeta SUBE" : "Recarga de Celular";
    const subtitle = isSube
        ? "Ingresá el saldo solicitado para cargar en la tarjeta"
        : "Ingresá el importe de saldo para la línea móvil";

    return (
        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        {title}
                    </span>
                </div>
                <span className="rounded-sm bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                    Comisión {feeLabel}
                </span>
            </div>

            <div className="p-4 space-y-3.5">
                <div>
                    <label
                        htmlFor="recharge-amount-input"
                        className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1"
                    >
                        Monto de carga solicitado ($)
                    </label>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                        {subtitle}
                    </p>

                    <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                            $
                        </span>
                        <MoneyInput
                            id="recharge-amount-input"
                            value={rechargeAmount}
                            onChange={(e) => onChangeRechargeAmount?.(e.target.value)}
                            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="0"
                        />
                    </div>
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {presets.map((presetVal) => {
                        const isSelected = Number(rechargeAmount) === presetVal;
                        return (
                            <button
                                key={presetVal}
                                type="button"
                                onClick={() => onChangeRechargeAmount?.(String(presetVal))}
                                className={`rounded-md border px-3 py-1.5 text-xs font-bold transition flex-1 text-center ${
                                    isSelected
                                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                        : "border-[var(--border)] bg-[var(--surface-accent)]/50 text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                }`}
                            >
                                ${presetVal.toLocaleString("es-AR")}
                            </button>
                        );
                    })}
                </div>

                {/* Fee & total calculation banner */}
                {feeInfo.rechargeAmount > 0 && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">
                                Saldo acreditado al cliente:
                            </span>
                            <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                                {formatCurrency(feeInfo.rechargeAmount)}
                            </strong>
                        </div>

                        {feeInfo.fee > 0 && (
                            <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300">
                                <span>
                                    Comisión del servicio ({feeLabel}):
                                </span>
                                <strong className="font-bold tabular-nums">
                                    +{formatCurrency(feeInfo.fee)}
                                </strong>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-sky-500/20 pt-2">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                                    Total a cobrar al cliente
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                    Carga {formatCurrency(feeInfo.rechargeAmount)} {feeInfo.fee > 0 ? `+ Comisión ${formatCurrency(feeInfo.fee)}` : ""}
                                </span>
                            </div>

                            <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                                {formatCurrency(feeInfo.totalToCharge)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default TransactionRecharge;

