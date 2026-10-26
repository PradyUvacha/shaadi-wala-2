import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * A false flag still leaves a dynamic import() in the module graph, so Rollup
 * emits the parked screen. Replace that import before Rollup sees it.
 * Flip the constant in src/features/onboarding/flag.ts to compile the slice again.
 */
function parkDisabledSlices(): Plugin {
  const flags = () => readFileSync(new URL('./src/features/onboarding/flag.ts', import.meta.url), 'utf8')
  return {
    name: 'park-disabled-slices',
    enforce: 'pre',
    transform(code, id) {
      let next = code
      const source = flags()
      if (id.endsWith('/SetupScreen.tsx') && /export const legacyOnboardingEnabled = false/.test(source)) {
        next = next.replaceAll("import('./LegacySetupScreen.tsx')", 'Promise.resolve({ LegacySetupScreen: () => null })')
      }
      if (id.endsWith('/GuestsTab.tsx') && /export const rsvpBySideEnabled = false/.test(source)) {
        next = next.replaceAll("void import('./RsvpBySide.tsx')", 'void Promise.resolve(null)')
      }
      return next === code ? null : { code: next, map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), parkDisabledSlices()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
