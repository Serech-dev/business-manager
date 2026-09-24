import { useMemo, useState, useEffect } from "react";
import { formatCurrency, roundUpTo50 } from "../../utils/formatCurrency";
import MoneyInput from "../MoneyInput";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { getBankAccounts } from "../../services/business";

function TransactionAmounts({
    amounts,
    targetTotal = 0,
    onAmountsChange,
    disableDebt = false,
    hasClient = false,
    client = null,
    onRequireClient,
    receivedCash = "",
    onReceivedCashChange,
    ignoreDebtSurcharge = false,
    onToggleIgnoreDebtSurcharge,
    isExchange = false,
}) {
    const { settings, calculateDebtSurcharge, calculateCardSurcharge, getClientDebtLimit } = useStoreSettings();
    const isSingleMethod = amounts.length === 1;

    const [bankAccounts, setBankAccounts] = useState([]);

    useEffect(() => {
        let isMounted = true;
        getBankAccounts(true)
            .then((data) => {
                if (isMounted) setBankAccounts(data || []);
            })
            .catch((err) => console.error("Error loading bank accounts in TransactionAmounts:", err));
        return () => {
            isMounted = false;
        };
    }, []);

    // Ensure debt method is sanitized to cash when debt is disabled (e.g. debt payment or exchange)
    useEffect(() => {
        if ((disableDebt || isExchange) && amounts && amounts.some((a) => a.method === "debt")) {
            const sanitized = amounts.map((a) =>
                a.method === "debt" ? { ...a, method: isExchange ? "transfer" : "cash" } : a
            );
            onAmountsChange?.(sanitized);
        }
    }, [disableDebt, isExchange, amounts, onAmountsChange]);

    const defaultBank = useMemo(() => {
        return bankAccounts.find((b) => b.is_default) || bankAccounts[0] || null;
    }, [bankAccounts]);

    // Ensure digital payment amounts receive a valid bank account if none assigned
    useEffect(() => {
        if (!defaultBank) return;
        const needsBank = amounts.some(
            (a) => ["transfer", "card"].includes(a.method) && !a.bank_account
        );
        if (needsBank) {
            const updated = amounts.map((a) =>
                ["transfer", "card"].includes(a.method) && !a.bank_account
                    ? { ...a, bank_account: defaultBank.id }
                    : a
            );
            onAmountsChange?.(updated);
        }
    }, [defaultBank, amounts, onAmountsChange]);

    function handleSelectSingleMethod(method) {
        if (method === "debt" && !hasClient) {
            onRequireClient?.();
        }

        let defaultAmount = amounts[0]?.amount || "";
        if (targetTotal > 0) {
            if (method === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                const surchargeInfo = calculateDebtSurcharge(targetTotal);
                defaultAmount = String(surchargeInfo.totalWithSurcharge);
            } else if (method === "card" && settings.card_surcharge_enabled) {
                const surchargeInfo = calculateCardSurcharge(targetTotal);
                defaultAmount = String(surchargeInfo.totalWithSurcharge);
            } else {
                defaultAmount = String(targetTotal);
            }
        }

        const isDigital = method === "transfer" || method === "card";
        const selectedBank = isDigital ? (amounts[0]?.bank_account || defaultBank?.id || null) : null;

        onAmountsChange([
            {
                method,
                amount: defaultAmount,
                ...(selectedBank ? { bank_account: selectedBank } : {}),
            },
        ]);
    }

    function updateAmount(index, field, value) {
        if (field === "method" && value === "debt" && !hasClient) {
            onRequireClient?.();
        }

        let updated = amounts.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            const newItem = {
                ...item,
                [field]: value,
            };

            // When switching to digital payment, ensure default bank is assigned
            if (field === "method") {
                if (value === "transfer" || value === "card") {
                    if (!newItem.bank_account && defaultBank?.id) {
                        newItem.bank_account = defaultBank.id;
                    }
                } else {
                    delete newItem.bank_account;
                }

                if (targetTotal > 0 && amounts.length === 2) {
                    const otherIndex = index === 0 ? 1 : 0;
                    const otherAmt = Number(amounts[otherIndex].amount) || 0;
                    const baseRemainder = Math.max(0, targetTotal - otherAmt);
                    if (value === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                        newItem.amount = baseRemainder > 0 ? String(calculateDebtSurcharge(baseRemainder).totalWithSurcharge) : "";
                    } else if (value === "card" && settings.card_surcharge_enabled) {
                        newItem.amount = baseRemainder > 0 ? String(calculateCardSurcharge(baseRemainder).totalWithSurcharge) : "";
                    } else {
                        newItem.amount = baseRemainder > 0 ? String(roundUpTo50(baseRemainder)) : "";
                    }
                } else if (value === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                    const currentAmt = Number(newItem.amount) || 0;
                    if (currentAmt > 0) {
                        newItem.amount = String(calculateDebtSurcharge(currentAmt).totalWithSurcharge);
                    }
                }
            }

            return newItem;
        });

        // Auto-recalculate the other amount when splitting across 2 payment methods
        if (field === "amount" && targetTotal > 0 && updated.length === 2) {
            const otherIndex = index === 0 ? 1 : 0;
            const enteredVal = Number(value) || 0;
            if (value !== "" && enteredVal >= 0) {
                const remainder = Math.max(0, targetTotal - enteredVal);
                let finalOtherAmount = roundUpTo50(remainder);
                if (updated[otherIndex].method === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                    finalOtherAmount = calculateDebtSurcharge(remainder).totalWithSurcharge;
                } else if (updated[otherIndex].method === "card" && settings.card_surcharge_enabled) {
                    finalOtherAmount = calculateCardSurcharge(remainder).totalWithSurcharge;
                }
                updated[otherIndex] = {
                    ...updated[otherIndex],
                    amount: finalOtherAmount > 0 ? String(finalOtherAmount) : "0",
                };
            }
        }

        onAmountsChange(updated);
    }

    function addAmount() {
        const usedMethods = new Set(amounts.map((a) => a.method));
        const allMethods = disableDebt
            ? ["cash", "transfer", "card"]
            : ["cash", "transfer", "card", "debt"];
        const nextMethod = allMethods.find((m) => !usedMethods.has(m)) || "transfer";
        const isDigital = nextMethod === "transfer" || nextMethod === "card";
        const bankAccount = isDigital && defaultBank?.id ? defaultBank.id : undefined;

        if (targetTotal > 0) {
            const currentSum = amounts.reduce(
                (sum, item) => sum + (Number(item.amount) || 0),
                0
            );
            const remainder = Math.max(0, targetTotal - currentSum);
            let nextAmount = roundUpTo50(remainder);
            if (nextMethod === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                nextAmount = calculateDebtSurcharge(remainder).totalWithSurcharge;
            } else if (nextMethod === "card" && settings.card_surcharge_enabled) {
                nextAmount = calculateCardSurcharge(remainder).totalWithSurcharge;
            }

            onAmountsChange([
                ...amounts,
                {
                    method: nextMethod,
                    amount: nextAmount > 0 ? String(nextAmount) : "",
                    ...(bankAccount ? { bank_account: bankAccount } : {}),
                },
            ]);
        } else {
            onAmountsChange([
                ...amounts,
                {
                    method: nextMethod,
                    amount: "",
                    ...(bankAccount ? { bank_account: bankAccount } : {}),
                },
            ]);
        }
    }

    function removeAmount(index) {
        if (amounts.length <= 1) return;
        const updated = amounts.filter((_, itemIndex) => itemIndex !== index);
        if (updated.length === 1 && targetTotal > 0) {
            const method = updated[0].method;
            let targetAmt = roundUpTo50(targetTotal);
            if (method === "debt" && settings.debt_surcharge_enabled && !ignoreDebtSurcharge) {
                targetAmt = calculateDebtSurcharge(targetTotal).totalWithSurcharge;
            } else if (method === "card" && settings.card_surcharge_enabled) {
                targetAmt = calculateCardSurcharge(targetTotal).totalWithSurcharge;
            }
            updated[0] = {
                ...updated[0],
                amount: String(targetAmt),
            };
        }
        onAmountsChange(updated);
    }

    const subtotal = amounts.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    );

    // Calculate total cash due across all operations/methods
    const cashDue = useMemo(() => {
        return amounts
            .filter((a) => a.method === "cash")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    }, [amounts]);

    const receivedNum = Number(receivedCash) || 0;
    const change = Math.max(0, receivedNum - cashDue);
    const hasEnteredReceived = receivedCash !== "" && receivedNum > 0;

    // Bill suggestions based on cashDue
    const billSuggestions = useMemo(() => {
        if (cashDue <= 0) return [];

        if (cashDue > 20000) {
            const round1 = Math.ceil(cashDue / 10000) * 10000;
            const round2 = round1 + 10000;
            const round3 = round1 + 20000;
            const unique = Array.from(new Set([cashDue, round1, round2, round3]));
            return unique.map((val) => ({
                label: val === cashDue ? "Exacto" : formatCurrency(val),
                value: val,
            }));
        }

        return [
            { label: "Exacto", value: cashDue },
            { label: "$ 5.000", value: 5000 },
            { label: "$ 10.000", value: 10000 },
            { label: "$ 20.000", value: 20000 },
        ].filter((b, idx, arr) => arr.findIndex((x) => x.value === b.value) === idx);
    }, [cashDue]);

    // Credit limit calculation
    const { clientDebt, effectiveLimit, debtAmountInOp, projectedDebt, isLimitBreached } = useMemo(() => {
        const debtInOp = amounts
            .filter((a) => a.method === "debt")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        const debt = Number(client?.debt || 0);
        const limit = client ? getClientDebtLimit(client) : null;
        const projected = debt + debtInOp;
        const breached = limit !== null && limit > 0 && projected > limit && debtInOp > 0;

        return {
            clientDebt: debt,
            effectiveLimit: limit,
            debtAmountInOp: debtInOp,
            projectedDebt: projected,
            isLimitBreached: breached,
        };
    }, [amounts, client, getClientDebtLimit]);

    const methods = isExchange
        ? [
            { id: "transfer", label: "Transf. por Efectivo" },
            { id: "cash", label: "Efectivo por Transf." },
            { id: "card", label: "Tarjeta por Efectivo" },
            ...(!disableDebt ? [{ id: "debt", label: "Fiado" }] : []),
        ]
        : [
            { id: "cash", label: "Efectivo" },
            { id: "transfer", label: "Transferencia" },
            { id: "card", label: "Tarjeta" },
            ...(!disableDebt ? [{ id: "debt", label: "Fiado" }] : []),
        ];

    const hasDebtMethod = amounts.some((a) => a.method === "debt");
    const nonDebtSum = useMemo(() => {
        return amounts
            .filter((a) => a.method !== "debt")
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    }, [amounts]);

    const debtBaseTarget = useMemo(() => {
        if (targetTotal <= 0) {
            return amounts
                .filter((a) => a.method === "debt")
                .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        }
        return isSingleMethod ? targetTotal : Math.max(0, targetTotal - nonDebtSum);
    }, [targetTotal, isSingleMethod, nonDebtSum, amounts]);

    const debtSurchargeInfo = useMemo(() => {
        return calculateDebtSurcharge(debtBaseTarget);
    }, [calculateDebtSurcharge, debtBaseTarget]);

    const hasCashMethod = amounts.some((a) => a.method === "cash");

    return (
        <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-accent)]/40 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Medio de pago
                </span>

                {isSingleMethod ? (
                    <button
                        type="button"
                        onClick={addAmount}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                        + Dividir pago
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={addAmount}
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                        + Agregar otro medio
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {isSingleMethod ? (
                    /* Single Payment Method Selection */
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {methods.map((m) => {
                                const isSelected = amounts[0]?.method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectSingleMethod(m.id)}
                                        className={`rounded-lg border py-2.5 px-3 text-xs sm:text-sm font-bold transition text-center ${
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                : "border-[var(--border)] bg-[var(--surface-accent)]/40 text-[var(--text-secondary)] hover:border-[var(--primary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Amount Input & Bank Destination (if transfer/card) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    value={amounts[0]?.amount || ""}
                                    onChange={(e) => updateAmount(0, "amount", e.target.value)}
                                    placeholder="0"
                                    className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                            </div>

                            {["transfer", "card"].includes(amounts[0]?.method) && bankAccounts.length > 0 && (
                                <div className="relative flex items-center">
                                    <select
                                        value={amounts[0]?.bank_account || defaultBank?.id || ""}
                                        onChange={(e) =>
                                            updateAmount(
                                                0,
                                                "bank_account",
                                                e.target.value ? Number(e.target.value) : null
                                            )
                                        }
                                        className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-8 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                    >
                                        {bankAccounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} {acc.is_default ? "(Principal)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Informational banners for card surcharge */}
                        {amounts[0]?.method === "card" && settings.card_surcharge_enabled && (
                            <div className="rounded-lg border border-purple-500/25 bg-purple-500/10 p-2.5 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                    <span>
                                        Recargo por cobro con tarjeta ({settings.card_surcharge_type === "percentage" ? `${Number(settings.card_surcharge_value)}%` : formatCurrency(Number(settings.card_surcharge_value))}):
                                    </span>
                                    {targetTotal > 0 && (
                                        <span className="tabular-nums">
                                            +{formatCurrency(calculateCardSurcharge(targetTotal).surcharge)}
                                        </span>
                                    )}
                                </div>
                                {targetTotal > 0 && (
                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                                        <span>Base: {formatCurrency(targetTotal)}</span>
                                        <span>Total sugerido con recargo: {formatCurrency(calculateCardSurcharge(targetTotal).totalWithSurcharge)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {amounts[0]?.method === "debt" && settings.debt_surcharge_enabled && (
                            <div className="rounded-md border border-indigo-500/25 bg-indigo-500/10 p-2.5 text-xs text-indigo-700 dark:text-indigo-300 space-y-1.5">
                                <div className="flex items-center justify-between font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span>
                                            Recargo por fiado ({settings.debt_surcharge_type === "percentage" ? `${Number(settings.debt_surcharge_value)}%` : formatCurrency(Number(settings.debt_surcharge_value))}):
                                        </span>
                                        {ignoreDebtSurcharge && (
                                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                Omitido
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {debtBaseTarget > 0 && !ignoreDebtSurcharge && (
                                            <span className="tabular-nums">
                                                +{formatCurrency(debtSurchargeInfo.surcharge)}
                                            </span>
                                        )}
                                        {onToggleIgnoreDebtSurcharge && (
                                            <button
                                                type="button"
                                                onClick={() => onToggleIgnoreDebtSurcharge(!ignoreDebtSurcharge)}
                                                className="rounded-md border border-indigo-500/30 bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 transition shadow-2xs cursor-pointer"
                                            >
                                                {ignoreDebtSurcharge ? "Aplicar recargo" : "Omitir recargo"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {debtBaseTarget > 0 && (
                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                                        <span>Base: {formatCurrency(debtBaseTarget)}</span>
                                        <span>
                                            {ignoreDebtSurcharge
                                                ? `Total a cobrar (sin recargo): ${formatCurrency(debtBaseTarget)}`
                                                : `Total sugerido con recargo: ${formatCurrency(debtSurchargeInfo.totalWithSurcharge)}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LIMIT BREACH WARNING */}
                        {isLimitBreached && (
                            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                    </svg>
                                    <span>Límite de fiado superado</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                    Deuda actual ({formatCurrency(clientDebt)}) + este fiado ({formatCurrency(debtAmountInOp)}) = <strong>{formatCurrency(projectedDebt)}</strong>. Supera el límite de <strong>{formatCurrency(effectiveLimit)}</strong>.
                                </p>
                            </div>
                        )}

                        {amounts[0]?.method === "debt" && !hasClient && (
                            <div className="rounded-lg bg-[var(--warning)]/10 p-2.5 text-xs font-medium text-[var(--warning)]">
                                Para registrar a cuenta, asigná un cliente en la sección de abajo.
                            </div>
                        )}
                    </div>
                ) : (
                    /* Split Payment Multi-Row Interface */
                    <div className="space-y-2.5">
                        {amounts.map((item, index) => (
                            <div key={index} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-40 sm:w-44 shrink-0">
                                        <select
                                            value={item.method}
                                            onChange={(e) =>
                                                updateAmount(index, "method", e.target.value)
                                            }
                                            className="h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 pr-8 text-xs sm:text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                        >
                                            {isExchange ? (
                                                <>
                                                    <option value="transfer">Transf. por Efectivo</option>
                                                    <option value="cash">Efectivo por Transf.</option>
                                                    <option value="card">Tarjeta por Efectivo</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="cash">Efectivo</option>
                                                    <option value="transfer">Transferencia</option>
                                                    <option value="card">Tarjeta</option>
                                                    {!disableDebt && <option value="debt">Fiado</option>}
                                                </>
                                            )}
                                        </select>
                                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="relative flex-1">
                                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                            $
                                        </span>
                                        <MoneyInput
                                            value={item.amount}
                                            onChange={(e) =>
                                                updateAmount(index, "amount", e.target.value)
                                            }
                                            placeholder="0"
                                            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeAmount(index)}
                                        className="h-10 w-10 flex items-center justify-center rounded-md text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                        title="Eliminar medio"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {["transfer", "card"].includes(item.method) && bankAccounts.length > 0 && (
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className="text-[11px] text-[var(--text-secondary)]">Cuenta destino:</span>
                                        <div className="relative">
                                            <select
                                                value={item.bank_account || defaultBank?.id || ""}
                                                onChange={(e) =>
                                                    updateAmount(
                                                        index,
                                                        "bank_account",
                                                        e.target.value ? Number(e.target.value) : null
                                                    )
                                                }
                                                className="h-7 appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-2 pr-6 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            >
                                                {bankAccounts.map((acc) => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name} {acc.is_default ? "(Principal)" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {item.method === "debt" && !hasClient && (
                                    <div className="rounded-lg bg-[var(--warning)]/10 px-3 py-1.5 text-xs font-medium text-[var(--warning)]">
                                        Requiere asignar cliente abajo.
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* FIADO SURCHARGE BANNER (SPLIT) */}
                        {hasDebtMethod && settings.debt_surcharge_enabled && (
                            <div className="rounded-md border border-indigo-500/25 bg-indigo-500/10 p-2.5 text-xs text-indigo-700 dark:text-indigo-300 space-y-1.5">
                                <div className="flex items-center justify-between font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span>
                                            Recargo por fiado ({settings.debt_surcharge_type === "percentage" ? `${Number(settings.debt_surcharge_value)}%` : formatCurrency(Number(settings.debt_surcharge_value))}):
                                        </span>
                                        {ignoreDebtSurcharge && (
                                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                Omitido
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {debtBaseTarget > 0 && !ignoreDebtSurcharge && (
                                            <span className="tabular-nums">
                                                +{formatCurrency(debtSurchargeInfo.surcharge)}
                                            </span>
                                        )}
                                        {onToggleIgnoreDebtSurcharge && (
                                            <button
                                                type="button"
                                                onClick={() => onToggleIgnoreDebtSurcharge(!ignoreDebtSurcharge)}
                                                className="rounded-md border border-indigo-500/30 bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 transition shadow-2xs cursor-pointer"
                                            >
                                                {ignoreDebtSurcharge ? "Aplicar recargo" : "Omitir recargo"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {debtBaseTarget > 0 && (
                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                                        <span>Base en fiado: {formatCurrency(debtBaseTarget)}</span>
                                        <span>
                                            {ignoreDebtSurcharge
                                                ? `Total fiado (sin recargo): ${formatCurrency(debtBaseTarget)}`
                                                : `Total sugerido en fiado: ${formatCurrency(debtSurchargeInfo.totalWithSurcharge)}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LIMIT BREACH WARNING (SPLIT) */}
                        {isLimitBreached && (
                            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                    </svg>
                                    <span>Límite de fiado superado</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                    Deuda actual ({formatCurrency(clientDebt)}) + este fiado ({formatCurrency(debtAmountInOp)}) = <strong>{formatCurrency(projectedDebt)}</strong>. Supera el límite de <strong>{formatCurrency(effectiveLimit)}</strong>.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* IN-CARD CASH RECEIVED & VUELTO (VISIBLE DIRECTLY WHEN CASH IS USED) */}
                {hasCashMethod && cashDue > 0 && onReceivedCashChange && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/30 p-3.5 space-y-3 animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label
                                htmlFor="inline-cash-received"
                                className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                                Paga con (Efectivo del cliente)
                            </label>

                            <span className="text-xs text-[var(--text-secondary)]">
                                Total en efectivo: <strong className="text-[var(--text-primary)] tabular-nums">{formatCurrency(cashDue)}</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                            {/* Input */}
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
                                    $
                                </span>
                                <MoneyInput
                                    id="inline-cash-received"
                                    value={receivedCash}
                                    onChange={(e) => onReceivedCashChange(e.target.value)}
                                    placeholder={String(cashDue)}
                                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-8 text-sm font-bold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                                {receivedCash && (
                                    <button
                                        type="button"
                                        onClick={() => onReceivedCashChange("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                        title="Limpiar"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Quick Bill Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {billSuggestions.map((bill) => {
                                    const isSelected = Number(receivedCash) === bill.value;
                                    return (
                                        <button
                                            key={bill.label}
                                            type="button"
                                            onClick={() => onReceivedCashChange(String(bill.value))}
                                            className={`rounded-lg border px-2.5 py-2 text-xs font-bold transition flex-1 text-center ${
                                                isSelected
                                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                                                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-accent)]"
                                            }`}
                                        >
                                            {bill.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PROMINENT VUELTO CALLOUT BANNER */}
                        {hasEnteredReceived && (
                            receivedNum >= cashDue ? (
                                change > 0 ? (
                                    <div className="flex items-center justify-between rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)]/25 px-4 py-3 transition animate-in fade-in duration-150">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--success-text)] block">
                                                Vuelto a entregar
                                            </span>
                                            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                                Paga {formatCurrency(receivedNum)} − Cobro {formatCurrency(cashDue)}
                                            </span>
                                        </div>
                                        <span className="text-xl sm:text-2xl font-black text-[var(--success)] tabular-nums">
                                            {formatCurrency(change)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2.5 text-xs font-bold text-[var(--primary)]">
                                        <span className="flex items-center gap-1.5">
                                            <span>✓</span>
                                            <span>Pago exacto en efectivo (Sin vuelto).</span>
                                        </span>
                                        <span className="tabular-nums">{formatCurrency(cashDue)}</span>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-500">
                                    <span>Monto insuficiente:</span>
                                    <span className="tabular-nums">Faltan {formatCurrency(cashDue - receivedNum)}</span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* SPLIT PAYMENT STATUS FOOTER */}
            {amounts.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-accent)]/20 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-secondary)]">Suma de medios:</span>
                        <strong className="font-bold text-[var(--text-primary)] tabular-nums">
                            {formatCurrency(subtotal)}
                        </strong>

                        {targetTotal > 0 && subtotal < targetTotal && (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                                Faltan {formatCurrency(targetTotal - subtotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal > targetTotal && (
                            <span className="rounded bg-[var(--danger)]/15 px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
                                +{formatCurrency(subtotal - targetTotal)}
                            </span>
                        )}
                        {targetTotal > 0 && subtotal === targetTotal && (
                            <span className="rounded bg-[var(--success)]/15 px-2 py-0.5 text-xs font-bold text-[var(--success)]">
                                Total cubierto
                            </span>
                        )}
                    </div>

                    {targetTotal > 0 && subtotal < targetTotal && (
                        <button
                            type="button"
                            onClick={() => {
                                const diff = targetTotal - subtotal;
                                const lastIdx = amounts.length - 1;
                                const lastAmt = Number(amounts[lastIdx].amount) || 0;
                                updateAmount(lastIdx, "amount", String(lastAmt + diff));
                            }}
                            className="rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                        >
                            + Asignar restante ({formatCurrency(targetTotal - subtotal)})
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}

export default TransactionAmounts;
