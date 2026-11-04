/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18332d",
        forest: "#246b52",
        mint: "#eaf3ed",
        lime: "#d8ee7f",
        canvas: "#f7f8f6"
      },
      boxShadow: { card: "0 8px 28px rgba(27, 55, 45, .07)" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
