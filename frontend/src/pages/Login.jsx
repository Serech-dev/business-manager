import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api, { getApiError } from "../services/api";
import { getSavedTheme, setTheme } from "../utils/theme";
import { APP_VERSION } from "../utils/version";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(getSavedTheme());

    function toggleTheme() {
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        setCurrentTheme(newTheme);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await api.post("auth/login/", {
                email,
                password,
            });

            localStorage.setItem(
                "businessManagerAuthToken",
                response.data.token
            );

            localStorage.setItem(
                "businessManagerAuthUser",
                JSON.stringify(response.data.user)
            );

            toast.success("Sesión iniciada.");
            navigate("/");
        } catch (error) {
            console.error(error);
            toast.error(
                getApiError(error, "No se pudo iniciar sesión. Verificá tus credenciales.")
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        const token = localStorage.getItem("businessManagerAuthToken");
        if (token) {
            navigate("/", { replace: true });
        }
    }, [navigate]);

    const isDark = currentTheme === "dark";

    return (
        <div className="relative min-h-screen bg-[var(--background)] flex flex-col justify-between p-4 selection:bg-[var(--primary)] selection:text-white transition-colors duration-200">
            {/* AMBIENT BACKGROUND GLOW */}
            <div className="animate-ambient-1 pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-[var(--primary)]/12 blur-[130px]" />

            {/* TOP BAR / THEME SWITCHER */}
            <header className="relative z-10 flex items-center justify-end px-2 sm:px-6 py-2">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    aria-label="Cambiar tema"
                >
                    <span>{isDark ? "Tema Oscuro" : "Tema Claro"}</span>
                    <span className="text-sm">{isDark ? "☾" : "☀"}</span>
                </button>
            </header>

            {/* MAIN LOGIN CARD */}
            <main className="relative z-10 flex-1 flex items-center justify-center my-6">
                <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl transition-all duration-200">
                    {/* BRAND HEADER */}
                    <div className="text-center space-y-3 mb-8">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] shadow-inner">
                            {/* STORE / SAFE ICON */}
                            <svg
                                className="h-7 w-7"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                                />
                            </svg>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                                Business Manager
                            </h1>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                Sistema de gestión comercial y control de caja
                            </p>
                        </div>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* EMAIL */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                                Email de acceso
                            </label>

                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-secondary)]">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                                        />
                                    </svg>
                                </div>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    placeholder="usuario@comercio.com"
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-secondary)]/50"
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                                Contraseña
                            </label>

                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-secondary)]">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                        />
                                    </svg>
                                </div>

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-secondary)]/50"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {showPassword ? "Ocultar" : "Ver"}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-xl bg-[var(--primary)] py-3 px-4 text-sm font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] focus:ring-2 focus:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg
                                        className="h-4 w-4 animate-spin text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <span>Ingresando...</span>
                                </>
                            ) : (
                                <span>Iniciar sesión</span>
                            )}
                        </button>
                    </form>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="relative z-10 text-center py-2">
                <p className="text-[11px] text-[var(--text-secondary)]/70">
                    Business Manager {APP_VERSION} · Sesión cifrada
                </p>
            </footer>
        </div>
    );
}

export default Login;