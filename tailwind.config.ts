import type { Config } from 'tailwindcss';

/**
 * VELMOR design system.
 * Colours, type and spacing are derived directly from the VELMOR Brand Identity:
 *   ink (warm charcoal), paper/cream, deep pine green, and a restrained goldenrod accent.
 * The site is Arabic-first and RTL; the type scale is designed for Arabic display + body.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core brand palette (see docs/BRAND.md).
        ink: {
          DEFAULT: '#1B1714', // warm near-black — primary dark surface & text
          800: '#241F1B',
          700: '#2E2823',
          600: '#3C352E',
          500: '#5A5148',
        },
        paper: {
          DEFAULT: '#F4F0E8', // editorial cream — primary light surface
          200: '#EDE7DC',
          300: '#E3DACB',
        },
        pine: {
          DEFAULT: '#2E3A31', // deep brand green
          600: '#374A3D',
          500: '#456352',
          400: '#5B7E69',
        },
        gold: {
          DEFAULT: '#D4A017', // brand goldenrod accent (use sparingly)
          600: '#B7891A', // AA-safe on paper for large text / borders
          700: '#9A7412', // AA-safe on paper for small text
          300: '#E3C25E',
        },
        // Semantic
        success: '#3E7C52',
        warning: '#B7891A',
        danger: '#B4453A',
      },
      fontFamily: {
        // Latin editorial display (Baskerville equivalent).
        display: ['var(--font-baskerville)', 'Georgia', 'serif'],
        // Arabic display (geometric, modern, masculine).
        'display-ar': ['var(--font-reem)', 'var(--font-plex-ar)', 'sans-serif'],
        // Primary UI / body — Arabic-first, pairs with Latin.
        sans: ['var(--font-plex-ar)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Editorial type scale
        display: ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.01em' }],
        hero: ['clamp(2rem, 4.5vw, 3.5rem)', { lineHeight: '1.08' }],
        h1: ['clamp(1.75rem, 3.2vw, 2.5rem)', { lineHeight: '1.15' }],
        h2: ['clamp(1.375rem, 2.4vw, 1.875rem)', { lineHeight: '1.2' }],
        h3: ['clamp(1.125rem, 1.8vw, 1.375rem)', { lineHeight: '1.3' }],
        price: ['1.375rem', { lineHeight: '1.1', letterSpacing: '0' }],
        label: ['0.75rem', { lineHeight: '1', letterSpacing: '0.14em' }],
      },
      maxWidth: {
        content: '1280px',
        prose: '68ch',
      },
      spacing: {
        gutter: 'clamp(1rem, 4vw, 2.5rem)',
        section: 'clamp(3.5rem, 8vw, 7rem)',
      },
      borderRadius: {
        // Restrained radii — luxury, not "rounded everywhere".
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '10px',
      },
      transitionTimingFunction: {
        velmor: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s var(--tw-ease, cubic-bezier(0.22,1,0.36,1)) both',
      },
    },
  },
  plugins: [],
};

export default config;
