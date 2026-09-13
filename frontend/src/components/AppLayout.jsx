import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import HelpButton from "./HelpButton";
import { getCurrentRegister } from "../services/business";

function AppLayout() {
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

    return (
        <div className="min-h-screen text-[var(--text-primary)]">
            <div className="print:hidden">
                <Sidebar
                    register={register}
                    setRegister={setRegister}
                />
            </div>

            <main className="ml-64 min-h-screen print:ml-0 print:p-0">
                <Outlet
                    context={{
                        register,
                        setRegister,
                        loadRegister,
                    }}
                />
            </main>

            <div className="print:hidden">
                <HelpButton />
            </div>
        </div>
    );
}

export default AppLayout;