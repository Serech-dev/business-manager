import { logout } from "../services/auth";
import ThemeSelector from "./ThemeSelector";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";


function AccountMenu({ user, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, []);

    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <div
            ref={menuRef}
            className="relative"
        >
            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-[var(--primary)]
                    bg-[var(--primary)]
                    px-3
                    py-2
                    text-sm
                    font-medium
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[var(--primary-hover)]
                "
            >
                <span>Opciones de Cuenta</span>

                <span
                    className={`
                        text-xs
                        text-white
                        transition-transform
                        ${isOpen ? "rotate-180" : ""}
                    `}
                >
                    ▾
                </span>
            </button>

            {isOpen && (
                <div
                    className="
                        absolute
                        right-0
                        z-20
                        mt-2
                        w-44
                        rounded-xl
                        border
                        border-[var(--border)]
                        bg-[var(--surface)]
                        p-3
                        shadow-lg
                    "
                >
                    <div className="px-1 pb-3 text-center">
                        <p className="text-xs text-[var(--text-secondary)]">
                            Cuenta
                        </p>

                        <p
                            className="
                                mt-1
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

                    <div
                        className="
                            border-t
                            border-[var(--border)]
                            px-1
                            py-3
                            text-center                            
                        "
                    >
                        <p className="mb-1.5 text-sm font-medium text-[var(--text-primary)]">
                            Tema
                        </p>

                        <ThemeSelector />
                    </div>

                    <div className="border-t border-[var(--border)] pt-3 text-center">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="
                                rounded-lg
                                px-2
                                py-1.5
                                text-sm
                                font-medium
                                text-[var(--danger)]
                                transition
                                hover:bg-[var(--surface-accent)]
                            "
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountMenu;