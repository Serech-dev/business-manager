import { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getStoreSettings, updateStoreSettings } from "../services/business";

const StoreSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
    store_name: "Mi Negocio",
    store_address: "",
    store_phone: "",
    ticket_footer: "¡Gracias por su compra!",
    exchange_fee_type: "percentage",
    exchange_fee_value: "10.00",
    phone_fee_type: "percentage",
    phone_fee_value: "10.00",
    sube_fee_type: "percentage",
    sube_fee_value: "10.00",
    debt_surcharge_enabled: false,
    debt_surcharge_type: "percentage",
    debt_surcharge_value: "10.00",
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

    const updateSettings = useCallback(async (partialData) => {
        try {
            const updated = await updateStoreSettings(partialData);
            setSettings(updated);
            toast.success("Configuración del comercio guardada.");
            return updated;
        } catch (error) {
            console.error("Error guardando configuración:", error);
            toast.error("No se pudo guardar la configuración.");
            throw error;
        }
    }, []);

    const calculateExchangeFee = useCallback(
        (amount) => {
            const num = Number(amount) || 0;
            if (num <= 0) return { fee: 0, clientAmount: 0 };

            const feeValue = Number(settings.exchange_fee_value) || 0;
            let fee = 0;

            if (settings.exchange_fee_type === "percentage") {
                fee = Math.round(num * (feeValue / 100));
            } else {
                fee = Math.round(feeValue);
            }

            const clientAmount = Math.max(0, num - fee);
            return { fee, clientAmount };
        },
        [settings.exchange_fee_type, settings.exchange_fee_value]
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
                surcharge = Math.round(num * (surchargeValue / 100));
            } else {
                surcharge = Math.round(surchargeValue);
            }

            return {
                surcharge,
                totalWithSurcharge: num + surcharge,
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
                calculateDebtSurcharge,
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

