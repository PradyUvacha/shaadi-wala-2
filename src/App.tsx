import { useState, useEffect } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string;
}

interface PartPayment {
  amount: number;
  paidBy: string;
  date: string;
  notes: string;
}

interface Split {
  name: string;
  pct: number;
}

interface BudgetItem {
  id: string;
  category: string;
  currency: string;
  estimated: number;
  actual: number;
  paid: boolean;
  notes: string;
  partPayments: PartPayment[];
  splits: Split[];
}

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  meal: string;
  plusOnes: number;
}

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: string;
  description: string;
}

interface WeddingSetup {
  coupleNames: string;
  weddingDate: string;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const COLORS = {
  crimson: "#8B0000",
  maroon: "#6B0000",
  deepRed: "#A01010",
  gold: "#C9A84C",
  lightGold: "#E8D48B",
  saffron: "#FF6B00",
  ivory: "#FDF6EC",
  parchment: "#F5E6CC",
  darkBg: "#1A0505",
  cardBg: "#FFF9F0",
  green: "#2D7A4F",
  orange: "#E8720C",
};

const CATEGORY_COLORS: Record<string, string> = {
  Venue: "#7C3AED",
  Catering: "#EA580C",
  Decor: "#DB2777",
  Attire: "#B45309",
  Invitations: "#BE185D",
  Other: "#92400E",
};

const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: "₹", label: "INR" },
  USD: { symbol: "$", label: "USD" },
  EUR: { symbol: "€", label: "EUR" },
  GBP: { symbol: "£", label: "GBP" },
};

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_TASKS: Task[] = [
  { id: "t1", title: "Book Wedding Venue", description: "Grand Palace Hotel confirmed", category: "Venue", priority: "High", status: "Completed", dueDate: "2026-06-01" },
  { id: "t2", title: "Book Pandit Ji", description: "For Saat Phere & rituals", category: "Other", priority: "High", status: "In Progress", dueDate: "2026-06-15" },
  { id: "t3", title: "Bridal Lehenga", description: "Visit Sabyasachi boutique", category: "Attire", priority: "High", status: "Pending", dueDate: "2026-05-20" },
  { id: "t4", title: "Mehendi Ceremony Setup", description: "Artist booking & decor", category: "Decor", priority: "Medium", status: "Pending", dueDate: "2026-06-10" },
  { id: "t5", title: "Book Caterer", description: "700 guest capacity required", category: "Catering", priority: "High", status: "Completed", dueDate: "2026-05-15" },
  { id: "t6", title: "Wedding Invitations", description: "Design & print 500 cards", category: "Invitations", priority: "Medium", status: "In Progress", dueDate: "2026-05-25" },
  { id: "t7", title: "Sangeet Arrangements", description: "DJ, stage, lighting", category: "Decor", priority: "Medium", status: "Pending", dueDate: "2026-06-08" },
  { id: "t8", title: "Baraat Vehicle", description: "Decorated horse + vintage car", category: "Other", priority: "Low", status: "Pending", dueDate: "2026-06-20" },
];

const DEMO_BUDGET: BudgetItem[] = [
  { id: "b1", category: "Venue", currency: "INR", estimated: 500000, actual: 450000, paid: true, notes: "Grand Palace Hotel", partPayments: [{ amount: 150000, paidBy: "Mr. Sharma", date: "2026-01-15", notes: "Booking advance" }, { amount: 300000, paidBy: "Rahul", date: "2026-03-01", notes: "Second installment" }], splits: [{ name: "Bride's Family", pct: 60 }, { name: "Groom's Family", pct: 40 }] },
  { id: "b2", category: "Catering", currency: "INR", estimated: 350000, actual: 380000, paid: false, notes: "700 covers, veg + non-veg", partPayments: [{ amount: 100000, paidBy: "Priya", date: "2026-02-10", notes: "Advance" }], splits: [{ name: "Bride's Family", pct: 50 }, { name: "Groom's Family", pct: 50 }] },
  { id: "b3", category: "Decor", currency: "INR", estimated: 200000, actual: 185000, paid: true, notes: "Floral + lighting + stage", partPayments: [], splits: [{ name: "Groom's Family", pct: 100 }] },
  { id: "b4", category: "Attire", currency: "USD", estimated: 3000, actual: 2800, paid: false, notes: "Lehenga + Sherwani", partPayments: [], splits: [] },
  { id: "b5", category: "Invitations", currency: "INR", estimated: 25000, actual: 22000, paid: true, notes: "500 cards printed", partPayments: [], splits: [] },
  { id: "b6", category: "Other", currency: "INR", estimated: 80000, actual: 65000, paid: false, notes: "Pandit, transportation, misc", partPayments: [], splits: [] },
];

const DEMO_GUESTS: Guest[] = [
  { id: "g1", name: "Mr. & Mrs. Sharma", email: "sharma@email.com", phone: "9876543210", status: "Confirmed", meal: "Vegetarian", plusOnes: 2 },
  { id: "g2", name: "Anita Mehta", email: "anita@email.com", phone: "9876543211", status: "Confirmed", meal: "Non-Vegetarian", plusOnes: 1 },
  { id: "g3", name: "Rajesh Kapoor", email: "rajesh@email.com", phone: "", status: "Pending", meal: "Vegetarian", plusOnes: 0 },
  { id: "g4", name: "Sunita Verma", email: "sunita@email.com", phone: "9876543212", status: "Declined", meal: "", plusOnes: 0 },
  { id: "g5", name: "Vikram Singh", email: "", phone: "9876543213", status: "Confirmed", meal: "Jain", plusOnes: 3 },
  { id: "g6", name: "Pooja & Amit Joshi", email: "pooja@email.com", phone: "9876543214", status: "Pending", meal: "Vegetarian", plusOnes: 2 },
];

const DEMO_MILESTONES: Milestone[] = [
  { id: "m1", name: "Roka Ceremony", date: "2025-12-20", status: "Completed", description: "Official engagement announcement" },
  { id: "m2", name: "Venue Booking", date: "2026-01-15", status: "Completed", description: "Grand Palace Hotel confirmed" },
  { id: "m3", name: "Sangeet Night", date: "2026-06-18", status: "Upcoming", description: "Family performances & DJ night" },
  { id: "m4", name: "Mehendi Ceremony", date: "2026-06-19", status: "Upcoming", description: "Traditional mehendi & haldi" },
  { id: "m5", name: "Wedding Day", date: "2026-06-20", status: "Upcoming", description: "The Big Day! 🪔" },
];

