import { SIZE } from './tokens.ts'

/** Capacitor sets these inline on Android 15+. env() covers iOS and mobile browsers. */
export const safeTop = 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))'
export const safeBottom = 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))'
export const headerPadding = `max(52px, calc(16px + ${safeTop})) 20px 20px`
/** The bar sits in the shell column, so screens only need a little air above it. */
export const screenBottom = '24px'
/** List screens clear the FAB on `.app-shell-scroll`, not on an inner page. */
export const listAboveFab = `calc(${SIZE.fab}px + 16px + ${safeBottom})`
