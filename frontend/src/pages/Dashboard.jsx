import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { logout } from "../services/auth";

function Dashboard() {
    const navigate = useNavigate();

    function handleLogout() {
        logout();

        toast.success("Sesión cerrada.");
        navigate("/login", { replace: true });
    }

    return (
        <div className="min-h-screen bg-[var(--background)] px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                    Business Manager
                </h1>

                <p className="mt-2 text-[var(--text-secondary)]">
                    Hello world.
                </p>

                <button
                    onClick={handleLogout}
                    className="
                        mt-6
                        rounded-xl
                        bg-[var(--primary)]
                        px-4
                        py-3
                        font-semibold
                        text-white
                        transition
                        hover:bg-[var(--primary-hover)]
                    "
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}

export default Dashboard;