import { createContext, useContext, useState, useCallback } from "react";

const OnboardingContext = createContext(null);

const STORAGE_PREFIX = "bm_onboarding_hide_";

export function OnboardingProvider({ children }) {
    const [activeTour, setActiveTour] = useState(null);
    const [activeStep, setActiveStep] = useState(0);

    const isTourDismissed = useCallback((tourKey) => {
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}${tourKey}`) === "true";
        } catch {
            return false;
        }
    }, []);

    const startTour = useCallback(
        (tourKey, force = true) => {
            if (!tourKey) return;
            if (!force && isTourDismissed(tourKey)) return;

            setActiveTour(tourKey);
            setActiveStep(0);
        },
        [isTourDismissed]
    );

    const nextStep = useCallback(() => {
        setActiveStep((prev) => prev + 1);
    }, []);

    const prevStep = useCallback(() => {
        setActiveStep((prev) => Math.max(0, prev - 1));
    }, []);

    const dismissTour = useCallback((tourKey, permanent = false) => {
        if (permanent && tourKey) {
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${tourKey}`, "true");
            } catch (err) {
                console.error("Failed to save onboarding preference:", err);
            }
        }
        setActiveTour(null);
        setActiveStep(0);
    }, []);

    const resetAllTours = useCallback(() => {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch (err) {
            console.error("Failed to reset onboarding tours:", err);
        }
    }, []);

    const value = {
        activeTour,
        activeStep,
        setActiveStep,
        startTour,
        nextStep,
        prevStep,
        dismissTour,
        isTourDismissed,
        resetAllTours,
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
}
