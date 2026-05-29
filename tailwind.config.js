/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* Named palette — use these directly: bg-gray-00, text-red-500, etc. */
        gray: {
          '00': 'var(--gray-00)',
          '01': 'var(--gray-01)',
          '02': 'var(--gray-02)',
          '03': 'var(--gray-03)',
          '04': 'var(--gray-04)',
          '05': 'var(--gray-05)',
          '06': 'var(--gray-06)',
          '07': 'var(--gray-07)',
          '08': 'var(--gray-08)',
          '09': 'var(--gray-09)',
          '10': 'var(--gray-10)',
        },
        red: {
          '50':  'var(--red-50)',
          '100': 'var(--red-100)',
          '200': 'var(--red-200)',
          '300': 'var(--red-300)',
          '400': 'var(--red-400)',
          '500': 'var(--red-500)',
          '600': 'var(--red-600)',
          '700': 'var(--red-700)',
          '800': 'var(--red-800)',
          '900': 'var(--red-900)',
          '950': 'var(--red-950)',
        },
        /* Semantic aliases — used by shadcn/ui components */
        border:     'var(--border)',
        input:      'var(--input)',
        ring:       'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT:    'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
