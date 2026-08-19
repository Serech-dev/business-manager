const THEME_KEY = "theme";

export function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);

    const primary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();

    let themeColor = document.querySelector(
        'meta[name="theme-color"]'
    );

    if (!themeColor) {
        themeColor = document.createElement("meta");
        themeColor.name = "theme-color";
        document.head.appendChild(themeColor);
    }

    themeColor.content = primary;
}

export function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || "blue";
}