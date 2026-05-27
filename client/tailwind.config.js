/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141417",
        paper: "#fbfaf7",
        line: "#dedbd2",
        moss: "#49624f",
        clay: "#a45b42",
        ocean: "#2f6f89"
      },
      boxShadow: {
        soft: "0 12px 35px rgba(20, 20, 23, 0.08)"
      }
    }
  },
  plugins: [typography]
};
