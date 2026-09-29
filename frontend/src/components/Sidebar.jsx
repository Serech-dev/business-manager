import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    closeRegister,
    getCurrentRegister,
    getClosedRegisters,
    getStockAlertsSummary,
} from "../services/business";

import AccountMenu from "./AccountMenu";
import NotificationMenu from "./notifications/NotificationMenu";
import ConfirmDialog from "./ConfirmDialog";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useStoreSettings } from "../context/StoreSettingsContext";


function Sidebar({
    register,
    setRegister,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const { settings, openSettingsModal } = useStoreSettings();

    const {
        isSuperuser,
        isExpiringSoon,
        daysRemaining,
        isPremium,
        tier,
        isTrial,
        openSubscriptionModal,
    } = useSubscription();

    const {
        isKioskDevice,
        isUnlocked,
        requireOwnerAccess,
        lock,
        toggleKioskDevice,
    } = useDeviceSecurity();

    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [stockAlerts, setStockAlerts] = useState(null);

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
        async function loadSidebarData() {
            try {
                const [currentRegister, alerts] = await Promise.all([
                    getCurrentRegister(),
                    getStockAlertsSummary().catch(() => null),
                ]);

                setRegister(currentRegister);
                if (alerts) setStockAlerts(alerts);
            } catch (error) {
                console.error(error);
            }
        }

        loadSidebarData();
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
                px-5
                py-4
            ">
                <div className="flex items-center justify-between">
                    <p className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-wider
                        text-[var(--primary)]
                    ">
                        Administrador
                    </p>
                    <div className="flex items-center gap-1.5">
                        <NotificationMenu align="left" />
                        <button
                            type="button"
                            onClick={openSubscriptionModal}
                            className={`rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${
                                isPremium || isSuperuser
                                    ? "badge-gold hover:opacity-95"
                                    : isTrial
                                    ? "badge-gold-subtle"
                                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]"
                            }`}
                            title="Ver plan y opciones de suscripción"
                        >
                            {isSuperuser ? "Admin" : isTrial ? "Prueba" : isPremium ? "Premium" : "Básico"}
                        </button>
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                    <h1 className="
                        text-base
                        font-bold
                        tracking-tight
                        text-[var(--text-primary)]
                        truncate
                    " title={settings?.store_name || "Mi Negocio"}>
                        {settings?.store_name || "Mi Negocio"}
                    </h1>
                    <button
                        type="button"
                        onClick={openSettingsModal}
                        data-tour="sidebar-store-settings"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                        title="Configuración de Tienda (tickets, envíos, recargos, caja)"
                        aria-label="Configuración de tienda"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    </button>
                </div>
            </div>


            {/* NAVIGATION */}

            <nav
                data-tour="sidebar-nav"
                className="
                flex-1
                space-y-1
                overflow-y-auto
                p-3
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
                        py-2.5
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
                        py-2.5
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
                        requireOwnerAccess(() => navigate("/analytics"));
                    }}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        border-l-2
                        px-4
                        py-2.5
                        text-left
                        text-sm
                        transition
                        ${
                            isActive("/analytics")
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
                    <span>Reportes & Métricas</span>
                    {isKioskDevice && !isUnlocked && (
                        <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                            PIN
                        </span>
                    )}
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
                        py-2.5
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
                        py-2.5
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
                        justify-between
                        rounded-lg
                        border-l-2
                        px-4
                        py-2.5
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
                    <span>Proveedores</span>
                    {!isPremium && !isSuperuser && (
                        <span className="badge-gold px-1.5 py-0.5 rounded-sm text-[9px]">
                            PRO
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        requireOwnerAccess(() => navigate("/products"));
                    }}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        border-l-2
                        px-4
                        py-2.5
                        text-left
                        text-sm
                        transition
                        ${
                            isActive("/products")
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
                    <span>Productos</span>
                    {isKioskDevice && !isUnlocked && (
                        <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                            PIN
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        requireOwnerAccess(() => navigate("/stock"));
                    }}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        border-l-2
                        px-4
                        py-2.5
                        text-left
                        text-sm
                        transition
                        ${
                            isActive("/stock")
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
                    <div className="flex items-center gap-2">
                        <span>Control de Stock</span>
                        {stockAlerts?.total_alerts > 0 && (
                            <span className="rounded-full bg-[var(--danger-bg)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--danger)] border border-[var(--danger-border)]">
                                {stockAlerts.total_alerts}
                            </span>
                        )}
                    </div>
                    {isKioskDevice && !isUnlocked && (
                        <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                            PIN
                        </span>
                    )}
                </button>

                {isSuperuser && (
                    <button
                        type="button"
                        onClick={() => navigate("/admin-panel")}
                        className={`
                            flex
                            w-full
                            items-center
                            justify-between
                            rounded-lg
                            border-l-2
                            px-4
                            py-2.5
                            text-left
                            text-sm
                            transition
                            ${
                                isActive("/admin-panel")
                                    ? `
                                        border-[var(--primary)]
                                        bg-[var(--surface-accent)]
                                        font-bold
                                        text-[var(--primary)]
                                    `
                                    : `
                                        border-transparent
                                        font-semibold
                                        text-[var(--primary)]
                                        hover:bg-[var(--surface-accent)]
                                    `
                            }
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <span>Panel de Dueño</span>
                        </div>
                        <span className="rounded bg-[var(--primary)]/15 px-1.5 py-0.2 text-[9px] font-bold text-[var(--primary)] border border-[var(--primary)]/30 uppercase">
                            Admin
                        </span>
                    </button>
                )}

            </nav>

            {/* EXPIRING SOON BANNER */}
            {isExpiringSoon && (
                <div className="mx-3 mb-1 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-2.5 text-xs text-[var(--text-primary)]">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--warning)]">Aviso de Licencia</span>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">{daysRemaining}d restantes</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-tight">
                        Tu período de acceso finaliza pronto.
                    </p>
                    <button
                        type="button"
                        onClick={openSubscriptionModal}
                        className="mt-2 w-full rounded-lg bg-[var(--primary)] py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
                    >
                        Renovar Licencia
                    </button>
                </div>
            )}

            {/* CURRENT REGISTER STATUS */}

            <div className="
                border-t
                border-[var(--border)]
                p-3
            ">
                <div className="
                    rounded-lg
                    border
                    border-[var(--border)]
                    bg-[var(--background)]
                    p-3
                ">
                    <p className="
                        text-[10px]
                        font-medium
                        uppercase
                        tracking-wider
                        text-[var(--text-secondary)]
                    ">
                        Caja actual
                    </p>

                    <div className="
                        mt-1
                        flex
                        items-center
                        gap-2
                    ">
                        <span className={`
                            h-2
                            w-2
                            rounded-full
                            ${
                                register && register.is_open
                                    ? "bg-[var(--success)]"
                                    : "bg-[var(--danger)]"
                            }
                        `} />

                        <span className="
                            text-xs
                            font-bold
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
                                mt-2.5
                                flex
                                w-full
                                items-center
                                justify-center
                                gap-1.5
                                rounded-md
                                border
                                border-[var(--danger-border)]
                                px-2.5
                                py-1.5
                                text-[11px]
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
                                <span className="rounded bg-[var(--danger-bg)] px-1 py-0.2 text-[9px] font-semibold text-[var(--danger)]">
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
                px-3.5
                py-2
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
                                <span className="font-semibold text-[var(--success)] text-[11px]">
                                    Modo Dueño (Desbloqueado)
                                </span>
                            ) : (
                                <span className="font-semibold text-[var(--warning)] text-[11px]">
                                    Modo Caja
                                </span>
                            )
                        ) : (
                            <span className="font-semibold text-[var(--text-primary)] text-[11px]">
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
                                    className="font-medium text-[11px] text-[var(--danger)] hover:underline"
                                >
                                    Bloquear
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => requireOwnerAccess(() => {})}
                                    className="font-semibold text-[11px] text-[var(--primary)] hover:underline"
                                >
                                    Desbloquear
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggleKioskDevice(true)}
                                title="Activar Modo Caja en este terminal"
                                className="font-medium text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                Activar Modo Caja
                            </button>
                        )}
                    </div>
                </div>

                {isKioskDevice && (
                    <div className="mt-0.5 flex justify-between text-[10px] text-[var(--text-secondary)]">
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
                px-3
                py-2
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