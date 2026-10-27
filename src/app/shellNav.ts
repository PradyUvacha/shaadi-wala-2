const FAB_LISTS = ['/planning', '/tasks', '/guests', '/budget', '/timeline']

/** Screens whose first cards sit above the add button. */
export function listHasFab(pathname: string): boolean {
  return FAB_LISTS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** Setup, join, and every other screen before a wedding exist have no tabs to switch. */
export function showBottomNav(pathname: string, hasWedding: boolean): boolean {
  if (!hasWedding) return false
  if (pathname === '/setup' || pathname.startsWith('/invite')) return false
  return true
}
