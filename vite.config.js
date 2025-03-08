/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    includeSource: ['functions/**/*.test.{js,ts}', '__tests__/**/*.{js,ts}'],
  },
 
})