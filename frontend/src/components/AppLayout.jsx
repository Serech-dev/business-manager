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
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
            <Sidebar
                register={register}
                setRegister={setRegister}
            />

            <main className="ml-64 min-h-screen">
                <Outlet
                    context={{
                        register,
                        setRegister,
                        loadRegister,
                    }}
                />
            </main>

            <HelpButton />
        </div>
    );
}

export default AppLayout;