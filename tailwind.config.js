/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a', // Deep clinical trust navy
        clinic: {
          50:  '#f0f7ff', // Softest ice white/blue
          100: '#e0effe', // Pearl dental blue
          200: '#bae0fd', // Sky dental wash
          300: '#7cc4fa', // Crisp dental blue
          400: '#38a5f8', // Bright dental azure
          500: '#0284c7', // Primary dental blue
          600: '#0369a1', // Deep clinical blue
          700: '#075985', // Sapphire medical navy
          800: '#0c4a6e', // Deep trust navy
          900: '#082f49'  // Midnight clinical blue
        },
        clay: '#f43f5e',
        sand: '#f8fafc', // Enamel pearl white
        slate: {
          25: '#f9fafb'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'blue-glow': '0 0 25px -5px rgba(2, 132, 199, 0.25)'
      }
    }
  },
  plugins: []
}
