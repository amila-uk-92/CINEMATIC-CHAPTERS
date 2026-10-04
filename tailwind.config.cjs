/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D0C0A",
        surface: "#191713",
        "surface-card": "#1E1B16",
        "surface-hover": "#25211B",
        "smoky-brown": "#302921",
        "muted-bronze": "#806849",
        "champagne-gold": "#C8AD7F",
        "champagne-light": "#DFC7A0",
        "warm-ivory": "#F2EDE4",
        "muted-secondary": "#B7AEA2",
      },
      fontFamily: {
        headline: ["var(--font-headline)", "Oswald", "Bebas Neue", "sans-serif"],
        condensed: ["var(--font-condensed)", "Barlow Condensed", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "gold-glow": "0 0 15px rgba(200, 173, 127, 0.25)",
      },
      borderColor: {
        "gold-fine": "rgba(200, 173, 127, 0.22)",
        "bronze-fine": "rgba(128, 104, 73, 0.25)",
      }
    },
  },
  plugins: [],
};
