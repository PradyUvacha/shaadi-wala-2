import { lazy, Suspense } from 'react'
import { legacyOnboardingEnabled } from '../onboarding/flag.ts'
import { CreateWeddingScreen } from './CreateWeddingScreen.tsx'

const LegacySetupScreen = legacyOnboardingEnabled
  ? lazy(() => import('./LegacySetupScreen.tsx').then((module) => ({ default: module.LegacySetupScreen })))
  : null

export function SetupScreen() {
  if (LegacySetupScreen) {
    return (
      <Suspense fallback={null}>
        <LegacySetupScreen />
      </Suspense>
    )
  }
  return <CreateWeddingScreen />
}
