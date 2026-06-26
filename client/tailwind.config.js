/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F97316',
          blue: '#2563EB',
          'orange-light': '#FFF7ED',
          'blue-light': '#EFF6FF',
        },
      },
    },
  },
  plugins: [],
};
