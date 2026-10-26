import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { COLORS } from '../styles/tokens.ts'
import { labelStyle } from '../styles/ui.ts'

export function MehendiPattern() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} viewBox="0 0 400 400" aria-hidden="true">
      <g fill={COLORS.gold}>
        <circle cx="50" cy="50" r="30" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1.5" />
        <circle cx="50" cy="50" r="20" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1" />
        <circle cx="50" cy="50" r="5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse
            key={angle}
            cx={50 + 25 * Math.cos((angle * Math.PI) / 180)}
            cy={50 + 25 * Math.sin((angle * Math.PI) / 180)}
            rx="6"
            ry="3"
            transform={`rotate(${angle},${50 + 25 * Math.cos((angle * Math.PI) / 180)},${50 + 25 * Math.sin((angle * Math.PI) / 180)})`}
          />
        ))}
        <circle cx="350" cy="350" r="40" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1.5" />
        <circle cx="350" cy="350" r="5" />
        <path d="M200,10 Q220,40 200,70 Q180,40 200,10Z" />
        <path d="M200,330 Q220,360 200,390 Q180,360 200,330Z" />
      </g>
    </svg>
  )
}

export function Celebration({ active, onDone }: { active: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(onDone, 1800)
    return () => clearTimeout(timer)
  }, [active, onDone])
  if (!active) return null
  const emojis = ['🎉', '✨', '🪔', '🌸', '💐', '🎊', '⭐']
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} aria-hidden="true">
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index / 24) * 360
        const distance = 80 + ((index * 37) % 120)
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              fontSize: 18 + (index % 5) * 3,
              ['--tx' as string]: `${Math.cos((angle * Math.PI) / 180) * distance}px`,
              ['--ty' as string]: `${Math.sin((angle * Math.PI) / 180) * distance}px`,
              animation: 'confetti 1.6s ease-out forwards',
              animationDelay: `${(index % 6) * 0.05}s`,
            }}
          >
            {emojis[index % emojis.length]}
          </div>
        )
      })}
    </div>
  )
}

export function ProgressRing({
  pct,
  label,
  sublabel,
  color,
  onClick,
}: {
  pct: number
  label: string
  sublabel: string
  color: string
  onClick?: () => void
}) {
  const radius = 40
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: onClick ? 'pointer' : 'default', gap: 6, background: 'none', border: 'none', padding: 0 }}
    >
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#E8D4B0" strokeWidth="7" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'Playfair Display', Georgia, serif" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#5A2020' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#8B5050' }}>{sublabel}</div>
      </div>
    </button>
  )
}

export function Badge({ color, children, small }: { color: string; children: ReactNode; small?: boolean }) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 99,
        padding: small ? '1px 7px' : '2px 10px',
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function Modal({
  open,
  onClose,
  children,
  title,
  headerColor,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title: string
  headerColor?: string
}) {
  if (!open) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', background: '#FFF9F0', borderRadius: '20px 20px 0 0', animation: 'slideUp 0.3s ease' }}>
        <div
          style={{
            background: headerColor || `linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,
            padding: '16px 20px',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
        >
          <span style={{ color: '#fff', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17 }}>{title}</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function FAB({ onClick }: { onClick: () => void }) {
  const style: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(90px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))',
    right: 'max(20px, calc((100vw - 480px) / 2 + 20px))',
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: `linear-gradient(135deg,${COLORS.crimson},${COLORS.saffron})`,
    border: 'none',
    color: '#fff',
    fontSize: 28,
    cursor: 'pointer',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(139,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'glow 2s ease-in-out infinite',
  }
  return (
    <button type="button" onClick={onClick} aria-label="Add" style={style}>
      +
    </button>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p style={{ color: '#8B0000', background: '#F8E4E4', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>{message}</p>
}

export function Splash() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg,${COLORS.maroon},${COLORS.crimson})`, color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 42 }}>💍</div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700 }}>Shaadi Wala</div>
      </div>
    </div>
  )
}
