import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'property',
    include: ['property/**/*.property.ts'],
    environment: 'node',
  },
})
