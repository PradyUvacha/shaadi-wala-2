import { normalizeBundle } from './bundle.ts'
import type { WeddingBundle } from '../types.ts'

const PREVIEW_KEY = 'shaadi-wala.preview'

export function readPreview(): WeddingBundle | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeddingBundle
    if (!parsed?.wedding?.id || !Array.isArray(parsed.tasks)) return null
    return normalizeBundle(parsed)
  } catch {
    return null
  }
}

export function writePreview(bundle: WeddingBundle | null): void {
  if (!bundle) {
    sessionStorage.removeItem(PREVIEW_KEY)
    return
  }
  sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(bundle))
}
