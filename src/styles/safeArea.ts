/** Capacitor sets these inline on Android 15+. env() covers iOS and mobile browsers. */
export const safeTop = 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))'
export const safeBottom = 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))'
export const headerPadding = `max(52px, calc(16px + ${safeTop})) 20px 20px`
export const screenBottom = `calc(108px + ${safeBottom})`
