import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OnboardingChecklist({
    register,
    transactionsCount = 0,
    onOpenRegister,
    onOpenGuide,
    onOpenChangePin,
}) {
    const navigate = useNavigate();
    const [isDismissed, setIsDismissed] = useState(true);

    useEffect(() => {
        const dismissed = localStorage.getItem("bm_hide_onboarding");
        if (!dismissed) {
            setIsDismissed(false);
        }
    }, []);

    function handleDismiss() {
        localStorage.setItem("bm_hide_onboarding", "true");
        setIsDismissed(true);
    }

    if (isDismissed) return null;

    const steps = [
        {
            id: "register",
            title: "1. Abrir tu primera caja",
            desc: "Iniciá el turno para empezar a registrar movimientos.",
            isDone: Boolean(register),
            actionLabel: "Abrir caja",
            onAction: onOpenRegister,
        },
        {
            id: "sale",
            title: "2. Registrar tu primera venta",
            desc: "Cobrá en efectivo, transferencia, tarjeta o fiado.",
            isDone: transactionsCount > 0,
            actionLabel: "+ Nueva venta",
            onAction: () => navigate("/transactions/new"),
        },
        {
            id: "client",
            title: "3. Cargar un cliente con saldo de libreta",
            desc: "Migrá deudas de cuaderno anotando el saldo inicial.",
            isDone: false, // actionable shortcut
            actionLabel: "+ Crear cliente",
            onAction: () => navigate("/clients/new"),
        },
        {
            id: "pin",
            title: "4. Configurar tu PIN de Dueño",
            desc: "Protegé la terminal de empleados con un PIN de 4 dígitos.",
            isDone: false, // actionable shortcut
            actionLabel: "Configurar PIN",
            onAction: onOpenChangePin,
        },
    ];

    const completedCount = steps.filter((s) => s.isDone).length;

    return (
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--surface)] p-5 shadow-xs space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                        ✓
                    </span>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Guía de Inicio Rápido
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Completá estos 4 pasos básicos para dominar tu negocio ({completedCount} de {steps.length})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <button
                        type="button"
                        onClick={onOpenGuide}
                        className="font-bold text-[var(--primary)] hover:underline"
                    >
                        Ver tutorial completo →
                    </button>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Ocultar esta guía"
                    >
                        ✕ Ocultar
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`
                            flex flex-col justify-between rounded-md border p-3.5 space-y-3 transition
                            ${
                                step.isDone
                                    ? "border-[var(--success-border)] bg-[var(--success-bg)]/20"
                                    : "border-[var(--border)] bg-[var(--surface-accent)]/40 hover:border-[var(--primary)]/50"
                            }
                        `}
                    >
                        <div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${step.isDone ? "text-[var(--success)]" : "text-[var(--text-primary)]"}`}>
                                    {step.title}
                                </span>
                                {step.isDone && (
                                    <span className="text-xs font-bold text-[var(--success)]">
                                        ✓ Hecho
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-tight">
                                {step.desc}
                            </p>
                        </div>

                        {!step.isDone && step.onAction && (
                            <button
                                type="button"
                                onClick={step.onAction}
                                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] py-1.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
                            >
                                {step.actionLabel}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OnboardingChecklist;
