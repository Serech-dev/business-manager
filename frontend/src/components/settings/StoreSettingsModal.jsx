import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function StoreSettingsModal({ isOpen, onClose }) {
    const { settings, updateSettings } = useStoreSettings();

    const [activeTab, setActiveTab] = useState("general");
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [storeName, setStoreName] = useState("");
    const [storeAddress, setStoreAddress] = useState("");
    const [storePhone, setStorePhone] = useState("");
    const [ticketFooter, setTicketFooter] = useState("");

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
    }, [settings, isOpen]);

    const token = localStorage.getItem("businessManagerAuthToken");
    if (!token || !isOpen) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateSettings({
                store_name: storeName.trim() || "Mi Negocio",
                store_address: storeAddress.trim(),
                store_phone: storePhone.trim(),
                ticket_footer: ticketFooter.trim() || "¡Gracias por su compra!",
                exchange_fee_type: exchangeFeeType,
                exchange_fee_value: exchangeFeeValue,
                phone_fee_type: phoneFeeType,
                phone_fee_value: phoneFeeValue,
                sube_fee_type: subeFeeType,
                sube_fee_value: subeFeeValue,
                debt_surcharge_enabled: debtSurchargeEnabled,
                debt_surcharge_type: debtSurchargeType,
                debt_surcharge_value: debtSurchargeValue,
            });
            onClose();
        } catch {
            // Handled in context
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Configuración del Comercio</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Personalizá nombre, comisiones y recargos</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 pt-2">
                    {[
                        { id: "general", label: "Datos del Comercio" },
                        { id: "services", label: "Comisiones de Servicios" },
                        { id: "debt", label: "Venta a Cuenta (Fiado)" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                                activeTab === tab.id
                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* FORM BODY */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* TAB: GENERAL */}
                    {activeTab === "general" && (
                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                    Nombre del Negocio *
                                </label>
                                <input
                                    type="text"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    placeholder="Ej: Kiosco Central"
                                    required
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                                <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                                    Se imprime en los tickets térmicos y se muestra en la barra lateral.
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                        Dirección del Local
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
                                        Teléfono de Contacto
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
                                    Mensaje al pie del Ticket
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
                    )}

                    {/* TAB: SERVICES */}
                    {activeTab === "services" && (
                        <div className="space-y-4 text-xs">
                            {/* EXCHANGE */}
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[var(--text-primary)] text-sm">
                                        Cambio de Dinero (Virtual a Efectivo)
                                    </span>
                                    <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                        Comisión
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
                                        {exchangeFeeType === "percentage" ? "% del monto transferido" : "$ fijos por operación"}
                                    </span>
                                </div>
                            </div>

                            {/* PHONE */}
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[var(--text-primary)] text-sm">
                                        Carga de Celular
                                    </span>
                                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        Comisión
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
                                        {phoneFeeType === "percentage" ? "% de comisión" : "$ fijos"}
                                    </span>
                                </div>
                            </div>

                            {/* SUBE */}
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[var(--text-primary)] text-sm">
                                        Carga de Tarjeta SUBE
                                    </span>
                                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                        Comisión
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
                                        {subeFeeType === "percentage" ? "% de comisión" : "$ fijos"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: DEBT / FIADO */}
                    {activeTab === "debt" && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-4 text-xs">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-[var(--text-primary)] text-sm">
                                        Recargo automático al vender Fiado
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                        Aplica un incremento sugerido cuando se anota una venta en la libreta.
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
                                            {debtSurchargeType === "percentage" ? `+${debtSurchargeValue || "0"}% sobre el importe` : `+$${debtSurchargeValue || "0"} fijos por venta`}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-2 text-[11px] text-[var(--text-secondary)] italic">
                                    Sin recargo. Las ventas a cuenta se registrarán por el monto normal.
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOOTER ACTIONS */}
                    <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-bold text-white shadow hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
                        >
                            {isSaving ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StoreSettingsModal;

