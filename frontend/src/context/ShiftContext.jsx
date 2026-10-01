import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentShift } from "../services/business";

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
    const [activeShift, setActiveShift] = useState(null);
    const [registerId, setRegisterId] = useState(null);
    const [isLoadingShift, setIsLoadingShift] = useState(true);
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

    const refreshActiveShift = useCallback(async () => {
        const token = localStorage.getItem("businessManagerAuthToken");
        if (!token) {
            setActiveShift(null);
            setIsLoadingShift(false);
            return;
        }

        try {
            const data = await getCurrentShift();
            setActiveShift(data?.active_shift || null);
            setRegisterId(data?.register_id || null);
        } catch (error) {
            console.error("Error loading active register shift:", error);
            setActiveShift(null);
        } finally {
            setIsLoadingShift(false);
        }
    }, []);

    useEffect(() => {
        refreshActiveShift();
    }, [refreshActiveShift]);

    const openHandoverModal = () => setIsHandoverModalOpen(true);
    const closeHandoverModal = () => setIsHandoverModalOpen(false);

    const value = {
        activeShift,
        registerId,
        isLoadingShift,
        refreshActiveShift,
        isHandoverModalOpen,
        openHandoverModal,
        closeHandoverModal,
    };

    return (
        <ShiftContext.Provider value={value}>
            {children}
        </ShiftContext.Provider>
    );
}

export function useShift() {
    const context = useContext(ShiftContext);
    if (!context) {
        throw new Error("useShift must be used within a ShiftProvider");
    }
    return context;
}
