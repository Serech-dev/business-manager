import { useState } from "react";
import { getSavedTheme, setTheme } from "../utils/theme";

function ThemeSelector() {
    const [theme, setCurrentTheme] = useState(
        getSavedTheme()
    );

    function toggleTheme() {
        const newTheme =
            theme === "dark"
                ? "light"
                : "dark";

        setTheme(newTheme);
        setCurrentTheme(newTheme);
    }

    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="
                flex
                w-full
                items-center
                justify-between
                rounded-lg
                border
                border-[var(--border)]
                bg-[var(--background)]
                px-3
                py-2
                text-sm
                text-[var(--text-primary)]
                transition
                hover:bg-[var(--surface-accent)]
            "
        >
            <span>
                {isDark ? "Oscuro" : "Claro"}
            </span>

            <span
                className="
                    text-[var(--control-icon)]
                    transition
                "
            >
                {isDark ? "☾" : "☀"}
            </span>
        </button>
    );
}

export default ThemeSelector;