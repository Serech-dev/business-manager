import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import HelpButton from "./HelpButton";
import { getCurrentRegister } from "../services/business";


function AppLayout() {
    const [register, setRegister] = useState(null);

    async function loadRegister() {
        try {
            const currentRegister =
                await getCurrentRegister();

            setRegister(currentRegister);
        } catch (error) {
            console.error(error);
        }
    }


    useEffect(() => {
        loadRegister();
    }, []);


    return (
        <div className="relative min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200">
            {/* GLOBAL AMBIENT BREATHING GRADIENTS */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="animate-ambient-1 absolute -top-32 right-12 h-[520px] w-[520px] rounded-full bg-[var(--ambient-1)] blur-[75px]" />
                <div className="animate-ambient-2 absolute top-1/3 -left-32 h-[460px] w-[460px] rounded-full bg-[var(--ambient-2)] blur-[75px]" />
                <div className="animate-ambient-1 absolute -bottom-32 right-1/4 h-[420px] w-[420px] rounded-full bg-[var(--ambient-3)] blur-[80px]" style={{ animationDelay: "-4s" }} />
            </div>

            <Sidebar
                register={register}
                setRegister={setRegister}
            />

            <main className="relative z-10 ml-64 min-h-screen">
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