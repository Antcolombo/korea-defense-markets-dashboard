import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgba(255, 255, 255, 0.96)',
        muted: 'rgba(255, 255, 255, 0.78)',
        line: 'rgba(255, 255, 255, 0.15)',
        panel: 'rgba(0, 0, 0, 0.45)',
        canvas: '#8290bd',
        navy: 'rgba(0, 0, 0, 0.55)',
        steel: 'rgb(80, 210, 193)',
        signal: 'rgb(80, 210, 193)',
        amber: '#ffe4a8',
        danger: '#ff7a7a',
        crisis: '#ffc4cc',
        good: 'rgb(124, 255, 178)',
        goodPanel: 'rgba(80, 210, 193, 0.16)',
        badPanel: 'rgba(255, 122, 122, 0.16)',
        warnPanel: 'rgba(255, 228, 168, 0.14)'
      },
      boxShadow: {
        research: '0 4px 20px rgba(0, 0, 0, 0.6)'
      }
    }
  },
  plugins: []
}

export default config
