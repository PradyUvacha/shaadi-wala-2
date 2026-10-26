/** Setup, join, and every other screen before a wedding exist have no tabs to switch. */
export function showBottomNav(pathname: string, hasWedding: boolean): boolean {
  if (!hasWedding) return false
  if (pathname === '/setup' || pathname.startsWith('/invite')) return false
  return true
}
