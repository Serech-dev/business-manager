import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { formatCurrency } from "../../utils/formatCurrency";
import {
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
} from "../../services/business";

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
    const [globalDebtLimit, setGlobalDebtLimit] = useState("");

    const [cardSurchargeEnabled, setCardSurchargeEnabled] = useState(false);
    const [cardSurchargeType, setCardSurchargeType] = useState("percentage");
    const [cardSurchargeValue, setCardSurchargeValue] = useState("10");

    // Bank accounts state
    const [bankAccounts, setBankAccounts] = useState([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [isBankFormOpen, setIsBankFormOpen] = useState(false);
    const [editingBankId, setEditingBankId] = useState(null);
    const [bankName, setBankName] = useState("");
    const [bankType, setBankType] = useState("virtual_wallet");
    const [bankIsDefault, setBankIsDefault] = useState(false);
    const [bankCbuCvu, setBankCbuCvu] = useState("");
    const [bankAlias, setBankAlias] = useState("");
    const [bankNotes, setBankNotes] = useState("");
    const [isSavingBank, setIsSavingBank] = useState(false);

    const loadBanks = async () => {
        setIsLoadingBanks(true);
        try {
            const data = await getBankAccounts();
            setBankAccounts(data);
        } catch (err) {
            console.error("Error loading bank accounts:", err);
            toast.error("No se pudieron cargar las cuentas bancarias.");
        } finally {
            setIsLoadingBanks(false);
        }
    };

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
            setGlobalDebtLimit(
                settings.global_debt_limit !== null && settings.global_debt_limit !== undefined
                    ? String(Math.round(Number(settings.global_debt_limit)))
                    : ""
            );
            setCardSurchargeEnabled(Boolean(settings.card_surcharge_enabled));
            setCardSurchargeType(settings.card_surcharge_type || "percentage");
            setCardSurchargeValue(settings.card_surcharge_value ? String(Math.round(Number(settings.card_surcharge_value))) : "10");
        }
        if (isOpen) {
            loadBanks();
        }
    }, [settings, isOpen]);

    const handleOpenNewBankForm = () => {
        setEditingBankId(null);
        setBankName("");
        setBankType("virtual_wallet");
        setBankIsDefault(bankAccounts.length === 0);
        setBankCbuCvu("");
        setBankAlias("");
        setBankNotes("");
        setIsBankFormOpen(true);
    };

    const handleEditBank = (bank) => {
        setEditingBankId(bank.id);
        setBankName(bank.name);
        setBankType(bank.account_type);
        setBankIsDefault(bank.is_default);
        setBankCbuCvu(bank.cbu_cvu || "");
        setBankAlias(bank.alias || "");
        setBankNotes(bank.notes || "");
        setIsBankFormOpen(true);
    };

    const handleSaveBank = async (e) => {
        e.preventDefault();
        if (!bankName.trim()) {
            toast.error("Ingresá un nombre para la cuenta o billetera.");
            return;
        }

        setIsSavingBank(true);
        try {
            const payload = {
                name: bankName.trim(),
                account_type: bankType,
                is_default: bankIsDefault,
                cbu_cvu: bankCbuCvu.trim(),
                alias: bankAlias.trim(),
                notes: bankNotes.trim(),
            };

            if (editingBankId) {
                await updateBankAccount(editingBankId, payload);
                toast.success("Cuenta bancaria actualizada.");
            } else {
                await createBankAccount(payload);
                toast.success("Cuenta bancaria registrada.");
            }
            setIsBankFormOpen(false);
            loadBanks();
        } catch (error) {
            console.error("Error guardando cuenta bancaria:", error);
            toast.error("No se pudo guardar la cuenta bancaria.");
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleDeleteBank = async (id, name) => {
        if (!window.confirm(`¿Estás seguro de eliminar la cuenta "${name}"?`)) {
            return;
        }

        try {
            await deleteBankAccount(id);
            toast.success("Cuenta bancaria eliminada.");
            loadBanks();
        } catch (error) {
            console.error("Error eliminando cuenta bancaria:", error);
            toast.error("No se pudo eliminar la cuenta bancaria.");
        }
    };

    const handleSetDefaultBank = async (id) => {
        try {
            await setDefaultBankAccount(id);
            toast.success("Cuenta predeterminada actualizada.");
            loadBanks();
        } catch (error) {
            console.error("Error al establecer cuenta predeterminada:", error);
            toast.error("No se pudo actualizar la cuenta predeterminada.");
        }
    };

    if (!isOpen) return null;

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
                global_debt_limit: globalDebtLimit.trim() === "" ? null : globalDebtLimit.trim(),
                card_surcharge_enabled: cardSurchargeEnabled,
                card_surcharge_type: cardSurchargeType,
                card_surcharge_value: cardSurchargeValue,
            });
            onClose();
        } catch {
            // Handled in context
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">Configuración del Comercio</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Personalizá datos, comisiones, cuentas y recargos</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* TABS (3 CONSOLIDATED TABS) */}
                <div className="flex border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0 relative z-10">
                    {[
                        { id: "general", label: "Datos del Comercio" },
                        { id: "fees", label: "Comisiones y Recargos" },
                        { id: "banks", label: "Cuentas y Billeteras" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition -mb-px ${
                                activeTab === tab.id
                                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* FORM BODY */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 relative">
                    {/* TAB 1: GENERAL */}
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
                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
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
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
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
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
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
                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: FEES & SURCHARGES (CONSOLIDATED) */}
                    {activeTab === "fees" && (
                        <div className="space-y-5 text-xs">
                            {/* SECTION 1: COMISIONES DE SERVICIOS */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Comisiones de Servicios Virtuales
                                    </h3>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                        Ganancia sugerida al operar con cambio de dinero o recargas.
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    {/* EXCHANGE */}
                                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Cambio de Dinero
                                                </span>
                                                <span className="rounded bg-sky-500/15 px-1.5 py-0.2 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                                    Virtual a Efectivo
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Comisión por entregar efectivo y recibir transferencia.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative">
                                                <select
                                                    value={exchangeFeeType}
                                                    onChange={(e) => setExchangeFeeType(e.target.value)}
                                                    className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2 pr-6 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
                                                >
                                                    <option value="percentage">Porcentaje (%)</option>
                                                    <option value="fixed">Monto Fijo ($)</option>
                                                </select>
                                                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </div>
                                            <div className="relative w-24">
                                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                    {exchangeFeeType === "percentage" ? "%" : "$"}
                                                </span>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={exchangeFeeValue}
                                                    onChange={(e) => setExchangeFeeValue(e.target.value)}
                                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1.5 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* PHONE */}
                                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Carga de Celular
                                                </span>
                                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    Telefonía
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Comisión aplicada sobre recargas telefónicas.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative">
                                                <select
                                                    value={phoneFeeType}
                                                    onChange={(e) => setPhoneFeeType(e.target.value)}
                                                    className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2 pr-6 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
                                                >
                                                    <option value="percentage">Porcentaje (%)</option>
                                                    <option value="fixed">Monto Fijo ($)</option>
                                                </select>
                                                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </div>
                                            <div className="relative w-24">
                                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                    {phoneFeeType === "percentage" ? "%" : "$"}
                                                </span>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={phoneFeeValue}
                                                    onChange={(e) => setPhoneFeeValue(e.target.value)}
                                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1.5 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SUBE */}
                                    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Carga de Tarjeta SUBE
                                                </span>
                                                <span className="rounded bg-cyan-500/15 px-1.5 py-0.2 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                                    Transporte
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Comisión aplicada al cargar saldo en transporte.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative">
                                                <select
                                                    value={subeFeeType}
                                                    onChange={(e) => setSubeFeeType(e.target.value)}
                                                    className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2 pr-6 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
                                                >
                                                    <option value="percentage">Porcentaje (%)</option>
                                                    <option value="fixed">Monto Fijo ($)</option>
                                                </select>
                                                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </div>
                                            <div className="relative w-24">
                                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                    {subeFeeType === "percentage" ? "%" : "$"}
                                                </span>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={subeFeeValue}
                                                    onChange={(e) => setSubeFeeValue(e.target.value)}
                                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1.5 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: RECARGO POR COBRO CON TARJETA */}
                            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                                <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Recargo por Cobro con Tarjeta
                                                </span>
                                                <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                    Débito / Crédito
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Incremento sugerido automático al seleccionar medio de pago tarjeta en el checkout.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setCardSurchargeEnabled(!cardSurchargeEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                cardSurchargeEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    cardSurchargeEnabled ? "translate-x-4" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {cardSurchargeEnabled ? (
                                        <div className="pt-2.5 border-t border-[var(--border)] space-y-2.5 animate-in fade-in duration-150">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs text-[var(--text-secondary)]">Recargo:</span>
                                                <div className="relative">
                                                    <select
                                                        value={cardSurchargeType}
                                                        onChange={(e) => setCardSurchargeType(e.target.value)}
                                                        className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2 pr-6 py-1 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
                                                    >
                                                        <option value="percentage">Porcentaje (+%)</option>
                                                        <option value="fixed">Monto Fijo (+$)</option>
                                                    </select>
                                                    <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                </div>
                                                <div className="relative w-24">
                                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                        {cardSurchargeType === "percentage" ? "%" : "$"}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={cardSurchargeValue}
                                                        onChange={(e) => setCardSurchargeValue(e.target.value)}
                                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-[var(--primary)]">
                                                    {cardSurchargeType === "percentage" ? `+${cardSurchargeValue || "0"}%` : `+$${cardSurchargeValue || "0"}`}
                                                </span>
                                            </div>

                                            {/* Preview banner */}
                                            <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5 text-xs text-sky-700 dark:text-sky-300">
                                                <span className="font-semibold block text-[11px] mb-0.5">Ejemplo en caja:</span>
                                                <p className="text-[11px] text-[var(--text-secondary)]">
                                                    Una venta de $10.000 sugerirá cobrar{" "}
                                                    <strong className="text-[var(--text-primary)] font-bold">
                                                        {cardSurchargeType === "percentage"
                                                            ? `$${(10000 + Math.round(10000 * ((Number(cardSurchargeValue) || 0) / 100))).toLocaleString("es-AR")}`
                                                            : `$${(10000 + Math.round(Number(cardSurchargeValue) || 0)).toLocaleString("es-AR")}`}
                                                    </strong>.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-[var(--text-secondary)] italic">
                                            Desactivado. Las ventas con tarjeta se cobran por el importe estándar sin recargo.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 3: RECARGO POR VENTA A CUENTA (FIADO) */}
                            <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                                <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Recargo por Venta a Cuenta
                                                </span>
                                                <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    Libreta / Fiado
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                Incremento sugerido al anotar una venta en la cuenta corriente del cliente.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setDebtSurchargeEnabled(!debtSurchargeEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                debtSurchargeEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    debtSurchargeEnabled ? "translate-x-4" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {debtSurchargeEnabled ? (
                                        <div className="pt-2.5 border-t border-[var(--border)] space-y-2 animate-in fade-in duration-150">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs text-[var(--text-secondary)]">Recargo:</span>
                                                <div className="relative">
                                                    <select
                                                        value={debtSurchargeType}
                                                        onChange={(e) => setDebtSurchargeType(e.target.value)}
                                                        className="appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] pl-2 pr-6 py-1 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
                                                    >
                                                        <option value="percentage">Porcentaje (+%)</option>
                                                        <option value="fixed">Monto Fijo (+$)</option>
                                                    </select>
                                                    <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                </div>
                                                <div className="relative w-24">
                                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                        {debtSurchargeType === "percentage" ? "%" : "$"}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={debtSurchargeValue}
                                                        onChange={(e) => setDebtSurchargeValue(e.target.value)}
                                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-5 pr-2 py-1 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-[var(--primary)]">
                                                    {debtSurchargeType === "percentage" ? `+${debtSurchargeValue || "0"}%` : `+$${debtSurchargeValue || "0"}`}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-[var(--text-secondary)] italic">
                                            Desactivado. Las ventas fiadas se registran por el importe normal sin recargo.
                                        </p>
                                    )}

                                    {/* LÍMITE GENERAL DE FIADO */}
                                    <div className="pt-2.5 border-t border-[var(--border)] space-y-1.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <span className="font-bold text-[var(--text-primary)] text-xs">
                                                    Límite de Fiado General
                                                </span>
                                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                    Monto máximo total que cualquier cliente puede adeudar. Podés configurar límites personalizados por cliente desde su perfil.
                                                </p>
                                            </div>
                                            <div className="relative w-32 shrink-0">
                                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                                    $
                                                </span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    placeholder="Sin límite"
                                                    value={globalDebtLimit}
                                                    onChange={(e) => setGlobalDebtLimit(e.target.value)}
                                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-6 pr-2 py-1 text-xs font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                />
                                            </div>
                                        </div>
                                        {Number(globalDebtLimit) > 0 && (
                                            <p className="text-[10px] text-[var(--primary)] font-semibold">
                                                Tope por defecto: {formatCurrency(Number(globalDebtLimit))} por cliente.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: BANK ACCOUNTS & WALLETS */}
                    {activeTab === "banks" && (
                        <div className="space-y-4 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                                        Cuentas Bancarias y Billeteras Virtuales
                                    </h3>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                        Registrá Mercado Pago, Cuenta DNI o bancos para ordenar y controlar los ingresos y egresos digitales.
                                    </p>
                                </div>

                                {!isBankFormOpen && (
                                    <button
                                        type="button"
                                        onClick={handleOpenNewBankForm}
                                        className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-md shadow-xs hover:bg-[var(--primary-hover)] transition"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Nueva Cuenta
                                    </button>
                                )}
                            </div>

                            {/* BANK FORM (NEW / EDIT) */}
                            {isBankFormOpen ? (
                                <div className="rounded-md border border-[var(--primary)]/30 bg-[var(--surface-accent)]/30 p-4 space-y-3.5 animate-fadeIn">
                                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                                        <span className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                                            {editingBankId ? "Editar Cuenta / Billetera" : "Nueva Cuenta / Billetera"}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsBankFormOpen(false)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Cancelar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                Nombre de la Cuenta / Billetera *
                                            </label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                                placeholder="Ej: Mercado Pago, Cuenta DNI, Banco Galicia"
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                Tipo de Cuenta
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={bankType}
                                                    onChange={(e) => setBankType(e.target.value)}
                                                    className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 pr-8 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                                >
                                                    <option value="virtual_wallet">Billetera Virtual (MP, Cuenta DNI, Ualá)</option>
                                                    <option value="bank">Cuenta Bancaria (Galicia, Santander, etc.)</option>
                                                </select>
                                                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                Alias (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={bankAlias}
                                                onChange={(e) => setBankAlias(e.target.value)}
                                                placeholder="Ej: kiosco.central.mp"
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                                CBU / CVU (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={bankCbuCvu}
                                                onChange={(e) => setBankCbuCvu(e.target.value)}
                                                placeholder="22 dígitos"
                                                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setBankIsDefault(!bankIsDefault)}
                                            className={`h-4 w-4 rounded flex items-center justify-center border transition ${
                                                bankIsDefault ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--background)]"
                                            }`}
                                        >
                                            {bankIsDefault && (
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                            )}
                                        </button>
                                        <label
                                            onClick={() => setBankIsDefault(!bankIsDefault)}
                                            className="text-xs text-[var(--text-primary)] cursor-pointer select-none font-medium"
                                        >
                                            Establecer como cuenta principal por defecto
                                        </label>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                        <button
                                            type="button"
                                            onClick={() => setIsBankFormOpen(false)}
                                            className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveBank}
                                            disabled={isSavingBank}
                                            className="px-4 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] disabled:opacity-50"
                                        >
                                            {isSavingBank ? "Guardando..." : "Guardar Cuenta"}
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {/* BANK ACCOUNTS LIST */}
                            {isLoadingBanks ? (
                                <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                                    Cargando cuentas...
                                </div>
                            ) : bankAccounts.length === 0 && !isBankFormOpen ? (
                                <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center space-y-2">
                                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-[var(--surface-accent)] text-[var(--text-secondary)]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                                        </svg>
                                    </div>
                                    <p className="font-bold text-xs text-[var(--text-primary)]">
                                        No tenés cuentas o billeteras configuradas
                                    </p>
                                    <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                                        Agregá tus cuentas (Mercado Pago, Cuenta DNI, etc.) para separar y llevar el control del dinero digital en cada turno.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {bankAccounts.map((bank) => (
                                        <div
                                            key={bank.id}
                                            className={`flex items-center justify-between p-3 rounded-md border transition ${
                                                bank.is_default
                                                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/5"
                                                    : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                                                    bank.account_type === "virtual_wallet"
                                                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                                                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                }`}>
                                                    {bank.account_type === "virtual_wallet" ? (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-[var(--text-primary)]">
                                                            {bank.name}
                                                        </span>
                                                        {bank.is_default && (
                                                            <span className="rounded bg-[var(--primary)] px-1.5 py-0.2 text-[10px] font-bold text-white">
                                                                Principal
                                                            </span>
                                                        )}
                                                        <span className="rounded bg-[var(--surface-accent)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--text-secondary)]">
                                                            {bank.account_type_display || (bank.account_type === "virtual_wallet" ? "Billetera" : "Banco")}
                                                        </span>
                                                    </div>

                                                    {(bank.alias || bank.cbu_cvu) && (
                                                        <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                                                            {bank.alias && `Alias: ${bank.alias}`}
                                                            {bank.alias && bank.cbu_cvu && " · "}
                                                            {bank.cbu_cvu && `CBU: ${bank.cbu_cvu}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {!bank.is_default && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefaultBank(bank)}
                                                        className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-secondary)] transition"
                                                    >
                                                        Hacer principal
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleEditBank(bank)}
                                                    className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition"
                                                    title="Editar"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                    </svg>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBank(bank.id)}
                                                    className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                                    title="Eliminar"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOOTER ACTIONS */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
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

