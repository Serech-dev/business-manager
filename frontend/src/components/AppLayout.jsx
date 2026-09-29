import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import HelpButton from "./HelpButton";
import FeedbackButton from "./feedback/FeedbackButton";
import MobileSimpleLayout from "./mobile/MobileSimpleLayout";
import SystemAnnouncementBanner from "./announcements/SystemAnnouncementBanner";
import { getCurrentRegister } from "../services/business";
import { useDeviceMode } from "../hooks/useDeviceMode";

function AppLayout() {
    const { isSimpleMode } = useDeviceMode();
    const [register, setRegister] = useState(null);

    async function loadRegister() {
        try {
            const currentRegister = await getCurrentRegister();
            setRegister(currentRegister);
        } catch (error) {
            console.error("Error loading current register in AppLayout:", error);
        }
    }

    useEffect(() => {
        loadRegister();
    }, []);

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

            <div className="print:hidden">
                <FeedbackButton />
                <HelpButton />
            </div>
        </div>
    );
}

export default AppLayout;