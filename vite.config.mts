import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const apiProxy = { '/api': 'http://localhost:4000' }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
  },
})
