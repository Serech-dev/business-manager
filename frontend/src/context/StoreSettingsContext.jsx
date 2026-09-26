import { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getStoreSettings, updateStoreSettings } from "../services/business";
import { roundUpTo50 } from "../utils/formatCurrency";

const StoreSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
    store_name: "Mi Negocio",
    store_address: "",
    store_phone: "",
    ticket_footer: "¡Gracias por su compra!",
    exchange_fee_type: "percentage",
    exchange_fee_value: "10",
    phone_fee_type: "percentage",
    phone_fee_value: "10",
    sube_fee_type: "percentage",
    sube_fee_value: "10",
    debt_surcharge_enabled: false,
    debt_surcharge_type: "percentage",
    debt_surcharge_value: "10",
    global_debt_limit: null,
    card_surcharge_enabled: false,
    card_surcharge_type: "percentage",
    card_surcharge_value: "10",
    is_setup_completed: false,
};

export function StoreSettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

    const token = localStorage.getItem("businessManagerAuthToken");

    const loadSettings = useCallback(async () => {
        const currentToken = localStorage.getItem("businessManagerAuthToken");
        if (!currentToken) {
            setSettings(DEFAULT_SETTINGS);
            setIsLoading(false);
            return;
        }

        try {
            const data = await getStoreSettings();
            setSettings(data);
            if (!data.is_setup_completed) {
                // Auto-prompt first time setup wizard if not completed
                setIsSetupWizardOpen(true);
            }
        } catch (error) {
            console.error("No se pudo cargar la configuración del comercio:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            loadSettings();
        } else {
            setIsLoading(false);
        }
    }, [token, loadSettings]);

    const updateSettings = useCallback(async (partialData, { silent = false } = {}) => {
        try {
            const cleanData = { ...partialData };
            if (cleanData.exchange_fee_value !== undefined) {
                cleanData.exchange_fee_value = String(Math.round(Number(cleanData.exchange_fee_value) || 0));
            }
            if (cleanData.phone_fee_value !== undefined) {
                cleanData.phone_fee_value = String(Math.round(Number(cleanData.phone_fee_value) || 0));
            }
            if (cleanData.sube_fee_value !== undefined) {
                cleanData.sube_fee_value = String(Math.round(Number(cleanData.sube_fee_value) || 0));
            }
            if (cleanData.debt_surcharge_value !== undefined) {
                cleanData.debt_surcharge_value = String(Math.round(Number(cleanData.debt_surcharge_value) || 0));
            }
            if (cleanData.global_debt_limit !== undefined) {
                cleanData.global_debt_limit =
                    cleanData.global_debt_limit === "" || cleanData.global_debt_limit === null
                        ? null
                        : String(Math.round(Number(cleanData.global_debt_limit) || 0));
            }
            if (cleanData.card_surcharge_value !== undefined) {
                cleanData.card_surcharge_value = String(Math.round(Number(cleanData.card_surcharge_value) || 0));
            }

            const updated = await updateStoreSettings(cleanData);
            setSettings(updated);
            if (!silent) {
                toast.success("Configuración del comercio guardada.");
            }
            return updated;
        } catch (error) {
            console.error("Error guardando configuración:", error);
            toast.error("No se pudo guardar la configuración.");
            throw error;
        }
    }, []);

    const calculateExchangeFee = useCallback(
        (amount, mode = "payout") => {
            const num = Number(amount) || 0;
            if (num <= 0) return { fee: 0, clientAmount: 0, totalToCharge: 0 };

            const feeValue = Number(settings.exchange_fee_value) || 0;
            let fee = 0;

            if (settings.exchange_fee_type === "percentage") {
                fee = roundUpTo50(num * (feeValue / 100));
            } else {
                fee = roundUpTo50(feeValue);
            }

            let clientAmount = 0;
            let totalToCharge = 0;

            if (mode === "received") {
                clientAmount = Math.max(0, num - fee);
                totalToCharge = num;
            } else {
                // "payout": amount entered is what the customer receives in cash
                clientAmount = num;
                totalToCharge = num + fee;
            }

            return { fee, clientAmount, totalToCharge };
        },
        [settings.exchange_fee_type, settings.exchange_fee_value]
    );

    const calculateSubeFee = useCallback(
        (rechargeAmount) => {
            const num = Number(rechargeAmount) || 0;
            if (num <= 0) return { fee: 0, totalToCharge: 0 };

            const feeValue = Number(settings.sube_fee_value) || 0;
            let fee = 0;

            if (settings.sube_fee_type === "percentage") {
                fee = roundUpTo50(num * (feeValue / 100));
            } else {
                fee = roundUpTo50(feeValue);
            }

            const totalToCharge = roundUpTo50(num + fee);
            return { fee, totalToCharge, rechargeAmount: num };
        },
        [settings.sube_fee_type, settings.sube_fee_value]
    );

    const calculatePhoneFee = useCallback(
        (rechargeAmount) => {
            const num = Number(rechargeAmount) || 0;
            if (num <= 0) return { fee: 0, totalToCharge: 0 };

            const feeValue = Number(settings.phone_fee_value) || 0;
            let fee = 0;

            if (settings.phone_fee_type === "percentage") {
                fee = roundUpTo50(num * (feeValue / 100));
            } else {
                fee = roundUpTo50(feeValue);
            }

            const totalToCharge = roundUpTo50(num + fee);
            return { fee, totalToCharge, rechargeAmount: num };
        },
        [settings.phone_fee_type, settings.phone_fee_value]
    );

    const calculateDebtSurcharge = useCallback(
        (amount) => {
            const num = Number(amount) || 0;
            if (!settings.debt_surcharge_enabled || num <= 0) {
                return { surcharge: 0, totalWithSurcharge: num, isEnabled: false };
            }

            const surchargeValue = Number(settings.debt_surcharge_value) || 0;
            let surcharge = 0;

            if (settings.debt_surcharge_type === "percentage") {
                surcharge = roundUpTo50(num * (surchargeValue / 100));
            } else {
                surcharge = roundUpTo50(surchargeValue);
            }

            const totalWithSurcharge = roundUpTo50(num + surcharge);

            return {
                surcharge,
                totalWithSurcharge,
                isEnabled: true,
                type: settings.debt_surcharge_type,
                value: surchargeValue,
            };
        },
        [
            settings.debt_surcharge_enabled,
            settings.debt_surcharge_type,
            settings.debt_surcharge_value,
        ]
    );

    const calculateCardSurcharge = useCallback(
        (amount) => {
            const num = Number(amount) || 0;
            if (!settings.card_surcharge_enabled || num <= 0) {
                return { surcharge: 0, totalWithSurcharge: num, isEnabled: false };
            }

            const surchargeValue = Number(settings.card_surcharge_value) || 0;
            let surcharge = 0;

            if (settings.card_surcharge_type === "percentage") {
                surcharge = roundUpTo50(num * (surchargeValue / 100));
            } else {
                surcharge = roundUpTo50(surchargeValue);
            }

            const totalWithSurcharge = roundUpTo50(num + surcharge);

            return {
                surcharge,
                totalWithSurcharge,
                isEnabled: true,
                type: settings.card_surcharge_type,
                value: surchargeValue,
            };
        },
        [
            settings.card_surcharge_enabled,
            settings.card_surcharge_type,
            settings.card_surcharge_value,
        ]
    );

    const getClientDebtLimit = useCallback(
        (client) => {
            if (!client) return null;
            if (client.debt_limit !== undefined && client.debt_limit !== null && client.debt_limit !== "") {
                const limit = Number(client.debt_limit);
                return isNaN(limit) ? null : limit;
            }
            if (client.effective_debt_limit !== undefined && client.effective_debt_limit !== null) {
                const limit = Number(client.effective_debt_limit);
                return isNaN(limit) ? null : limit;
            }
            if (settings?.global_debt_limit !== undefined && settings?.global_debt_limit !== null && settings?.global_debt_limit !== "") {
                const limit = Number(settings.global_debt_limit);
                return isNaN(limit) ? null : limit;
            }
            return null;
        },
        [settings?.global_debt_limit]
    );

    const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
    const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

    const openSetupWizard = useCallback(() => setIsSetupWizardOpen(true), []);
    const closeSetupWizard = useCallback(() => setIsSetupWizardOpen(false), []);

    return (
        <StoreSettingsContext.Provider
            value={{
                settings,
                isLoading,
                updateSettings,
                calculateExchangeFee,
                calculateSubeFee,
                calculatePhoneFee,
                calculateDebtSurcharge,
                calculateCardSurcharge,
                getClientDebtLimit,
                isSettingsModalOpen,
                openSettingsModal,
                closeSettingsModal,
                isSetupWizardOpen,
                openSetupWizard,
                closeSetupWizard,
                loadSettings,
            }}
        >
            {children}
        </StoreSettingsContext.Provider>
    );
}

export function useStoreSettings() {
    const context = useContext(StoreSettingsContext);
    if (!context) {
        throw new Error("useStoreSettings must be used within a StoreSettingsProvider");
    }
    return context;
}

