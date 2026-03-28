/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{ts,tsx}",
        "./src/app/**/*.{ts,tsx}",
        "../TotemSystem/src/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                border: "var(--lunavita-dark)"
            }
        }
    },
    plugins: []
};
