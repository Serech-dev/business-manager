import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import {
    getCurrentRegister,
    openRegister,
    closeRegister,
    getTransactions,
    createTransaction,
} from "../../services/business";
import { playBeepSuccess, playBeepWarning } from "../../utils/audio";

export function SimpleCashRegister() {
    const [register, setRegister] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Open Register State
    const [initialCashInput, setInitialCashInput] = useState("");
    const [isOpening, setIsOpening] = useState(false);

    // Close Register State
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [closingNotes, setClosingNotes] = useState("");
    const [isClosing, setIsClosing] = useState(false);

    // Quick Cash Movement (Expense / Cash In) Modal
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState("expense"); // 'expense' | 'income'
    const [movementAmount, setMovementAmount] = useState("");
    const [movementDescription, setMovementDescription] = useState("");
    const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

    const loadRegisterData = useCallback(async () => {
        try {
            setIsLoading(true);
            const reg = await getCurrentRegister();
            setRegister(reg);

            if (reg) {
                const txs = await getTransactions(true);
                setTransactions(Array.isArray(txs) ? txs : txs?.results || []);
            } else {
                setTransactions([]);
            }
        } catch (err) {
            console.error("Error loading register in mobile cash view:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRegisterData();
    }, [loadRegisterData]);

    // Financial calculations
    const summary = useMemo(() => {
        let salesCash = 0;
        let salesTransfer = 0;
        let salesCard = 0;
        let salesDebt = 0;
        let totalExpenses = 0;
        let totalCashIn = 0;

        transactions.forEach((tx) => {
            const txType = tx.type;
            const amounts = tx.amounts || [];

            if (["sale", "sube", "phone", "exchange", "sale_exchange", "payment"].includes(txType)) {
                amounts.forEach((a) => {
                    const amt = Number(a.amount) || 0;
                    if (a.method === "cash") salesCash += amt;
                    else if (a.method === "transfer") salesTransfer += amt;
                    else if (a.method === "card") salesCard += amt;
                    else if (a.method === "debt") salesDebt += amt;
                });
            } else if (["expense", "provider", "loss"].includes(txType)) {
                amounts.forEach((a) => {
                    if (a.method === "cash") totalExpenses += (Number(a.amount) || 0);
                });
            }
        });

        const initialCash = Number(register?.initial_cash) || 0;
        const estimatedCashInDrawer = initialCash + salesCash - totalExpenses;
        const totalSales = salesCash + salesTransfer + salesCard + salesDebt;

        return {
            initialCash,
            salesCash,
            salesTransfer,
            salesCard,
            salesDebt,
            totalExpenses,
            totalSales,
            estimatedCashInDrawer,
        };
    }, [register, transactions]);

    const handleOpenRegister = async () => {
        try {
            setIsOpening(true);
            const amt = Number(initialCashInput) || 0;
            const res = await openRegister({ initial_cash: amt });
            setRegister(res);
            setInitialCashInput("");
            playBeepSuccess();
            toast.success("¡Caja abierta con éxito!");
            await loadRegisterData();
        } catch (err) {
            console.error("Error opening register:", err);
            toast.error(err?.response?.data?.detail || "Error al abrir la caja.");
            playBeepWarning();
        } finally {
            setIsOpening(false);
        }
    };

    const handleCloseRegister = async () => {
        try {
            setIsClosing(true);
            await closeRegister();
            playBeepSuccess();
            toast.success("¡Caja cerrada con éxito!");
            setIsCloseModalOpen(false);
            setRegister(null);
            setTransactions([]);
        } catch (err) {
            console.error("Error closing register:", err);
            toast.error("Error al cerrar la caja.");
            playBeepWarning();
        } finally {
            setIsClosing(false);
        }
    };

    const handleCreateMovement = async () => {
        const amt = Number(movementAmount);
        if (!amt || amt <= 0) {
            toast.error("Ingresá un monto válido.");
            return;
        }

        try {
            setIsSubmittingMovement(true);
            const payload = {
                type: movementType === "expense" ? "expense" : "payment",
                description: movementDescription || (movementType === "expense" ? "Gasto menor de caja" : "Ingreso de dinero"),
                operations: [
                    {
                        type: movementType === "expense" ? "expense" : "payment",
                        manualAmount: amt,
                        amounts: [{ method: "cash", amount: amt }],
                        items: [],
                    },
                ],
            };

            await createTransaction(payload);
            playBeepSuccess();
            toast.success(movementType === "expense" ? "Gasto registrado." : "Ingreso registrado.");
            setIsMovementModalOpen(false);
            setMovementAmount("");
            setMovementDescription("");
            await loadRegisterData();
        } catch (err) {
            console.error("Error creating cash movement:", err);
            toast.error("Error al registrar movimiento de caja.");
        } finally {
            setIsSubmittingMovement(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--text-secondary)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs">Cargando estado de caja...</p>
            </div>
        );
    }

    if (!register) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-4 pb-24 flex flex-col justify-center">
                <div className="max-w-sm mx-auto w-full bg-[var(--surface)] border border-[var(--border)] rounded-md p-5 shadow-lg text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">Caja Diaria Cerrada</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">
                        Ingresá el cambio inicial en efectivo para comenzar a registrar ventas del turno.
                    </p>

                    <div className="mb-4 text-left">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                            Monto Inicial en Efectivo:
                        </label>
                        <input
                            type="number"
                            value={initialCashInput}
                            onChange={(e) => setInitialCashInput(e.target.value)}
                            placeholder="$ 0.00"
                            className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-base text-[var(--text-primary)]"
                        />
                    </div>

                    <button
                        type="button"
                        disabled={isOpening}
                        onClick={handleOpenRegister}
                        className="w-full py-3 bg-[var(--primary)] hover:opacity-95 disabled:opacity-50 text-white font-bold text-sm rounded-md shadow-md transition-transform active:scale-98"
                    >
                        {isOpening ? "Abriendo Caja..." : "Abrir Turno de Caja"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-4 pb-24 space-y-4">
            {/* Header & Status */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Caja Diaria</h2>
                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Turno Abierto · {new Date(register.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(true)}
                    className="px-3 py-1.5 bg-[var(--surface-accent)] hover:border-[var(--primary)] border border-[var(--border)] text-xs font-semibold rounded-md shadow-xs"
                >
                    + Movimiento
                </button>
            </div>

            {/* Estimated Cash In Drawer (Primary Stat) */}
            <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-md text-center">
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">
                    Efectivo Estimado en Cajón
                </p>
                <p className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatCurrency(summary.estimatedCashInDrawer)}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-[var(--text-secondary)]">
                    <span>Inicial: {formatCurrency(summary.initialCash)}</span>
                    <span>•</span>
                    <span>Ventas Ef.: {formatCurrency(summary.salesCash)}</span>
                    {summary.totalExpenses > 0 && (
                        <>
                            <span>•</span>
                            <span className="text-rose-400">Gastos: -{formatCurrency(summary.totalExpenses)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Total Today Sales Breakdown */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Total Facturado Hoy</span>
                    <span className="text-sm font-bold font-mono text-[var(--primary)]">
                        {formatCurrency(summary.totalSales)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-[var(--surface-accent)]/60 rounded-md">
                        <span className="text-[10px] text-[var(--text-secondary)] block">Efectivo</span>
                        <span className="font-bold font-mono text-[var(--text-primary)]">
                            {formatCurrency(summary.salesCash)}
                        </span>
                    </div>

                    <div className="p-2.5 bg-[var(--surface-accent)]/60 rounded-md">
                        <span className="text-[10px] text-[var(--text-secondary)] block">Mercado Pago / Transf.</span>
                        <span className="font-bold font-mono text-[var(--text-primary)]">
                            {formatCurrency(summary.salesTransfer)}
                        </span>
                    </div>

                    <div className="p-2.5 bg-[var(--surface-accent)]/60 rounded-md">
                        <span className="text-[10px] text-[var(--text-secondary)] block">Tarjetas Débito/Crédito</span>
                        <span className="font-bold font-mono text-[var(--text-primary)]">
                            {formatCurrency(summary.salesCard)}
                        </span>
                    </div>

                    <div className="p-2.5 bg-[var(--surface-accent)]/60 rounded-md">
                        <span className="text-[10px] text-[var(--text-secondary)] block">A Cuenta (Fiado)</span>
                        <span className="font-bold font-mono text-amber-400">
                            {formatCurrency(summary.salesDebt)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Close Register Action Button */}
            <button
                type="button"
                onClick={() => setIsCloseModalOpen(true)}
                className="w-full py-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-bold text-xs rounded-md shadow-xs transition-colors"
            >
                Cerrar Caja Diaria (Fin de Turno)
            </button>

            {/* Close Register Confirmation Modal */}
            {isCloseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-md p-5 shadow-2xl">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1">Cierre de Caja Diaria</h4>
                        <p className="text-xs text-[var(--text-secondary)] mb-4">
                            Al cerrar la caja se emitirá el resumen contable del día.
                        </p>

                        <div className="p-3 bg-[var(--surface-accent)] rounded-md mb-4 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Efectivo calculado en cajón:</span>
                                <span className="font-bold font-mono">{formatCurrency(summary.estimatedCashInDrawer)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total general del día:</span>
                                <span className="font-bold font-mono">{formatCurrency(summary.totalSales)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={isClosing}
                                onClick={handleCloseRegister}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-md"
                            >
                                {isClosing ? "Cerrando..." : "Confirmar Cierre"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCloseModalOpen(false)}
                                className="px-3 py-2.5 bg-[var(--surface-accent)] border border-[var(--border)] text-xs rounded-md"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash In / Expense Modal */}
            {isMovementModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 shadow-xl">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3">Movimiento de Caja</h4>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setMovementType("expense")}
                                className={`py-1.5 text-xs font-semibold rounded-md border ${
                                    movementType === "expense"
                                        ? "bg-rose-600 text-white border-rose-600"
                                        : "bg-[var(--surface-accent)] border-[var(--border)]"
                                }`}
                            >
                                Retiro / Gasto
                            </button>
                            <button
                                type="button"
                                onClick={() => setMovementType("income")}
                                className={`py-1.5 text-xs font-semibold rounded-md border ${
                                    movementType === "income"
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-[var(--surface-accent)] border-[var(--border)]"
                                }`}
                            >
                                Ingreso
                            </button>
                        </div>

                        <div className="space-y-2 mb-4">
                            <input
                                type="number"
                                autoFocus
                                value={movementAmount}
                                onChange={(e) => setMovementAmount(e.target.value)}
                                placeholder="Monto $ 0.00"
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm text-[var(--text-primary)]"
                            />
                            <input
                                type="text"
                                value={movementDescription}
                                onChange={(e) => setMovementDescription(e.target.value)}
                                placeholder="Motivo (ej: Compra de hielo, cambio)"
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)]"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={isSubmittingMovement}
                                onClick={handleCreateMovement}
                                className="flex-1 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md"
                            >
                                Guardar
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMovementModalOpen(false)}
                                className="px-3 py-2 bg-[var(--surface-accent)] border border-[var(--border)] text-xs rounded-md"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SimpleCashRegister;

