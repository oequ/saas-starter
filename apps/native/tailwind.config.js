/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#171717',
        primary: '#1a1a1a',
        'primary-foreground': '#fafafa',
        muted: '#f5f5f5',
        'muted-foreground': '#737373',
        border: '#e5e5e5',
        destructive: '#c2410c',
        sheet: '#ffffff',
        backdrop: 'rgba(0,0,0,0.4)',
      },
      borderRadius: {
        control: '10px',
        sheet: '20px',
      },
      fontFamily: {
        display: ['Fraunces_600SemiBold'],
        body: ['DMSans_400Regular'],
        'body-medium': ['DMSans_500Medium'],
        'body-semibold': ['DMSans_600SemiBold'],
      },
    },
  },
  plugins: [],
};
