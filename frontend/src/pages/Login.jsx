import api, { getApiError } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";


function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setIsSubmitting(true);

        try {
            const response = await api.post(
                "auth/login/",
                {
                    email,
                    password,
                }
            );

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
                getApiError(
                    error,
                    "No se pudo iniciar sesión."
                )
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

    return (
        <div className="min-h-screen bg-[var(--surface)] px-4 py-8">
            <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-accent)] p-6 shadow-sm">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                            Market Manager
                        </h1>

                        <p className="mt-1 text-[var(--text-secondary)]">
                            Iniciá sesión para continuar.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-[var(--text-primary)]"
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                autoComplete="email"
                                required
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--border)]
                                    bg-[var(--background)]
                                    px-4
                                    py-3
                                    text-[var(--text-primary)]
                                    outline-none
                                    transition
                                    focus:border-[var(--primary)]
                                    focus:ring-2
                                    focus:ring-[var(--primary)]/20
                                "
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[var(--text-primary)]"
                            >
                                Contraseña
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                autoComplete="current-password"
                                required
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[var(--border)]
                                    bg-[var(--background)]
                                    px-4
                                    py-3
                                    text-[var(--text-primary)]
                                    outline-none
                                    transition
                                    focus:border-[var(--primary)]
                                    focus:ring-2
                                    focus:ring-[var(--primary)]/20
                                "
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="
                                w-full
                                rounded-xl
                                bg-[var(--primary)]
                                px-4
                                py-3
                                font-semibold
                                text-white
                                shadow-sm
                                transition
                                hover:bg-[var(--primary-hover)]
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {isSubmitting
                                ? "Ingresando..."
                                : "Iniciar sesión"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;