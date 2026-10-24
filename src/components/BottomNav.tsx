import { NavLink } from 'react-router-dom'
import { useWedding } from '../state/wedding-context.ts'
import { COLORS } from '../styles/tokens.ts'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/tasks', label: 'Tasks', icon: '✓', end: false, showCount: true },
  { to: '/budget', label: 'Budget', icon: '💰', end: false },
  { to: '/guests', label: 'Guests', icon: '👥', end: false },
  { to: '/timeline', label: 'Timeline', icon: '📅', end: false },
]

export function BottomNav() {
  const { bundle } = useWedding()
  const pending = bundle?.tasks.filter((task) => task.status === 'Pending').length ?? 0
  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #E8D4B0', display: 'flex', justifyContent: 'space-around', padding: '8px 0 calc(8px + env(safe-area-inset-bottom))', zIndex: 200, boxShadow: '0 -4px 20px rgba(139,0,0,0.1)' }}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 8px', position: 'relative', minWidth: 52 }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? `${COLORS.crimson}15` : 'transparent' }}>
                <span style={{ fontSize: tab.to === '/tasks' ? 16 : 18, color: isActive ? COLORS.crimson : '#8B6060' }}>{tab.icon}</span>
              </span>
              {tab.showCount && pending > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 4, background: COLORS.crimson, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 99, padding: '0 4px', minWidth: 14, textAlign: 'center' }}>{pending}</span>
              )}
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? COLORS.crimson : '#8B6060' }}>{tab.label}</span>
              {isActive && <span style={{ position: 'absolute', bottom: -8, width: 20, height: 2, borderRadius: 99, background: COLORS.crimson }} />}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  )
}
