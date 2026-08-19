import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  resolve: {
    // svelte must resolve to its client runtime inside jsdom
    conditions: ['browser'],
    alias: {
      $lib: new URL('./src/lib', import.meta.url).pathname
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js']
  }
})
