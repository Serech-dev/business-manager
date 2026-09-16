import { useState, useEffect, useCallback, createContext, useContext } from "react";

const DeviceModeContext = createContext(null);

export function DeviceModeProvider({ children }) {
    const [modePreference, setModePreference] = useState(() => {
        return localStorage.getItem("bm_view_mode") || "auto"; // 'auto' | 'simple' | 'desktop'
    });

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    const [isPWA, setIsPWA] = useState(() => {
        if (typeof window === "undefined") return false;
        return Boolean(
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator?.standalone ||
            document.referrer.includes("android-app://")
        );
    });

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth < 768);
        }

        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        function handleDisplayModeChange(e) {
            setIsPWA(e.matches);
        }

        window.addEventListener("resize", handleResize);
        try {
            mediaQuery.addEventListener("change", handleDisplayModeChange);
        } catch {
            mediaQuery.addListener?.(handleDisplayModeChange);
        }

        return () => {
            window.removeEventListener("resize", handleResize);
            try {
                mediaQuery.removeEventListener("change", handleDisplayModeChange);
            } catch {
                mediaQuery.removeListener?.(handleDisplayModeChange);
            }
        };
    }, []);

    const setMode = useCallback((newMode) => {
        setModePreference(newMode);
        localStorage.setItem("bm_view_mode", newMode);
    }, []);

    const toggleMode = useCallback(() => {
        const next = modePreference === "simple" ? "desktop" : "simple";
        setMode(next);
    }, [modePreference, setMode]);

    // Calculate effective active UI mode
    const effectiveMode = modePreference === "auto"
        ? (isMobile ? "simple" : "desktop")
        : modePreference;

    const value = {
        modePreference,
        effectiveMode,
        isMobile,
        isPWA,
        isSimpleMode: effectiveMode === "simple",
        isDesktopMode: effectiveMode === "desktop",
        setMode,
        toggleMode,
    };

    return (
        <DeviceModeContext.Provider value={value}>
            {children}
        </DeviceModeContext.Provider>
    );
}

export function useDeviceMode() {
    const context = useContext(DeviceModeContext);
    if (!context) {
        // Fallback if rendered outside provider
        const isMob = typeof window !== "undefined" && window.innerWidth < 768;
        return {
            modePreference: "auto",
            effectiveMode: isMob ? "simple" : "desktop",
            isMobile: isMob,
            isPWA: false,
            isSimpleMode: isMob,
            isDesktopMode: !isMob,
            setMode: () => {},
            toggleMode: () => {},
        };
    }
    return context;
}

export default useDeviceMode;

