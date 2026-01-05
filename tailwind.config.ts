import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Primary palette - warm coffee tones
        espresso: {
          50: "#faf7f4",
          100: "#f3ebe3",
          200: "#e6d5c5",
          300: "#d5b99f",
          400: "#c19577",
          500: "#b27a5a",
          600: "#a5674d",
          700: "#8a5341",
          800: "#71453a",
          900: "#5c3a31",
          950: "#311d18",
        },
        // Accent - burnt sienna / copper
        sienna: {
          50: "#fdf6f3",
          100: "#fceae4",
          200: "#fad8cc",
          300: "#f5bda8",
          400: "#ee9676",
          500: "#e4724d",
          600: "#d15732",
          700: "#af4527",
          800: "#913b24",
          900: "#783524",
          950: "#41180e",
        },
        // Warm neutrals - linen/cream
        linen: {
          50: "#fdfcfa",
          100: "#faf7f2",
          200: "#f5f0e8",
          300: "#ebe3d5",
          400: "#ddd0bb",
          500: "#ccb89d",
          600: "#b89d7f",
          700: "#a08467",
          800: "#856d57",
          900: "#6d5b49",
          950: "#3a2f25",
        },
        // Success - sage green
        sage: {
          50: "#f4f7f4",
          100: "#e5ebe5",
          200: "#ccd8cc",
          300: "#a6bca6",
          400: "#7a9a7a",
          500: "#5b7d5b",
          600: "#476447",
          700: "#3a513a",
          800: "#314231",
          900: "#29372a",
          950: "#141d15",
        },
        // Warning - warm amber
        roast: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "warm": "0 4px 20px -2px rgba(92, 58, 49, 0.12)",
        "warm-lg": "0 10px 40px -4px rgba(92, 58, 49, 0.18)",
        "inner-warm": "inset 0 2px 4px 0 rgba(92, 58, 49, 0.06)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
