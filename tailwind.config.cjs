module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent-color-rgb) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-color-foreground-rgb) / <alpha-value>)",
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        "primary-foreground": "rgb(var(--color-primary-foreground-rgb) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}
