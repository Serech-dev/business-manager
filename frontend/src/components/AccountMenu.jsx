import { logout } from "../services/auth";
import ThemeSelector from "./ThemeSelector";
import ChangePinModal from "./ChangePinModal";
import GuideModal from "./GuideModal";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../utils/version";
import { useSubscription } from "../context/SubscriptionContext";
import { useStoreSettings } from "../context/StoreSettingsContext";


function AccountMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef(null);

    const navigate = useNavigate();
    const { openSettingsModal } = useStoreSettings();
    const {
        subscription,
        isExpired,
        isTrial,
        daysRemaining,
        isSuperuser,
        openSubscriptionModal,
    } = useSubscription();

    useEffect(() => {
        const storedUser = localStorage.getItem("businessManagerAuthUser");

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error("No se pudo leer el usuario guardado.", error);
            }
        }
    }, []);

    function handleLogout() {
        logout();
        navigate("/login");
    }

    const isUserSuper = isSuperuser || user?.is_superuser;

    return (
        <>
            <ChangePinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
            />

            <GuideModal
                isOpen={isGuideModalOpen}
                onClose={() => setIsGuideModalOpen(false)}
            />

            <div ref={menuRef} className="relative">
                {isOpen && (
                    <div
                        className="
                            absolute
                            inset-x-0
                            bottom-full
                            z-20
                            mb-2
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            shadow-lg
                            rounded-xl
                            overflow-hidden
                        "
                    >
                        {/* SUBSCRIPTION / LICENSE ITEM */}
                        <div className="border-b border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    openSubscriptionModal();
                                }}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    px-4
                                    py-3
                                    text-left
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                "
                            >
                                <div className="flex flex-col">
                                    <span>Mi Suscripción</span>
                                    <span className="text-[10px] text-[var(--text-secondary)]">
                                        {isExpired
                                            ? "Vencida"
                                            : isTrial
                                            ? `Prueba (${daysRemaining}d restantes)`
                                            : subscription?.plan === "lifetime"
                                            ? "Licencia Vitalicia"
                                            : `Plan Activo (${daysRemaining}d)`}
                                    </span>
                                </div>
                                <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                                        isExpired
                                            ? "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]"
                                            : isTrial
                                            ? "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]"
                                            : "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]"
                                    }`}
                                >
                                    {isExpired ? "Renovar" : "Ver Plan"}
                                </span>
                            </button>
                        </div>

                        {/* SUPERADMIN OWNER PANEL LINK (IF SUPERUSER) */}
                        {isUserSuper && (
                            <div className="border-b border-[var(--border)] bg-[var(--primary)]/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate("/admin-panel");
                                    }}
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between
                                        px-4
                                        py-3
                                        text-left
                                        text-sm
                                        font-bold
                                        text-[var(--primary)]
                                        transition
                                        hover:bg-[var(--surface-accent)]
                                    "
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                        </svg>
                                        <span>Panel de Dueño</span>
                                    </div>
                                    <span className="rounded bg-[var(--primary)] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                                        Admin
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* STORE SETTINGS */}
                        <div className="border-b border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    openSettingsModal();
                                }}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    px-4
                                    py-3
                                    text-left
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                "
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                    <span>Configuración del Comercio</span>
                                </div>
                                <span className="text-xs text-[var(--text-secondary)]">Ajustes</span>
                            </button>
                        </div>

                        {/* THEME */}
                        <div className="
                            border-b
                            border-[var(--border)]
                            px-4
                            py-3
                        ">
                            <div className="
                                flex
                                items-center
                                justify-between
                                gap-4
                            ">
                                <span className="
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                ">
                                    Tema
                                </span>

                                <ThemeSelector />
                            </div>
                        </div>

                        {/* SYSTEM GUIDE */}
                        <div className="
                            border-b
                            border-[var(--border)]
                        ">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsGuideModalOpen(true);
                                }}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    px-4
                                    py-3
                                    text-left
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                "
                            >
                                <span>Guía del Sistema</span>
                                <span className="text-xs font-semibold text-[var(--primary)]">Ayuda</span>
                            </button>
                        </div>

                        {/* CHANGE OWNER PIN */}
                        <div className="
                            border-b
                            border-[var(--border)]
                        ">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsPinModalOpen(true);
                                }}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    px-4
                                    py-3
                                    text-left
                                    text-sm
                                    font-medium
                                    text-[var(--text-primary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                "
                            >
                                <span>PIN de Dueño</span>
                                <span className="text-xs text-[var(--text-secondary)]">Cambiar</span>
                            </button>
                        </div>

                        {/* LOGOUT */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="
                                flex
                                w-full
                                items-center
                                justify-between
                                px-4
                                py-3
                                text-left
                                text-sm
                                font-medium
                                text-[var(--danger)]
                                transition
                                hover:bg-[var(--surface-accent)]
                            "
                        >
                            <span>
                                Cerrar sesión
                            </span>

                            <span className="text-base">
                                →
                            </span>
                        </button>

                        {/* APP VERSION */}
                        <div className="border-t border-[var(--border)] px-4 py-2 text-center text-[10px] text-[var(--text-secondary)]/60">
                            Business Manager {APP_VERSION}
                        </div>
                    </div>
                )}

                {/* ACCOUNT TOGGLE BUTTON */}
                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-3
                        border
                        px-4
                        py-3
                        text-left
                        transition
                        rounded-xl
                        ${
                            isOpen
                                ? "border-[var(--primary)] bg-[var(--surface-accent)]"
                                : "border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface-accent)]"
                        }
                    `}
                >
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs text-[var(--text-secondary)]">
                                Cuenta
                            </p>
                            {subscription && (
                                <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                                        isExpired
                                            ? "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]"
                                            : isTrial
                                            ? "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]"
                                            : "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                                    }`}
                                >
                                    {isExpired ? "Vencida" : isTrial ? `${daysRemaining}d prueba` : "Activa"}
                                </span>
                            )}
                        </div>

                        <p
                            className="
                                mt-0.5
                                truncate
                                text-sm
                                font-medium
                                text-[var(--text-primary)]
                            "
                            title={user?.email}
                        >
                            {user?.email}
                        </p>
                    </div>

                    <span
                        className={`
                            shrink-0
                            text-sm
                            text-[var(--text-secondary)]
                            transition-transform
                            ${isOpen ? "rotate-180" : ""}
                        `}
                    >
                        ↑
                    </span>
                </button>
            </div>
        </>
    );
}

export default AccountMenu;