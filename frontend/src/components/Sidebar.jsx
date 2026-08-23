import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    closeRegister,
    getCurrentRegister,
} from "../services/business";

import AccountMenu from "../components/AccountMenu";


function Sidebar({
    register,
    setRegister,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const [isClosing, setIsClosing] = useState(false);

    async function handleCloseRegister() {
        const confirmed = window.confirm(
            "¿Querés cerrar la caja?"
        );

        if (!confirmed) {
            return;
        }

        setIsClosing(true);

        try {
            await closeRegister();

            setRegister(null);

            toast.success("Caja cerrada.");
        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo cerrar la caja."
            );
        } finally {
            setIsClosing(false);
        }
    }


    useEffect(() => {
        async function loadRegister() {
            try {
                const currentRegister =
                    await getCurrentRegister();

                setRegister(currentRegister);
            } catch (error) {
                console.error(error);
            }
        }

        loadRegister();
    }, [location.pathname]);


    function isActive(path) {
        return location.pathname === path;
    }


    function handleNewTransaction() {
        if (!register) {
            toast.error(
                "Abrí la caja primero."
            );

            return;
        }

        navigate("/transactions/new");
    }


    return (
        <aside className="
            fixed
            inset-y-0
            left-0
            z-30
            flex
            w-64
            flex-col
            overflow-y-auto
            border-r
            border-[var(--border)]
            bg-[var(--surface)]
        ">

            {/* BRAND */}

            <div className="
                border-b
                border-[var(--border)]
                px-6
                py-5
            ">
                <h1 className="
                    text-xl
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                ">
                    Business Manager
                </h1>

                <p className="
                    mt-1
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    Gestión del negocio
                </p>
            </div>


            {/* NAVIGATION */}

            <nav className="
                flex-1
                space-y-1
                px-3
                py-5
            ">

                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className={`
                        flex
                        w-full
                        items-center
                        rounded-lg
                        border-l-2
                        px-4
                        py-3
                        text-left
                        text-sm
                        transition
                        ${
                            isActive("/")
                                ? `
                                    border-[var(--primary)]
                                    bg-[var(--surface-accent)]
                                    font-semibold
                                    text-[var(--text-primary)]
                                `
                                : `
                                    border-transparent
                                    font-medium
                                    text-[var(--text-secondary)]
                                    hover:bg-[var(--surface-accent)]
                                    hover:text-[var(--text-primary)]
                                `
                        }
                    `}
                >
                    Dashboard
                </button>


                <button
                    type="button"
                    onClick={handleNewTransaction}
                    className={`
                        flex
                        w-full
                        items-center
                        rounded-lg
                        border-l-2
                        border-transparent
                        px-4
                        py-3
                        text-left
                        text-sm
                        font-medium
                        transition
                        ${
                            isActive("/transactions/new")
                                ? `
                                    border-[var(--primary)]
                                    bg-[var(--surface-accent)]
                                    font-semibold
                                    text-[var(--text-primary)]
                                `
                                : `
                                    text-[var(--text-secondary)]
                                    hover:bg-[var(--surface-accent)]
                                    hover:text-[var(--text-primary)]
                                `
                        }
                    `}
                >
                    Nueva operación
                </button>


                <button
                    type="button"
                    onClick={() =>
                        navigate("/registers")
                    }
                    className={`
                        flex
                        w-full
                        items-center
                        rounded-lg
                        border-l-2
                        px-4
                        py-3
                        text-left
                        text-sm
                        transition
                        ${
                            isActive("/registers")
                                ? `
                                    border-[var(--primary)]
                                    bg-[var(--surface-accent)]
                                    font-semibold
                                    text-[var(--text-primary)]
                                `
                                : `
                                    border-transparent
                                    font-medium
                                    text-[var(--text-secondary)]
                                    hover:bg-[var(--surface-accent)]
                                    hover:text-[var(--text-primary)]
                                `
                        }
                    `}
                >
                    Historial de cierres
                </button>

            </nav>


            {/* REGISTER STATUS */}

            <div className="
                border-t
                border-[var(--border)]
                p-4
            ">
                <div className="
                    border
                    border-[var(--border)]
                    bg-[var(--surface-muted)]
                    p-4
                ">
                    <div className="
                        flex
                        items-center
                        justify-between
                        gap-3
                    ">
                        <span className="
                            text-xs
                            font-medium
                            uppercase
                            tracking-wide
                            text-[var(--text-secondary)]
                        ">
                            Caja
                        </span>

                        <span className={`
                            h-2
                            w-2
                            rounded-full
                            ${
                                register
                                    ? "bg-[var(--success)]"
                                    : "bg-[var(--danger)]"
                            }
                        `} />
                    </div>


                    <p className="
                        mt-2
                        text-sm
                        font-semibold
                        text-[var(--text-primary)]
                    ">
                        {register
                            ? "Abierta"
                            : "Cerrada"}
                    </p>


                    {register && (
                        <button
                            type="button"
                            onClick={handleCloseRegister}
                            disabled={isClosing}
                            className="
                                mt-4
                                w-full
                                border
                                border-[var(--danger-border)]
                                px-3
                                py-2
                                text-sm
                                font-semibold
                                text-[var(--danger)]
                                transition
                                hover:bg-[var(--danger-bg)]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            {isClosing
                                ? "Cerrando..."
                                : "Cerrar caja"}
                        </button>
                    )}
                </div>
            </div>


            {/* ACCOUNT */}

            <div className="
                border-t
                border-[var(--border)]
                p-4
            ">
                <AccountMenu />
            </div>

        </aside>
    );
}


export default Sidebar;