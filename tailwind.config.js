/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/test-panel/**/*.{js,jsx}',
    './src/renderer/config/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
