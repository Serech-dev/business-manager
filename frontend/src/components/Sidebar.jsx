import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    closeRegister,
    getCurrentRegister,
    getClosedRegisters,
} from "../services/business";

import AccountMenu from "./AccountMenu";
import ConfirmDialog from "./ConfirmDialog";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";


function Sidebar({
    register,
    setRegister,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        isKioskDevice,
        isUnlocked,
        requireOwnerAccess,
        lock,
        toggleKioskDevice,
    } = useDeviceSecurity();

    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    async function handleCloseRegister() {
        setIsClosing(true);

        try {
            await closeRegister();

            const registers = await getClosedRegisters();
            const closedRegister = registers[0];

            toast.success(
                "Caja cerrada."
            );

            navigate(
                `/registers/${closedRegister.id}`
            );

        } catch (error) {
            console.error(error);

            toast.error(
                "No se pudo cerrar la caja."
            );
        } finally {
            setIsClosing(false);
            setShowCloseDialog(false);
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
        if (path === "/") {
            return location.pathname === "/";
        }

        return location.pathname.startsWith(path);
    }


    function handleNewTransaction() {
        if (!register || !register.is_open) {
            toast.error(
                "Tenés que abrir la caja para registrar operaciones."
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
            h-screen
            w-64
            flex-col
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
                <p className="
                    text-xs
                    font-medium
                    uppercase
                    tracking-wider
                    text-[var(--primary)]
                ">
                    Administrador
                </p>

                <h1 className="
                    mt-1
                    text-lg
                    font-bold
                    tracking-tight
                    text-[var(--text-primary)]
                ">
                    Mi Negocio
                </h1>
            </div>


            {/* NAVIGATION */}

            <nav className="
                flex-1
                space-y-1
                overflow-y-auto
                p-4
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
                            isActive("/") &&
                            location.pathname === "/"
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
                    Inicio
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
                        px-4
                        py-3
                        text-left
                        text-sm
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
                                    border-transparent
                                    font-medium
                                    text-[var(--text-secondary)]
                                    hover:bg-[var(--surface-accent)]
                                    hover:text-[var(--text-primary)]
                                `
                        }
                    `}
                >
                    Nueva venta
                </button>


                <button
                    type="button"
                    onClick={() => {
                        requireOwnerAccess(() => navigate("/registers"));
                    }}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
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
                    <span>Historial de cierres</span>
                    {isKioskDevice && !isUnlocked && (
                        <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                            PIN
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => navigate("/clients")}
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
                            isActive("/clients")
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
                    Clientes
                </button>

                <button
                    type="button"
                    onClick={() => navigate("/providers")}
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
                            isActive("/providers")
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
                    Proveedores
                </button>

            </nav>


            {/* CURRENT REGISTER STATUS */}

            <div className="
                border-t
                border-[var(--border)]
                p-4
            ">
                <div className="
                    rounded-lg
                    border
                    border-[var(--border)]
                    bg-[var(--background)]
                    p-4
                ">
                    <p className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-wider
                        text-[var(--text-secondary)]
                    ">
                        Caja actual
                    </p>

                    <div className="
                        mt-2
                        flex
                        items-center
                        gap-2
                    ">
                        <span className={`
                            h-2.5
                            w-2.5
                            rounded-full
                            ${
                                register && register.is_open
                                    ? "bg-[var(--success)]"
                                    : "bg-[var(--danger)]"
                            }
                        `} />

                        <span className="
                            text-sm
                            font-semibold
                            text-[var(--text-primary)]
                        ">
                            {register && register.is_open
                                ? "Abierta"
                                : "Cerrada"}
                        </span>
                    </div>


                    {register && register.is_open && (
                        <button
                            type="button"
                            onClick={() => {
                                requireOwnerAccess(() => setShowCloseDialog(true));
                            }}
                            disabled={isClosing}
                            className="
                                mt-4
                                flex
                                w-full
                                items-center
                                justify-center
                                gap-1.5
                                rounded-md
                                border
                                border-[var(--danger-border)]
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-[var(--danger)]
                                transition
                                hover:bg-[var(--danger-bg)]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <span>Cerrar caja</span>
                            {isKioskDevice && !isUnlocked && (
                                <span className="rounded bg-[var(--danger-bg)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--danger)]">
                                    PIN
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* DEVICE MODE / SECURITY STATUS */}
            <div className="
                border-t
                border-[var(--border)]
                px-4
                py-3
            ">
                <div className="
                    flex
                    items-center
                    justify-between
                    text-xs
                ">
                    <div>
                        {isKioskDevice ? (
                            isUnlocked ? (
                                <span className="font-semibold text-[var(--success)]">
                                    Modo Dueño (Desbloqueado)
                                </span>
                            ) : (
                                <span className="font-semibold text-[var(--warning)]">
                                    Modo Caja
                                </span>
                            )
                        ) : (
                            <span className="font-semibold text-[var(--text-primary)]">
                                Equipo Dueño
                            </span>
                        )}
                    </div>

                    <div>
                        {isKioskDevice ? (
                            isUnlocked ? (
                                <button
                                    type="button"
                                    onClick={lock}
                                    className="font-medium text-[var(--danger)] hover:underline"
                                >
                                    Bloquear
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => requireOwnerAccess(() => {})}
                                    className="font-semibold text-[var(--primary)] hover:underline"
                                >
                                    Desbloquear
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggleKioskDevice(true)}
                                title="Activar Modo Caja en este terminal"
                                className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                Activar Modo Caja
                            </button>
                        )}
                    </div>
                </div>

                {isKioskDevice && (
                    <div className="mt-1 flex justify-between text-[10px] text-[var(--text-secondary)]">
                        <span>Terminal protegida</span>
                        <button
                            type="button"
                            onClick={() => {
                                requireOwnerAccess(() => toggleKioskDevice(false));
                            }}
                            className="hover:underline"
                        >
                            Cambiar a Dueño
                        </button>
                    </div>
                )}
            </div>

            {/* ACCOUNT */}

            <div className="
                border-t
                border-[var(--border)]
                p-4
            ">
                <AccountMenu />
            </div>


            {/* CONFIRM DIALOG */}

            {showCloseDialog && (
                <ConfirmDialog
                    title="Cerrar caja"
                    message={
                        <div>
                            <div>
                                ¿Querés cerrar la caja actual?
                            </div>

                            <div className="
                                mt-2
                                text-xs
                                text-[var(--text-secondary)]
                            ">
                                Una vez cerrada, sus operaciones no podrán
                                modificarse ni eliminarse.
                            </div>
                        </div>
                    }
                    confirmLabel="Cerrar caja"
                    cancelLabel="Cancelar"
                    onConfirm={handleCloseRegister}
                    onCancel={() => setShowCloseDialog(false)}
                    isLoading={isClosing}
                />
            )}
        </aside>
    );
}


export default Sidebar;