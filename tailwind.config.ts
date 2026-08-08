import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './client/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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

export default config;
