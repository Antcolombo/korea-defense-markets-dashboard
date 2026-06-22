import type { Config } from 'tailwindcss'
import formsPlugin from '@tailwindcss/forms'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#061515',
        foreground: '#ffffff',
        card: {
          DEFAULT: '#071b1a',
          foreground: '#ffffff'
        },
        popover: {
          DEFAULT: '#071b1a',
          foreground: '#ffffff'
        },
        primary: {
          DEFAULT: '#50d2c1',
          foreground: '#03100f'
        },
        secondary: {
          DEFAULT: '#12302d',
          foreground: '#ddfaf5'
        },
        muted: {
          DEFAULT: '#102523',
          foreground: '#ffffffa3'
        },
        accent: {
          DEFAULT: '#163b37',
          foreground: '#ffffff'
        },
        destructive: {
          DEFAULT: '#ff6565',
          foreground: '#ffffff'
        },
        border: '#ffffff14',
        input: '#ffffff24',
        ring: '#50d2c1',
        ink: '#ffffff',
        line: '#ffffff14',
        panel: '#ffffff06',
        canvas: '#061515',
        steel: '#50d2c1',
        amber: '#ffb96d',
        danger: '#ff6565',
        crisis: '#ff9a9a',
        good: '#50d2c1'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        research: '0 8px 28px -12px rgba(0, 0, 0, 0.55)'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [formsPlugin]
}

export default config
