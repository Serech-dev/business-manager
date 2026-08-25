import { logout } from "../services/auth";
import ThemeSelector from "./ThemeSelector";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";


function AccountMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef(null);

    const navigate = useNavigate();


    useEffect(() => {
        const storedUser =
            localStorage.getItem(
                "businessManagerAuthUser"
            );

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error(
                    "No se pudo leer el usuario guardado.",
                    error
                );
            }
        }
    }, []);

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <div
            ref={menuRef}
            className="relative"
        >
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
                    "
                >

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

                        <span className="
                            text-base
                        ">
                            →
                        </span>
                    </button>
                </div>
            )}


            {/* ACCOUNT TOGGLE */}

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
                    ${
                        isOpen
                            ? "border-[var(--primary)] bg-[var(--surface-accent)]"
                            : "border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface-accent)]"
                    }
                `}
            >
                <div className="
                    min-w-0
                ">
                    <p className="
                        text-xs
                        text-[var(--text-secondary)]
                    ">
                        Cuenta
                    </p>

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
    );
}

export default AccountMenu;