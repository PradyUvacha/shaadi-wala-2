import { useNavigate } from 'react-router-dom'
import { MOTIVATIONAL_QUOTES } from '../../data/content.ts'
import { MehendiPattern, ProgressRing } from '../../components/ui.tsx'
import { FeedList } from '../feed/FeedList.tsx'
import { useAnnouncementFeed } from '../feed/useAnnouncementFeed.ts'
import { canPostFeed, canSeeBudget } from '../../lib/access.ts'
import { formatDate, formatInrCompact, money, quoteForDay, weddingCountdown } from '../../lib/format.ts'
import { formatWhen } from '../../lib/when.ts'
import { priorityTasks, recentActivity, sideGuests } from '../../lib/homeView.ts'
import { familySettlement, percent } from '../../lib/planning.ts'
import { rollupWedding } from '../../lib/rollup.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS, TYPE } from '../../styles/tokens.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import type { MemberRole, Side, WeddingBundle } from '../../types.ts'

export function HomeTab() {
  const navigate = useNavigate()
  const { bundle, notice, clearNotice } = useWedding()
  if (!bundle) return null
  const { tasks, budget, guests, wedding, displayName } = bundle
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length
  const pendingTasks = tasks.filter((task) => task.status !== 'Completed').length
  const rolled = rollupWedding(budget, tasks)
  const confirmedGuests = guests.filter((guest) => guest.status === 'Confirmed').length
  const countdown = weddingCountdown(wedding.weddingDate)
  const countdownKicker = countdown.headline === '—' ? '🪔' : countdown.days > 0 ? '🪔 दिन बाकी है' : countdown.days === 0 ? '🪔 आज' : '🪔'
  const taskPct = percent(completedTasks, tasks.length)
  const budgetPct = percent(Number(rolled.actualRupees), Number(rolled.budgetRupees))
  const guestPct = percent(confirmedGuests, guests.length)
  const priorityTasks = tasks.filter((task) => task.priority === 'High' && task.status !== 'Completed').slice(0, 3)
  const quote = quoteForDay(MOTIVATIONAL_QUOTES)
  const role = bundle.membership.role
  if (role === 'family' || role === 'friend' || role === 'planner') {
    return <MemberHome bundle={bundle} />
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 70%,${COLORS.appBar} 100%)`, padding: headerPadding, position: 'relative', overflow: 'hidden' }}>
        <MehendiPattern />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontSize: TYPE.small, color: COLORS.gold, fontWeight: 500, letterSpacing: 1 }}>NAMASTE,</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontSize: TYPE.small, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>{wedding.coupleNames}{wedding.city ? ` · ${wedding.city}` : ''}</div>
            </div>
            <button type="button" onClick={() => navigate('/profile')} style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '8px 12px', fontSize: TYPE.body, color: '#fff', fontWeight: 700, cursor: 'pointer', minHeight: 48 }}>
              Profile
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ margin: '12px 16px 0', background: COLORS.goldTint, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, fontSize: TYPE.small, color: COLORS.ink }}>
          {notice}
          <button type="button" onClick={clearNotice} style={{ marginLeft: 8, background: 'none', border: 'none', color: COLORS.crimson, fontWeight: 700, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ margin: 16, background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: TYPE.small, color: COLORS.gold, marginBottom: 8 }}>{countdownKicker}</div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: countdown.headline.includes(' ') ? 32 : 72, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{countdown.headline}</div>
        <div style={{ fontSize: TYPE.small, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>{countdown.caption}</div>
        <div style={{ color: COLORS.gold, fontSize: TYPE.small, marginTop: 6 }}>{formatDate(wedding.weddingDate)}</div>
      </div>

      <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: COLORS.ink, marginBottom: 16 }}>Your wedding progress</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <ProgressRing pct={taskPct} label="Tasks" sublabel={`${completedTasks}/${tasks.length} done`} color={COLORS.crimson} onClick={() => navigate('/planning')} />
          <ProgressRing pct={budgetPct} label="Budget" sublabel={`${formatInrCompact(Number(rolled.actualRupees))} spent`} color={COLORS.goldText} onClick={() => navigate('/budget')} />
          <ProgressRing pct={guestPct} label="RSVPs" sublabel={`${confirmedGuests}/${guests.length} confirmed`} color={COLORS.green} onClick={() => navigate('/guests')} />
        </div>
      </div>

      <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Pending', value: pendingTasks, color: COLORS.crimson },
          { label: 'In Progress', value: tasks.filter((task) => task.status === 'In Progress').length, color: COLORS.orangeText },
          { label: 'Done', value: completedTasks, color: COLORS.green },
        ].map((stat) => (
          <button key={stat.label} type="button" onClick={() => navigate('/planning')} style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', minHeight: 48 }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: TYPE.small, color: COLORS.muted, fontWeight: 600 }}>{stat.label}</div>
          </button>
        ))}
      </div>

      {priorityTasks.length > 0 && (
        <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: COLORS.ink }}>Priority tasks</div>
            <button type="button" onClick={() => navigate('/planning')} style={{ background: 'none', border: 'none', color: COLORS.goldText, fontSize: TYPE.body, cursor: 'pointer', fontWeight: 600, minHeight: 48 }}>
              View all
            </button>
          </div>
          {priorityTasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.crimson, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: TYPE.small, fontWeight: 600, color: COLORS.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{task.category} · {task.dueDate || 'No date'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: '0 16px 16px', background: COLORS.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: TYPE.body, color: COLORS.ink, lineHeight: 1.6, fontStyle: 'italic' }}>"{quote}"</div>
      </div>
    </div>
  )
}

function MemberHome({ bundle }: { bundle: WeddingBundle }) {
  const navigate = useNavigate()
  const role = bundle.membership.role
  const viewerSide = bundle.membership.side
  const seeMoney = canSeeBudget(role)
  const { posts } = useAnnouncementFeed(bundle.wedding.id, true)
  const countdown = weddingCountdown(bundle.wedding.weddingDate)
  const tasks = priorityTasks(bundle.tasks, role, viewerSide)
  const guests = sideGuests(bundle.guests, role, viewerSide)
  const activity = recentActivity({
    tasks: bundle.tasks,
    guests: bundle.guests,
    posts,
    authors: bundle.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      side: member.side,
      displayName: member.displayName,
    })),
    members: bundle.members,
    role,
    viewerSide,
  })
  const settlement = familySettlement(bundle.budget, bundle.tasks)
  const share = sideShare(settlement, role, viewerSide)

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 70%,${COLORS.appBar} 100%)`, padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: '#fff', fontWeight: 700 }}>{bundle.displayName}</div>
        <div style={{ fontSize: TYPE.small, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>{bundle.wedding.coupleNames}</div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 40, color: '#fff', fontWeight: 700, marginTop: 12 }}>{countdown.headline}</div>
        <div style={{ fontSize: TYPE.small, color: COLORS.gold }}>{countdown.caption}</div>
      </div>
      <section style={{ margin: 16 }}>
        <h2 style={heading}>Priority tasks</h2>
        {tasks.length === 0 ? <p style={muted}>No tasks on your side.</p> : tasks.map((task) => (
          <button key={task.id} type="button" onClick={() => navigate('/planning')} style={rowButton}>
            <strong>{task.title}</strong>
            <span style={muted}>{task.priority}{task.dueDate ? ` · ${task.dueDate}` : ''}{seeMoney && role === 'planner' && task.actualCost != null ? ` · ${money(task.actualCost, '₹')}` : ''}</span>
          </button>
        ))}
      </section>
      <section style={{ margin: 16 }}>
        <h2 style={heading}>Recent activity</h2>
        {activity.length === 0 ? <p style={muted}>No activity yet.</p> : activity.slice(0, 12).map((item) => (
          <p key={item.id} style={{ margin: '8px 0', fontSize: TYPE.small, color: COLORS.ink }}>
            {item.text} · {item.who} · {formatWhen(item.at)}
          </p>
        ))}
      </section>
      <section style={{ margin: 16 }}>
        <h2 style={heading}>{role === 'planner' ? 'Guests' : "Your side's guests"}</h2>
        {guests.length === 0 ? <p style={muted}>No guests yet.</p> : guests.map((guest) => (
          <p key={guest.id} style={{ margin: '4px 0', fontSize: TYPE.small }}>{guest.name}</p>
        ))}
      </section>
      {seeMoney && share ? (
        <section style={{ margin: 16 }}>
          <h2 style={heading}>Budget share</h2>
          <p style={{ fontSize: TYPE.body, color: COLORS.ink }}>{share}</p>
        </section>
      ) : null}
      <section style={{ margin: 16 }}>
        <h2 style={heading}>Announcements</h2>
        <FeedList
          posts={posts}
          authors={bundle.members.map((member) => ({
            userId: member.userId,
            role: member.role,
            side: member.side,
            displayName: member.displayName,
          }))}
          canPost={false}
          currentUserId={null}
          onCreate={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
        />
        {canPostFeed(role) ? (
          <button type="button" onClick={() => navigate('/feed')} style={{ ...rowButton, color: COLORS.crimson, fontWeight: 700 }}>Post an announcement</button>
        ) : null}
      </section>
    </div>
  )
}

function sideShare(
  settlement: { brideShare: number; groomShare: number },
  role: MemberRole,
  side: Side | null,
): string | null {
  if (role === 'planner') {
    return `Bride ${money(settlement.brideShare, '₹')} · Groom ${money(settlement.groomShare, '₹')}`
  }
  if (role === 'family' && side === 'bride') return money(settlement.brideShare, '₹')
  if (role === 'family' && side === 'groom') return money(settlement.groomShare, '₹')
  return null
}

const heading = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: COLORS.ink, margin: '0 0 8px' }
const muted = { fontSize: TYPE.small, color: COLORS.muted, margin: 0 }
const rowButton = { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', width: '100%', minHeight: 48, border: 'none', background: 'transparent', padding: '8px 0', cursor: 'pointer', color: COLORS.ink }
