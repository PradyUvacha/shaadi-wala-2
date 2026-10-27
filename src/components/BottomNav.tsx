import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { canSeeBudget } from '../lib/access.ts'
import { useWedding } from '../state/wedding-context.ts'
import { COLORS, SIZE, TYPE, WEIGHT } from '../styles/tokens.ts'

const tabs = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/planning', label: 'Planning', icon: 'clipboard' },
  { to: '/budget', label: 'Budget', icon: 'wallet' },
  { to: '/guests', label: 'Guests', icon: 'users' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] as const

function isTabActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/planning') return pathname === '/planning' || pathname.startsWith('/planning/') || pathname === '/tasks' || pathname.startsWith('/tasks/')
  if (to === '/settings') return pathname === '/settings' || pathname.startsWith('/settings/') || pathname.startsWith('/profile/settings')
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { bundle, mode } = useWedding()
  const navRef = useRef<HTMLElement>(null)
  const visible = tabs.filter((tab) => tab.to !== '/budget' || mode === 'preview' || canSeeBudget(bundle?.membership.role))

  useEffect(() => {
    const bar = navRef.current
    if (!bar) return
    const apply = () => {
      document.documentElement.style.setProperty('--bottom-nav-height', `${Math.ceil(bar.getBoundingClientRect().height)}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [visible.length])

  return (
    <nav ref={navRef} className="bottom-nav" aria-label="Primary" style={{ background: '#fff', borderTop: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'stretch', height: 'auto', minHeight: `calc(${SIZE.nav}px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))`, padding: '0 var(--safe-area-inset-right, env(safe-area-inset-right, 0px)) var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) var(--safe-area-inset-left, env(safe-area-inset-left, 0px))' }}>
      {visible.map((tab) => {
        const active = isTabActive(pathname, tab.to)
        const color = active ? COLORS.crimson : COLORS.muted
        return (
          <button key={tab.to} type="button" aria-label={tab.label} aria-current={active ? 'page' : undefined} onClick={() => navigate(tab.to)} style={{ flex: '1 1 0', minWidth: 0, minHeight: SIZE.tap, border: 'none', background: 'transparent', color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', padding: '6px 2px 4px', position: 'relative' }}>
            <NavIcon name={tab.icon} />
            <span className="nav-label" style={{ fontSize: TYPE.small, fontWeight: active ? WEIGHT.semibold : WEIGHT.medium }}>{tab.label}</span>
            {active && <span aria-hidden style={{ width: 4, height: 4, borderRadius: 99, background: COLORS.crimson, marginTop: 4, flex: '0 0 auto' }} />}
          </button>
        )
      })}
    </nav>
  )
}

function NavIcon({ name }: { name: string }) {
  const common = { className: 'nav-icon', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'home') {
    return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>
  }
  if (name === 'clipboard') {
    return <svg {...common}><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4.5h6v2H9zM9 11h6M9 15h4" /></svg>
  }
  if (name === 'wallet') {
    return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" /></svg>
  }
  if (name === 'users') {
    return <svg {...common}><path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8" /></svg>
  }
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>
}
