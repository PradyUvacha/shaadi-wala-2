import { SIZE } from './tokens.ts'

/** Capacitor sets these inline on Android 15+. env() covers iOS and mobile browsers. */
export const safeTop = 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))'
export const safeBottom = 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))'
export const headerPadding = `max(52px, calc(16px + ${safeTop})) 20px 20px`
/** Bottom nav height, measured on the bar so a larger text size can grow it. */
const navHeight = `var(--bottom-nav-height, calc(${SIZE.nav}px + ${safeBottom}))`
export const screenBottom = `calc(${navHeight} + 24px)`
/** Clears the nav, the 56px add button, the 16px gap under it, and 16px above it. */
export const listAboveFab = `calc(${navHeight} + ${SIZE.fab}px + 32px)`
