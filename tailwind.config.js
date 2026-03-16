/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A',
        secondary: '#14B8A6',
        accent: '#22D3EE',
        background: '#F8FAFC',
        slate: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-card-teal': 'linear-gradient(135deg, #ccfbf1 0%, #e0f2fe 100%)',
        'gradient-card-blue': 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
        'gradient-card-amber': 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%)',
        'gradient-card-cyan': 'linear-gradient(135deg, #cffafe 0%, #ccfbf1 100%)',
        'gradient-card-violet': 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
        'gradient-card-emerald': 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      },
    },
  },
  plugins: [],
};