const HINDU_TEMPLATE = [
  { title: "Roka Ceremony", category: "Other", priority: "High" },
  { title: "Sagai/Engagement", category: "Other", priority: "High" },
  { title: "Book Wedding Venue", category: "Venue", priority: "High" },
  { title: "Book Pandit Ji", category: "Other", priority: "High" },
  { title: "Sangeet Arrangements", category: "Decor", priority: "High" },
  { title: "Mehendi Ceremony Setup", category: "Decor", priority: "Medium" },
  { title: "Haldi Ceremony Prep", category: "Other", priority: "Medium" },
  { title: "Mandap Decoration", category: "Decor", priority: "High" },
  { title: "Bridal Lehenga/Saree", category: "Attire", priority: "High" },
  { title: "Groom's Sherwani", category: "Attire", priority: "High" },
  { title: "Bridal Jewelry", category: "Attire", priority: "High" },
  { title: "Wedding Invitations", category: "Invitations", priority: "High" },
  { title: "Book Caterer", category: "Catering", priority: "High" },
  { title: "Menu Tasting", category: "Catering", priority: "Medium" },
  { title: "Sweets/Mithai Order", category: "Catering", priority: "Medium" },
  { title: "Book Photographer", category: "Other", priority: "High" },
  { title: "Book Videographer", category: "Other", priority: "High" },
  { title: "Pre-Wedding Photoshoot", category: "Other", priority: "Medium" },
  { title: "Book DJ/Band", category: "Other", priority: "High" },
  { title: "Flower Decoration", category: "Decor", priority: "High" },
  { title: "Lighting Setup (Diyas)", category: "Decor", priority: "Medium" },
  { title: "Baraat Vehicle (Ghodi/Car)", category: "Other", priority: "High" },
  { title: "Guest Transportation", category: "Other", priority: "Medium" },
  { title: "Finalize Guest List", category: "Other", priority: "High" },
  { title: "Book Hotel Rooms for Guests", category: "Venue", priority: "Medium" },
  { title: "Var Mala/Jaimala Arrangements", category: "Decor", priority: "High" },
  { title: "Saat Phere Setup", category: "Other", priority: "High" },
  { title: "Bidaai Preparations", category: "Other", priority: "High" },
  { title: "Reception Planning", category: "Venue", priority: "High" },
  { title: "Honeymoon Planning", category: "Other", priority: "Medium" },
  { title: "Return Gifts", category: "Other", priority: "Low" },
  { title: "Thank You Cards", category: "Invitations", priority: "Low" },
];

const ACHIEVEMENTS = [
  { id: "first_task", icon: "🏆", title: "First Task", desc: "Create your first task", threshold: 1, type: "tasks_completed" },
  { id: "five_tasks", icon: "⭐", title: "5 Tasks Done", desc: "Complete 5 tasks", threshold: 5, type: "tasks_completed" },
  { id: "ten_tasks", icon: "🎯", title: "10 Tasks Done", desc: "Complete 10 tasks", threshold: 10, type: "tasks_completed" },
  { id: "budget_set", icon: "💰", title: "Budget Boss", desc: "Add first budget item", threshold: 1, type: "budget_items" },
  { id: "guests_10", icon: "💝", title: "10 RSVPs", desc: "Add 10 guests", threshold: 10, type: "guests_total" },
  { id: "guests_5", icon: "👥", title: "Social Star", desc: "Add 5 guests", threshold: 5, type: "guests_total" },
];

const MOTIVATIONAL_QUOTES = [
  "शादी एक नई शुरुआत है — The best story begins with 'I do' ✨",
  "Every detail you plan brings magic to your big day 🪔",
  "Love is not about perfection, it's about the journey together 💐",
  "आपकी शादी, आपके सपनों की तरह हो — May your wedding be as beautiful as your dreams 🌸",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = new Date();
const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
const formatDate = (dateStr: string) => new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const fmtCurrency = (amount: number, currency: string) => `${CURRENCIES[currency]?.symbol || "₹"}${Number(amount || 0).toLocaleString("en-IN")}`;

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Poppins:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Poppins', sans-serif; background: ${COLORS.ivory}; color: #1A0505; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.gold}; border-radius: 2px; }
  input, select, textarea { font-family: 'Poppins', sans-serif; }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
  @keyframes confetti { 0%{opacity:1;transform:translate(0,0) rotate(0deg)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(720deg)} }
  @keyframes glow { 0%,100%{box-shadow:0 0 12px rgba(201,168,76,0.3)} 50%{box-shadow:0 0 24px rgba(201,168,76,0.7)} }
`;

// ─── MEHENDI SVG ──────────────────────────────────────────────────────────────
const MehendiPattern = () => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.06,pointerEvents:"none" }} viewBox="0 0 400 400">
    <g fill={COLORS.gold}>
      <circle cx="50" cy="50" r="30" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="20" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1"/>
      <circle cx="50" cy="50" r="5"/>
      {[0,45,90,135,180,225,270,315].map((a,i)=>(
        <ellipse key={i} cx={50+25*Math.cos(a*Math.PI/180)} cy={50+25*Math.sin(a*Math.PI/180)} rx="6" ry="3" transform={`rotate(${a},${50+25*Math.cos(a*Math.PI/180)},${50+25*Math.sin(a*Math.PI/180)})`}/>
      ))}
      <circle cx="350" cy="350" r="40" fillOpacity="0" stroke={COLORS.gold} strokeWidth="1.5"/>
      <circle cx="350" cy="350" r="5"/>
      <path d="M200,10 Q220,40 200,70 Q180,40 200,10Z"/>
      <path d="M200,330 Q220,360 200,390 Q180,360 200,330Z"/>
    </g>
  </svg>
);

// ─── CELEBRATION ──────────────────────────────────────────────────────────────
const Celebration = ({ active, onDone }: { active: boolean; onDone: () => void }) => {
  useEffect(() => { if (active) { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); } }, [active, onDone]);
  if (!active) return null;
  const emojis = ["🎉","✨","🪔","🌸","💐","🎊","⭐"];
  return (
    <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:9999 }}>
      {Array.from({length:24}).map((_,i) => {
        const angle=(i/24)*360, dist=80+Math.random()*120;
        return (
          <div key={i} style={{ position:"absolute",left:"50%",top:"50%",fontSize:18+Math.random()*14+"px",
            ["--tx" as string]:`${Math.cos(angle*Math.PI/180)*dist}px`,
            ["--ty" as string]:`${Math.sin(angle*Math.PI/180)*dist}px`,
            animation:`confetti 1.6s ease-out forwards`,animationDelay:`${Math.random()*0.3}s` }}>
            {emojis[i%emojis.length]}
          </div>
        );
      })}
    </div>
  );
};

// ─── PROGRESS RING ────────────────────────────────────────────────────────────
const ProgressRing = ({ pct, label, sublabel, color, onClick }: { pct: number; label: string; sublabel: string; color: string; onClick?: () => void }) => {
  const r=40, circ=2*Math.PI*r, offset=circ-(pct/100)*circ;
  return (
    <div onClick={onClick} style={{ display:"flex",flexDirection:"column",alignItems:"center",cursor:onClick?"pointer":"default",gap:6 }}>
      <div style={{ position:"relative",width:96,height:96 }}>
        <svg width="96" height="96" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="48" cy="48" r={r} fill="none" stroke="#E8D4B0" strokeWidth="7"/>
          <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 1s ease" }}/>
        </svg>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <span style={{ fontSize:15,fontWeight:700,color,fontFamily:"'Playfair Display',serif" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:11,fontWeight:600,color:"#5A2020" }}>{label}</div>
        <div style={{ fontSize:10,color:"#8B5050" }}>{sublabel}</div>
      </div>
    </div>
  );
};

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ color, children, small }: { color: string; children: React.ReactNode; small?: boolean }) => (
  <span style={{ background:color+"22",color,border:`1px solid ${color}55`,borderRadius:99,
    padding:small?"1px 7px":"2px 10px",fontSize:small?10:11,fontWeight:600,whiteSpace:"nowrap" as const }}>
    {children}
  </span>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, children, title, headerColor }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string; headerColor?: string }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",background:"rgba(0,0,0,0.6)" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ width:"100%",maxHeight:"92vh",overflowY:"auto",background:"#FFF9F0",borderRadius:"20px 20px 0 0",animation:"slideUp 0.3s ease" }}>
        <div style={{ background:headerColor||`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,padding:"16px 20px",borderRadius:"20px 20px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:2 }}>
          <span style={{ color:"#fff",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:17 }}>{title}</span>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:"20px" }}>{children}</div>
      </div>
    </div>
  );
};

