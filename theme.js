"use strict";

(() => {
    const root = document.documentElement;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const storageKey = "bankweb-theme";
    const colors = { light: "#f3f7f6", dark: "#0a1419" };

    function apply(theme) {
        root.dataset.theme = theme;
        themeColor.content = colors[theme];
    }

    try {
        if (localStorage.getItem(storageKey) === "dark") apply("dark");
    } catch {
        // The default theme remains available when browser storage is blocked.
    }

    document.addEventListener("DOMContentLoaded", () => {
        const toggle = document.getElementById("themeToggle");
        const syncToggle = () => toggle.setAttribute("aria-checked", String(root.dataset.theme === "dark"));

        syncToggle();
        toggle.hidden = false;
        toggle.addEventListener("click", () => {
            const theme = root.dataset.theme === "dark" ? "light" : "dark";
            apply(theme);
            syncToggle();
            try {
                localStorage.setItem(storageKey, theme);
            } catch {
                // The toggle still works for the current visit.
            }
        });
    });
})();
