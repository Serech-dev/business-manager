import { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const DeviceSecurityContext = createContext(null);

const KIOSK_STORAGE_KEY = "bm_kiosk_device_mode";
const PIN_STORAGE_KEY = "bm_owner_pin";
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function DeviceSecurityProvider({ children }) {
    const [isKioskDevice, setIsKioskDevice] = useState(() => {
        return localStorage.getItem(KIOSK_STORAGE_KEY) === "true";
    });

    const [ownerPin, setOwnerPinState] = useState(() => {
        return localStorage.getItem(PIN_STORAGE_KEY) || "1234";
    });

    const [isUnlocked, setIsUnlocked] = useState(() => {
        // If not a Kiosk device, it's always unlocked
        const kiosk = localStorage.getItem(KIOSK_STORAGE_KEY) === "true";
        return !kiosk;
    });

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Auto-lock on inactivity if in Kiosk mode
    useEffect(() => {
        if (!isKioskDevice || !isUnlocked) return;

        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setIsUnlocked(false);
                toast("Modo Caja bloqueado por inactividad.");
            }, INACTIVITY_TIMEOUT_MS);
        };

        const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
        activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer));

        resetTimer();

        return () => {
            clearTimeout(timer);
            activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
        };
    }, [isKioskDevice, isUnlocked]);

    const lock = useCallback(() => {
        if (isKioskDevice) {
            setIsUnlocked(false);
            toast.success("Terminal bloqueada en Modo Caja.");
        }
    }, [isKioskDevice]);

    const setOwnerPin = useCallback((currentPin, newPin) => {
        if (currentPin !== ownerPin) {
            toast.error("El PIN actual es incorrecto.");
            return false;
        }
        if (!newPin || newPin.length < 4) {
            toast.error("El nuevo PIN debe tener al menos 4 dígitos.");
            return false;
        }
        localStorage.setItem(PIN_STORAGE_KEY, newPin);
        setOwnerPinState(newPin);
        toast.success("PIN de dueño actualizado con éxito.");
        return true;
    }, [ownerPin]);

    const toggleKioskDevice = useCallback((enable) => {
        localStorage.setItem(KIOSK_STORAGE_KEY, enable ? "true" : "false");
        setIsKioskDevice(enable);
        setIsUnlocked(!enable);
        toast.success(
            enable
                ? "Este dispositivo ahora funciona como Terminal de Caja (Modo Empleado)."
                : "Este dispositivo ahora funciona como Equipo de Dueño (Sin restricciones)."
        );
    }, []);

    const unlockWithPin = useCallback(
        (enteredPin) => {
            if (enteredPin === ownerPin) {
                setIsUnlocked(true);
                setIsPinModalOpen(false);
                if (pendingAction) {
                    const action = pendingAction;
                    setPendingAction(null);
                    action();
                } else {
                    toast.success("Modo Dueño desbloqueado.");
                }
                return true;
            } else {
                toast.error("PIN incorrecto.");
                return false;
            }
        },
        [ownerPin, pendingAction]
    );

    const requireOwnerAccess = useCallback(
        (actionCallback) => {
            if (!isKioskDevice || isUnlocked) {
                actionCallback();
                return;
            }
            // Require PIN
            setPendingAction(() => actionCallback);
            setIsPinModalOpen(true);
        },
        [isKioskDevice, isUnlocked]
    );

    const closePinModal = useCallback(() => {
        setIsPinModalOpen(false);
        setPendingAction(null);
    }, []);

    return (
        <DeviceSecurityContext.Provider
            value={{
                isKioskDevice,
                isUnlocked: !isKioskDevice || isUnlocked,
                isPinModalOpen,
                requireOwnerAccess,
                unlockWithPin,
                lock,
                setOwnerPin,
                toggleKioskDevice,
                closePinModal,
            }}
        >
            {children}
        </DeviceSecurityContext.Provider>
    );
}

export function useDeviceSecurity() {
    const context = useContext(DeviceSecurityContext);
    if (!context) {
        throw new Error("useDeviceSecurity must be used within a DeviceSecurityProvider");
    }
    return context;
}