// ─── FIELD ────────────────────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:"block",fontSize:11,fontWeight:600,color:COLORS.crimson,marginBottom:5,textTransform:"uppercase" as const,letterSpacing:"0.5px" }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = { width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0CABB",background:"#FFFAF4",fontSize:14,outline:"none",color:"#2A0A0A" };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance:"none" as const };

// ─── FAB ─────────────────────────────────────────────────────────────────────
const FAB = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} style={{ position:"fixed",bottom:90,right:20,width:56,height:56,borderRadius:"50%",
    background:`linear-gradient(135deg,${COLORS.crimson},${COLORS.saffron})`,border:"none",color:"#fff",
    fontSize:28,cursor:"pointer",zIndex:100,boxShadow:"0 4px 20px rgba(139,0,0,0.5)",
    display:"flex",alignItems:"center",justifyContent:"center",animation:"glow 2s ease-in-out infinite" }}>+</button>
);

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
const HomeTab = ({ tasks, budget, guests, weddingDate, userName, coupleNames, setTab }:
  { tasks: Task[]; budget: BudgetItem[]; guests: Guest[]; weddingDate: string; userName: string; coupleNames: string; setTab: (t: string) => void }) => {
  const completedTasks = tasks.filter(t=>t.status==="Completed").length;
  const totalBudget = budget.filter(b=>b.currency==="INR").reduce((s,b)=>s+b.estimated,0);
  const spentBudget = budget.filter(b=>b.currency==="INR").reduce((s,b)=>s+b.actual,0);
  const confirmedGuests = guests.filter(g=>g.status==="Confirmed").length;
  const days = daysUntil(weddingDate);
  const taskPct = tasks.length ? Math.round((completedTasks/tasks.length)*100) : 0;
  const budgetPct = totalBudget ? Math.round((spentBudget/totalBudget)*100) : 0;
  const guestPct = guests.length ? Math.round((confirmedGuests/guests.length)*100) : 0;
  const level = Math.floor(completedTasks/5)+1;
  const priorityTasks = tasks.filter(t=>t.priority==="High"&&t.status!=="Completed").slice(0,3);
  const quote = MOTIVATIONAL_QUOTES[Math.floor(Date.now()/86400000)%MOTIVATIONAL_QUOTES.length];
  const unlockedIds = ACHIEVEMENTS.filter(a => {
    if (a.type==="tasks_completed") return completedTasks>=a.threshold;
    if (a.type==="budget_items") return budget.length>=a.threshold;
    if (a.type==="guests_total") return guests.length>=a.threshold;
    return false;
  }).map(a=>a.id);

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ background:`linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 60%,${COLORS.saffron}33 100%)`,padding:"52px 20px 28px",position:"relative",overflow:"hidden" }}>
        <MehendiPattern/>
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:12,color:"#FFD88B",fontWeight:500,letterSpacing:1 }}>🙏 NAMASTE,</div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:24,color:"#fff",fontWeight:700,lineHeight:1.2 }}>{userName}</div>
              <div style={{ fontSize:13,color:"rgba(255,255,255,0.8)",marginTop:4 }}>💐 {coupleNames}</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <div style={{ background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"#FFD88B",fontWeight:600 }}>👑 Level {level}</div>
              <div style={{ background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"#FF9E5E",fontWeight:600 }}>🔥 7d</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin:"16px",background:`linear-gradient(135deg,${COLORS.maroon},#3D0000)`,borderRadius:20,padding:"24px 20px",textAlign:"center",position:"relative",overflow:"hidden",animation:"glow 3s ease-in-out infinite" }}>
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ fontSize:13,color:COLORS.lightGold,marginBottom:8 }}>🪔 दिन बाकी है</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:72,fontWeight:900,color:"#fff",lineHeight:1,animation:"pulse 2s ease-in-out infinite" }}>{days>0?days:0}</div>
          <div style={{ fontSize:14,color:"rgba(255,255,255,0.8)",marginTop:8 }}>Days until your Big Day!</div>
          <div style={{ color:COLORS.lightGold,fontSize:12,marginTop:6 }}>📅 {formatDate(weddingDate)}</div>
          <div style={{ color:COLORS.gold,fontSize:11,marginTop:8,letterSpacing:3 }}>✨ 💐 ✨ 💐 ✨</div>
        </div>
      </div>

      <div style={{ margin:"0 16px 16px",background:COLORS.cardBg,borderRadius:16,padding:"18px",border:`1px solid ${COLORS.parchment}`,boxShadow:"0 2px 12px rgba(139,0,0,0.07)" }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:COLORS.crimson,marginBottom:16 }}>🎯 Your Wedding Progress</div>
        <div style={{ display:"flex",justifyContent:"space-around" }}>
          <ProgressRing pct={taskPct} label="Tasks" sublabel={`${completedTasks}/${tasks.length} done`} color={COLORS.crimson} onClick={()=>setTab("tasks")}/>
          <ProgressRing pct={budgetPct} label="Budget" sublabel={`₹${(spentBudget/1000).toFixed(0)}k spent`} color={COLORS.gold} onClick={()=>setTab("budget")}/>
          <ProgressRing pct={guestPct} label="RSVPs" sublabel={`${confirmedGuests}/${guests.length} confirmed`} color={COLORS.green} onClick={()=>setTab("guests")}/>
        </div>
      </div>

      <div style={{ margin:"0 16px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
        {[
          { label:"Pending",value:tasks.filter(t=>t.status==="Pending").length,color:COLORS.crimson,icon:"🔴" },
          { label:"In Progress",value:tasks.filter(t=>t.status==="In Progress").length,color:COLORS.saffron,icon:"⏳" },
          { label:"Done",value:completedTasks,color:COLORS.green,icon:"✅" },
        ].map(s=>(
          <div key={s.label} onClick={()=>setTab("tasks")} style={{ background:`linear-gradient(135deg,${s.color}15,${s.color}08)`,border:`1px solid ${s.color}30`,borderRadius:14,padding:"14px 10px",textAlign:"center",cursor:"pointer" }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10,color:"#7A3030",fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ margin:"0 16px 16px",background:COLORS.cardBg,borderRadius:16,padding:"18px",border:`1px solid ${COLORS.parchment}` }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:COLORS.crimson,marginBottom:14 }}>🏆 Achievements</div>
        <div style={{ display:"flex",gap:12,overflowX:"auto",paddingBottom:4 }}>
          {ACHIEVEMENTS.map(a=>{
            const unlocked=unlockedIds.includes(a.id);
            return (
              <div key={a.id} style={{ minWidth:72,textAlign:"center",flexShrink:0 }}>
                <div style={{ width:52,height:52,borderRadius:"50%",margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
                  background:unlocked?`linear-gradient(135deg,${COLORS.gold},${COLORS.saffron})`:"#E0D0C0",
                  border:unlocked?`2px solid ${COLORS.gold}`:"2px solid #CCC",filter:unlocked?"none":"grayscale(1) opacity(0.4)" }}>
                  {unlocked?a.icon:"🔒"}
                </div>
                <div style={{ fontSize:9,fontWeight:600,color:unlocked?COLORS.crimson:"#999",lineHeight:1.2 }}>{a.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {priorityTasks.length>0&&(
        <div style={{ margin:"0 16px 16px",background:COLORS.cardBg,borderRadius:16,padding:"18px",border:`1px solid ${COLORS.parchment}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:COLORS.crimson }}>🔥 Priority Tasks</div>
            <button onClick={()=>setTab("tasks")} style={{ background:"none",border:"none",color:COLORS.gold,fontSize:12,cursor:"pointer",fontWeight:600 }}>View All →</button>
          </div>
          {priorityTasks.map(t=>(
            <div key={t.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #F0E0CC" }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:COLORS.crimson,flexShrink:0 }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#2A0A0A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{t.title}</div>
                <div style={{ fontSize:11,color:"#8B5050" }}>{t.category} • {t.dueDate}</div>
              </div>
              <Badge color={CATEGORY_COLORS[t.category]||"#666"} small>{t.category}</Badge>
            </div>
          ))}
        </div>
      )}

      <div style={{ margin:"0 16px 16px",background:`linear-gradient(135deg,${COLORS.maroon}15,${COLORS.gold}15)`,borderRadius:16,padding:"18px",border:`1px solid ${COLORS.gold}40`,textAlign:"center" }}>
        <div style={{ fontSize:18,marginBottom:8 }}>✨</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:COLORS.maroon,lineHeight:1.6,fontStyle:"italic" }}>"{quote}"</div>
      </div>
    </div>
  );
};

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
const TasksTab = ({ tasks, setTasks }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) => {
  const [filter, setFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task|null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [form, setForm] = useState<Omit<Task,"id">>({ title:"",description:"",category:"Venue",priority:"Medium",dueDate:"",status:"Pending" });

  const filtered = filter==="All"?tasks:tasks.filter(t=>t.status===filter);
  const completedCount = tasks.filter(t=>t.status==="Completed").length;
  const pct = tasks.length?Math.round((completedCount/tasks.length)*100):0;
  const priorityColors: Record<string,string> = { High:COLORS.crimson, Medium:COLORS.saffron, Low:COLORS.gold };

  const openAdd = () => { setEditTask(null); setForm({title:"",description:"",category:"Venue",priority:"Medium",dueDate:"",status:"Pending"}); setModalOpen(true); };
  const openEdit = (t: Task) => { setEditTask(t); setForm({title:t.title,description:t.description,category:t.category,priority:t.priority,dueDate:t.dueDate,status:t.status}); setModalOpen(true); };
  const save = () => {
    if(!form.title.trim()) return;
    if(editTask) { setTasks(prev=>prev.map(t=>t.id===editTask.id?{...t,...form}:t)); }
    else { setTasks(prev=>[...prev,{...form,id:uid()}]); }
    setModalOpen(false);
  };
  const toggle = (t: Task) => {
    const next = t.status==="Completed"?"Pending":"Completed";
    setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:next}:x));
    if(next==="Completed") setCelebrate(true);
  };
  const del = (id: string) => setTasks(prev=>prev.filter(t=>t.id!==id));
  const loadTemplate = () => {
    const existing = new Set(tasks.map(t=>t.title));
    const newTasks = HINDU_TEMPLATE.filter(t=>!existing.has(t.title)).map(t=>({...t,id:uid(),status:"Pending",description:"",dueDate:""}));
    setTasks(prev=>[...prev,...newTasks]);
    setShowTemplate(false);
  };

  return (
    <div style={{ paddingBottom:100 }}>
      <Celebration active={celebrate} onDone={()=>setCelebrate(false)}/>
      <div style={{ background:`linear-gradient(135deg,${COLORS.saffron},${COLORS.crimson})`,padding:"52px 20px 20px" }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:10 }}>Task Manager</div>
        <div style={{ background:"rgba(255,255,255,0.2)",borderRadius:99,height:8,overflow:"hidden",marginBottom:6 }}>
          <div style={{ height:"100%",width:`${pct}%`,background:"#fff",borderRadius:99,transition:"width 0.8s ease" }}/>
        </div>
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.9)" }}>🎯 {completedCount}/{tasks.length} Tasks Done — {pct}%</div>
      </div>

      <div style={{ margin:"12px 16px 0" }}>
        <button onClick={()=>setShowTemplate(true)} style={{ width:"100%",padding:"10px",borderRadius:12,border:`1.5px dashed ${COLORS.gold}`,background:"transparent",color:COLORS.crimson,fontSize:12,fontWeight:600,cursor:"pointer" }}>
          🕉️ Load Hindu Wedding Checklist ({HINDU_TEMPLATE.length} tasks)
        </button>
      </div>

      <div style={{ display:"flex",gap:8,padding:"12px 16px",overflowX:"auto" }}>
        {["All","Pending","In Progress","Completed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"7px 16px",borderRadius:99,border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:12,fontWeight:600,
            background:filter===f?COLORS.crimson:"#F0E0CC",color:filter===f?"#fff":COLORS.crimson,transition:"all 0.2s" }}>{f}</button>
        ))}
      </div>

      <div style={{ padding:"0 16px" }}>
        {filtered.length===0?(
          <div style={{ textAlign:"center",padding:"60px 20px",color:"#A07070" }}>
            <div style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>✓</div>
            <div style={{ fontSize:16,fontWeight:600 }}>No tasks yet</div>
            <div style={{ fontSize:13,marginTop:4 }}>Add your first task to get started!</div>
          </div>
        ):filtered.map(t=>(
          <div key={t.id} style={{ background:COLORS.cardBg,border:`1px solid ${t.status==="Completed"?"#4CAF5040":"#E8D4B0"}`,borderRadius:14,padding:"14px",marginBottom:10,animation:"fadeIn 0.3s ease",opacity:t.status==="Completed"?0.75:1,transition:"all 0.3s" }}>
            <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
              <button onClick={()=>toggle(t)} style={{ width:24,height:24,borderRadius:"50%",border:`2px solid ${t.status==="Completed"?COLORS.green:COLORS.crimson}`,background:t.status==="Completed"?COLORS.green:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1 }}>
                {t.status==="Completed"&&<span style={{ color:"#fff",fontSize:12 }}>✓</span>}
              </button>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:14,fontWeight:600,color:"#2A0A0A",textDecoration:t.status==="Completed"?"line-through":"none",marginBottom:4 }}>{t.title}</div>
                {t.description&&<div style={{ fontSize:12,color:"#7A5050",marginBottom:6 }}>{t.description}</div>}
                <div style={{ display:"flex",flexWrap:"wrap",gap:5,alignItems:"center" }}>
                  <Badge color={CATEGORY_COLORS[t.category]||"#666"} small>{t.category}</Badge>
                  <Badge color={priorityColors[t.priority]} small>{t.priority}</Badge>
                  {t.dueDate&&<span style={{ fontSize:10,color:"#8B5050" }}>📅 {t.dueDate}</span>}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                <button onClick={()=>openEdit(t)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:COLORS.gold }}>✏️</button>
                <button onClick={()=>del(t.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#CC4444" }}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FAB onClick={openAdd}/>

      <Modal open={showTemplate} onClose={()=>setShowTemplate(false)} title="🕉️ Hindu Wedding Checklist">
        <p style={{ fontSize:13,color:"#5A2020",marginBottom:16,lineHeight:1.6 }}>Load {HINDU_TEMPLATE.length} traditional Hindu wedding tasks. Existing tasks won't be duplicated.</p>
        <button onClick={loadTemplate} style={{ width:"100%",padding:"12px",borderRadius:12,background:`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }}>Load All Tasks</button>
      </Modal>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editTask?"Edit Task":"New Task"}>
        <Field label="Title *"><input style={inputStyle} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Task title"/></Field>
        <Field label="Description"><textarea style={{...inputStyle,minHeight:70,resize:"vertical"}} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Details..."/></Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Field label="Category">
            <select style={selectStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
              {["Venue","Catering","Decor","Attire","Invitations","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select style={selectStyle} value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
              {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        {editTask&&<Field label="Status"><select style={selectStyle} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
          {["Pending","In Progress","Completed"].map(s=><option key={s}>{s}</option>)}
        </select></Field>}
        <Field label="Due Date"><input style={inputStyle} type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))}/></Field>
        <button onClick={save} style={{ width:"100%",padding:"13px",borderRadius:12,background:`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:4 }}>
          {editTask?"Save Changes":"Add Task"}
        </button>
      </Modal>
    </div>
  );
};

// ─── BUDGET TAB ───────────────────────────────────────────────────────────────
const BudgetTab = ({ budget, setBudget }: { budget: BudgetItem[]; setBudget: React.Dispatch<React.SetStateAction<BudgetItem[]>> }) => {
  const [currFilter, setCurrFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem|null>(null);
  const [payModalOpen, setPayModalOpen] = useState<string|null>(null);
  const [payForm, setPayForm] = useState({ amount:"",paidBy:"",notes:"" });
  const [form, setForm] = useState<Omit<BudgetItem,"id">>({ category:"Venue",currency:"INR",estimated:0,actual:0,paid:false,notes:"",partPayments:[],splits:[] });
  const [splitName, setSplitName] = useState("");
  const [splitPct, setSplitPct] = useState("");

  const filtered = currFilter==="All"?budget:budget.filter(b=>b.currency===currFilter);
  const totalEst = filtered.reduce((s,b)=>s+Number(b.estimated||0),0);
  const totalAct = filtered.reduce((s,b)=>s+Number(b.actual||0),0);
  const sym = currFilter==="All"?"₹":(CURRENCIES[currFilter]?.symbol||"₹");

  const openAdd = () => { setEditItem(null); setForm({category:"Venue",currency:"INR",estimated:0,actual:0,paid:false,notes:"",partPayments:[],splits:[]}); setModalOpen(true); };
  const openEdit = (item: BudgetItem) => { setEditItem(item); setForm({category:item.category,currency:item.currency,estimated:item.estimated,actual:item.actual,paid:item.paid,notes:item.notes,partPayments:item.partPayments,splits:item.splits}); setModalOpen(true); };
  const save = () => {
    if(!form.category) return;
    if(editItem) { setBudget(prev=>prev.map(b=>b.id===editItem.id?{...b,...form}:b)); }
    else { setBudget(prev=>[...prev,{...form,id:uid()}]); }
    setModalOpen(false);
  };
  const del = (id: string) => setBudget(prev=>prev.filter(b=>b.id!==id));
  const addSplit = () => {
    if(!splitName.trim()||!splitPct) return;
    const total = form.splits.reduce((s,x)=>s+Number(x.pct),0)+Number(splitPct);
    if(total>100) return;
    setForm(p=>({...p,splits:[...p.splits,{name:splitName,pct:Number(splitPct)}]}));
    setSplitName(""); setSplitPct("");
  };
  const addPayment = () => {
    if(!payForm.amount||!payModalOpen) return;
    const payment: PartPayment = { amount:Number(payForm.amount),paidBy:payForm.paidBy,date:new Date().toISOString().slice(0,10),notes:payForm.notes };
    setBudget(prev=>prev.map(b=>b.id===payModalOpen?{...b,partPayments:[...(b.partPayments||[]),payment],actual:Number(b.actual||0)+Number(payForm.amount)}:b));
    setPayModalOpen(null); setPayForm({amount:"",paidBy:"",notes:""});
  };

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ background:`linear-gradient(135deg,${COLORS.maroon},#5C0000)`,padding:"52px 20px 16px",position:"relative",overflow:"hidden" }}>
        <MehendiPattern/>
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:12 }}>💰 Budget Planner</div>
          <div style={{ display:"flex",gap:10 }}>
            {["All","INR","USD","EUR","GBP"].map(c=>(
              <button key={c} onClick={()=>setCurrFilter(c)} style={{ padding:"5px 14px",borderRadius:99,border:`1px solid ${currFilter===c?"#fff":"rgba(255,255,255,0.4)"}`,background:currFilter===c?"rgba(255,255,255,0.25)":"transparent",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                {c==="All"?"All":(CURRENCIES[c]?.symbol||c)+" "+c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,margin:"14px 16px" }}>
        {[
          { label:"Budget",value:totalEst,color:COLORS.crimson },
          { label:"Spent",value:totalAct,color:"#CC2222" },
          { label:"Remaining",value:totalEst-totalAct,color:totalEst-totalAct>=0?COLORS.green:COLORS.crimson },
        ].map(c=>(
          <div key={c.label} style={{ background:`linear-gradient(135deg,${c.color}18,${c.color}08)`,border:`1px solid ${c.color}30`,borderRadius:14,padding:"12px 10px",textAlign:"center" }}>
            <div style={{ fontSize:10,color:"#7A3030",fontWeight:600,marginBottom:4,textTransform:"uppercase" as const }}>{c.label}</div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:c.color }}>{sym}{Math.abs(c.value).toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:"0 16px" }}>
        {filtered.length===0?(
          <div style={{ textAlign:"center",padding:"60px 20px",color:"#A07070" }}>
            <div style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>💰</div>
            <div style={{ fontSize:16,fontWeight:600 }}>No budget items yet</div>
          </div>
        ):filtered.map(item=>{
          const catColor=CATEGORY_COLORS[item.category]||"#666";
          const isym=CURRENCIES[item.currency]?.symbol||"₹";
          return (
            <div key={item.id} style={{ background:COLORS.cardBg,border:"1px solid #E8D4B0",borderRadius:16,padding:"14px",marginBottom:12,animation:"fadeIn 0.3s ease" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#2A0A0A" }}>{item.category}</div>
                  {item.notes&&<div style={{ fontSize:11,color:"#8B5050",marginTop:2 }}>{item.notes}</div>}
                </div>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  <Badge color={catColor} small>{item.currency}</Badge>
                  {item.paid&&<Badge color={COLORS.green} small>PAID</Badge>}
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
                <div style={{ background:"#F5EDD8",borderRadius:10,padding:"8px 10px" }}>
                  <div style={{ fontSize:10,color:"#8B5050",fontWeight:600 }}>Estimated</div>
                  <div style={{ fontWeight:700,color:COLORS.crimson,fontSize:14 }}>{isym}{Number(item.estimated||0).toLocaleString()}</div>
                </div>
                <div style={{ background:"#F5EDD8",borderRadius:10,padding:"8px 10px" }}>
                  <div style={{ fontSize:10,color:"#8B5050",fontWeight:600 }}>Actual</div>
                  <div style={{ fontWeight:700,color:"#2A7A2A",fontSize:14 }}>{isym}{Number(item.actual||0).toLocaleString()}</div>
                </div>
              </div>
              {item.partPayments?.length>0&&(
                <div style={{ background:"#FFF3E0",borderRadius:10,padding:"10px",marginBottom:8 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:COLORS.saffron,marginBottom:6 }}>💰 Payments ({item.partPayments.length})</div>
                  {item.partPayments.map((p,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0" }}>
                      <span style={{ color:"#5A3010" }}>{p.paidBy||"—"} · {p.date}</span>
                      <span style={{ fontWeight:600,color:COLORS.saffron }}>{isym}{Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.splits?.length>0&&(
                <div style={{ background:"#F0F8FF",borderRadius:10,padding:"10px",marginBottom:8 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#1E5F8E",marginBottom:6 }}>📊 Split Between:</div>
                  {item.splits.map((s,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0" }}>
                      <span style={{ color:"#2A4A6A" }}>{s.name}</span>
                      <span style={{ fontWeight:600,color:"#1E5F8E" }}>{s.pct}% · {isym}{Math.round(item.estimated*(s.pct/100)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>setPayModalOpen(item.id)} style={{ flex:1,padding:"8px",borderRadius:10,border:`1px solid ${COLORS.green}`,background:"transparent",color:COLORS.green,fontSize:12,fontWeight:600,cursor:"pointer" }}>+ Payment</button>
                <button onClick={()=>openEdit(item)} style={{ padding:"8px 12px",borderRadius:10,border:`1px solid ${COLORS.gold}`,background:"transparent",color:COLORS.gold,cursor:"pointer" }}>✏️</button>
                <button onClick={()=>del(item.id)} style={{ padding:"8px 12px",borderRadius:10,border:"1px solid #CC4444",background:"transparent",color:"#CC4444",cursor:"pointer" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      <FAB onClick={openAdd}/>

      <Modal open={!!payModalOpen} onClose={()=>setPayModalOpen(null)} title="Add Payment" headerColor={`linear-gradient(135deg,${COLORS.green},#1A5C35)`}>
        <Field label="Amount"><input style={inputStyle} type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} placeholder="0"/></Field>
        <Field label="Paid By"><input style={inputStyle} value={payForm.paidBy} onChange={e=>setPayForm(p=>({...p,paidBy:e.target.value}))} placeholder="Name"/></Field>
        <Field label="Notes"><input style={inputStyle} value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. First installment"/></Field>
        <button onClick={addPayment} style={{ width:"100%",padding:"13px",borderRadius:12,background:`linear-gradient(135deg,${COLORS.green},#1A5C35)`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }}>Record Payment</button>
      </Modal>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editItem?"Edit Budget Item":"New Budget Item"}>
        <Field label="Category"><select style={selectStyle} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
          {["Venue","Catering","Decor","Attire","Invitations","Other"].map(c=><option key={c}>{c}</option>)}
        </select></Field>
        <Field label="Currency"><select style={selectStyle} value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
          {Object.entries(CURRENCIES).map(([k,v])=><option key={k} value={k}>{v.symbol} {k}</option>)}
        </select></Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Field label="Estimated"><input style={inputStyle} type="number" value={form.estimated} onChange={e=>setForm(p=>({...p,estimated:Number(e.target.value)}))}/></Field>
          <Field label="Actual"><input style={inputStyle} type="number" value={form.actual} onChange={e=>setForm(p=>({...p,actual:Number(e.target.value)}))}/></Field>
        </div>
        <div style={{ background:"#FFF3E0",borderRadius:12,padding:"12px",marginBottom:14 }}>
          <div style={{ fontSize:12,fontWeight:700,color:COLORS.saffron,marginBottom:10 }}>💸 Split Payment</div>
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input style={{...inputStyle,flex:2}} value={splitName} onChange={e=>setSplitName(e.target.value)} placeholder="Name"/>
            <input style={{...inputStyle,flex:1}} type="number" value={splitPct} onChange={e=>setSplitPct(e.target.value)} placeholder="%"/>
            <button onClick={addSplit} style={{ padding:"10px 14px",borderRadius:10,background:COLORS.saffron,border:"none",color:"#fff",cursor:"pointer",fontWeight:700 }}>+</button>
          </div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
            {form.splits.map((s,i)=>(
              <div key={i} style={{ background:`${COLORS.saffron}22`,border:`1px solid ${COLORS.saffron}55`,borderRadius:99,padding:"4px 10px",fontSize:11,fontWeight:600,color:COLORS.saffron,display:"flex",gap:6,alignItems:"center" }}>
                {s.name} {s.pct}%
                <button onClick={()=>setForm(p=>({...p,splits:p.splits.filter((_,j)=>j!==i)}))} style={{ background:"none",border:"none",cursor:"pointer",color:"#AA5500",fontSize:12 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <Field label="Notes"><textarea style={{...inputStyle,minHeight:60,resize:"vertical"}} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Notes..."/></Field>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
          <input type="checkbox" id="paid" checked={form.paid} onChange={e=>setForm(p=>({...p,paid:e.target.checked}))} style={{ width:18,height:18,accentColor:COLORS.crimson }}/>
          <label htmlFor="paid" style={{ fontSize:13,color:"#5A2020",fontWeight:600 }}>Mark as Paid</label>
        </div>
        <button onClick={save} style={{ width:"100%",padding:"13px",borderRadius:12,background:`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }}>
          {editItem?"Save Changes":"Add Item"}
        </button>
      </Modal>
    </div>
  );
};

// ─── GUESTS TAB ───────────────────────────────────────────────────────────────
const GuestsTab = ({ guests, setGuests }: { guests: Guest[]; setGuests: React.Dispatch<React.SetStateAction<Guest[]>> }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest|null>(null);
  const [form, setForm] = useState<Omit<Guest,"id">>({ name:"",email:"",phone:"",status:"Pending",meal:"",plusOnes:0 });
  const statusColors: Record<string,string> = { Confirmed:COLORS.green, Pending:COLORS.saffron, Declined:"#CC4444" };

  const openAdd = () => { setEditGuest(null); setForm({name:"",email:"",phone:"",status:"Pending",meal:"",plusOnes:0}); setModalOpen(true); };
  const openEdit = (g: Guest) => { setEditGuest(g); setForm({name:g.name,email:g.email,phone:g.phone,status:g.status,meal:g.meal,plusOnes:g.plusOnes}); setModalOpen(true); };
  const save = () => {
    if(!form.name.trim()) return;
    if(editGuest) { setGuests(prev=>prev.map(g=>g.id===editGuest.id?{...g,...form}:g)); }
    else { setGuests(prev=>[...prev,{...form,id:uid()}]); }
    setModalOpen(false);
  };
  const del = (id: string) => setGuests(prev=>prev.filter(g=>g.id!==id));

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ background:`linear-gradient(135deg,#4A1060,${COLORS.crimson})`,padding:"52px 20px 20px" }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:12 }}>👥 Guest List</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8 }}>
          {[
            { label:"Total",value:guests.length,color:"rgba(255,255,255,0.9)" },
            { label:"Confirmed",value:guests.filter(g=>g.status==="Confirmed").length,color:"#80FF9E" },
            { label:"Pending",value:guests.filter(g=>g.status==="Pending").length,color:"#FFD080" },
            { label:"Declined",value:guests.filter(g=>g.status==="Declined").length,color:"#FF8080" },
          ].map(s=>(
            <div key={s.label} style={{ textAlign:"center",background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 4px" }}>
              <div style={{ fontSize:18,fontWeight:700,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {guests.length===0?(
          <div style={{ textAlign:"center",padding:"60px 20px",color:"#A07070" }}>
            <div style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>👥</div>
            <div style={{ fontSize:16,fontWeight:600 }}>No guests yet</div>
          </div>
        ):guests.map(g=>(
          <div key={g.id} style={{ background:COLORS.cardBg,border:"1px solid #E8D4B0",borderRadius:14,padding:"14px",marginBottom:10,animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:"#2A0A0A" }}>{g.name}</span>
                  <Badge color={statusColors[g.status]||"#666"} small>{g.status}</Badge>
                </div>
                {g.email&&<div style={{ fontSize:11,color:"#8B5050" }}>✉️ {g.email}</div>}
                {g.phone&&<div style={{ fontSize:11,color:"#8B5050" }}>📱 {g.phone}</div>}
                <div style={{ display:"flex",gap:8,marginTop:6,flexWrap:"wrap" }}>
                  {g.meal&&<Badge color={COLORS.saffron} small>🍽 {g.meal}</Badge>}
                  {g.plusOnes>0&&<Badge color={COLORS.gold} small>+{g.plusOnes} guests</Badge>}
                </div>
              </div>
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={()=>openEdit(g)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:COLORS.gold }}>✏️</button>
                <button onClick={()=>del(g.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#CC4444" }}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FAB onClick={openAdd}/>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editGuest?"Edit Guest":"New Guest"}>
        <Field label="Name *"><input style={inputStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Full name"/></Field>
        <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@example.com"/></Field>
        <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 9876543210"/></Field>
        <Field label="RSVP Status"><select style={selectStyle} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
          {["Pending","Confirmed","Declined"].map(s=><option key={s}>{s}</option>)}
        </select></Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Field label="Meal Preference"><select style={selectStyle} value={form.meal} onChange={e=>setForm(p=>({...p,meal:e.target.value}))}>
            {["","Vegetarian","Non-Vegetarian","Jain","Vegan"].map(m=><option key={m} value={m}>{m||"Not specified"}</option>)}
          </select></Field>
          <Field label="Plus Ones"><input style={inputStyle} type="number" min="0" value={form.plusOnes} onChange={e=>setForm(p=>({...p,plusOnes:Number(e.target.value)}))}/></Field>
        </div>
        <button onClick={save} style={{ width:"100%",padding:"13px",borderRadius:12,background:`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }}>
          {editGuest?"Save Changes":"Add Guest"}
        </button>
      </Modal>
    </div>
  );
};

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────
const TimelineTab = ({ milestones, setMilestones }: { milestones: Milestone[]; setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>> }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editMs, setEditMs] = useState<Milestone|null>(null);
  const [form, setForm] = useState<Omit<Milestone,"id">>({ name:"",date:"",status:"Upcoming",description:"" });

  const sorted = [...milestones].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  const openAdd = () => { setEditMs(null); setForm({name:"",date:"",status:"Upcoming",description:""}); setModalOpen(true); };
  const openEdit = (m: Milestone) => { setEditMs(m); setForm({name:m.name,date:m.date,status:m.status,description:m.description}); setModalOpen(true); };
  const save = () => {
    if(!form.name.trim()||!form.date) return;
    if(editMs) { setMilestones(prev=>prev.map(m=>m.id===editMs.id?{...m,...form}:m)); }
    else { setMilestones(prev=>[...prev,{...form,id:uid()}]); }
    setModalOpen(false);
  };
  const toggle = (m: Milestone) => setMilestones(prev=>prev.map(x=>x.id===m.id?{...x,status:x.status==="Completed"?"Upcoming":"Completed"}:x));
  const del = (id: string) => setMilestones(prev=>prev.filter(m=>m.id!==id));

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ background:`linear-gradient(135deg,#1A4060,#0D2A40)`,padding:"52px 20px 20px" }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",fontWeight:700 }}>📅 Wedding Timeline</div>
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4 }}>{sorted.filter(m=>m.status==="Completed").length}/{sorted.length} milestones completed</div>
      </div>
      <div style={{ padding:"20px" }}>
        {sorted.length===0?(
          <div style={{ textAlign:"center",padding:"60px 20px",color:"#A07070" }}>
            <div style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>📅</div>
            <div style={{ fontSize:16,fontWeight:600 }}>No milestones yet</div>
          </div>
        ):sorted.map((m,i)=>{
          const done=m.status==="Completed";
          return (
            <div key={m.id} style={{ display:"flex",gap:16,marginBottom:0,animation:"fadeIn 0.3s ease" }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                <button onClick={()=>toggle(m)} style={{ width:32,height:32,borderRadius:"50%",border:`2px solid ${done?COLORS.green:COLORS.gold}`,background:done?COLORS.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {done?<span style={{ color:"#fff",fontSize:14 }}>✓</span>:<span style={{ width:10,height:10,borderRadius:"50%",background:COLORS.gold,display:"block" }}/>}
                </button>
                {i<sorted.length-1&&<div style={{ width:2,flex:1,minHeight:32,background:done?`${COLORS.green}40`:"#E8D4B0",margin:"4px 0" }}/>}
              </div>
              <div style={{ flex:1,background:COLORS.cardBg,border:`1px solid ${done?"#4CAF5030":"#E8D4B0"}`,borderRadius:14,padding:"14px",marginBottom:12,opacity:done?0.85:1 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:done?"#4A7A4A":"#2A0A0A",textDecoration:done?"line-through":"none" }}>{m.name}</div>
                    <div style={{ fontSize:11,color:"#8B5050",marginTop:3 }}>📅 {formatDate(m.date)}</div>
                    {m.description&&<div style={{ fontSize:12,color:"#7A5050",marginTop:6,lineHeight:1.5 }}>{m.description}</div>}
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end" }}>
                    <Badge color={done?COLORS.green:COLORS.gold} small>{done?"Completed":"Upcoming"}</Badge>
                    <div style={{ display:"flex",gap:4,marginTop:4 }}>
                      <button onClick={()=>openEdit(m)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:COLORS.gold }}>✏️</button>
                      <button onClick={()=>del(m.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#CC4444" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <FAB onClick={openAdd}/>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editMs?"Edit Milestone":"New Milestone"} headerColor={`linear-gradient(135deg,#1A4060,#0D2A40)`}>
        <Field label="Milestone Name *"><input style={inputStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Sangeet Night"/></Field>
        <Field label="Date *"><input style={inputStyle} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></Field>
        <Field label="Status"><select style={selectStyle} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
          {["Upcoming","Completed"].map(s=><option key={s}>{s}</option>)}
        </select></Field>
        <Field label="Description"><textarea style={{...inputStyle,minHeight:70,resize:"vertical"}} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Details..."/></Field>
        <button onClick={save} style={{ width:"100%",padding:"13px",borderRadius:12,background:`linear-gradient(135deg,#1A4060,#0D2A40)`,border:"none",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }}>
          {editMs?"Save Changes":"Add Milestone"}
        </button>
      </Modal>
    </div>
  );
};

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
const SetupScreen = ({ onSetup }: { onSetup: (s: WeddingSetup & { demo: boolean }) => void }) => {
  const [coupleNames, setCoupleNames] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [tab, setTab] = useState("new");
  const createWedding = () => { if(!coupleNames.trim()||!weddingDate) return; onSetup({coupleNames,weddingDate,demo:false}); };
  const loadDemo = () => onSetup({coupleNames:"Priya & Rahul",weddingDate:"2026-06-20",demo:true});

  return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 50%,${COLORS.saffron}44 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",position:"relative",overflow:"hidden" }}>
      <MehendiPattern/>
      <div style={{ position:"relative",zIndex:1,width:"100%",maxWidth:400,animation:"fadeIn 0.6s ease" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ fontSize:52,marginBottom:12 }}>💍</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:32,color:"#fff",fontWeight:900,marginBottom:8 }}>Shaadi Planner</h1>
          <p style={{ color:"rgba(255,255,255,0.8)",fontSize:14 }}>Plan your perfect day, stress-free</p>
          <div style={{ color:COLORS.lightGold,letterSpacing:3,marginTop:8,fontSize:12 }}>🪔 ✨ 💐 ✨ 🪔</div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.12)",backdropFilter:"blur(12px)",borderRadius:20,padding:"24px",border:"1px solid rgba(255,255,255,0.25)" }}>
          <div style={{ display:"flex",borderRadius:12,overflow:"hidden",marginBottom:20,border:"1px solid rgba(255,255,255,0.3)" }}>
            {["new","demo"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:"10px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===t?"rgba(255,255,255,0.25)":"transparent",color:"#fff",transition:"all 0.2s" }}>
                {t==="new"?"✨ New Wedding":"🔍 Demo"}
              </button>
            ))}
          </div>
          {tab==="new"?(
            <>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontSize:11,fontWeight:600,color:COLORS.lightGold,marginBottom:6,textTransform:"uppercase" as const,letterSpacing:1 }}>Couple Names</label>
                <input style={{ width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:14,outline:"none" }} placeholder="Priya & Rahul" value={coupleNames} onChange={e=>setCoupleNames(e.target.value)}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block",fontSize:11,fontWeight:600,color:COLORS.lightGold,marginBottom:6,textTransform:"uppercase" as const,letterSpacing:1 }}>Wedding Date</label>
                <input style={{ width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:14,outline:"none" }} type="date" value={weddingDate} onChange={e=>setWeddingDate(e.target.value)}/>
              </div>
              <button onClick={createWedding} style={{ width:"100%",padding:"14px",borderRadius:14,background:`linear-gradient(135deg,${COLORS.gold},${COLORS.saffron})`,border:"none",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(201,168,76,0.5)" }}>
                🎉 Create Wedding Plan
              </button>
            </>
          ):(
            <>
              <div style={{ background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",marginBottom:16 }}>
                <div style={{ color:"#FFD88B",fontSize:12,fontWeight:600,marginBottom:8 }}>Demo Wedding includes:</div>
                <div style={{ color:"rgba(255,255,255,0.85)",fontSize:12,lineHeight:1.8 }}>
                  💑 Couple: Priya & Rahul<br/>
                  📅 Date: June 20, 2026<br/>
                  ✓ 8 Tasks · 💰 6 Budget items · 👥 6 Guests · 📅 5 Milestones
                </div>
              </div>
              <button onClick={loadDemo} style={{ width:"100%",padding:"14px",borderRadius:14,background:`linear-gradient(135deg,${COLORS.gold},${COLORS.saffron})`,border:"none",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(201,168,76,0.5)" }}>
                🔍 Explore Demo Wedding
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const BottomNav = ({ active, setTab, counts }: { active: string; setTab: (t: string) => void; counts: { tasks: number } }) => {
  const tabs = [
    { id:"home", icon:"🏠", label:"Home" },
    { id:"tasks", icon:"✓", label:"Tasks", count:counts.tasks },
    { id:"budget", icon:"💰", label:"Budget" },
    { id:"guests", icon:"👥", label:"Guests" },
    { id:"timeline", icon:"📅", label:"Timeline" },
  ];
  return (
    <div style={{ position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #E8D4B0",display:"flex",justifyContent:"space-around",padding:"8px 0 calc(8px + env(safe-area-inset-bottom))",zIndex:200,boxShadow:"0 -4px 20px rgba(139,0,0,0.1)" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 8px",position:"relative",minWidth:52 }}>
          <div style={{ width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:active===t.id?`${COLORS.crimson}15`:"transparent",transition:"all 0.2s" }}>
            <span style={{ fontSize:t.id==="tasks"?16:18,color:active===t.id?COLORS.crimson:"#8B6060" }}>{t.icon}</span>
          </div>
          {(t.count??0)>0&&<div style={{ position:"absolute",top:0,right:4,background:COLORS.crimson,color:"#fff",fontSize:9,fontWeight:700,borderRadius:99,padding:"0 4px",minWidth:14,textAlign:"center" as const }}>{t.count}</div>}
          <span style={{ fontSize:9,fontWeight:active===t.id?"700":"500",color:active===t.id?COLORS.crimson:"#8B6060" }}>{t.label}</span>
          {active===t.id&&<div style={{ position:"absolute",bottom:-8,width:20,height:2,borderRadius:99,background:COLORS.crimson }}/>}
        </button>
      ))}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [setup, setSetup] = useState<WeddingSetup|null>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const handleSetup = ({ coupleNames, weddingDate, demo }: WeddingSetup & { demo: boolean }) => {
    setSetup({ coupleNames, weddingDate });
    if(demo) { setTasks(DEMO_TASKS); setBudget(DEMO_BUDGET); setGuests(DEMO_GUESTS); setMilestones(DEMO_MILESTONES); }
  };

  const pendingTasks = tasks.filter(t=>t.status==="Pending").length;

  if(!setup) return (
    <>
      <style>{globalStyle}</style>
      <SetupScreen onSetup={handleSetup}/>
    </>
  );

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ maxWidth:480,margin:"0 auto",minHeight:"100vh",background:COLORS.ivory,position:"relative",overflow:"hidden" }}>
        <div style={{ overflowY:"auto",height:"100vh" }}>
          {activeTab==="home"&&<HomeTab tasks={tasks} budget={budget} guests={guests} weddingDate={setup.weddingDate} userName="Prathamesh" coupleNames={setup.coupleNames} setTab={setActiveTab}/>}
          {activeTab==="tasks"&&<TasksTab tasks={tasks} setTasks={setTasks}/>}
          {activeTab==="budget"&&<BudgetTab budget={budget} setBudget={setBudget}/>}
          {activeTab==="guests"&&<GuestsTab guests={guests} setGuests={setGuests}/>}
          {activeTab==="timeline"&&<TimelineTab milestones={milestones} setMilestones={setMilestones}/>}
        </div>
        <BottomNav active={activeTab} setTab={setActiveTab} counts={{ tasks:pendingTasks }}/>
      </div>
    </>
  );
}