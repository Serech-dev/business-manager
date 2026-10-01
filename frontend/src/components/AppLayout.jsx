import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import HelpButton from "./HelpButton";
import FeedbackButton from "./feedback/FeedbackButton";
import MobileSimpleLayout from "./mobile/MobileSimpleLayout";
import SystemAnnouncementBanner from "./announcements/SystemAnnouncementBanner";
import { getCurrentRegister } from "../services/business";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { useSubscription } from "../context/SubscriptionContext";

function AppLayout() {
    const { isSimpleMode } = useDeviceMode();
    const { isExpired } = useSubscription();
    const [register, setRegister] = useState(null);

    async function loadRegister() {
        if (isExpired) return;
        try {
            const currentRegister = await getCurrentRegister();
            setRegister(currentRegister);
        } catch (error) {
            console.error("Error loading current register in AppLayout:", error);
        }
    }

    useEffect(() => {
        if (!isExpired) {
            loadRegister();
        }
    }, [isExpired]);

    if (isSimpleMode) {
        return <MobileSimpleLayout />;
    }

    return (
        <div className="min-h-screen text-[var(--text-primary)]">
            <div className="print:hidden">
                <Sidebar
                    register={register}
                    setRegister={setRegister}
                />
            </div>

            <main className="ml-64 min-h-screen print:ml-0 print:p-0 flex flex-col">
                <div className="print:hidden">
                    <SystemAnnouncementBanner />
                </div>
                <div className="flex-1">
                    <Outlet
                        context={{
                            register,
                            setRegister,
                            loadRegister,
                        }}
                    />
                </div>
            </main>

            <div
                data-tour="help-feedback-dock"
                className="fixed bottom-4 right-4 z-40 flex items-center gap-2 print:hidden"
            >
                <FeedbackButton />
                <HelpButton />
            </div>
        </div>
    );
}

export default AppLayout;