import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0a0a0f',
          card: '#12121a',
          border: '#1e1e2e',
          text: '#f1f5f9',
          muted: '#94a3b8',
          purple: '#7c3aed',
          blue: '#2563eb',
          green: '#16a34a',
          red: '#dc2626',
          orange: '#f97316'
        }
      },
      boxShadow: {
        glow: '0 0 40px rgba(124, 58, 237, 0.24)'
      }
    }
  },
  plugins: []
}

export default config
