import { useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS, MOTIVATIONAL_QUOTES } from '../../data/content.ts'
import { Badge, MehendiPattern, ProgressRing } from '../../components/ui.tsx'
import { formatDate, formatInrCompact, quoteForDay, weddingCountdown } from '../../lib/format.ts'
import { inrBudgetTotals, percent, plannerLevel, unlockedAchievementIds } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { CATEGORY_COLORS, COLORS } from '../../styles/tokens.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'

export function HomeTab() {
  const navigate = useNavigate()
  const { bundle, notice, clearNotice } = useWedding()
  if (!bundle) return null
  const { tasks, budget, guests, wedding, displayName } = bundle
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length
  const { estimated, actual } = inrBudgetTotals(budget)
  const confirmedGuests = guests.filter((guest) => guest.status === 'Confirmed').length
  const countdown = weddingCountdown(wedding.weddingDate)
  const countdownKicker = countdown.headline === '—' ? '🪔' : countdown.days > 0 ? '🪔 दिन बाकी है' : countdown.days === 0 ? '🪔 आज' : '🪔'
  const taskPct = percent(completedTasks, tasks.length)
  const budgetPct = percent(actual, estimated)
  const guestPct = percent(confirmedGuests, guests.length)
  const level = plannerLevel(completedTasks)
  const priorityTasks = tasks.filter((task) => task.priority === 'High' && task.status !== 'Completed').slice(0, 3)
  const quote = quoteForDay(MOTIVATIONAL_QUOTES)
  const unlocked = unlockedAchievementIds({
    completedTasks,
    budgetCount: budget.length,
    guestCount: guests.length,
  })

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 60%,${COLORS.saffron}33 100%)`, padding: headerPadding, position: 'relative', overflow: 'hidden' }}>
        <MehendiPattern />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: '#FFD88B', fontWeight: 500, letterSpacing: 1 }}>🙏 NAMASTE,</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>💐 {wedding.coupleNames}{wedding.city ? ` · ${wedding.city}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#FFD88B', fontWeight: 600 }}>👑 Level {level}</div>
              <button type="button" onClick={() => navigate('/profile')} style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '8px 12px', fontSize: 16, color: '#fff', fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ margin: '12px 16px 0', background: '#FFF3E0', border: `1px solid ${COLORS.saffron}`, borderRadius: 12, padding: 12, fontSize: 13, color: '#5A3010' }}>
          {notice}
          <button type="button" onClick={clearNotice} style={{ marginLeft: 8, background: 'none', border: 'none', color: COLORS.crimson, fontWeight: 700, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ margin: 16, background: `linear-gradient(135deg,${COLORS.maroon},#3D0000)`, borderRadius: 20, padding: '24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden', animation: 'glow 3s ease-in-out infinite' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: COLORS.lightGold, marginBottom: 8 }}>{countdownKicker}</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: countdown.headline.includes(' ') ? 32 : 72, fontWeight: 900, color: '#fff', lineHeight: 1.1, animation: 'pulse 2s ease-in-out infinite' }}>{countdown.headline}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>{countdown.caption}</div>
          <div style={{ color: COLORS.lightGold, fontSize: 12, marginTop: 6 }}>📅 {formatDate(wedding.weddingDate)}</div>
          <div style={{ color: COLORS.gold, fontSize: 11, marginTop: 8, letterSpacing: 3 }}>✨ 💐 ✨ 💐 ✨</div>
        </div>
      </div>

      <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.parchment}`, boxShadow: '0 2px 12px rgba(139,0,0,0.07)' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: COLORS.crimson, marginBottom: 16 }}>🎯 Your Wedding Progress</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <ProgressRing pct={taskPct} label="Tasks" sublabel={`${completedTasks}/${tasks.length} done`} color={COLORS.crimson} onClick={() => navigate('/tasks')} />
          <ProgressRing pct={budgetPct} label="Budget" sublabel={`${formatInrCompact(actual)} spent`} color={COLORS.gold} onClick={() => navigate('/budget')} />
          <ProgressRing pct={guestPct} label="RSVPs" sublabel={`${confirmedGuests}/${guests.length} confirmed`} color={COLORS.green} onClick={() => navigate('/guests')} />
        </div>
      </div>

      <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Pending', value: tasks.filter((task) => task.status === 'Pending').length, color: COLORS.crimson, icon: '🔴' },
          { label: 'In Progress', value: tasks.filter((task) => task.status === 'In Progress').length, color: COLORS.saffron, icon: '⏳' },
          { label: 'Done', value: completedTasks, color: COLORS.green, icon: '✅' },
        ].map((stat) => (
          <button key={stat.label} type="button" onClick={() => navigate('/tasks')} style={{ background: `linear-gradient(135deg,${stat.color}15,${stat.color}08)`, border: `1px solid ${stat.color}30`, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 20 }}>{stat.icon}</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#7A3030', fontWeight: 600 }}>{stat.label}</div>
          </button>
        ))}
      </div>

      <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.parchment}` }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: COLORS.crimson, marginBottom: 14 }}>🏆 Achievements</div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlocked.includes(achievement.id)
            return (
              <div key={achievement.id} style={{ minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: isUnlocked ? `linear-gradient(135deg,${COLORS.gold},${COLORS.saffron})` : '#E0D0C0', border: isUnlocked ? `2px solid ${COLORS.gold}` : '2px solid #CCC', filter: isUnlocked ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                  {isUnlocked ? achievement.icon : '🔒'}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: isUnlocked ? COLORS.crimson : '#999', lineHeight: 1.2 }}>{achievement.title}</div>
              </div>
            )
          })}
        </div>
      </div>

      {priorityTasks.length > 0 && (
        <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.parchment}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: COLORS.crimson }}>🔥 Priority Tasks</div>
            <button type="button" onClick={() => navigate('/tasks')} style={{ background: 'none', border: 'none', color: COLORS.gold, fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
              View All →
            </button>
          </div>
          {priorityTasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F0E0CC' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.crimson, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2A0A0A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                <div style={{ fontSize: 11, color: '#8B5050' }}>{task.category} • {task.dueDate || 'No date'}</div>
              </div>
              <Badge color={CATEGORY_COLORS[task.category] || '#666'} small>{task.category}</Badge>
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: '0 16px 16px', background: `linear-gradient(135deg,${COLORS.maroon}15,${COLORS.gold}15)`, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.gold}40`, textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>✨</div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: COLORS.maroon, lineHeight: 1.6, fontStyle: 'italic' }}>"{quote}"</div>
      </div>
    </div>
  )
}
