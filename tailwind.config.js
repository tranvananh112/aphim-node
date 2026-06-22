/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './*.html',
        './js/**/*.js',
        './views/**/*.ejs',
    ],
    theme: {
        extend: {
            colors: {
                // ── Midnight Cinema Theme ──────────────────────────
                "primary":          "#e8b94f",   // Vàng ấm cinema (thay #f2f20d chói)
                "primary-dim":      "#c49a30",   // Vàng tối — pressed/dim state
                "primary-bright":   "#f59e0b",   // Hổ phách — gradient pair
                "primary-red":      "#ec1313",   // Đỏ giữ nguyên (18+)
                "background-light": "#f8f8f5",
                "background-dark":  "#1e2130",   // Nền navy premium (đồng bộ toàn site)
                "background-mid":   "#0a0b12",   // Nền ambient
                "surface-dark":     "#12131f",   // Card / panel nền
                "surface-elevated": "#1a1b2e",   // Card hover / modal
                "text-dim":         "#9899b0",   // Text secondary
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
                "vietnam": ["Be Vietnam Pro", "sans-serif"],
                "playfair": ["Playfair Display", "serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
