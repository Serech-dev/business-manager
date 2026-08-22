import { useState } from "react";
import { themes } from "../themes/themes";
import { getSavedTheme, setTheme } from "../utils/theme";

function ThemeSelector() {
    const [theme, setCurrentTheme] = useState(getSavedTheme());

    function handleChange(event) {
        const newTheme = event.target.value;

        setTheme(newTheme);
        setCurrentTheme(newTheme);
    }

    return (
        <div>
            <select
                id="theme"
                value={theme}
                onChange={handleChange}
                className="
                    rounded-lg
                    border
                    border-[var(--border)]
                    bg-[var(--background)]
                    px-2
                    py-1.5
                    text-sm
                    text-[var(--text-primary)]
                    outline-none
                    focus:border-[var(--primary)]
                    focus:ring-2
                    focus:ring-[var(--primary)]/20
                "
            >
                {themes.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default ThemeSelector;