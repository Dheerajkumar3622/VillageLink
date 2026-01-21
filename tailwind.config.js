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
                    deep: '#0B0F19', // New: Absolute Depth
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
                // "Nano Banana" Palette (Whisk 3.0)
                nano: {
                    green: '#4ade80',  // Growth/Success
                    neon: '#22c55e',   // High-Vis Actions
                    glass: 'rgba(34, 197, 94, 0.15)',
                },
                banana: {
                    yellow: '#facc15', // Warning/Energy
                    gold: '#eab308',   // Premium Highlights
                    glass: 'rgba(250, 204, 21, 0.15)',
                },
                glass: {
                    indigo: 'rgba(99, 102, 241, 0.1)',
                    dark: 'rgba(15, 23, 42, 0.6)',
                },
                // Accent color for CTA highlights
                accent: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                },
                // Whisk "Micro-Palettes"
                organic: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a', // Soft Organic Green
                    900: '#14532d',
                },
                industrial: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    400: '#94a3b8',
                    500: '#64748b', // Metallic Industrial Grey
                    600: '#475569',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                warm: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    500: '#f97316',
                    600: '#ea580c', // Warm Candle-light
                    900: '#7c2d12',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.4)',
                'glow-md': '0 0 25px -5px rgba(99, 102, 241, 0.5)',
                'glow-lg': '0 0 40px -8px rgba(99, 102, 241, 0.6)',
                // Whisk "Multi-layered Shadows" (Umbra, Penumbra, Antumbra)
                'whisk-float': '0 1px 2px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.04)',
                'whisk-subtle': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            },
            animation: {
                'blob': 'blob 7s infinite',
                'waveform': 'waveform 1.2s ease-in-out infinite',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
            },
            keyframes: {
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                waveform: {
                    '0%, 100%': { height: '10px' },
                    '50%': { height: '24px' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
