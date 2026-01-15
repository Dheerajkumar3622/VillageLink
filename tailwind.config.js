/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./index.tsx",
        "./*.{ts,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // "Midnight Depth" - Premium dark mode backgrounds
                midnight: {
                    800: '#0f172a',
                    900: '#020617',
                    950: '#010409',
                },
                // "Electric Trust" - Indigo-based brand for safety & trust
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                    glow: '#818cf8',
                },
                // Accent color for CTA highlights
                accent: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.4)',
                'glow-md': '0 0 25px -5px rgba(99, 102, 241, 0.5)',
                'glow-lg': '0 0 40px -8px rgba(99, 102, 241, 0.6)',
            },
        },
    },
    plugins: [],
}
