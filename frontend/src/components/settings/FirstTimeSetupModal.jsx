import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function FirstTimeSetupModal() {
    const { settings, updateSettings, isSetupWizardOpen, closeSetupWizard } = useStoreSettings();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [storeName, setStoreName] = useState("Mi Negocio");
    const [storeAddress, setStoreAddress] = useState("");
    const [storePhone, setStorePhone] = useState("");
    const [ticketFooter, setTicketFooter] = useState("¡Gracias por su compra!");

    const [exchangeFeeType, setExchangeFeeType] = useState("percentage");
    const [exchangeFeeValue, setExchangeFeeValue] = useState("10");

    const [phoneFeeType, setPhoneFeeType] = useState("percentage");
    const [phoneFeeValue, setPhoneFeeValue] = useState("10");

    const [subeFeeType, setSubeFeeType] = useState("percentage");
    const [subeFeeValue, setSubeFeeValue] = useState("10");

    const [debtSurchargeEnabled, setDebtSurchargeEnabled] = useState(false);
    const [debtSurchargeType, setDebtSurchargeType] = useState("percentage");
    const [debtSurchargeValue, setDebtSurchargeValue] = useState("10");

    useEffect(() => {
        if (settings) {
            setStoreName(settings.store_name || "Mi Negocio");
            setStoreAddress(settings.store_address || "");
            setStorePhone(settings.store_phone || "");
            setTicketFooter(settings.ticket_footer || "¡Gracias por su compra!");
            setExchangeFeeType(settings.exchange_fee_type || "percentage");
            setExchangeFeeValue(settings.exchange_fee_value ? String(Math.round(Number(settings.exchange_fee_value))) : "10");
            setPhoneFeeType(settings.phone_fee_type || "percentage");
            setPhoneFeeValue(settings.phone_fee_value ? String(Math.round(Number(settings.phone_fee_value))) : "10");
            setSubeFeeType(settings.sube_fee_type || "percentage");
            setSubeFeeValue(settings.sube_fee_value ? String(Math.round(Number(settings.sube_fee_value))) : "10");
            setDebtSurchargeEnabled(Boolean(settings.debt_surcharge_enabled));
            setDebtSurchargeType(settings.debt_surcharge_type || "percentage");
            setDebtSurchargeValue(settings.debt_surcharge_value ? String(Math.round(Number(settings.debt_surcharge_value))) : "10");
        }
    }, [settings]);

    if (!isSetupWizardOpen) return null;

    async function handleSave(skip = false) {
        setIsSaving(true);
        try {
            await updateSettings(
                {
                    store_name: skip ? "Mi Negocio" : (storeName.trim() || "Mi Negocio"),
                    store_address: skip ? "" : storeAddress.trim(),
                    store_phone: skip ? "" : storePhone.trim(),
                    ticket_footer: skip ? "¡Gracias por su compra!" : (ticketFooter.trim() || "¡Gracias por su compra!"),
                    exchange_fee_type: exchangeFeeType,
                    exchange_fee_value: exchangeFeeValue,
                    phone_fee_type: phoneFeeType,
                    phone_fee_value: phoneFeeValue,
                    sube_fee_type: subeFeeType,
                    sube_fee_value: subeFeeValue,
                    debt_surcharge_enabled: debtSurchargeEnabled,
                    debt_surcharge_type: debtSurchargeType,
                    debt_surcharge_value: debtSurchargeValue,
                    is_setup_completed: true,
                },
                { silent: true }
            );
            if (!skip) {
                toast.success("¡Bienvenido a Business Manager! Tu comercio está listo.");
            }
            closeSetupWizard();
        } catch {
            // Error handled in context
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="border-b border-[var(--border)] px-6 py-5 bg-[var(--surface-accent)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm font-black text-base">
                                ✦
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                    Configuración Inicial de tu Comercio
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Paso {step} de 3 · Ajustá el sistema a la medida de tu local
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                        >
                            Omitir por ahora
                        </button>
                    </div>

                    {/* STEP PROGRESS BAR */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                            { num: 1, label: "Identidad" },
                            { num: 2, label: "Comisiones" },
                            { num: 3, label: "Fiado" },
                        ].map((s) => (
                            <div
                                key={s.num}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    step >= s.num ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* CONTENT PER STEP */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* STEP 1: STORE IDENTITY */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    1. Nombre y datos de tu Comercio
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Este nombre se mostrará en el menú, barra lateral y en el encabezado de los tickets térmicos.
                                </p>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                        Nombre del Negocio / Fantasía *
                                    </label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        placeholder="Ej: Kiosco Don Juan / Almacén Los Amigos"
                                        required
                                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                            Dirección del local (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={storeAddress}
                                            onChange={(e) => setStoreAddress(e.target.value)}
                                            placeholder="Ej: Av. San Martín 1420"
                                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                            Teléfono / WhatsApp (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={storePhone}
                                            onChange={(e) => setStorePhone(e.target.value)}
                                            placeholder="Ej: 11-4567-8900"
                                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                        Mensaje al pie de Ticket
                                    </label>
                                    <input
                                        type="text"
                                        value={ticketFooter}
                                        onChange={(e) => setTicketFooter(e.target.value)}
                                        placeholder="¡Gracias por su compra!"
                                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SERVICE COMMISSIONS (EXCHANGE, SUBE, PHONE) */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    2. Comisiones por Servicios
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Establecé las ganancias automáticas para cambio de dinero y cargas virtuales.
                                </p>
                            </div>

                            <div className="space-y-3.5 text-xs">
                                {/* EXCHANGE */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[var(--text-primary)]">
                                            Cambio de Dinero (Virtual a Efectivo)
                                        </span>
                                        <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                            Recomendado 10%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={exchangeFeeType}
                                            onChange={(e) => setExchangeFeeType(e.target.value)}
                                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="percentage">Porcentaje (%)</option>
                                            <option value="fixed">Monto Fijo ($)</option>
                                        </select>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={exchangeFeeValue}
                                            onChange={(e) => setExchangeFeeValue(e.target.value)}
                                            className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {exchangeFeeType === "percentage" ? "% del monto transferido" : "$ por operación"}
                                        </span>
                                    </div>
                                </div>

                                {/* PHONE RECHARGE */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[var(--text-primary)]">
                                            Recarga de Celular
                                        </span>
                                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            Comisión / Ganancia
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={phoneFeeType}
                                            onChange={(e) => setPhoneFeeType(e.target.value)}
                                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="percentage">Porcentaje (%)</option>
                                            <option value="fixed">Monto Fijo ($)</option>
                                        </select>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={phoneFeeValue}
                                            onChange={(e) => setPhoneFeeValue(e.target.value)}
                                            className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {phoneFeeType === "percentage" ? "% de comisión" : "$ fijo por carga"}
                                        </span>
                                    </div>
                                </div>

                                {/* SUBE */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[var(--text-primary)]">
                                            Carga de Tarjeta SUBE
                                        </span>
                                        <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                            Comisión / Ganancia
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={subeFeeType}
                                            onChange={(e) => setSubeFeeType(e.target.value)}
                                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="percentage">Porcentaje (%)</option>
                                            <option value="fixed">Monto Fijo ($)</option>
                                        </select>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={subeFeeValue}
                                            onChange={(e) => setSubeFeeValue(e.target.value)}
                                            className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                        />
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {subeFeeType === "percentage" ? "% de comisión" : "$ fijo por carga"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DEBT / TAB SURCHARGE */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    3. Ventas a Cuenta Corriente (Fiado)
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    ¿Tu comercio aplica un recargo por financiar o anotar en la libreta?
                                </p>
                            </div>

                            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-4 text-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)] text-sm">
                                            Recargo automático en Fiado
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                            Al elegir "Fiado" en una venta, sugerirá el total con este incremento.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setDebtSurchargeEnabled(!debtSurchargeEnabled)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            debtSurchargeEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                debtSurchargeEnabled ? "translate-x-5" : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                </div>

                                {debtSurchargeEnabled ? (
                                    <div className="pt-3 border-t border-[var(--border)] space-y-2 animate-in fade-in duration-150">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                            Valor del Recargo por Fiado
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={debtSurchargeType}
                                                onChange={(e) => setDebtSurchargeType(e.target.value)}
                                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            >
                                                <option value="percentage">Porcentaje (+%)</option>
                                                <option value="fixed">Monto Fijo (+$)</option>
                                            </select>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={debtSurchargeValue}
                                                onChange={(e) => setDebtSurchargeValue(e.target.value)}
                                                className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                            <span className="text-xs font-bold text-[var(--primary)]">
                                                {debtSurchargeType === "percentage" ? `+${debtSurchargeValue || "0"}% sobre la venta` : `+$${debtSurchargeValue || "0"} monto adicional`}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2 text-[11px] text-[var(--text-secondary)] italic">
                                        Sin recargo. Las ventas a cuenta se anotarán por el importe exacto de los productos.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER BUTTONS */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                        >
                            ← Anterior
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
                        >
                            Siguiente →
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="rounded-xl bg-[var(--success)] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition"
                        >
                            {isSaving ? "Guardando..." : "Finalizar y Comenzar"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FirstTimeSetupModal;

