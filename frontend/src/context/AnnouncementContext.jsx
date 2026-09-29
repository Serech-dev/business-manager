import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getActiveAnnouncement } from "../services/announcements";

const AnnouncementContext = createContext(null);

export function AnnouncementProvider({ children }) {
    const [activeAnnouncement, setActiveAnnouncement] = useState(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isReloading, setIsReloading] = useState(false);

    const refreshAnnouncement = useCallback(async () => {
        try {
            const data = await getActiveAnnouncement();
            if (data && data.is_active) {
                setActiveAnnouncement(data);

                const storedDismissedId = localStorage.getItem("dismissed_announcement_id");
                if (data.allow_dismiss && String(storedDismissedId) === String(data.id)) {
                    setIsDismissed(true);
                    return;
                }

                // AUTO-DISMISS ON REFRESH:
                // If the announcement has auto_dismiss_on_reload enabled (or is an update / prompts for reload):
                const shouldAutoDismissOnReload =
                    data.auto_dismiss_on_reload !== false &&
                    (data.announcement_type === "update" ||
                        data.show_reload_button ||
                        data.auto_dismiss_on_reload);

                if (shouldAutoDismissOnReload) {
                    const seenKey = `bm_announcement_seen_${data.id}`;
                    const alreadySeenBeforeThisLoad = sessionStorage.getItem(seenKey);
                    if (alreadySeenBeforeThisLoad) {
                        // The user already saw this notice before refreshing the page.
                        // Now that the page reloaded, dismiss it so it is removed!
                        localStorage.setItem("dismissed_announcement_id", String(data.id));
                        setIsDismissed(true);

                        // Show a reassuring toast confirming the update
                        const toastKey = `bm_update_toast_${data.id}`;
                        if (!sessionStorage.getItem(toastKey)) {
                            sessionStorage.setItem(toastKey, "true");
                            toast.success("¡Sistema actualizado a la última versión!", {
                                id: "pwa-update-success",
                                duration: 4000,
                            });
                        }
                        return;
                    }

                    // First time seen in this tab session: record it
                    sessionStorage.setItem(seenKey, "true");
                }

                setIsDismissed(false);
            } else {
                setActiveAnnouncement(null);
                setIsDismissed(false);
            }
        } catch {
            // Silently fail if server is down or restarting
        }
    }, []);

    useEffect(() => {
        refreshAnnouncement();

        // Poll every 45 seconds for real-time broadcast responsiveness
        const interval = setInterval(refreshAnnouncement, 45000);

        // Also check whenever user switches back to the tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshAnnouncement();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refreshAnnouncement]);

    const dismissAnnouncement = useCallback(() => {
        if (activeAnnouncement) {
            localStorage.setItem("dismissed_announcement_id", String(activeAnnouncement.id));
            setIsDismissed(true);
        }
    }, [activeAnnouncement]);

    const forceAppReload = useCallback(async () => {
        setIsReloading(true);
        if (activeAnnouncement) {
            localStorage.setItem("dismissed_announcement_id", String(activeAnnouncement.id));
            sessionStorage.setItem(`bm_announcement_seen_${activeAnnouncement.id}`, "true");
        }
        try {
            // 1. Force update and trigger service workers
            if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.update().catch(() => {});
                }
            }

            // 2. Clear browser cache storage
            if ("caches" in window) {
                const cacheKeys = await caches.keys().catch(() => []);
                for (const key of cacheKeys) {
                    await caches.delete(key).catch(() => {});
                }
            }
        } catch (e) {
            console.error("Cache purge failed:", e);
        } finally {
            // 3. Force cache-busting reload
            window.location.reload(true);
        }
    }, [activeAnnouncement]);

    return (
        <AnnouncementContext.Provider
            value={{
                activeAnnouncement,
                isDismissed,
                dismissAnnouncement,
                forceAppReload,
                isReloading,
                refreshAnnouncement,
            }}
        >
            {children}
        </AnnouncementContext.Provider>
    );
}

export function useAnnouncement() {
    const context = useContext(AnnouncementContext);
    if (!context) {
        return {
            activeAnnouncement: null,
            isDismissed: false,
            dismissAnnouncement: () => {},
            forceAppReload: () => window.location.reload(true),
            isReloading: false,
            refreshAnnouncement: () => {},
        };
    }
    return context;
}
