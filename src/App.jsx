import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabaseclient";

// ─── Utilities ────────────────────────────────────────────────────
const fmt = (n, cur = "LYD") => { const x = Number(n); if (!x) return `0.00 ${cur}`; return `${x.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" }) : "";
const daysDiff = d => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };
const addMonths = (dateStr, months) => { const d = new Date(dateStr); d.setMonth(d.getMonth()+months); return d.toISOString().split("T")[0]; };
const NOW = new Date();
const DEFAULT_CREDENTIALS = { user: "fahed", pass: "771997" };

const getGreeting = () => {
  const h = NOW.getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  if (h < 20) return "مساء النور";
  return "مساء الخير";
};

// ─── Settings helpers ─────────────────────────────────────────────
const getSettings = () => { try { return JSON.parse(localStorage.getItem("fareq_settings") || "{}"); } catch { return {}; } };
const saveSettings = s => { try { localStorage.setItem("fareq_settings", JSON.stringify(s)); } catch {} };

// ─── Notification helpers ─────────────────────────────────────────
const getStoredNotifs = () => { try { return JSON.parse(localStorage.getItem("fareq_notifs") || "[]"); } catch { return []; } };
const saveNotifs = n => { try { localStorage.setItem("fareq_notifs", JSON.stringify(n)); } catch {} };

const SL = { active:"جارٍ", pending:"معلق", completed:"مكتمل", cancelled:"ملغي" };
const SC = { active:"#00ff88", pending:"#ffd600", completed:"#a78bfa", cancelled:"#ff4d4d" };
const CARD_ACCENT = {
  active:    { border:"rgba(0,255,136,0.35)",  glow:"rgba(0,255,136,0.10)",  bar:"#00ff88",  shadow:"rgba(0,255,136,0.20)" },
  pending:   { border:"rgba(255,214,0,0.35)",  glow:"rgba(255,214,0,0.08)",  bar:"#ffd600",  shadow:"rgba(255,214,0,0.18)" },
  completed: { border:"rgba(167,139,250,0.35)",glow:"rgba(167,139,250,0.10)",bar:"#a78bfa",  shadow:"rgba(167,139,250,0.18)" },
  cancelled: { border:"rgba(255,77,77,0.25)",  glow:"rgba(255,77,77,0.06)",  bar:"#ff4d4d",  shadow:"rgba(255,77,77,0.12)" },
};

const nameToGradient = name => {
  if (!name) return ["#00ff88","#00c96e"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const palettes = [
    ["#00ff88","#00bfff"],["#ff6b6b","#ffd600"],["#a78bfa","#38bdf8"],
    ["#fb923c","#f43f5e"],["#34d399","#06b6d4"],["#f472b6","#a78bfa"],
    ["#fbbf24","#34d399"],["#60a5fa","#a78bfa"],
  ];
  return palettes[Math.abs(h) % palettes.length];
};

const haptic = (type = "light") => {
  if (navigator.vibrate) { const p = { light:30, medium:[30,20,30], heavy:80 }; navigator.vibrate(p[type]||30); }
};

// ─── Logo ─────────────────────────────────────────────────────────
const FareqLogo = ({ size=36, style={} }) => (
  <img src="/BA449EC2-EB5B-4033-BCDA-333BF5EED250.PNG" alt="فارق"
    style={{ width:size, height:size, objectFit:"contain", mixBlendMode:"screen", filter:"brightness(1.1)", display:"block", ...style }} />
);

// ─── Animated counter hook ────────────────────────────────────────
function useCountUp(target, duration=900, start=false) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (!start) return;
    const from = prev.current;
    prev.current = target;
    let startTime = null;
    const step = ts => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1-p, 3);
      setVal(from + (target-from)*eased);
      if (p < 1) requestAnimationFrame(step); else setVal(target);
    };
    requestAnimationFrame(step);
  }, [target, start, duration]);
  return val;
}

// ─── Pull-to-refresh ──────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const startY = useRef(null);
  const threshold = 70;
  const onTouchStart = useCallback(e => { if (window.scrollY===0) startY.current = e.touches[0].clientY; }, []);
  const onTouchMove  = useCallback(e => {
    if (startY.current===null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy>0) { setProgress(Math.min(dy/threshold,1)); setPulling(dy>10); }
  }, [threshold]);
  const onTouchEnd = useCallback(() => {
    if (progress>=1) { haptic("medium"); onRefresh(); }
    setPulling(false); setProgress(0); startY.current = null;
  }, [progress, onRefresh]);
  return { pulling, progress, handlers:{ onTouchStart, onTouchMove, onTouchEnd } };
}

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton({ w="100%", h=16, r=8, style={} }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:"var(--skel-bg)", backgroundSize:"200% 100%", animation:"skel 1.4s ease-in-out infinite", ...style }} />;
}
function SkeletonCard() {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--card-border)", borderRadius:16, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
      <Skeleton w={38} h={38} r={11} style={{ flexShrink:0 }} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <Skeleton w="55%" h={13} /><Skeleton w="35%" h={10} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
        <Skeleton w={70} h={13} /><Skeleton w={45} h={10} />
      </div>
    </div>
  );
}
function SkeletonHero() {
  return (
    <div style={{ background:"linear-gradient(135deg,#0f1e3a,#0a1428 50%,#060e1f)", borderRadius:24, padding:"24px 20px 20px", margin:"14px 0 16px", border:"1px solid rgba(0,255,136,0.12)" }}>
      <Skeleton w="40%" h={12} style={{ marginBottom:8 }} />
      <Skeleton w="70%" h={36} style={{ marginBottom:6 }} />
      <Skeleton w="30%" h={10} style={{ marginBottom:20 }} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[0,1,2,3].map(i=><Skeleton key={i} h={70} r={14} />)}
      </div>
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────
function ProgressRing({ pct, size=52, stroke=4, color="var(--ac)", track="var(--muted2)" }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r, offset = circ-(pct/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset .8s cubic-bezier(.34,1.56,.64,1)" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fill:"var(--text)", fontSize:size*0.22, fontWeight:800, fontFamily:"var(--font)", transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────
function MonthlyBarChart({ contracts }) {
  const months = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth()-i, 1);
    const label = d.toLocaleDateString("ar-LY", { month:"short" });
    const total = contracts.filter(c=>c.startDate&&new Date(c.startDate).getMonth()===d.getMonth()&&new Date(c.startDate).getFullYear()===d.getFullYear()).reduce((s,c)=>s+Number(c.videoAmount||0),0);
    months.push({ label, total });
  }
  const max = Math.max(...months.map(m=>m.total),1);
  const current=months[5].total, prev=months[4].total;
  const diff = prev>0 ? Math.round(((current-prev)/prev)*100) : current>0 ? 100 : 0;
  return (
    <div className="card" style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"var(--text)" }}>الإيرادات الشهرية</div>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:diff>=0?"var(--ac)":"var(--danger)" }}>
          <span>{diff>=0?"▲":"▼"} {Math.abs(diff)}%</span>
          <span style={{ color:"var(--muted)", fontWeight:500 }}>vs الشهر الماضي</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:80 }}>
        {months.map((m,i)=>{
          const h = max>0?Math.max((m.total/max)*72,m.total>0?6:2):2;
          const isLast=i===5;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:"100%", height:h, borderRadius:"4px 4px 0 0", background:isLast?"linear-gradient(180deg,var(--ac),var(--ac2))":"var(--surface2)", border:`1px solid ${isLast?"var(--ac-border)":"var(--card-border)"}`, boxShadow:isLast?"0 0 10px var(--ac-glow)":"none", transition:"height .5s cubic-bezier(.4,0,.2,1)", alignSelf:"flex-end" }} />
              <div style={{ fontSize:9, color:isLast?"var(--ac)":"var(--muted)", fontWeight:isLast?800:500 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────
function PieChart({ data }) {
  if (!data||data.length===0) return null;
  const total=data.reduce((s,d)=>s+d.value,0); if(!total) return null;
  const colors=["#00ff88","#a78bfa","#ffd600","#ff4d6d","#38bdf8","#fb923c","#34d399","#f472b6"];
  let cum=0;
  const slices=data.map((d,i)=>{ const pct=d.value/total; const start=cum; cum+=pct; return {...d,pct,start,color:colors[i%colors.length]}; });
  const size=120,cx=60,cy=60,r=48,inner=28;
  const arc=(s,e)=>{
    const a1=s*2*Math.PI-Math.PI/2,a2=e*2*Math.PI-Math.PI/2;
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const xi1=cx+inner*Math.cos(a1),yi1=cy+inner*Math.sin(a1),xi2=cx+inner*Math.cos(a2),yi2=cy+inner*Math.sin(a2);
    const lg=e-s>0.5?1:0;
    return `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${lg} 0 ${xi1} ${yi1} Z`;
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {slices.map((s,i)=><path key={i} d={arc(s.start,s.start+s.pct)} fill={s.color} opacity={0.9} />)}
      </svg>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
        {slices.slice(0,5).map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
            <div style={{ flex:1, fontSize:10, color:"var(--text2)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
            <div style={{ fontSize:10, fontWeight:800, color:"var(--text)" }}>{Math.round(s.pct*100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3D Tilt Card wrapper ─────────────────────────────────────────
function TiltCard({ children, style={}, className="" }) {
  const ref = useRef();
  const onMove = e => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left)/rect.width - 0.5;
    const y = (e.clientY - rect.top)/rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x*6}deg) rotateX(${-y*6}deg) translateZ(4px)`;
  };
  const onLeave = () => { const el = ref.current; if(el) el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) translateZ(0px)"; };
  return <div ref={ref} className={className} style={{ transition:"transform .25s cubic-bezier(.4,0,.2,1)", willChange:"transform", ...style }} onMouseMove={onMove} onMouseLeave={onLeave}>{children}</div>;
}

// ─── Swipeable card ───────────────────────────────────────────────
function SwipeableCard({ onDelete, onCancel, onEdit, onLongPress, children }) {
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(null);
  const longPressTimer = useRef(null);
  const SNAP = 120;

  const onTStart = e => {
    startX.current = e.touches[0].clientX;
    longPressTimer.current = setTimeout(() => { haptic("heavy"); onLongPress && onLongPress(); }, 600);
  };
  const onTMove = e => {
    clearTimeout(longPressTimer.current);
    if (startX.current===null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx<0) setOffset(Math.max(dx,-SNAP));
  };
  const onTEnd = () => {
    clearTimeout(longPressTimer.current);
    if (offset < -SNAP*0.5) { setOffset(-SNAP); setSwiped(true); }
    else { setOffset(0); setSwiped(false); }
    startX.current = null;
  };
  const close = () => { setOffset(0); setSwiped(false); };
  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius:16, marginBottom:10 }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:SNAP, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
        <button onClick={()=>{ onEdit(); close(); }} style={{ width:34,height:34,borderRadius:10,background:"rgba(96,165,250,0.18)",border:"1px solid rgba(96,165,250,0.3)",color:"#60a5fa",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><Icon name="edit" size={13} color="#60a5fa" /></button>
        <button onClick={()=>{ onCancel(); close(); }} style={{ width:34,height:34,borderRadius:10,background:"rgba(255,214,0,0.15)",border:"1px solid rgba(255,214,0,0.3)",color:"#ffd600",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><Icon name="cancel" size={13} color="#ffd600" /></button>
        <button onClick={()=>{ onDelete(); close(); }} style={{ width:34,height:34,borderRadius:10,background:"rgba(255,77,77,0.15)",border:"1px solid rgba(255,77,77,0.3)",color:"#ff4d4d",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><Icon name="trash" size={13} color="#ff4d4d" /></button>
      </div>
      <div style={{ transform:`translateX(${offset}px)`, transition:startX.current?"none":"transform .25s cubic-bezier(.4,0,.2,1)", position:"relative", zIndex:1 }}
        onTouchStart={onTStart} onTouchMove={onTMove} onTouchEnd={onTEnd}>
        {children}
      </div>
    </div>
  );
}

// ─── Notification Center ──────────────────────────────────────────
function NotificationCenter({ notifications, onClose, onMarkAllRead, onDismiss }) {
  const grouped = useMemo(() => {
    const groups = { payments:[], deadlines:[], completions:[], smart:[] };
    notifications.forEach(n => {
      if (n.group) groups[n.group]?.push(n) || (groups.smart.push(n));
      else groups.smart.push(n);
    });
    return groups;
  }, [notifications]);

  const groupLabels = { payments:"💳 الدفعات", deadlines:"⏰ المواعيد النهائية", completions:"✅ المكتملة", smart:"🧠 تنبيهات ذكية" };
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="mov" style={{ alignItems:"flex-start", padding:"0" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--glass-bg)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)", border:"1px solid var(--card-border)", borderRadius:"0 0 24px 24px", width:"100%", maxWidth:480, margin:"0 auto", maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"var(--shadow-float)" }}>
        <div style={{ padding:"18px 18px 12px", borderBottom:"1px solid var(--muted2)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:"var(--text)", display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="alert" size={16} color="var(--ac)"/> الإشعارات
              {unread > 0 && <span style={{ background:"var(--danger)", color:"#fff", fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:20 }}>{unread}</span>}
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{notifications.length} إشعار</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {unread > 0 && <button className="btn bng" style={{ fontSize:11, padding:"5px 12px" }} onClick={onMarkAllRead}>قراءة الكل</button>}
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"12px 14px" }}>
          {notifications.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 16px", color:"var(--muted)" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔕</div>
              <div style={{ fontWeight:700, fontSize:14 }}>لا توجد إشعارات</div>
            </div>
          )}
          {Object.entries(grouped).map(([key, items]) => {
            if (!items.length) return null;
            return (
              <div key={key} style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"var(--muted)", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{groupLabels[key]}</div>
                {items.map((n, i) => (
                  <NotifRow key={n.id} n={n} onDismiss={()=>onDismiss(n.id)} delay={i*30}/>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NotifRow({ n, onDismiss, delay=0 }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const [dismissed, setDismissed] = useState(false);

  const onTStart = e => { startX.current = e.touches[0].clientX; };
  const onTMove = e => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(dx);
  };
  const onTEnd = () => {
    if (Math.abs(offset) > 100) {
      setDismissed(true);
      setTimeout(onDismiss, 250);
    } else setOffset(0);
    startX.current = null;
  };

  if (dismissed) return null;
  return (
    <div style={{
      transform:`translateX(${offset}px)`,
      transition:startX.current?"none":"transform .25s, opacity .25s",
      opacity:dismissed?0:1,
      background: n.read ? "var(--surface2)" : "var(--glass-bg)",
      border:`1px solid ${n.read?"var(--card-border)":"var(--ac-border)"}`,
      borderRadius:14, padding:"10px 12px", marginBottom:7, display:"flex", gap:10, alignItems:"flex-start",
      boxShadow: n.read ? "none" : "0 2px 12px var(--ac-glow)",
      animation:`fu .3s ${delay}ms both`,
    }} onTouchStart={onTStart} onTouchMove={onTMove} onTouchEnd={onTEnd}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:n.type==="u"?"var(--danger)":n.type==="w"?"var(--warn)":"var(--ac)", flexShrink:0, marginTop:4, boxShadow:`0 0 6px ${n.type==="u"?"var(--danger)":n.type==="w"?"var(--warn)":"var(--ac)"}` }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, color:n.read?"var(--text2)":"var(--text)", fontWeight:n.read?500:700 }}>{n.msg}</div>
        {n.time && <div style={{ fontSize:9, color:"var(--muted)", marginTop:3 }}>{n.time}</div>}
      </div>
      <button onClick={onDismiss} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:16, padding:"0 2px", lineHeight:1 }}>×</button>
    </div>
  );
}

// ─── Notification Bell (top bar) ──────────────────────────────────
function NotifBell({ count, onClick }) {
  return (
    <div style={{ position:"relative" }}>
      <button className="tb-btn" onClick={onClick} style={{ position:"relative" }}>
        <Icon name="alert" size={16} color={count>0?"var(--warn)":"var(--text2)"} />
        {count>0 && <span style={{ position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"var(--danger)",color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--bg)",animation:"pulse-glow 2s infinite" }}>{count>9?"9+":count}</span>}
      </button>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────
function ActivityFeed({ activities }) {
  if (!activities.length) return null;
  const icons = { payment:"💳", contract:"📄", complete:"✅", cancel:"❌", video:"🎬", client:"👤" };
  return (
    <div className="card" style={{ marginBottom:10 }}>
      <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
        <Icon name="history" size={14} color="var(--ac)"/> آخر النشاطات
      </div>
      {activities.slice(0,6).map((a, i) => (
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"7px 0", borderBottom: i < activities.length-1 ? "1px solid var(--muted2)" : "none", animation:`stagger-in .4s ${i*50}ms both` }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"var(--surface2)", border:"1px solid var(--card-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
            {icons[a.type] || "📝"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.4 }}>{a.msg}</div>
            <div style={{ fontSize:9, color:"var(--muted)", marginTop:2 }}>{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ type, onAdd }) {
  const states = {
    contracts:{ svg:(<svg viewBox="0 0 120 100" width={120} height={100}><rect x={20} y={15} width={80} height={70} rx={8} fill="var(--surface2)" stroke="var(--card-border)" strokeWidth={1.5}/><rect x={32} y={30} width={56} height={5} rx={2.5} fill="var(--muted2)"/><rect x={32} y={42} width={40} height={4} rx={2} fill="var(--muted2)"/><rect x={32} y={54} width={48} height={4} rx={2} fill="var(--muted2)"/><circle cx={86} cy={72} r={14} fill="var(--ac)" opacity={0.15}/><line x1={80} y1={72} x2={92} y2={72} stroke="var(--ac)" strokeWidth={2.5} strokeLinecap="round"/><line x1={86} y1={66} x2={86} y2={78} stroke="var(--ac)" strokeWidth={2.5} strokeLinecap="round"/></svg>), title:"لا توجد عقود بعد", sub:"أضف أول عقد لبدء تتبع عملك", cta:"+ إضافة عقد" },
    clients:{ svg:(<svg viewBox="0 0 120 100" width={120} height={100}><circle cx={60} cy={35} r={18} fill="var(--surface2)" stroke="var(--card-border)" strokeWidth={1.5}/><circle cx={60} cy={30} r={9} fill="var(--muted2)"/><path d="M35 75 Q60 55 85 75" fill="var(--surface2)" stroke="var(--card-border)" strokeWidth={1.5}/><circle cx={86} cy={72} r={14} fill="var(--ac)" opacity={0.15}/><line x1={80} y1={72} x2={92} y2={72} stroke="var(--ac)" strokeWidth={2.5} strokeLinecap="round"/><line x1={86} y1={66} x2={86} y2={78} stroke="var(--ac)" strokeWidth={2.5} strokeLinecap="round"/></svg>), title:"لا يوجد عملاء بعد", sub:"أضف أول عميل لبدء إدارة قاعدة عملائك", cta:"+ إضافة عميل" },
    income:{ svg:(<svg viewBox="0 0 120 100" width={120} height={100}>{[0,1,2,3,4].map((i)=><rect key={i} x={14+i*20} y={70-[30,50,40,60,20][i]} width={14} height={[30,50,40,60,20][i]} rx={3} fill={i===3?"var(--ac)":"var(--muted2)"} opacity={i===3?0.5:1}/>)}<line x1={10} y1={72} x2={110} y2={72} stroke="var(--card-border)" strokeWidth={1}/></svg>), title:"لا توجد بيانات دخل بعد", sub:"أضف عقودًا لبدء تتبع دخلك", cta:null },
    search:{ svg:(<svg viewBox="0 0 120 100" width={120} height={100}><circle cx={52} cy={48} r={24} fill="var(--surface2)" stroke="var(--card-border)" strokeWidth={1.5}/><circle cx={52} cy={48} r={16} fill="var(--muted2)" opacity={0.5}/><line x1={70} y1={66} x2={90} y2={82} stroke="var(--card-border)" strokeWidth={4} strokeLinecap="round"/></svg>), title:"لا توجد نتائج", sub:"جرّب البحث بكلمات مختلفة", cta:null },
  };
  const s = states[type]||states.contracts;
  return (
    <div style={{ textAlign:"center", padding:"40px 16px" }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:12, opacity:0.7 }}>{s.svg}</div>
      <div style={{ fontWeight:700, color:"var(--text)", fontSize:14, marginBottom:6 }}>{s.title}</div>
      <div style={{ color:"var(--muted)", fontSize:12, marginBottom:s.cta?16:0 }}>{s.sub}</div>
      {s.cta&&onAdd&&<button className="btn bngf" style={{ fontSize:12, padding:"8px 18px" }} onClick={onAdd}>{s.cta}</button>}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root {
  --bg:#f0f2f7; --surface:#ffffff; --surface2:#e8ebf4; --surface3:#dde1ef;
  --glass-bg:rgba(255,255,255,0.72); --glass-blur:blur(20px);
  --ac:#00c96e; --ac2:#00a85a; --ac-glow:rgba(0,201,110,0.25); --ac-faint:rgba(0,201,110,0.10); --ac-border:rgba(0,201,110,0.35);
  --text:#0d1b2a; --text2:#4a5568; --muted:#94a3b8; --muted2:#e2e8f0;
  --danger:#ff4d6d; --warn:#f59e0b; --card-border:rgba(255,255,255,0.8); --card-gap:10px; --font:'Tajawal',sans-serif;
  --grad-card:linear-gradient(135deg,#1a2340 0%,#0f1829 60%,#0a1020 100%);
  --grad-accent:linear-gradient(135deg,#00ff88,#00c96e);
  --shadow-card:0 8px 32px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
  --shadow-float:0 20px 60px rgba(0,0,0,0.15),0 4px 16px rgba(0,0,0,0.1);
  --shadow-inner:inset 0 2px 8px rgba(0,0,0,0.06); --nav-bg:rgba(255,255,255,0.85);
  --skel-bg:linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%);
}
[data-theme="dark"] {
  --bg:#0a0f1e; --surface:#111827; --surface2:#1a2340; --surface3:#1e2a4a;
  --glass-bg:rgba(17,24,39,0.75); --glass-blur:blur(20px);
  --ac:#00ff88; --ac2:#00e07a; --ac-glow:rgba(0,255,136,0.30); --ac-faint:rgba(0,255,136,0.08); --ac-border:rgba(0,255,136,0.35);
  --text:#f0f4ff; --text2:#94a3b8; --muted:#4a5568; --muted2:#1e2a4a;
  --danger:#ff4d6d; --warn:#fbbf24; --card-border:rgba(255,255,255,0.06);
  --grad-card:linear-gradient(135deg,#1e2d50 0%,#151f38 60%,#0f1829 100%);
  --shadow-card:0 8px 32px rgba(0,0,0,0.4),0 2px 8px rgba(0,0,0,0.3);
  --shadow-float:0 20px 60px rgba(0,0,0,0.5),0 4px 16px rgba(0,0,0,0.4);
  --shadow-inner:inset 0 2px 8px rgba(0,0,0,0.3); --nav-bg:rgba(10,15,30,0.85);
  --skel-bg:linear-gradient(90deg,#1a2340 25%,#1e2a4a 50%,#1a2340 75%);
}

/* ── Keyframes ── */
@keyframes skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes fu { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes fu-fast { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
@keyframes pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0.4)} 50%{box-shadow:0 0 0 5px rgba(255,77,109,0)} }
@keyframes expandCard { from{opacity:0;max-height:0;transform:translateY(-6px)} to{opacity:1;max-height:700px;transform:none} }
@keyframes spinIn { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
@keyframes stagger-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@keyframes neon-pulse { 0%,100%{text-shadow:0 0 8px var(--ac),0 0 20px var(--ac)} 50%{text-shadow:0 0 16px var(--ac),0 0 40px var(--ac),0 0 60px var(--ac)} }
@keyframes shimmer-text { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes urgent-border { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
@keyframes wave-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes float-in { from{opacity:0;transform:translateY(-16px) scale(.96)} to{opacity:1;transform:none} }
@keyframes slide-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }
@keyframes dot-appear { from{transform:scale(0)} to{transform:scale(1)} }

/* ── Base ── */
html,body{background:var(--bg);color:var(--text);font-family:var(--font);direction:rtl;height:100%;transition:background .3s,color .3s;}
::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:var(--ac-border);border-radius:4px}
.app{display:flex;flex-direction:column;height:100dvh;background:var(--bg);overflow:hidden;}
.screen{flex:1;overflow-y:auto;padding:0 14px 100px;}

/* ── Topbar frosted ── */
.topbar{display:flex;justify-content:space-between;align-items:center;padding:14px 14px 10px;gap:10px;position:sticky;top:0;z-index:50;
  background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);
  border-bottom:1px solid var(--card-border);margin:0 -14px;padding-left:14px;padding-right:14px;}
.tb-btn{width:36px;height:36px;border-radius:10px;background:var(--surface2);border:1px solid var(--card-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);transition:all .2s;flex-shrink:0;}
.tb-btn:hover{border-color:var(--ac-border);color:var(--ac);}

/* ── Hero card with animated wave ── */
.hero-card{background:linear-gradient(135deg,#0f1e3a 0%,#0a1428 50%,#060e1f 100%);border-radius:24px;padding:24px 20px 20px;margin:14px 0 16px;position:relative;overflow:hidden;border:1px solid rgba(0,255,136,0.12);}
/* Colored shadow for hero */
.hero-card-shadow{box-shadow:0 20px 60px rgba(0,255,136,0.12),0 8px 24px rgba(0,0,0,0.5),0 0 0 1px rgba(0,255,136,0.08);}
.hero-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,255,136,0.15) 0%,rgba(0,100,255,0.08) 50%,rgba(0,255,136,0.05) 100%);background-size:400% 400%;animation:wave-shift 8s ease infinite;z-index:0;}
.hero-card::after{content:'';position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(0,150,255,0.08) 0%,transparent 70%);border-radius:50%;z-index:0;}
.hero-dots{position:absolute;inset:0;opacity:0.1;background-image:radial-gradient(circle,rgba(0,255,136,0.6) 1px,transparent 1px);background-size:20px 20px;pointer-events:none;z-index:0;}
.hero-lbl{font-size:12px;color:rgba(255,255,255,0.55);font-weight:500;margin-bottom:6px;letter-spacing:0.5px;position:relative;z-index:1;}
.hero-greeting{font-size:11px;color:rgba(255,255,255,0.45);font-weight:400;margin-bottom:8px;position:relative;z-index:1;}
.hero-amount{font-size:34px;font-weight:900;line-height:1.1;margin-bottom:4px;position:relative;z-index:1;
  background:linear-gradient(135deg,#ffffff 0%,#00ff88 50%,#00ffcc 100%);background-size:200% 200%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer-text 4s ease infinite;}
.hero-change{font-size:11px;color:var(--ac);font-weight:600;display:flex;align-items:center;gap:4px;}
.quick-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px;position:relative;z-index:1;}
.qa-btn{display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:12px 6px;cursor:pointer;transition:all .2s;backdrop-filter:blur(10px);}
.qa-btn:hover{background:rgba(0,255,136,0.15);border-color:rgba(0,255,136,0.3);transform:translateY(-2px);}
.qa-btn:active{transform:scale(.96);}
.qa-icon{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;}
.qa-lbl{font-size:10px;color:rgba(255,255,255,0.7);font-weight:600;}

/* ── Contract Card — redesigned ── */
.cc{border-radius:16px;overflow:hidden;transition:all .25s;position:relative;}
.cc-compact{padding:13px 14px;display:flex;align-items:center;gap:11px;}
.cc-compact-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;border:1px solid;flex-shrink:0;position:relative;}
.cc-compact-body{flex:1;min-width:0;}
.cc-compact-name{font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cc-compact-sub{font-size:10px;color:var(--muted);margin-top:1px;font-weight:500;}
.cc-compact-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
.cc-compact-amt{font-size:12px;font-weight:800;}
.cc-expand-btn{width:26px;height:26px;border-radius:8px;background:var(--surface2);border:1px solid var(--card-border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;color:var(--muted);}
.cc-expand-btn:hover{border-color:var(--ac-border);color:var(--ac);}
.cc-expand-btn svg{transition:transform .25s cubic-bezier(.4,0,.2,1);}
.cc-expand-btn.open svg{transform:rotate(180deg);}
.cc-expanded{border-top:1px solid var(--muted2);padding:10px 14px 14px;overflow:hidden;animation:expandCard .32s cubic-bezier(.34,1.2,.64,1) both;}
.cc-actions{display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;}

/* Urgent animated border */
@keyframes border-draw { from{stroke-dashoffset:1000} to{stroke-dashoffset:0} }
.urgent-ring{position:absolute;inset:0;border-radius:16px;pointer-events:none;z-index:0;overflow:hidden;}
.urgent-ring svg{position:absolute;inset:0;width:100%;height:100%;}
.urgent-stroke{fill:none;stroke:#ff4d4d;stroke-width:2;animation:urgent-border 1.5s ease-in-out infinite;stroke-dasharray:8 4;}

/* Days remaining watermark */
.days-watermark{position:absolute;bottom:6px;left:10px;font-size:52px;font-weight:900;opacity:0.04;line-height:1;pointer-events:none;color:var(--text);font-family:var(--font);z-index:0;user-select:none;}

/* Video dots progress */
.vdots{display:flex;gap:3px;flex-wrap:wrap;max-width:120px;}
.vdot{width:7px;height:7px;border-radius:50%;transition:all .3s;flex-shrink:0;}
.vdot.done{animation:dot-appear .3s ease both;}

/* Urgency bar */
.urgency-bar{height:3px;border-radius:4px;overflow:hidden;margin-top:4px;}
.urgency-fill{height:100%;border-radius:4px;transition:width .6s ease;}

/* ── Amount / payment boxes ── */
.amt-box{background:var(--surface2);border-radius:10px;padding:8px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--card-border);}
.amt-lbl{font-size:9px;color:var(--muted);font-weight:600;}
.amt-val{font-size:14px;font-weight:800;color:var(--ac);}
.payment-amt-shadow{box-shadow:0 4px 14px rgba(0,255,136,0.15);}

/* Payment sections */
.psec{background:var(--surface2);border-radius:12px;padding:10px 12px;border:1px solid var(--card-border);margin-top:6px;}
.pbar{height:4px;background:var(--muted2);border-radius:4px;margin:6px 0 8px;overflow:hidden;}
.pfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ac),#00ffcc);box-shadow:0 0 8px var(--ac-glow);transition:width .8s cubic-bezier(.34,1.56,.64,1);}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.pitem{background:var(--surface);border-radius:10px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:6px;border:1px solid var(--card-border);box-shadow:var(--shadow-card);}

/* Payment toggle */
.ptog{padding:4px 10px;border-radius:7px;border:none;font-size:9px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .25s;white-space:nowrap;position:relative;overflow:hidden;}
.ptog.ok{background:rgba(0,255,136,0.15);color:var(--ac);box-shadow:0 2px 8px rgba(0,255,136,0.2);}
.ptog.no{background:var(--surface2);color:var(--muted);}

/* Video progress */
.vpsec{background:var(--surface2);border-radius:12px;padding:10px 12px;border:1px solid var(--card-border);margin-top:8px;}
.vpbar{height:4px;background:var(--muted2);border-radius:4px;margin:6px 0 8px;overflow:hidden;}
.vpfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ac),#00ffcc);transition:width .8s cubic-bezier(.34,1.56,.64,1);}
.vp-btn{padding:5px 13px;border-radius:8px;border:none;background:var(--surface);color:var(--ac);font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all .2s;border:1px solid var(--card-border);box-shadow:var(--shadow-card);}
.vp-btn:hover{border-color:var(--ac-border);}

/* ── Glassmorphism card ── */
.glass-card{background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--card-border);border-radius:18px;box-shadow:var(--shadow-card);}

/* ── Stat cards ── */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;}
.stat-card{background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:18px;padding:16px;box-shadow:var(--shadow-card);transition:all .25s;}
.stat-card:hover{transform:translateY(-2px);}
.stat-card.wide{grid-column:1/-1;}
.stat-lbl{font-size:11px;color:var(--muted);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.stat-val{font-size:18px;font-weight:800;color:var(--text);} .stat-val.ac{color:var(--ac);} .stat-val.sm{font-size:14px;}

/* ── Nav ── */
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--nav-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border-top:1px solid var(--card-border);display:flex;align-items:center;padding:6px 8px max(6px,env(safe-area-inset-bottom));box-shadow:0 -8px 32px rgba(0,0,0,0.12);gap:4px;}
.bni{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:7px 6px;border-radius:14px;transition:all .2s;flex:1;position:relative;}
.bni:hover{background:var(--ac-faint);}
.bni-lbl{font-size:9px;color:var(--muted);font-weight:700;transition:color .2s;}
.bni.on .bni-lbl{color:var(--ac);animation:neon-pulse 2s ease-in-out infinite;}
.bni-fab{width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,#00ff88,#00c96e);display:flex;align-items:center;justify-content:center;margin-bottom:2px;transition:all .2s;cursor:pointer;box-shadow:0 0 20px rgba(0,255,136,0.4),0 4px 20px rgba(0,201,110,0.5);position:relative;overflow:hidden;}
.bni-fab:hover{transform:scale(1.08);box-shadow:0 0 30px rgba(0,255,136,0.5),0 8px 28px rgba(0,201,110,0.6);}
.bni-fab:active{transform:scale(.95);}

/* ── Core card ── */
.card{background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:18px;padding:14px;box-shadow:var(--shadow-card);margin-bottom:var(--card-gap);transition:all .25s;}
.card:hover{box-shadow:var(--shadow-float);border-color:var(--ac-border);}

/* ── Transaction cards ── */
.tx-card{background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:16px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-card);transition:all .2s;cursor:pointer;position:relative;overflow:hidden;}
.tx-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-float);border-color:var(--ac-border);}
.tx-icon{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,var(--surface2),var(--surface3));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.1);}
.tx-name{font-size:13px;font-weight:600;color:var(--text);}
.tx-sub{font-size:10px;color:var(--muted);margin-top:2px;}
.tx-amt{font-size:13px;font-weight:700;} .tx-amt.pos{color:var(--ac);} .tx-amt.neg{color:var(--danger);}

/* ── Section headers ── */
.sec-hdr{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px;}
.sec-title{font-size:15px;font-weight:800;color:var(--text);}
.sec-link{font-size:11px;color:var(--ac);font-weight:700;cursor:pointer;}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:9px;font-weight:800;border:1px solid;}
.badge::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor;flex-shrink:0;}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:12px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:700;transition:all .2s;}
.btn:hover{transform:translateY(-1px);} .btn:active{transform:scale(.97);}
.bng{background:var(--glass-bg);backdrop-filter:blur(8px);color:var(--text);border:1px solid var(--card-border);box-shadow:var(--shadow-card);}
.bng:hover{border-color:var(--ac-border);color:var(--ac);}
.bngf{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#000;font-weight:800;box-shadow:0 4px 20px var(--ac-glow);}
.bngf:hover{box-shadow:0 6px 28px var(--ac-glow);}
.bgh{background:var(--surface2);color:var(--muted);border:1px solid var(--card-border);}
.bgh:hover{color:var(--text);}
.btn-danger{background:rgba(255,77,109,0.12);color:var(--danger);border:1px solid rgba(255,77,109,0.2);}
.ico-btn{width:32px;height:32px;border-radius:9px;background:var(--surface2);border:1px solid var(--card-border);color:var(--text2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;box-shadow:var(--shadow-card);}
.ico-btn:hover{color:var(--ac);border-color:var(--ac-border);}
.ico-btn.red:hover{color:var(--danger);border-color:rgba(255,77,109,0.3);}
.ico-btn.wa:hover{color:#25D366;border-color:rgba(37,211,102,0.3);}

/* ── Modals ── */
.mov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(12px);}
.mod{background:var(--glass-bg);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--card-border);border-radius:24px;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:var(--shadow-float),0 0 60px var(--ac-glow);animation:fu .25s cubic-bezier(.4,0,.2,1);}
.mhd{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.mtitle{font-size:17px;font-weight:900;color:var(--text);display:flex;align-items:center;gap:8px;}
.mclose{width:30px;height:30px;border-radius:9px;background:var(--surface2);border:1px solid var(--card-border);color:var(--muted);font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
.mclose:hover{color:var(--danger);border-color:rgba(255,77,109,0.3);}
.mft{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--muted2);}

/* ── Forms ── */
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ffl{grid-column:1/-1;} .fg{display:flex;flex-direction:column;gap:5px;}
.flbl{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.3px;}
.finp,.fsel,.fta{background:var(--surface2);border:1px solid var(--card-border);border-radius:12px;padding:10px 14px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;transition:all .2s;width:100%;}
.finp:focus,.fsel:focus,.fta:focus{border-color:var(--ac-border);box-shadow:0 0 0 3px var(--ac-faint);}
.finp[readonly]{color:var(--muted);cursor:default;}
.fta{min-height:60px;resize:vertical;} .fsel option{background:var(--surface);}
.fck{display:flex;align-items:center;gap:8px;cursor:pointer;}
.fck input{accent-color:var(--ac);width:15px;height:15px;}
.fck label{font-size:12px;color:var(--text2);cursor:pointer;font-weight:500;}
.dur-btns{display:flex;gap:6px;}
.dur-btn{flex:1;padding:9px 5px;border-radius:10px;border:1px solid var(--card-border);background:var(--surface2);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:12px;font-weight:700;transition:all .2s;text-align:center;}
.dur-btn.on{background:var(--ac-faint);color:var(--ac);border-color:var(--ac-border);}

/* ── Search ── */
.sb{background:var(--glass-bg);backdrop-filter:blur(8px);border:1px solid var(--card-border);border-radius:14px;padding:10px 14px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;width:100%;transition:all .2s;box-shadow:var(--shadow-inner);}
.sb:focus{border-color:var(--ac-border);box-shadow:0 0 0 3px var(--ac-faint);}
.sb::placeholder{color:var(--muted);}
.sb-wrap{position:relative;margin-bottom:12px;}
.sb-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;}

/* ── Tabs ── */
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
.tab{padding:7px 14px;border-radius:10px;border:1px solid var(--card-border);background:var(--glass-bg);backdrop-filter:blur(8px);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;box-shadow:var(--shadow-card);}
.tab.on{background:var(--ac);color:#000;border-color:var(--ac);box-shadow:0 4px 16px var(--ac-glow);}

/* ── Alerts ── */
.alr{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:14px;margin-bottom:8px;font-size:11px;font-weight:700;border:1px solid;animation:fu .3s;}
.au{background:rgba(255,77,109,.06);border-color:rgba(255,77,109,.2);color:var(--danger);}
.aw{background:rgba(251,191,36,.06);border-color:rgba(251,191,36,.2);color:var(--warn);}

/* ── Clients ── */
.clic{background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:16px;padding:12px 14px;margin-bottom:var(--card-gap);display:flex;align-items:center;gap:12px;transition:all .25s;cursor:pointer;box-shadow:var(--shadow-card);}
.clic:hover{box-shadow:var(--shadow-float);border-color:var(--ac-border);transform:translateX(-2px);}
.cav{width:42px;height:42px;border-radius:50%;border:1px solid var(--card-border);display:flex;align-items:center;justify-content:center;background:var(--surface2);flex-shrink:0;font-size:16px;font-weight:900;color:#000;}
.clic-name{font-weight:700;font-size:14px;color:var(--text);}
.clic-sub{font-size:10px;color:var(--muted);margin-top:2px;font-weight:500;}

/* ── Confirm dialog ── */
.conf-ov{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(12px);}
.conf-box{background:var(--glass-bg);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--card-border);border-radius:22px;padding:26px;max-width:320px;width:100%;text-align:center;box-shadow:var(--shadow-float);animation:spinIn .25s cubic-bezier(.4,0,.2,1);}

/* ── Global search ── */
.gsearch-wrap{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.88);backdrop-filter:blur(16px);display:flex;flex-direction:column;padding:20px 14px;}
.gsearch-inp{background:var(--glass-bg);backdrop-filter:blur(16px);border:1px solid var(--ac-border);border-radius:16px;padding:14px 16px;color:var(--text);font-size:15px;font-family:var(--font);outline:none;width:100%;box-shadow:0 0 30px var(--ac-glow);}
.gresult{background:var(--glass-bg);backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:14px;padding:12px 14px;margin-bottom:7px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-card);}
.gresult:hover{box-shadow:var(--shadow-float);border-color:var(--ac-border);}

/* ── Wallet ── */
.wallet-hero{background:linear-gradient(135deg,#0f1e3a 0%,#0a1428 50%,#060e1f 100%);border-radius:24px;padding:22px 20px 20px;margin:14px 0 16px;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(167,139,250,0.15),0 8px 24px rgba(0,0,0,0.5);border:1px solid rgba(167,139,250,0.15);}
.wallet-hero::before{content:'';position:absolute;top:-50px;right:-50px;width:180px;height:180px;background:radial-gradient(circle,rgba(167,139,250,0.15) 0%,transparent 70%);border-radius:50%;}
.wallet-tabs{display:flex;background:rgba(255,255,255,0.07);border-radius:12px;padding:3px;margin-bottom:18px;position:relative;z-index:1;border:1px solid rgba(255,255,255,0.1);}
.wallet-tab-btn{flex:1;padding:8px;border:none;border-radius:9px;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:700;transition:all .2s;background:transparent;color:rgba(255,255,255,0.5);}
.wallet-tab-btn.on{background:rgba(167,139,250,0.2);color:#a78bfa;box-shadow:0 0 12px rgba(167,139,250,0.2);}
.wallet-balance-lbl{font-size:12px;color:rgba(255,255,255,0.5);font-weight:500;margin-bottom:4px;position:relative;z-index:1;}
.wallet-balance-amt{font-size:36px;font-weight:900;color:#fff;margin-bottom:16px;position:relative;z-index:1;line-height:1;}
.wallet-actions{display:flex;gap:10px;position:relative;z-index:1;}
.wa-btn{flex:1;padding:11px;border:none;border-radius:14px;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .2s;}
.wa-btn.income-btn{background:rgba(0,255,136,0.18);color:var(--ac);border:1px solid rgba(0,255,136,0.3);}
.wa-btn.expense-btn{background:rgba(255,77,109,0.15);color:#ff4d6d;border:1px solid rgba(255,77,109,0.25);box-shadow:0 4px 12px rgba(255,77,109,0.15);}
.wa-btn.savings-btn{background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.25);}
.wa-btn:hover{transform:translateY(-1px);} .wa-btn:active{transform:scale(.97);}
.wallet-tx-card{background:var(--glass-bg);backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:16px;padding:13px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-card);transition:all .2s;animation:fu .3s;}
.wallet-tx-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-float);}
.wtx-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.wtx-icon.green{background:rgba(0,255,136,0.12);box-shadow:0 4px 12px rgba(0,255,136,0.15);}
.wtx-icon.red{background:rgba(255,77,109,0.12);box-shadow:0 4px 12px rgba(255,77,109,0.12);}
.wtx-icon.purple{background:rgba(167,139,250,0.12);box-shadow:0 4px 12px rgba(167,139,250,0.12);}
.wtx-name{font-size:13px;font-weight:700;color:var(--text);}
.wtx-sub{font-size:10px;color:var(--muted);margin-top:2px;}
.wtx-amt{font-size:14px;font-weight:800;} .wtx-amt.pos{color:var(--ac);} .wtx-amt.neg{color:var(--danger);} .wtx-amt.purple{color:#a78bfa;}

/* ── Typography ── */
.pt{font-size:22px;font-weight:900;color:var(--text);margin-bottom:2px;}
.ps{font-size:12px;color:var(--muted);}
.sh{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin:18px 0 8px;}
.lmark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#000;box-shadow:0 4px 14px var(--ac-glow);}

/* ── Misc UI ── */
.ptr-indicator{display:flex;justify-content:center;align-items:center;padding:8px 0;color:var(--ac);font-size:12px;font-weight:700;gap:8px;transition:all .2s;}
.unpaid-banner{background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.25);border-radius:16px;padding:12px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 16px rgba(255,77,109,0.12);}
.today-task{background:var(--glass-bg);backdrop-filter:blur(8px);border:1px solid var(--card-border);border-radius:14px;padding:10px 12px;margin-bottom:6px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-card);}
.countdown-box{background:rgba(255,214,0,0.08);border:1px solid rgba(255,214,0,0.2);border-radius:14px;padding:11px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 16px rgba(255,214,0,0.1);}
.unpaid-row{background:var(--glass-bg);backdrop-filter:blur(8px);border:1px solid var(--card-border);border-radius:14px;padding:11px 14px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;box-shadow:var(--shadow-card);animation:fu .3s;}

/* ── Selection mode ── */
.selection-banner{position:sticky;top:0;z-index:40;background:var(--ac);color:#000;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-radius:14px;margin-bottom:10px;font-weight:800;font-size:13px;animation:fu-fast .2s;}
.selection-checkbox{width:20px;height:20px;border-radius:6px;border:2px solid var(--ac);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;}
.selection-checkbox.checked{background:var(--ac);}

/* ── Settings ── */
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--muted2);}
.settings-row:last-child{border-bottom:none;}
.settings-lbl{font-size:13px;font-weight:600;color:var(--text);}
.settings-sub{font-size:10px;color:var(--muted);margin-top:2px;}
.toggle{width:42px;height:24px;border-radius:12px;background:var(--muted2);border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.toggle.on{background:var(--ac);box-shadow:0 2px 10px var(--ac-glow);}
.toggle::after{content:'';position:absolute;width:18px;height:18px;border-radius:9px;background:#fff;top:3px;right:3px;transition:transform .2s cubic-bezier(.34,1.56,.64,1);box-shadow:0 2px 4px rgba(0,0,0,0.2);}
.toggle.on::after{transform:translateX(-18px);}

/* ── Cash flow projection ── */
.cashflow-card{border-radius:16px;padding:14px;margin-bottom:8px;border:1px solid;display:flex;justify-content:space-between;align-items:center;}
.cashflow-30{background:rgba(0,255,136,0.06);border-color:rgba(0,255,136,0.2);box-shadow:0 4px 16px rgba(0,255,136,0.08);}
.cashflow-60{background:rgba(56,189,248,0.06);border-color:rgba(56,189,248,0.2);box-shadow:0 4px 16px rgba(56,189,248,0.08);}
.cashflow-90{background:rgba(167,139,250,0.06);border-color:rgba(167,139,250,0.2);box-shadow:0 4px 16px rgba(167,139,250,0.08);}

/* ── Status history timeline ── */
.timeline-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.timeline-line{width:2px;background:var(--muted2);flex:1;min-height:16px;margin:2px auto;}

/* ── Client swipe carousel ── */
.client-carousel{overflow:hidden;position:relative;}
.client-carousel-inner{display:flex;transition:transform .35s cubic-bezier(.4,0,.2,1);}
.client-slide{flex-shrink:0;width:100%;}

/* ── Stagger ── */
.stagger-item{animation:stagger-in .4s cubic-bezier(.4,0,.2,1) both;}

/* ── Responsive ── */
@media(max-width:500px){.fgrid{grid-template-columns:1fr}.ffl{grid-column:1}.pgrid{grid-template-columns:1fr}}
`;

// ─── Icons ────────────────────────────────────────────────────────
const Icon = ({ name, size=20, color="currentColor" }) => {
  const s = { width:size, height:size, stroke:color, fill:"none", strokeWidth:1.7, strokeLinecap:"round", strokeLinejoin:"round", flexShrink:0, display:"block" };
  const p = {
    dashboard:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    contracts:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    clients:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    income:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    wallet:<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M16 12h2"/><path d="M2 10h20"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus:<><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit:<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:<><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    doc:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    alert:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    back:<><polyline points="15,18 9,12 15,6"/></>,
    search:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    user_plus:<><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    contract_plus:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    clock:<><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>,
    check:<><polyline points="20,6 9,17 4,12"/></>,
    sun:<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    whatsapp:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    cancel:<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    history:<><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></>,
    file:<><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></>,
    person:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
    arrow_up:<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></>,
    arrow_down:<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></>,
    chevron_down:<><polyline points="6,9 12,15 18,9"/></>,
    chevron_left:<><polyline points="15,18 9,12 15,6"/></>,
    chevron_right:<><polyline points="9,18 15,12 9,6"/></>,
    refresh:<><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
    download:<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    pie:<><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
    trend_up:<><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>,
    bill:<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></>,
    lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    language:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
    database:<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    building:<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
    pen:<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
    palette:<><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
    cash_flow:<><polyline points="1,12 5,12"/><polyline points="7,6 12,1 17,6"/><polyline points="12,1 12,15"/><path d="M22 12a10 10 0 01-10 10"/><path d="M14 19l-2 2-2-2"/></>,
    bell:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    zap:<><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></>,
  };
  return <svg style={s} viewBox="0 0 24 24">{p[name]||null}</svg>;
};

// ─── Data mappers ─────────────────────────────────────────────────
const toApp = r => ({
  id:String(r.id), clientId:r.client_id?String(r.client_id):"", clientName:r.client_name||"",
  clientAddress:r.client_address||"", clientPhone:r.client_phone||"",
  videoCount:r.video_count||"", videoDone:r.video_done||0,
  totalAmount:r.total_amount||"", videoAmount:r.video_amount||"", presenterAmount:r.presenter_amount||"",
  currency:r.currency||"LYD", startDate:r.start_date||"", endDate:r.end_date||"",
  deposit50Date:r.deposit50_date||"", deposit50Paid:r.deposit50_paid||false,
  final50Date:r.final50_date||"", final50Paid:r.final50_paid||false,
  status:r.status||"pending", notes:r.notes||"", statusHistory:r.status_history||[],
  fileUrl:r.file_url||"", fileName:r.file_name||"",
  updatedAt:r.updated_at||r.created_at||null,
});
const toDB = c => ({
  client_id:c.clientId?Number(c.clientId):null, client_name:c.clientName,
  client_address:c.clientAddress, client_phone:c.clientPhone, video_count:c.videoCount,
  video_done:Number(c.videoDone||0), total_amount:c.totalAmount?Number(c.totalAmount):null,
  video_amount:c.videoAmount?Number(c.videoAmount):null,
  presenter_amount:c.presenterAmount?Number(c.presenterAmount):null,
  currency:c.currency, start_date:c.startDate||null, end_date:c.endDate||null,
  deposit50_date:c.deposit50Date||null, deposit50_paid:c.deposit50Paid,
  final50_date:c.final50Date||null, final50_paid:c.final50Paid,
  status:c.status, notes:c.notes, status_history:c.statusHistory||[],
  file_url:c.fileUrl||"", file_name:c.fileName||"",
});
const toAppCl = r => ({ id:String(r.id), name:r.name||"", phone:r.phone||"", address:r.address||"", notes:r.notes||"" });
const toDBCl  = c => ({ name:c.name, phone:c.phone||"", address:c.address||"", notes:c.notes||"" });

function detectDuration(startDate, endDate) {
  if (!startDate||!endDate) return null;
  const months=(new Date(endDate).getFullYear()-new Date(startDate).getFullYear())*12+(new Date(endDate).getMonth()-new Date(startDate).getMonth());
  if (months===1) return 1; if (months===3) return 3; return null;
}

// ─── Build notifications from contracts ───────────────────────────
function buildNotifications(contracts, dismissed=[]) {
  const notifs = [];
  const now = new Date();
  contracts.forEach(c => {
    if (c.status === "cancelled") return;
    const vc = Number(c.videoCount||0), vd = Number(c.videoDone||0);

    // Payment deadlines
    if (!c.final50Paid && c.final50Date) {
      const d = daysDiff(c.final50Date);
      if (d !== null && d >= 0 && d <= 7) {
        notifs.push({ id:`pay2-${c.id}`, group:"payments", type:d<=2?"u":"w", msg:`الدفعة الثانية لـ ${c.clientName} ${d===0?"اليوم!":d===1?"غداً":"خلال "+d+" أيام"}`, time:fmtDate(c.final50Date), contractId:c.id });
      }
    }
    if (!c.deposit50Paid && c.deposit50Date) {
      const d = daysDiff(c.deposit50Date);
      if (d !== null && d <= 0) {
        notifs.push({ id:`pay1-${c.id}`, group:"payments", type:"u", msg:`المقدم لـ ${c.clientName} لم يُستلم بعد`, time:fmtDate(c.deposit50Date), contractId:c.id });
      }
    }

    // Deadlines
    if (c.endDate) {
      const d = daysDiff(c.endDate);
      if (d !== null && d >= 0 && d <= 3) {
        notifs.push({ id:`end-${c.id}`, group:"deadlines", type:d===0?"u":"w", msg:`عقد ${c.clientName} ينتهي ${d===0?"اليوم!":d===1?"غداً":"خلال "+d+" أيام"}`, time:fmtDate(c.endDate), contractId:c.id });
      }
      if (d !== null && d < 0 && vc > 0 && vd < vc) {
        notifs.push({ id:`expired-${c.id}`, group:"deadlines", type:"u", msg:`انتهى عقد ${c.clientName} ولم تكتمل الفيديوهات (${vd}/${vc})`, contractId:c.id });
      }
    }

    // Completions
    if (c.status === "completed") {
      notifs.push({ id:`done-${c.id}`, group:"completions", type:"ok", msg:`تم إكمال عقد ${c.clientName} بنجاح`, contractId:c.id });
    }

    // Smart alerts — inactive contracts
    if (c.updatedAt) {
      const daysOld = Math.round((now - new Date(c.updatedAt)) / 86400000);
      if (daysOld > 14 && (c.status === "active" || c.status === "pending")) {
        notifs.push({ id:`stale-${c.id}`, group:"smart", type:"w", msg:`لم يتم تحديث عقد ${c.clientName} منذ ${daysOld} يوماً`, contractId:c.id });
      }
    }
  });
  return notifs.filter(n => !dismissed.includes(n.id));
}

// ─── Build activity feed ──────────────────────────────────────────
function buildActivities(contracts) {
  const acts = [];
  contracts.forEach(c => {
    if (c.statusHistory) {
      c.statusHistory.forEach(h => {
        const label = h.status === "active" ? "تم تفعيل" : h.status === "completed" ? "تم إكمال" : h.status === "cancelled" ? "تم إلغاء" : "تم تعديل";
        acts.push({ type: h.status === "completed" ? "complete" : h.status === "cancelled" ? "cancel" : "contract", msg:`${label} عقد ${c.clientName}`, time: new Date(h.date).toLocaleString("ar-LY", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }), ts: new Date(h.date).getTime() });
      });
    }
    if (c.deposit50Paid) acts.push({ type:"payment", msg:`تم استلام الدفعة الأولى من ${c.clientName}`, time:"", ts: 0 });
    if (c.final50Paid) acts.push({ type:"payment", msg:`تم استلام الدفعة الثانية من ${c.clientName}`, time:"", ts: 0 });
  });
  return acts.sort((a, b) => b.ts - a.ts).slice(0, 10);
}

// ─── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel, confirmLabel="تأكيد الحذف", confirmColor="var(--danger)", icon="alert", iconColor="var(--danger)" }) {
  return (
    <div className="conf-ov">
      <div className="conf-box">
        <Icon name={icon} size={36} color={iconColor} />
        <div style={{ fontWeight:700, fontSize:15, margin:"14px 0 6px", color:"var(--text)" }}>{msg}</div>
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button className="btn bgh" style={{ flex:1 }} onClick={onCancel}>إلغاء</button>
          <button className="btn" style={{ flex:1, background:`${confirmColor}20`, color:confirmColor, border:`1px solid ${confirmColor}40` }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────
function GlobalSearch({ contracts, clients, onClose, onViewContract, goToClient }) {
  const [q, setQ] = useState("");
  const inp = useRef();
  useEffect(() => { setTimeout(()=>inp.current?.focus(),80); }, []);
  const results = q.trim().length<1 ? [] : [
    ...clients.filter(c=>c.name.includes(q)||c.phone?.includes(q)).map(c=>({ type:"client", label:c.name, sub:c.phone, obj:c })),
    ...contracts.filter(c=>c.clientName.includes(q)||String(c.totalAmount).includes(q)||(c.clientPhone&&c.clientPhone.includes(q))).map(c=>({ type:"contract", label:c.clientName, sub:fmt(c.videoAmount||c.totalAmount,c.currency), obj:c })),
  ].slice(0,10);
  return (
    <div className="gsearch-wrap" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
        <Icon name="search" size={18} color="var(--ac)" />
        <input ref={inp} className="gsearch-inp" value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن عميل، عقد، هاتف، مبلغ..." />
        <button className="btn bgh" style={{ padding:"9px 12px", flexShrink:0 }} onClick={onClose}>إغلاق</button>
      </div>
      {q&&results.length===0&&<EmptyState type="search" />}
      {results.map((r,i)=>(
        <div key={i} className="gresult stagger-item" style={{ animationDelay:`${i*40}ms` }}
          onClick={()=>{ r.type==="contract"?onViewContract(r.obj):goToClient(r.obj.id); onClose(); }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <Icon name={r.type==="contract"?"contracts":"person"} size={15} color="var(--ac)" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{r.label}</div>
            <div style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>{r.type==="contract"?"عقد":"عميل"} · {r.sub}</div>
          </div>
          <Icon name="back" size={14} color="var(--muted)" />
        </div>
      ))}
    </div>
  );
}

// ─── Alerts builder ───────────────────────────────────────────────
function buildAlerts(contracts) {
  const a = [];
  contracts.forEach(c=>{
    if (c.status==="cancelled"||c.status==="completed") return;
    const vc=Number(c.videoCount||0),vd=Number(c.videoDone||0);
    if (!c.final50Paid&&c.final50Date) { const d=daysDiff(c.final50Date); if(d!==null&&d>=0&&d<=7) a.push({id:c.id,msg:`${d===0?"اليوم":d+" أيام"} — الدفعة الثانية لـ ${c.clientName}`,type:d<=2?"u":"w"}); }
    if (!c.deposit50Paid&&c.deposit50Date&&daysDiff(c.deposit50Date)<=0) a.push({id:c.id+"d",msg:`المقدم غير مدفوع — ${c.clientName}`,type:"u"});
    if (c.endDate&&daysDiff(c.endDate)!==null&&daysDiff(c.endDate)<0&&vc>0&&vd<vc) a.push({id:c.id+"exp",msg:`انتهى العقد ولم تكتمل الفيديوهات (${vd}/${vc}) — ${c.clientName}`,type:"u"});
    if (c.endDate) { const d=daysDiff(c.endDate); if(d!==null&&d>=0&&d<=2) a.push({id:c.id+"e",msg:`ينتهي ${d===0?"اليوم":"خلال "+d+" أيام"} — ${c.clientName}`,type:"u"}); }
  });
  return a;
}
function Alerts({ contracts }) {
  const a = buildAlerts(contracts);
  if (!a.length) return null;
  return <div style={{ marginBottom:14 }}>{a.map(x=><div key={x.id} className={`alr ${x.type==="u"?"au":"aw"}`}><Icon name="alert" size={13} color="currentColor"/>{x.msg}</div>)}</div>;
}

// ─── WhatsApp button ──────────────────────────────────────────────
function WABtn({ phone, sm }) {
  if (!phone) return null;
  const clean=phone.replace(/\D/g,"");
  const num=clean.startsWith("0")?"218"+clean.slice(1):clean;
  const sz=sm?28:32;
  return (
    <button className="ico-btn wa" onClick={e=>{ e.stopPropagation(); window.open(`https://wa.me/${num}`,"_blank"); }} style={{ width:sz,height:sz }}>
      <Icon name="whatsapp" size={sm?12:14} color="#25D366" />
    </button>
  );
}

// ─── Gradient Avatar ──────────────────────────────────────────────
function GradientAvatar({ name, size=42 }) {
  const [c1,c2] = nameToGradient(name||"");
  const initials = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c1},${c2})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*0.38,color:"#000",flexShrink:0,boxShadow:`0 4px 14px ${c1}66`,userSelect:"none" }}>
      {initials}
    </div>
  );
}

// ─── Cash Flow Projection ─────────────────────────────────────────
function CashFlowProjection({ contracts }) {
  const now = new Date();
  const project = days => {
    const future = new Date(now.getTime() + days*86400000);
    return contracts.filter(c=>c.status!=="cancelled").reduce((s,c)=>{
      let amt=0;
      if (!c.deposit50Paid&&c.deposit50Date) { const d=new Date(c.deposit50Date); if(d>=now&&d<=future) amt+=Number(c.videoAmount||c.totalAmount||0)*0.5; }
      if (!c.final50Paid&&c.final50Date) { const d=new Date(c.final50Date); if(d>=now&&d<=future) amt+=Number(c.videoAmount||c.totalAmount||0)*0.5; }
      return s+amt;
    },0);
  };
  const p30=project(30),p60=project(60),p90=project(90);
  const tiers=[
    { days:30,amt:p30,label:"30 يوم",color:"#00ff88",cls:"cashflow-30" },
    { days:60,amt:p60,label:"60 يوم",color:"#38bdf8",cls:"cashflow-60" },
    { days:90,amt:p90,label:"90 يوم",color:"#a78bfa",cls:"cashflow-90" },
  ];
  return (
    <div className="card" style={{ marginBottom:10 }}>
      <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:12,display:"flex",alignItems:"center",gap:7 }}>
        <Icon name="trend_up" size={14} color="var(--ac)" /> توقع التدفق النقدي
      </div>
      {tiers.map(t=>(
        <div key={t.days} className={`cashflow-card ${t.cls}`}>
          <div>
            <div style={{ fontSize:10,color:"var(--muted)",fontWeight:700,marginBottom:2 }}>خلال {t.label}</div>
            <div style={{ fontSize:16,fontWeight:900,color:t.color }}>{fmt(t.amt)}</div>
          </div>
          <div style={{ width:40,height:40,borderRadius:"50%",border:`2px solid ${t.color}44`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Icon name="calendar" size={16} color={t.color} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────
function ClientModal({ client, onClose, onSave }) {
  const [f, setF] = useState(client?{...client}:{ name:"",phone:"",address:"",notes:"" });
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle"><Icon name={client?"edit":"user_plus"} size={17} color="var(--ac)"/>{client?"تعديل عميل":"عميل جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div className="fgrid">
          <div className="fg ffl"><label className="flbl">اسم العميل</label><input className="finp" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="الطرف الثاني"/></div>
          <div className="fg ffl"><label className="flbl">رقم الهاتف</label><input className="finp" value={f.phone} onChange={e=>s("phone",e.target.value)} placeholder="09..."/></div>
          <div className="fg ffl"><label className="flbl">العنوان</label><input className="finp" value={f.address} onChange={e=>s("address",e.target.value)}/></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e=>s("notes",e.target.value)}/></div>
        </div>
        <div className="mft"><button className="btn bgh" onClick={onClose}>إلغاء</button><button className="btn bngf" onClick={()=>{ if(!f.name){alert("أدخل الاسم");return;} onSave({...f,id:f.id||null}); }}>حفظ</button></div>
      </div>
    </div>
  );
}

// ─── Contract Modal ───────────────────────────────────────────────
const EC = { clientId:"",clientName:"",clientAddress:"",clientPhone:"",videoCount:"",videoDone:0,totalAmount:"",videoAmount:"",presenterAmount:"",currency:"LYD",startDate:"",endDate:"",deposit50Date:"",deposit50Paid:false,final50Date:"",final50Paid:false,status:"pending",notes:"",statusHistory:[],fileUrl:"",fileName:"" };

function ContractModal({ contract, clients, onClose, onSave, defaultCurrency }) {
  const initDur = contract?detectDuration(contract.startDate,contract.endDate):null;
  const [f, setF] = useState(contract?{...contract}:{ ...EC, currency:defaultCurrency||"LYD" });
  const [drop, setDrop] = useState(false);
  const [dur, setDur] = useState(initDur);
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  useEffect(()=>{ const v=Number(f.videoAmount||0),p=Number(f.presenterAmount||0); if(v||p) s("totalAmount",String(v+p)); },[f.videoAmount,f.presenterAmount]);
  useEffect(()=>{ if(f.startDate) s("deposit50Date",f.startDate); },[f.startDate]);
  useEffect(()=>{ if(f.endDate) s("final50Date",f.endDate); },[f.endDate]);
  const handleDur = m => { setDur(m); if(f.startDate) s("endDate",addMonths(f.startDate,m)); };
  const handleStart = v => { s("startDate",v); if(dur&&v) s("endDate",addMonths(v,dur)); };
  const pick = c => { setF(p=>({...p,clientId:c.id,clientName:c.name,clientPhone:c.phone||"",clientAddress:c.address||""})); setDrop(false); };
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle"><Icon name={contract?"edit":"contract_plus"} size={17} color="var(--ac)"/>{contract?"تعديل":"عقد جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div style={{ marginBottom:14, position:"relative" }}>
          <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:6 }}><span className="flbl">العميل</span>{f.clientName&&<span style={{ fontSize:11,color:"var(--ac)",fontWeight:700 }}>✓ {f.clientName}</span>}</div>
          <button className="btn bng" style={{ width:"100%",justifyContent:"space-between" }} onClick={()=>setDrop(p=>!p)}><span>{f.clientName||"اختر عميلاً..."}</span><Icon name="clients" size={13} color="var(--ac)"/></button>
          {drop && (
            <div style={{ position:"absolute",top:"100%",insetInline:0,zIndex:50,background:"var(--glass-bg)",backdropFilter:"blur(20px)",border:"1px solid var(--card-border)",borderRadius:16,padding:8,marginTop:6,maxHeight:170,overflowY:"auto",boxShadow:"var(--shadow-float)" }}>
              {clients.length===0&&<div style={{ padding:10,color:"var(--muted)",fontSize:12,textAlign:"center" }}>لا يوجد عملاء</div>}
              {clients.map(c=>(
                <div key={c.id} onClick={()=>pick(c)} style={{ padding:"9px 12px",borderRadius:10,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:10 }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--ac-faint)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <GradientAvatar name={c.name} size={28} />
                  <div><div style={{ fontWeight:600,fontSize:13 }}>{c.name}</div>{c.phone&&<div style={{ fontSize:10,color:"var(--muted)" }}>{c.phone}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="fgrid">
          <div className="fg"><label className="flbl">عدد الفيديوهات</label><input className="finp" type="number" value={f.videoCount} onChange={e=>s("videoCount",e.target.value)}/></div>
          <div className="fg"><label className="flbl">العملة</label><select className="fsel" value={f.currency} onChange={e=>s("currency",e.target.value)}><option value="LYD">دينار ليبي</option><option value="SAR">ريال سعودي</option><option value="AED">درهم إماراتي</option><option value="USD">دولار</option></select></div>
          <div className="fg"><label className="flbl">قيمة الفيديوهات</label><input className="finp" type="number" value={f.videoAmount} onChange={e=>s("videoAmount",e.target.value)}/></div>
          <div className="fg"><label className="flbl">قيمة الوجه الإعلامي</label><input className="finp" type="number" value={f.presenterAmount} onChange={e=>s("presenterAmount",e.target.value)}/></div>
          <div className="fg ffl"><label className="flbl">الإجمالي (تلقائي)</label><input className="finp" type="number" value={f.totalAmount} readOnly style={{ color:"var(--ac)",fontWeight:800 }}/></div>
          <div className="fg"><label className="flbl">تاريخ البدء</label><input className="finp" type="date" value={f.startDate} onChange={e=>handleStart(e.target.value)}/></div>
          <div className="fg"><label className="flbl">المدة</label><div className="dur-btns"><button className={`dur-btn${dur===1?" on":""}`} onClick={()=>handleDur(1)}>شهر</button><button className={`dur-btn${dur===3?" on":""}`} onClick={()=>handleDur(3)}>3 أشهر</button></div></div>
          <div className="fg"><label className="flbl">تاريخ الانتهاء</label><input className="finp" type="date" value={f.endDate} onChange={e=>s("endDate",e.target.value)}/></div>
          <div className="fg"><label className="flbl">موعد الدفعة الأولى</label><input className="finp" type="date" value={f.deposit50Date} readOnly style={{ color:"var(--muted)" }}/></div>
          <div className="fg"><label className="flbl">موعد الدفعة الثانية</label><input className="finp" type="date" value={f.final50Date} readOnly style={{ color:"var(--muted)" }}/></div>
          <div className="fck"><input type="checkbox" id="d1" checked={f.deposit50Paid} onChange={e=>s("deposit50Paid",e.target.checked)}/><label htmlFor="d1">تم استلام الدفعة الأولى</label></div>
          <div className="fck"><input type="checkbox" id="d2" checked={f.final50Paid} onChange={e=>s("final50Paid",e.target.checked)}/><label htmlFor="d2">تم استلام الدفعة الثانية</label></div>
          <div className="fg ffl"><label className="flbl">الحالة</label><select className="fsel" value={f.status} onChange={e=>s("status",e.target.value)}><option value="pending">معلق</option><option value="active">جارٍ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e=>s("notes",e.target.value)}/></div>
        </div>
        <div className="mft"><button className="btn bgh" onClick={onClose}>إلغاء</button><button className="btn bngf" onClick={()=>{ if(!f.clientName){alert("اختر عميلاً");return;} onSave({...f,id:f.id||null}); }}>حفظ العقد</button></div>
      </div>
    </div>
  );
}

// ─── Contract View Modal ──────────────────────────────────────────
function ContractViewModal({ c, onClose, onPdfExported, companyProfile, pdfOptions }) {
  const ref = useRef();
  const sigRef = useRef();
  const [hasSig, setHasSig] = useState(false);
  const opts = pdfOptions || { includeTerms:true, includePayment:true, includeSignature:true, includeLogo:true };

  const dParts = d=>{ if(!d) return {d:"",m:"",y:""}; const dt=new Date(d); return {d:String(dt.getDate()).padStart(2,"0"),m:String(dt.getMonth()+1).padStart(2,"0"),y:String(dt.getFullYear())}; };
  const sd=dParts(c.startDate),ed=dParts(c.endDate);
  const cur=c.currency||"LYD";
  const vAmt=c.videoAmount?Number(c.videoAmount).toLocaleString("en-US",{minimumFractionDigits:2}):"__________";
  const pAmt=c.presenterAmount?Number(c.presenterAmount).toLocaleString("en-US",{minimumFractionDigits:2}):"__________";
  const pct=Math.round(((c.deposit50Paid?0.5:0)+(c.final50Paid?0.5:0))*100);
  const vc=Number(c.videoCount||0),vd=Number(c.videoDone||0);
  const co = companyProfile||{};
  const compName = co.name||"شركة فارق للإنتاج";
  const compPhone = co.phone||"0920953918";

  useEffect(()=>{
    if (!sigRef.current) return;
    const canvas=sigRef.current;
    const ctx=canvas.getContext("2d");
    ctx.strokeStyle="#000"; ctx.lineWidth=2; ctx.lineCap="round";
    let isDown=false, last=null;
    const getPos=e=>{ const r=canvas.getBoundingClientRect(); const src=e.touches?e.touches[0]:e; return {x:src.clientX-r.left,y:src.clientY-r.top}; };
    const down=e=>{ isDown=true; last=getPos(e); setHasSig(true); };
    const move=e=>{ if(!isDown||!last) return; e.preventDefault(); const pos=getPos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(pos.x,pos.y); ctx.stroke(); last=pos; };
    const up=()=>{ isDown=false; last=null; };
    canvas.addEventListener("mousedown",down); canvas.addEventListener("mousemove",move); canvas.addEventListener("mouseup",up);
    canvas.addEventListener("touchstart",down,{passive:false}); canvas.addEventListener("touchmove",move,{passive:false}); canvas.addEventListener("touchend",up);
    return ()=>{ canvas.removeEventListener("mousedown",down); canvas.removeEventListener("mousemove",move); canvas.removeEventListener("mouseup",up); canvas.removeEventListener("touchstart",down); canvas.removeEventListener("touchmove",move); canvas.removeEventListener("touchend",up); };
  },[]);

  const clearSig=()=>{ const canvas=sigRef.current; if(!canvas) return; canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height); setHasSig(false); };

  const exportPDF=()=>{
    const w=window.open("","_blank");
    const sigData=hasSig?sigRef.current.toDataURL():"";
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>عقد - ${c.clientName||""}</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;background:#fff;padding:32px 44px;font-size:14px;line-height:1.9;}.sec{font-weight:800;font-size:14px;margin:13px 0 5px;border-right:3px solid #111;padding-right:8px;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:11px 0;}.bx{border:1px solid #ddd;border-radius:7px;padding:10px 12px;}.bl{font-weight:800;font-size:10px;color:#555;margin-bottom:5px;border-right:3px solid #111;padding-right:6px;}hr{border:none;border-top:2px solid #111;margin:12px 0;}hr.t{border-top:1px solid #ddd;margin:16px 0;}.sg{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:22px;}.s{text-align:center;}.sl{margin-top:34px;border-bottom:1.5px dashed #bbb;}</style></head><body>${ref.current.innerHTML}${opts.includeSignature&&sigData?`<div style="margin-top:20px;"><div style="font-weight:700;font-size:12px;margin-bottom:6px;">توقيع العميل الرقمي:</div><img src="${sigData}" style="border:1px solid #ddd;border-radius:8px;max-height:80px;"/></div>`:""}</body></html>`);
    w.document.close(); setTimeout(()=>{ w.focus(); w.print(); },500);
    onPdfExported(c.id);
  };

  return (
    <div className="mov" style={{ alignItems:"flex-start", overflowY:"auto" }}>
      <div style={{ background:"var(--glass-bg)",backdropFilter:"blur(24px)",border:"1px solid var(--card-border)",borderRadius:22,width:"100%",maxWidth:740,margin:"12px 0",overflow:"hidden",boxShadow:`var(--shadow-float),0 0 40px ${SC[c.status]}22` }}>
        <div style={{ background:"var(--surface2)",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--muted2)" }}>
          <span style={{ color:"var(--text)",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:7 }}><Icon name="doc" size={14} color={SC[c.status]}/>تفاصيل العقد</span>
          <div style={{ display:"flex", gap:7 }}>
            {c.fileUrl&&<a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}><button className="btn bng" style={{ fontSize:11,padding:"5px 11px" }}><Icon name="file" size={11} color="var(--ac)"/>نسخة العقد</button></a>}
            <button className="btn bngf" style={{ fontSize:11,padding:"6px 13px" }} onClick={exportPDF}><Icon name="doc" size={11} color="#000"/>تصدير PDF</button>
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ padding:"16px 18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <GradientAvatar name={c.clientName} size={40} />
              <div><div style={{ fontSize:17,fontWeight:700 }}>{c.clientName}</div><div style={{ fontSize:11,color:"var(--muted)",marginTop:2 }}>{c.videoCount?`${c.videoCount} فيديو`:""}</div></div>
            </div>
            <span className="badge" style={{ color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44" }}>{SL[c.status]}</span>
          </div>
          <div className="amt-box payment-amt-shadow"><div className="amt-lbl">الإجمالي</div><div className="amt-val">{fmt(c.totalAmount,c.currency)}</div></div>
          <div className="psec">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontSize:10,color:"var(--muted)",fontWeight:700 }}>الدفع</span>
              <ProgressRing pct={pct} size={50} stroke={4} color={pct===100?"var(--ac)":"#ffd600"}/>
            </div>
            <div className="pgrid">
              {[{l:"الأولى 50%",paid:c.deposit50Paid,date:c.deposit50Date},{l:"الثانية 50%",paid:c.final50Paid,date:c.final50Date}].map(p=>(
                <div key={p.l} className="pitem" style={{ boxShadow:p.paid?"0 2px 12px rgba(0,255,136,0.12)":"var(--shadow-card)" }}>
                  <div><div style={{ fontSize:10,color:"var(--muted)",fontWeight:600 }}>{p.l}</div><div style={{ fontSize:12,fontWeight:700 }}>{fmt(Number(c.totalAmount||0)*0.5,c.currency)}</div>{p.date&&<div style={{ fontSize:9,color:"var(--muted)" }}>{fmtDate(p.date)}</div>}</div>
                  <div style={{ fontSize:11,color:p.paid?"var(--ac)":"var(--muted)",fontWeight:800 }}>{p.paid?"✓":"—"}</div>
                </div>
              ))}
            </div>
          </div>
          {vc>0&&<div className="vpsec" style={{ marginTop:8 }}><div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:10,color:"var(--muted)",fontWeight:700 }}>الفيديوهات</span><span style={{ fontSize:11,fontWeight:800,color:"var(--ac)" }}>{vd}/{vc}</span></div><div className="vpbar"><div className="vpfill" style={{ width:`${vc>0?(vd/vc)*100:0}%` }}/></div></div>}
          {c.statusHistory&&c.statusHistory.length>0&&(
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11,fontWeight:800,color:"var(--muted)",marginBottom:8,display:"flex",alignItems:"center",gap:6 }}><Icon name="history" size={11} color="var(--muted)"/>سجل الحالات</div>
              {c.statusHistory.map((h,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"4px 0" }}>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:SC[h.status]||"var(--muted)",boxShadow:`0 0 8px ${SC[h.status]||"var(--muted)"}66`,flexShrink:0 }}/>
                    {i<c.statusHistory.length-1&&<div style={{ width:2,background:"var(--muted2)",flex:1,minHeight:16,margin:"2px auto" }}/>}
                  </div>
                  <div style={{ paddingBottom:i<c.statusHistory.length-1?12:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:SC[h.status]||"var(--muted)" }}>{SL[h.status]||h.status}</div>
                    <div style={{ fontSize:10,color:"var(--muted)" }}>{new Date(h.date).toLocaleDateString("ar-LY",{year:"numeric",month:"short",day:"numeric"})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {opts.includeSignature&&(
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11,fontWeight:800,color:"var(--muted)",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span><Icon name="pen" size={11} color="var(--muted)"/> التوقيع الرقمي للعميل</span>
                {hasSig&&<button className="btn bgh" style={{ fontSize:10,padding:"3px 9px" }} onClick={clearSig}>مسح</button>}
              </div>
              <canvas ref={sigRef} width={340} height={80} style={{ border:"1px dashed var(--muted2)",borderRadius:10,background:"var(--surface2)",cursor:"crosshair",width:"100%",height:80,touchAction:"none" }}/>
              <div style={{ fontSize:9,color:"var(--muted)",marginTop:4 }}>امسح بإصبعك أو الماوس</div>
            </div>
          )}
          {c.notes&&<div style={{ marginTop:10,fontSize:12,color:"var(--text2)",padding:"9px 12px",background:"var(--surface2)",borderRadius:10,border:"1px solid var(--card-border)" }}>📝 {c.notes}</div>}
        </div>
        <div ref={ref} style={{ display:"none" }}>
          {opts.includeLogo&&<div style={{ textAlign:"center",marginBottom:16 }}>
            <img src="/BA449EC2-EB5B-4033-BCDA-333BF5EED250.PNG" alt="فارق" style={{ width:70,height:70,objectFit:"contain",filter:"invert(1)",display:"inline-block",marginBottom:7 }}/>
            <div style={{ fontWeight:800,fontSize:16,fontFamily:"'Tajawal',sans-serif" }}>{compName}</div>
            <div style={{ color:"#555",fontSize:11,fontFamily:"'Tajawal',sans-serif" }}>FAREQ Productions — {compPhone}</div>
          </div>}
          <hr style={{ border:"none",borderTop:"2px solid #111",margin:"12px 0" }}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,margin:"11px 0",fontFamily:"'Tajawal',sans-serif" }}>
            <div style={{ border:"1px solid #ddd",borderRadius:7,padding:"9px 11px" }}><div style={{ fontWeight:800,fontSize:10,color:"#555",marginBottom:5,borderRight:"3px solid #111",paddingRight:6 }}>الطرف الأول</div>{[["الاسم",compName],["الهاتف",compPhone]].map(([l,v])=><div key={l} style={{ display:"flex",gap:4,margin:"2px 0",fontSize:13 }}><span style={{ color:"#666",minWidth:45 }}>{l}:</span><span style={{ fontWeight:600 }}>{v}</span></div>)}</div>
            <div style={{ border:"1px solid #ddd",borderRadius:7,padding:"9px 11px" }}><div style={{ fontWeight:800,fontSize:10,color:"#555",marginBottom:5,borderRight:"3px solid #111",paddingRight:6 }}>الطرف الثاني</div>{[["الاسم",c.clientName],["العنوان",c.clientAddress],["الهاتف",c.clientPhone]].map(([l,v])=><div key={l} style={{ display:"flex",gap:4,margin:"2px 0",fontSize:13 }}><span style={{ color:"#666",minWidth:45 }}>{l}:</span><span style={{ fontWeight:600,borderBottom:"1px solid #ddd",flex:1 }}>{v||""}</span></div>)}</div>
          </div>
          <div style={{ fontWeight:800,fontSize:13,margin:"13px 0 5px",borderRight:"3px solid #111",paddingRight:7,fontFamily:"'Tajawal',sans-serif" }}>موضوع العقد</div>
          <div style={{ fontFamily:"'Tajawal',sans-serif",lineHeight:1.9 }}><div>يلتزم الطرف الأول بتقديم خدمات إنتاج محتوى فيديو تشمل:</div><div>- تصوير وإنتاج عدد ({c.videoCount||"          "}) فيديوهات</div></div>
          <div style={{ fontWeight:800,fontSize:13,margin:"13px 0 5px",borderRight:"3px solid #111",paddingRight:7,fontFamily:"'Tajawal',sans-serif" }}>مدة العقد:</div>
          <div style={{ fontFamily:"'Tajawal',sans-serif" }}>من {sd.d}/{sd.m}/{sd.y} إلى {ed.d}/{ed.m}/{ed.y}</div>
          {opts.includePayment&&<><div style={{ fontWeight:800,fontSize:13,margin:"13px 0 5px",borderRight:"3px solid #111",paddingRight:7,fontFamily:"'Tajawal',sans-serif" }}>القيمة المالية:</div><div style={{ fontFamily:"'Tajawal',sans-serif" }}><div>- قيمة الفيديوهات: {vAmt} {cur}</div><div>- قيمة الوجه الإعلامي: {pAmt} {cur}</div><div style={{ margin:"9px 0 3px",fontWeight:700 }}>طريقة الدفع: 50% مقدماً · 50% عند التسليم</div></div></>}
          {opts.includeTerms&&<><div style={{ fontWeight:800,fontSize:13,margin:"13px 0 5px",borderRight:"3px solid #111",paddingRight:7,fontFamily:"'Tajawal',sans-serif" }}>الشروط والأحكام:</div><div style={{ fontFamily:"'Tajawal',sans-serif" }}><div>- يحق للعميل طلب تعديل فقط لكل فيديو</div><div>- لا يتم استرجاع الدفعة المقدمة في حال الإلغاء بعد بدء العمل</div><div>- يحق للطرف الأول استخدام الأعمال في معرض أعماله</div></div></>}
          {c.notes&&<><div style={{ fontWeight:800,fontSize:13,margin:"13px 0 5px",borderRight:"3px solid #111",paddingRight:7,fontFamily:"'Tajawal',sans-serif" }}>ملاحظات:</div><div style={{ fontFamily:"'Tajawal',sans-serif" }}>{c.notes}</div></>}
          <hr style={{ border:"none",borderTop:"1px solid #ddd",margin:"18px 0 14px" }}/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:36,fontFamily:"'Tajawal',sans-serif" }}>
            {[`الطرف الأول — ${compName}`,`الطرف الثاني — ${c.clientName||"___________"}`].map((p,i)=><div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:11,color:"#555",marginBottom:3 }}>{p}</div><div style={{ fontWeight:700 }}>التوقيع</div><div style={{ marginTop:34,borderBottom:"1.5px dashed #bbb" }}/></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Video Dots ───────────────────────────────────────────────────
function VideoDots({ done, total, color }) {
  if (!total || total === 0) return null;
  const count = Math.min(total, 12);
  return (
    <div className="vdots">
      {Array.from({length:count}).map((_,i) => (
        <div key={i} className={`vdot${i < done ? " done" : ""}`}
          style={{ background: i < done ? color : "var(--muted2)", boxShadow: i < done ? `0 0 4px ${color}88` : "none", animationDelay:`${i*50}ms` }} />
      ))}
      {total > 12 && <div style={{ fontSize:8, color:"var(--muted)", alignSelf:"center" }}>+{total-12}</div>}
    </div>
  );
}

// ─── Urgency Bar ──────────────────────────────────────────────────
function UrgencyBar({ endDate }) {
  if (!endDate) return null;
  const d = daysDiff(endDate);
  if (d === null || d > 30) return null;
  const pct = Math.max(0, Math.min(100, 100 - (d / 30) * 100));
  const color = d <= 0 ? "#ff4d4d" : d <= 3 ? "#ff6b35" : d <= 7 ? "#ffd600" : "#00ff88";
  return (
    <div style={{ marginTop:3 }}>
      <div style={{ fontSize:8, color, fontWeight:700, marginBottom:2 }}>
        {d <= 0 ? "منتهي" : d === 1 ? "يوم واحد" : `${d} أيام`}
      </div>
      <div className="urgency-bar" style={{ background:"var(--muted2)", width:"100%" }}>
        <div className="urgency-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}bb)`, boxShadow:`0 0 6px ${color}66` }}/>
      </div>
    </div>
  );
}

// ─── Contract Card — redesigned ───────────────────────────────────
function ContractCard({ c, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel, selected, onSelect, selectionMode, delay=0 }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(((c.deposit50Paid?0.5:0)+(c.final50Paid?0.5:0))*100);
  const f50d = c.final50Date ? daysDiff(c.final50Date) : null;
  const vc = Number(c.videoCount||0), vd = Number(c.videoDone||0);
  const vpct = vc > 0 ? Math.round((vd/vc)*100) : 0;
  const accent = CARD_ACCENT[c.status] || CARD_ACCENT.pending;
  const statusColor = SC[c.status];
  const daysLeft = c.endDate ? daysDiff(c.endDate) : null;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && c.status !== "completed" && c.status !== "cancelled";

  return (
    <div className="stagger-item" style={{ animationDelay:`${delay}ms` }}>
      <SwipeableCard onDelete={()=>onDelete(c.id)} onCancel={()=>onCancel(c.id)} onEdit={()=>onEdit(c)} onLongPress={()=>onSelect(c.id)}>
        <TiltCard>
          <div className="cc" style={{
            border:`1px solid ${accent.border}`,
            background:`linear-gradient(135deg,${accent.glow} 0%,transparent 60%),var(--glass-bg)`,
            backdropFilter:"blur(12px)",
            WebkitBackdropFilter:"blur(12px)",
            boxShadow:`0 8px 32px ${accent.shadow},0 2px 8px rgba(0,0,0,0.15)`,
          }}>
            {/* Animated border for urgent contracts */}
            {isUrgent && (
              <div style={{ position:"absolute",inset:0,borderRadius:16,pointerEvents:"none",zIndex:0,overflow:"hidden" }}>
                <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%" }} preserveAspectRatio="none">
                  <rect x="1" y="1" width="calc(100%-2)" height="calc(100%-2)" rx="15" ry="15"
                    fill="none" stroke="#ff4d4d" strokeWidth="2" strokeDasharray="8 4"
                    style={{ animation:"urgent-border 1.5s ease-in-out infinite" }}/>
                </svg>
              </div>
            )}

            {/* Days remaining watermark */}
            {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
              <div className="days-watermark">{daysLeft}</div>
            )}

            {/* Status bar */}
            <div style={{ position:"absolute",right:0,top:0,bottom:0,width:3,background:statusColor,borderRadius:"0 16px 16px 0",boxShadow:`0 0 10px ${statusColor}88`,zIndex:1 }}/>

            {/* Selection checkbox */}
            {selectionMode && (
              <div style={{ position:"absolute",top:10,left:10,zIndex:5 }} onClick={e=>{ e.stopPropagation(); onSelect(c.id); }}>
                <div className={`selection-checkbox${selected?" checked":""}`}>
                  {selected&&<Icon name="check" size={12} color="#000"/>}
                </div>
              </div>
            )}

            <div className="cc-compact" style={{ paddingLeft:selectionMode?36:14, position:"relative", zIndex:1 }}>
              {/* Client avatar */}
              <div onClick={()=>onView(c)} style={{ cursor:"pointer", flexShrink:0 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${statusColor}22,${statusColor}11)`,border:`1px solid ${statusColor}44`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${nameToGradient(c.clientName)[0]},${nameToGradient(c.clientName)[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:10,color:"#000" }}>
                    {(c.clientName||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="cc-compact-body" onClick={()=>onView(c)} style={{ cursor:"pointer" }}>
                <div className="cc-compact-name">{c.clientName||"عميل"}</div>
                <div className="cc-compact-sub" style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
                  {vc > 0 && <VideoDots done={vd} total={vc} color={statusColor}/>}
                  {fmtDate(c.startDate) && <span style={{ color:"var(--muted)",fontSize:9 }}>{fmtDate(c.startDate)}</span>}
                </div>
                <UrgencyBar endDate={c.endDate}/>
              </div>

              <div className="cc-compact-right">
                <span className="badge" style={{ color:statusColor,background:statusColor+"18",borderColor:statusColor+"44",boxShadow:`0 2px 8px ${statusColor}22` }}>{SL[c.status]}</span>
                <div className="cc-compact-amt" style={{ color:statusColor }}>{fmt(c.videoAmount||c.totalAmount,c.currency)}</div>
              </div>

              <button className={`cc-expand-btn${expanded?" open":""}`} onClick={e=>{ e.stopPropagation(); setExpanded(p=>!p); }}>
                <Icon name="chevron_down" size={14} color="currentColor"/>
              </button>
            </div>

            {expanded && (
              <div className="cc-expanded" style={{ position:"relative", zIndex:1 }}>
                <div className="cc-actions">
                  <div style={{ display:"flex",gap:5 }}>
                    <button className="ico-btn" onClick={()=>onEdit(c)}><Icon name="edit" size={12}/></button>
                    <button className="ico-btn" onClick={()=>onView(c)}><Icon name="doc" size={12}/></button>
                    <WABtn phone={c.clientPhone} sm/>
                    <button className="ico-btn red" onClick={()=>onCancel(c.id)}><Icon name="cancel" size={12} color="var(--danger)"/></button>
                    <button className="ico-btn red" onClick={()=>onDelete(c.id)}><Icon name="trash" size={12} color="var(--danger)"/></button>
                  </div>
                </div>
                <div className="amt-box" style={{ boxShadow:`0 4px 14px ${statusColor}22` }}>
                  <div className="amt-lbl">الإجمالي</div>
                  <div className="amt-val" style={{ color:statusColor }}>{fmt(c.totalAmount,c.currency)}</div>
                </div>
                <div className="psec">
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                    <span style={{ fontSize:10,color:"var(--muted)",fontWeight:700 }}>الدفع</span>
                    <ProgressRing pct={pct} size={48} stroke={4} color={pct===100?"var(--ac)":"#ffd600"}/>
                  </div>
                  <div className="pgrid">
                    {[
                      {label:"الأولى 50%",paid:c.deposit50Paid,date:c.deposit50Date,field:"deposit50Paid",diff:null},
                      {label:"الثانية 50%",paid:c.final50Paid,date:c.final50Date,field:"final50Paid",diff:f50d},
                    ].map(p=>(
                      <div key={p.field} className="pitem" style={{ boxShadow:p.paid?`0 2px 10px ${statusColor}22`:"var(--shadow-card)" }}>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:9,color:"var(--muted)",fontWeight:700 }}>{p.label}</div>
                          <div style={{ fontSize:11,fontWeight:700 }}>{fmt(Number(c.totalAmount||0)*0.5,c.currency)}</div>
                          {p.date&&<div style={{ fontSize:9,color:!p.paid&&p.diff!==null&&p.diff<=7&&p.diff>=0?"var(--warn)":"var(--muted)" }}>{fmtDate(p.date)}</div>}
                        </div>
                        <button className={`ptog ${p.paid?"ok":"no"}`} onClick={()=>{ haptic("medium"); onToggle(c.id,p.field); }}>{p.paid?"✓ مدفوع":"تحديد"}</button>
                      </div>
                    ))}
                  </div>
                </div>
                {vc > 0 && (
                  <div className="vpsec">
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ fontSize:10,color:"var(--muted)",fontWeight:700 }}>الفيديوهات</span><span style={{ fontSize:10,fontWeight:800,color:"var(--ac)" }}>{vd}/{vc}</span></div>
                    <div className="vpbar"><div className="vpfill" style={{ width:`${vpct}%` }}/></div>
                    <div style={{ display:"flex",gap:6 }}>
                      <button className="vp-btn" onClick={()=>onVideoUpdate(c.id,Math.min(vc,vd+1))}>+1 فيديو</button>
                      {vd>0&&<button className="vp-btn" onClick={()=>onVideoUpdate(c.id,vd-1)}>-1 فيديو</button>}
                    </div>
                  </div>
                )}
                {c.notes&&<div style={{ marginTop:8,fontSize:10,color:"var(--muted)",padding:"7px 10px",background:"var(--surface2)",borderRadius:8,border:"1px solid var(--card-border)",display:"flex",gap:5 }}><Icon name="doc" size={10}/>  {c.notes}</div>}
              </div>
            )}
          </div>
        </TiltCard>
      </SwipeableCard>
    </div>
  );
}

// ─── Wallet Modal ─────────────────────────────────────────────────
function WalletModal({ type, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const labels = { income:{title:"إضافة رصيد",color:"var(--ac)",icon:"arrow_up"}, expense:{title:"إضافة مصروف",color:"var(--danger)",icon:"arrow_down"}, savings_add:{title:"إضافة للادخار",color:"#a78bfa",icon:"arrow_up"}, savings_withdraw:{title:"سحب من الادخار",color:"var(--warn)",icon:"arrow_down"} };
  const lbl=labels[type]||labels.income;
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mod" style={{ maxWidth:380 }}>
        <div className="mhd"><div className="mtitle" style={{ color:lbl.color }}><Icon name={lbl.icon} size={17} color={lbl.color}/>{lbl.title}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="fg"><label className="flbl">المبلغ (LYD)</label><input className="finp" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" autoFocus style={{ fontSize:22,fontWeight:800,color:lbl.color,textAlign:"center" }}/></div>
          {(type==="expense"||type==="savings_withdraw")&&<div className="fg"><label className="flbl">{type==="expense"?"البند / الوصف":"سبب السحب"}</label><input className="finp" value={desc} onChange={e=>setDesc(e.target.value)} placeholder={type==="expense"?"مثل: بنزين، طعام...":"وصف اختياري..."}/></div>}
        </div>
        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" style={{ background:lbl.color,color:type==="income"?"#000":"#fff",boxShadow:`0 4px 20px ${lbl.color}44` }}
            onClick={()=>{ if(!amount||isNaN(Number(amount))||Number(amount)<=0){alert("أدخل مبلغاً صحيحاً");return;} onSave({type,amount:Number(amount),desc:desc||(type==="income"?"إضافة رصيد":type==="savings_add"?"إضافة ادخار":type==="savings_withdraw"?"سحب ادخار":"مصروف"),date:new Date().toISOString()}); }}>
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────
function SettingsScreen({ settings, onSave, theme, onThemeChange }) {
  const [f, setF] = useState({ ...settings });
  const [pwForm, setPwForm] = useState({ old:"", new1:"", new2:"", err:"", ok:false });
  const s = (k,v) => { const ns={...f,[k]:v}; setF(ns); onSave(ns); };

  const changePw = () => {
    const stored = JSON.parse(localStorage.getItem("fareq_pw")||JSON.stringify(DEFAULT_CREDENTIALS));
    if (pwForm.old!==stored.pass) { setPwForm(p=>({...p,err:"كلمة المرور الحالية غلط",ok:false})); return; }
    if (pwForm.new1!==pwForm.new2) { setPwForm(p=>({...p,err:"كلمتا المرور لا تتطابقان",ok:false})); return; }
    if (pwForm.new1.length<4) { setPwForm(p=>({...p,err:"كلمة المرور قصيرة جداً",ok:false})); return; }
    localStorage.setItem("fareq_pw",JSON.stringify({...stored,pass:pwForm.new1}));
    setPwForm({old:"",new1:"",new2:"",err:"",ok:true});
  };

  const exportBackup = () => {
    const data = { settings:f, wallet:localStorage.getItem("wallet_txns")||"[]", version:"1.0", date:new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`fareq_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = () => {
    const input = document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange = e => {
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{ try { const d=JSON.parse(ev.target.result); if(d.settings) { setF(d.settings); onSave(d.settings); } if(d.wallet) localStorage.setItem("wallet_txns",d.wallet); alert("تم استيراد النسخة الاحتياطية بنجاح!"); } catch { alert("ملف غير صالح"); } };
      reader.readAsText(file);
    };
    input.click();
  };

  const Toggle = ({val,onToggle}) => <button className={`toggle${val?" on":""}`} onClick={onToggle}/>;

  return (
    <div className="screen" style={{ paddingTop:8 }}>
      <div><div className="pt">الإعدادات</div><div className="ps">تخصيص التطبيق</div></div>
      <div style={{ marginTop:16 }}><div className="sh">ملف الشركة</div></div>
      <div className="card">
        <div className="fg" style={{ marginBottom:10 }}><label className="flbl">اسم الشركة</label><input className="finp" value={f.companyName||""} onChange={e=>s("companyName",e.target.value)} placeholder="شركة فارق للإنتاج"/></div>
        <div className="fg" style={{ marginBottom:10 }}><label className="flbl">رقم الهاتف</label><input className="finp" value={f.companyPhone||""} onChange={e=>s("companyPhone",e.target.value)} placeholder="0920953918"/></div>
        <div className="fg"><label className="flbl">وصف الشركة</label><input className="finp" value={f.companyDesc||""} onChange={e=>s("companyDesc",e.target.value)} placeholder="FAREQ Productions"/></div>
      </div>
      <div className="sh">التفضيلات</div>
      <div className="card">
        <div className="settings-row">
          <div><div className="settings-lbl">الوضع الداكن</div><div className="settings-sub">المظهر الحالي: {theme==="dark"?"داكن":"فاتح"}</div></div>
          <Toggle val={theme==="dark"} onToggle={()=>onThemeChange(theme==="dark"?"light":"dark")}/>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">العملة الافتراضية</div></div>
          <select className="fsel" style={{ width:"auto" }} value={f.defaultCurrency||"LYD"} onChange={e=>s("defaultCurrency",e.target.value)}>
            <option value="LYD">دينار ليبي</option><option value="SAR">ريال سعودي</option><option value="AED">درهم إماراتي</option><option value="USD">دولار</option>
          </select>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">إشعارات الدفعات</div><div className="settings-sub">تنبيه قبل 7 أيام من موعد الدفع</div></div>
          <Toggle val={f.notifyPayments!==false} onToggle={()=>s("notifyPayments",!(f.notifyPayments!==false))}/>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">إشعارات انتهاء العقد</div></div>
          <Toggle val={f.notifyExpiry!==false} onToggle={()=>s("notifyExpiry",!(f.notifyExpiry!==false))}/>
        </div>
      </div>
      <div className="sh">خيارات PDF</div>
      <div className="card">
        {[
          {key:"pdfIncludeLogo",label:"تضمين الشعار في PDF"},
          {key:"pdfIncludeTerms",label:"تضمين الشروط والأحكام"},
          {key:"pdfIncludePayment",label:"تضمين تفاصيل الدفع"},
          {key:"pdfIncludeSignature",label:"حقل التوقيع الرقمي"},
        ].map(opt=>(
          <div key={opt.key} className="settings-row">
            <div className="settings-lbl">{opt.label}</div>
            <Toggle val={f[opt.key]!==false} onToggle={()=>s(opt.key,!(f[opt.key]!==false))}/>
          </div>
        ))}
      </div>
      <div className="sh">الأمان</div>
      <div className="card">
        <div style={{ fontSize:13,fontWeight:700,marginBottom:10,color:"var(--text)",display:"flex",alignItems:"center",gap:7 }}><Icon name="lock" size={14} color="var(--ac)"/>تغيير كلمة المرور</div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          <input className="finp" type="password" placeholder="كلمة المرور الحالية" value={pwForm.old} onChange={e=>setPwForm(p=>({...p,old:e.target.value}))}/>
          <input className="finp" type="password" placeholder="كلمة المرور الجديدة" value={pwForm.new1} onChange={e=>setPwForm(p=>({...p,new1:e.target.value}))}/>
          <input className="finp" type="password" placeholder="تأكيد كلمة المرور" value={pwForm.new2} onChange={e=>setPwForm(p=>({...p,new2:e.target.value}))}/>
          {pwForm.err&&<div style={{ color:"var(--danger)",fontSize:11 }}>{pwForm.err}</div>}
          {pwForm.ok&&<div style={{ color:"var(--ac)",fontSize:11 }}>✓ تم تغيير كلمة المرور</div>}
          <button className="btn bngf" onClick={changePw} style={{ alignSelf:"flex-start" }}>تغيير</button>
        </div>
      </div>
      <div className="sh">النسخ الاحتياطي</div>
      <div className="card">
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          <button className="btn bng" onClick={exportBackup} style={{ flex:1 }}><Icon name="download" size={14} color="var(--ac)"/>تصدير نسخة</button>
          <button className="btn bng" onClick={importBackup} style={{ flex:1 }}><Icon name="database" size={14} color="var(--ac)"/>استيراد</button>
        </div>
        <div style={{ fontSize:10,color:"var(--muted)",marginTop:8 }}>يشمل النسخ الاحتياطي: الإعدادات وبيانات المحفظة</div>
      </div>
    </div>
  );
}

// ─── Wallet Screen ────────────────────────────────────────────────
function WalletScreen() {
  const [walletTab, setWalletTab] = useState("expense");
  const [modal, setModal] = useState(null);
  const [txns, setTxns] = useState(()=>{ try { return JSON.parse(localStorage.getItem("wallet_txns")||"[]"); } catch { return []; } });
  const save = newTxns => { setTxns(newTxns); try { localStorage.setItem("wallet_txns",JSON.stringify(newTxns)); } catch {} };
  const expenseTxns=txns.filter(t=>t.type==="income"||t.type==="expense");
  const savingsTxns=txns.filter(t=>t.type==="savings_add"||t.type==="savings_withdraw");
  const expenseBalance=expenseTxns.reduce((s,t)=>t.type==="income"?s+t.amount:s-t.amount,0);
  const savingsBalance=savingsTxns.reduce((s,t)=>t.type==="savings_add"?s+t.amount:s-t.amount,0);
  const balance=walletTab==="expense"?expenseBalance:savingsBalance;
  const currentTxns=walletTab==="expense"?[...expenseTxns].reverse():[...savingsTxns].reverse();
  const handleAdd=data=>{ save([...txns,data]); setModal(null); };
  const deleteTx=idx=>{ const all=walletTab==="expense"?expenseTxns:savingsTxns; const item=[...all].reverse()[idx]; save(txns.filter(t=>t!==item)); };
  return (
    <div className="screen" style={{ paddingTop:0 }}>
      <div className="wallet-hero">
        <div className="wallet-tabs">
          <button className={`wallet-tab-btn${walletTab==="expense"?" on":""}`} onClick={()=>setWalletTab("expense")}>💳 المصروف</button>
          <button className={`wallet-tab-btn${walletTab==="savings"?" on":""}`} onClick={()=>setWalletTab("savings")}>🏦 الادخار</button>
        </div>
        <div className="wallet-balance-lbl">{walletTab==="expense"?"رصيد المحفظة":"رصيد الادخار"}</div>
        <div className="wallet-balance-amt" style={{ color:balance<0?"#ff4d6d":"#fff" }}>{balance.toLocaleString("en-US",{minimumFractionDigits:2})} <span style={{ fontSize:16,fontWeight:500,color:"rgba(255,255,255,0.5)" }}>LYD</span></div>
        <div className="wallet-actions">
          {walletTab==="expense"
            ? <><button className="wa-btn income-btn" onClick={()=>setModal("income")}><Icon name="plus" size={14} color="var(--ac)"/>إضافة رصيد</button><button className="wa-btn expense-btn" onClick={()=>setModal("expense")}><Icon name="minus" size={14} color="#ff4d6d"/>إضافة مصروف</button></>
            : <><button className="wa-btn savings-btn" onClick={()=>setModal("savings_add")}><Icon name="plus" size={14} color="#a78bfa"/>إضافة</button><button className="wa-btn expense-btn" onClick={()=>setModal("savings_withdraw")}><Icon name="minus" size={14} color="#ff4d6d"/>سحب</button></>
          }
        </div>
      </div>
      <div className="sec-hdr"><span className="sec-title">آخر العمليات</span><span style={{ fontSize:11,color:"var(--muted)",fontWeight:600 }}>{currentTxns.length} عملية</span></div>
      {currentTxns.length===0&&<EmptyState type="income"/>}
      {currentTxns.map((t,i)=>{
        const isPos=t.type==="income"||t.type==="savings_add";
        const iconColor=isPos?"green":t.type==="savings_withdraw"?"purple":"red";
        const amtColor=isPos?"pos":t.type==="savings_withdraw"?"purple":"neg";
        return (
          <div key={i} className="wallet-tx-card stagger-item" style={{ justifyContent:"space-between",animationDelay:`${i*30}ms` }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div className={`wtx-icon ${iconColor}`}><Icon name={isPos?"arrow_up":"arrow_down"} size={18} color={isPos?"var(--ac)":t.type==="savings_withdraw"?"#a78bfa":"var(--danger)"}/></div>
              <div><div className="wtx-name">{t.desc}</div><div className="wtx-sub">{new Date(t.date).toLocaleDateString("ar-LY",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div></div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div className={`wtx-amt ${amtColor}`}>{isPos?"+":"-"}{t.amount.toLocaleString("en-US",{minimumFractionDigits:2})} LYD</div>
              <button className="ico-btn red" style={{ width:26,height:26 }} onClick={()=>deleteTx(i)}><Icon name="trash" size={11} color="var(--danger)"/></button>
            </div>
          </div>
        );
      })}
      {modal&&<WalletModal type={modal} onClose={()=>setModal(null)} onSave={handleAdd}/>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────
function Dashboard({ contracts, clients, goTo, onViewContract, onRefresh, refreshing }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setLoaded(true),100); return ()=>clearTimeout(t); },[]);

  const collected=contracts.reduce((s,c)=>s+Number(c.videoAmount||0)*((c.deposit50Paid?0.5:0)+(c.final50Paid?0.5:0)),0);
  const collectedAnim=useCountUp(collected,900,loaded);
  const recent=[...contracts].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,4);
  const unpaid=contracts.filter(c=>c.status!=="cancelled").reduce((s,c)=>s+Number(c.videoAmount||0)*((!c.deposit50Paid?0.5:0)+(!c.final50Paid?0.5:0)),0);

  const upcoming=contracts
    .filter(c=>c.status!=="cancelled"&&c.status!=="completed")
    .flatMap(c=>{ const items=[]; if(!c.deposit50Paid&&c.deposit50Date) items.push({name:c.clientName,date:c.deposit50Date,label:"الدفعة الأولى",amt:Number(c.totalAmount||0)*0.5,currency:c.currency}); if(!c.final50Paid&&c.final50Date) items.push({name:c.clientName,date:c.final50Date,label:"الدفعة الثانية",amt:Number(c.totalAmount||0)*0.5,currency:c.currency}); return items; })
    .filter(i=>{ const d=daysDiff(i.date); return d!==null&&d>=0; })
    .sort((a,b)=>new Date(a.date)-new Date(b.date))[0];

  const todayTasks=contracts.filter(c=>{ if(c.status==="cancelled"||c.status==="completed") return false; const d1=c.deposit50Date?daysDiff(c.deposit50Date):null,d2=c.final50Date?daysDiff(c.final50Date):null,de=c.endDate?daysDiff(c.endDate):null; return (d1!==null&&d1>=0&&d1<=3&&!c.deposit50Paid)||(d2!==null&&d2>=0&&d2<=3&&!c.final50Paid)||(de!==null&&de>=0&&de<=1); });

  const thisMonth=contracts.filter(c=>c.startDate&&new Date(c.startDate).getMonth()===NOW.getMonth()&&new Date(c.startDate).getFullYear()===NOW.getFullYear()).reduce((s,c)=>s+Number(c.videoAmount||0),0);
  const lastMonthDate=new Date(NOW.getFullYear(),NOW.getMonth()-1,1);
  const lastMonth=contracts.filter(c=>c.startDate&&new Date(c.startDate).getMonth()===lastMonthDate.getMonth()&&new Date(c.startDate).getFullYear()===lastMonthDate.getFullYear()).reduce((s,c)=>s+Number(c.videoAmount||0),0);
  const monthDiff=lastMonth>0?Math.round(((thisMonth-lastMonth)/lastMonth)*100):thisMonth>0?100:0;

  const activities = useMemo(()=>buildActivities(contracts),[contracts]);
  const { pulling, progress, handlers } = usePullToRefresh(onRefresh);
  const greeting = getGreeting();

  return (
    <div className="screen" style={{ paddingTop:8 }} {...handlers}>
      {pulling&&<div className="ptr-indicator" style={{ opacity:progress,transform:`translateY(${(1-progress)*-20}px)` }}><Icon name="refresh" size={14} color="var(--ac)"/>{progress>=1?"إطلاق للتحديث":"اسحب للتحديث"}</div>}
      {refreshing&&<div className="ptr-indicator"><Icon name="refresh" size={14} color="var(--ac)"/>جارٍ التحديث...</div>}

      <div className="hero-card hero-card-shadow">
        <div className="hero-dots"/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,position:"relative",zIndex:1 }}>
          <div>
            <div className="hero-greeting">{greeting} 👋</div>
            <div className="hero-lbl">إجمالي المحصّل</div>
            <div className="hero-amount">{collectedAnim.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<span style={{ fontSize:16,fontWeight:400,color:"rgba(255,255,255,0.4)",WebkitTextFillColor:"rgba(255,255,255,0.4)" }}> LYD</span></div>
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)" }}>العقود</div>
            <div style={{ fontSize:22,fontWeight:900,color:"#fff" }}>{contracts.length}</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:12,marginBottom:4,position:"relative",zIndex:1 }}>
          <div className="hero-change"><Icon name="check" size={12} color="var(--ac)"/>{contracts.filter(c=>c.status==="active").length} نشط · {contracts.filter(c=>c.status==="pending").length} معلق</div>
          {(thisMonth>0||lastMonth>0)&&<div style={{ fontSize:10,color:monthDiff>=0?"var(--ac)":"var(--danger)",fontWeight:700,display:"flex",alignItems:"center",gap:3 }}>{monthDiff>=0?"▲":"▼"} {Math.abs(monthDiff)}% هذا الشهر</div>}
        </div>
        <div className="quick-actions">
          {[
            {label:"عقد جديد",icon:"contract_plus",action:()=>goTo("contracts_new")},
            {label:"عميل",icon:"user_plus",action:()=>goTo("clients_new")},
            {label:"العقود",icon:"contracts",action:()=>goTo("contracts")},
            {label:"الدخل",icon:"income",action:()=>goTo("income")},
          ].map(q=>(
            <button key={q.label} className="qa-btn" onClick={q.action}>
              <div className="qa-icon"><Icon name={q.icon} size={16} color="rgba(255,255,255,0.85)"/></div>
              <span className="qa-lbl">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {unpaid>0&&<div className="unpaid-banner"><div><div style={{ fontSize:10,color:"var(--danger)",fontWeight:700,marginBottom:2 }}>إجمالي غير المحصّل</div><div style={{ fontSize:18,fontWeight:900,color:"var(--danger)" }}>{unpaid.toLocaleString("en-US",{minimumFractionDigits:2})} LYD</div></div><Icon name="alert" size={22} color="var(--danger)"/></div>}
      {upcoming&&<div className="countdown-box"><div><div style={{ fontSize:10,color:"var(--warn)",fontWeight:700,marginBottom:2 }}>⏰ أقرب دفعة قادمة</div><div style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{upcoming.name} — {upcoming.label}</div><div style={{ fontSize:11,color:"var(--warn)",fontWeight:700,marginTop:2 }}>{fmtDate(upcoming.date)} · {daysDiff(upcoming.date)===0?"اليوم!":`خلال ${daysDiff(upcoming.date)} يوم`}</div></div><div style={{ textAlign:"left" }}><div style={{ fontSize:14,fontWeight:800,color:"var(--warn)" }}>{fmt(upcoming.amt,upcoming.currency)}</div></div></div>}

      <Alerts contracts={contracts}/>

      {todayTasks.length>0&&<>
        <div className="sec-hdr"><span className="sec-title">📋 مهام اليوم</span><span style={{ fontSize:11,color:"var(--muted)",fontWeight:600 }}>{todayTasks.length} مهمة</span></div>
        {todayTasks.map(c=>{ const d2=c.final50Date?daysDiff(c.final50Date):null,d1=c.deposit50Date?daysDiff(c.deposit50Date):null,de=c.endDate?daysDiff(c.endDate):null; let lbl=""; if(d1!==null&&d1>=0&&d1<=3&&!c.deposit50Paid) lbl=`الدفعة الأولى${d1===0?" — اليوم!":" — "+d1+" أيام"}`; else if(d2!==null&&d2>=0&&d2<=3&&!c.final50Paid) lbl=`الدفعة الثانية${d2===0?" — اليوم!":" — "+d2+" أيام"}`; else if(de!==null&&de>=0&&de<=1) lbl=`ينتهي العقد${de===0?" اليوم!":" غداً"}`; return (<div key={c.id} className="today-task" style={{ boxShadow:`0 2px 12px ${SC[c.status]}22` }}><div style={{ width:8,height:8,borderRadius:"50%",background:SC[c.status],flexShrink:0,boxShadow:`0 0 8px ${SC[c.status]}` }}/><div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{c.clientName}</div><div style={{ fontSize:10,color:"var(--warn)",fontWeight:600,marginTop:2 }}>{lbl}</div></div><div style={{ fontSize:12,fontWeight:700,color:"var(--ac)" }}>{fmt(c.videoAmount||c.totalAmount,c.currency)}</div></div>); })}
      </>}

      <CashFlowProjection contracts={contracts}/>
      {contracts.length>0&&<MonthlyBarChart contracts={contracts}/>}

      <div className="stat-grid">
        {[
          {l:"نشطة",v:contracts.filter(c=>c.status==="active").length,icon:"check",ac:true,color:"#00ff88"},
          {l:"معلقة",v:contracts.filter(c=>c.status==="pending").length,icon:"clock",color:"#ffd600"},
          {l:"مكتملة",v:contracts.filter(c=>c.status==="completed").length,icon:"history",color:"#a78bfa"},
          {l:"العملاء",v:clients.length,icon:"clients",color:"#38bdf8"},
        ].map((s,i)=>(
          <div key={s.l} className="stat-card stagger-item" style={{ animationDelay:`${i*60}ms`, boxShadow:`0 4px 20px ${s.color}18,0 2px 8px rgba(0,0,0,0.1)`, border:`1px solid ${s.color}22` }}>
            <div className="stat-lbl" style={{ color:s.color }}><Icon name={s.icon} size={12} color={s.color}/>{s.l}</div>
            <div className={`stat-val${s.ac?" ac":""}`} style={{ color:s.color }}>{s.v}</div>
          </div>
        ))}
      </div>

      {recent.length>0&&<>
        <div className="sec-hdr"><span className="sec-title">آخر العقود</span><span className="sec-link" onClick={()=>goTo("contracts")}>عرض الكل ←</span></div>
        {recent.map((c,i)=>(
          <div key={c.id} className="tx-card stagger-item" style={{ borderRight:`3px solid ${SC[c.status]}`,background:`linear-gradient(135deg,${SC[c.status]}06,transparent)`,animationDelay:`${i*50}ms`,boxShadow:`0 4px 16px ${SC[c.status]}14` }} onClick={()=>onViewContract(c)}>
            <div className="tx-icon" style={{ background:`${SC[c.status]}18`,border:`1px solid ${SC[c.status]}33`,boxShadow:`0 2px 10px ${SC[c.status]}22` }}><Icon name="contracts" size={18} color={SC[c.status]}/></div>
            <div style={{ flex:1,minWidth:0 }}><div className="tx-name">{c.clientName}</div><div className="tx-sub">{c.videoCount?`${c.videoCount} فيديو · `:""}{fmtDate(c.startDate)}</div></div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:13,fontWeight:800,color:SC[c.status] }}>{fmt(c.videoAmount||c.totalAmount,c.currency)}</div>
              <span className="badge" style={{ color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44" }}>{SL[c.status]}</span>
            </div>
          </div>
        ))}
      </>}

      {activities.length > 0 && <ActivityFeed activities={activities}/>}
      {contracts.length===0&&<EmptyState type="contracts" onAdd={()=>goTo("contracts_new")}/>}
    </div>
  );
}

// ─── Contracts Screen ─────────────────────────────────────────────
function ContractsScreen({ contracts, clients, onAdd, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel, defaultCurrency }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(null);

  const tabs=[
    {key:"all",label:"الكل",count:contracts.filter(c=>c.status!=="completed"&&c.status!=="cancelled").length},
    {key:"active",label:"جارٍ",count:contracts.filter(c=>c.status==="active").length},
    {key:"pending",label:"معلق",count:contracts.filter(c=>c.status==="pending").length},
    {key:"completed",label:"مكتمل",count:contracts.filter(c=>c.status==="completed").length},
    {key:"cancelled",label:"ملغي",count:contracts.filter(c=>c.status==="cancelled").length},
  ];
  const filtered=[...contracts].sort((a,b)=>Number(b.id)-Number(a.id))
    .filter(c=>{ if(filter==="all") return c.status!=="completed"&&c.status!=="cancelled"; return c.status===filter; })
    .filter(c=>!search||c.clientName?.includes(search)||c.clientPhone?.includes(search));

  const toggleSel = id => setSelected(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const exitSel = () => { setSelectionMode(false); setSelected(new Set()); };

  const bulkDelete = () => setBulkConfirm({ msg:`حذف ${selected.size} عقد؟`, onConfirm:()=>{ selected.forEach(id=>onDelete(id)); exitSel(); setBulkConfirm(null); } });
  const bulkCancel = () => setBulkConfirm({ msg:`إلغاء ${selected.size} عقد؟`, icon:"cancel", iconColor:"var(--warn)", confirmLabel:"نعم إلغاء", confirmColor:"var(--warn)", onConfirm:()=>{ selected.forEach(id=>onCancel(id)); exitSel(); setBulkConfirm(null); } });

  return (
    <div className="screen" style={{ paddingTop:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div><div className="pt">العقود</div><div className="ps">{contracts.length} عقد</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ padding:"8px 16px",fontSize:13 }}><Icon name="contract_plus" size={14} color="#000"/>جديد</button>
      </div>
      {selectionMode&&(
        <div className="selection-banner">
          <span>{selected.size} محدد</span>
          <div style={{ display:"flex",gap:8 }}>
            {selected.size>0&&<><button className="btn" style={{ padding:"5px 12px",fontSize:11,background:"rgba(255,77,77,0.2)",color:"var(--danger)",border:"1px solid rgba(255,77,77,0.3)" }} onClick={bulkDelete}>حذف</button><button className="btn" style={{ padding:"5px 12px",fontSize:11,background:"rgba(255,214,0,0.2)",color:"#ffd600",border:"1px solid rgba(255,214,0,0.3)" }} onClick={bulkCancel}>إلغاء</button></>}
            <button className="btn bgh" style={{ padding:"5px 12px",fontSize:11 }} onClick={exitSel}>خروج</button>
          </div>
        </div>
      )}
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)"/></span><input className="sb" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." style={{ paddingRight:36 }}/></div>
      <div className="tabs">{tabs.map(t=><button key={t.key} className={`tab${filter===t.key?" on":""}`} onClick={()=>setFilter(t.key)}>{t.label}{t.count>0&&<span style={{ marginRight:5,background:filter===t.key?"rgba(0,0,0,0.2)":"var(--surface2)",color:filter===t.key?"#000":"var(--muted)",borderRadius:20,padding:"0 6px",fontSize:9,fontWeight:800 }}>{t.count}</span>}</button>)}</div>
      {filtered.length===0
        ? <EmptyState type={contracts.length===0?"contracts":"search"} onAdd={contracts.length===0?onAdd:null}/>
        : filtered.map((c,i)=><ContractCard key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView} onVideoUpdate={onVideoUpdate} onCancel={onCancel} delay={i*40} selected={selected.has(c.id)} selectionMode={selectionMode} onSelect={id=>{ if(!selectionMode) setSelectionMode(true); toggleSel(id); }}/>)}
      {bulkConfirm&&<ConfirmDialog {...bulkConfirm} onCancel={()=>setBulkConfirm(null)}/>}
    </div>
  );
}

// ─── Clients Screen (with swipe carousel + timeline) ─────────────
function ClientsScreen({ clients, contracts, onAdd, onEdit, onDelete, initialSel }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(initialSel||null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const startTouchX = useRef(null);
  useEffect(()=>{ if(initialSel) setSel(initialSel); },[initialSel]);
  const filtered = clients.filter(c=>!search||c.name.includes(search)||c.phone?.includes(search));

  // Build timeline for a client
  const buildClientTimeline = (cl) => {
    const events = [];
    contracts.filter(c=>c.clientId===cl.id).forEach(c=>{
      if(c.statusHistory) c.statusHistory.forEach(h=>{
        events.push({ date:h.date, label:SL[h.status]||h.status, color:SC[h.status]||"var(--muted)", icon:"contracts" });
      });
      if(c.deposit50Paid) events.push({ date:c.deposit50Date||c.startDate, label:"استلام الدفعة الأولى", color:"#00ff88", icon:"income" });
      if(c.final50Paid) events.push({ date:c.final50Date||c.endDate, label:"استلام الدفعة الثانية", color:"#00ff88", icon:"income" });
    });
    return events.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  };

  if (sel) {
    const filteredClients = filtered.filter(c=>c.id===sel||true);
    const clIdx = filteredClients.findIndex(c=>c.id===sel);
    const cl = clients.find(c=>c.id===sel);
    if (!cl) { setSel(null); return null; }
    const clc = contracts.filter(c=>c.clientId===cl.id);
    const ltv = clc.reduce((s,c)=>s+Number(c.videoAmount||0),0);
    const timeline = buildClientTimeline(cl);
    const [c1,c2] = nameToGradient(cl.name);

    const goNext = () => {
      const next = clients[clients.findIndex(c=>c.id===sel)+1];
      if(next) setSel(next.id);
    };
    const goPrev = () => {
      const prev = clients[clients.findIndex(c=>c.id===sel)-1];
      if(prev) setSel(prev.id);
    };
    const clientIdx = clients.findIndex(c=>c.id===sel);

    return (
      <div className="screen" style={{ paddingTop:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
          <button className="btn bng" style={{ padding:"6px 10px",fontSize:12 }} onClick={()=>setSel(null)}><Icon name="back" size={13} color="var(--text2)"/>رجوع</button>
          <div className="pt" style={{ flex:1 }}>{cl.name}</div>
          {clientIdx > 0 && <button className="ico-btn" onClick={goPrev}><Icon name="chevron_right" size={14}/></button>}
          {clientIdx < clients.length-1 && <button className="ico-btn" onClick={goNext}><Icon name="chevron_left" size={14}/></button>}
        </div>

        {/* Client profile hero */}
        <div style={{ background:`linear-gradient(135deg,${c1}18,${c2}0d)`,border:`1px solid ${c1}33`,borderRadius:20,padding:"20px 16px",marginBottom:14,boxShadow:`0 8px 32px ${c1}22` }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
            <GradientAvatar name={cl.name} size={54}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18,fontWeight:800,color:"var(--text)" }}>{cl.name}</div>
              {ltv > 0 && <div style={{ fontSize:11,fontWeight:700,marginTop:3,color:c1 }}>إجمالي العقود: {fmt(ltv)}</div>}
              <div style={{ fontSize:10,color:"var(--muted)",marginTop:2 }}>{clc.length} عقد · {clc.filter(c=>c.status==="active").length} نشط</div>
            </div>
            <WABtn phone={cl.phone}/>
          </div>
          {[["📞",cl.phone],["📍",cl.address],["📝",cl.notes]].filter(([,v])=>v).map(([ic,v])=>(
            <div key={ic} style={{ display:"flex",gap:10,padding:"7px 0",borderTop:"1px solid var(--muted2)",fontSize:13 }}>
              <span>{ic}</span><span style={{ color:"var(--text2)",flex:1 }}>{v}</span>
            </div>
          ))}
          <div style={{ display:"flex",gap:8,marginTop:12 }}>
            <button className="btn bng" style={{ flex:1,fontSize:12 }} onClick={()=>onEdit(cl)}><Icon name="edit" size={13} color="var(--ac)"/>تعديل</button>
            <button className="btn btn-danger" style={{ fontSize:12 }} onClick={()=>{ if(confirm("حذف العميل؟")){ onDelete(cl.id); setSel(null); } }}><Icon name="trash" size={13} color="var(--danger)"/></button>
          </div>
        </div>

        {/* Contracts */}
        <div className="sec-hdr"><span className="sec-title">عقوده ({clc.length})</span></div>
        {clc.length===0 ? <div style={{ color:"var(--muted)",fontSize:13,textAlign:"center",padding:"16px 0" }}>لا توجد عقود</div>
          : clc.map(c=>(
          <div key={c.id} className="tx-card" style={{ borderRight:`3px solid ${SC[c.status]}`,boxShadow:`0 4px 16px ${SC[c.status]}14` }}>
            <div className="tx-icon" style={{ background:`${SC[c.status]}18`,boxShadow:`0 2px 8px ${SC[c.status]}22` }}><Icon name="contracts" size={16} color={SC[c.status]}/></div>
            <div style={{ flex:1 }}><div className="tx-name">{c.videoCount?`${c.videoCount} فيديو`:"عقد"}</div><div className="tx-sub">{fmtDate(c.startDate)}</div></div>
            <div><div style={{ fontSize:13,fontWeight:800,color:SC[c.status] }}>{fmt(c.videoAmount||c.totalAmount,c.currency)}</div><span className="badge" style={{ color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44" }}>{SL[c.status]}</span></div>
          </div>
        ))}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div className="sec-hdr"><span className="sec-title">📅 التسلسل الزمني</span></div>
            <div className="card">
              {timeline.map((ev,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"6px 0" }}>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:ev.color,boxShadow:`0 0 8px ${ev.color}88` }}/>
                    {i < timeline.length-1 && <div style={{ width:2,height:20,background:"var(--muted2)",margin:"3px 0" }}/>}
                  </div>
                  <div style={{ paddingBottom:i<timeline.length-1?4:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:ev.color }}>{ev.label}</div>
                    <div style={{ fontSize:10,color:"var(--muted)" }}>{fmtDate(ev.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingTop:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div><div className="pt">العملاء</div><div className="ps">{clients.length} عميل</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ padding:"8px 16px",fontSize:13 }}><Icon name="user_plus" size={14} color="#000"/>عميل</button>
      </div>
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)"/></span><input className="sb" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight:36 }}/></div>
      {filtered.length===0
        ? <EmptyState type="clients" onAdd={clients.length===0?onAdd:null}/>
        : filtered.map((cl,i)=>{
          const ltv=contracts.filter(c=>c.clientId===cl.id).reduce((s,c)=>s+Number(c.videoAmount||0),0);
          const lastContract = contracts.filter(c=>c.clientId===cl.id).sort((a,b)=>Number(b.id)-Number(a.id))[0];
          const [g1,g2] = nameToGradient(cl.name);
          return (
            <div key={cl.id} className="clic stagger-item" style={{ animationDelay:`${i*40}ms`,borderColor:`${g1}33`,boxShadow:`0 4px 20px ${g1}14` }} onClick={()=>setSel(cl.id)}>
              <GradientAvatar name={cl.name} size={42}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div className="clic-name">{cl.name}</div>
                <div className="clic-sub">{[cl.phone,`${contracts.filter(c=>c.clientId===cl.id).length} عقد`,ltv>0?fmt(ltv):null].filter(Boolean).join(" · ")}</div>
                {lastContract && (
                  <div style={{ display:"flex",alignItems:"center",gap:4,marginTop:3 }}>
                    <div style={{ width:5,height:5,borderRadius:"50%",background:SC[lastContract.status],boxShadow:`0 0 4px ${SC[lastContract.status]}` }}/>
                    <span style={{ fontSize:9,color:SC[lastContract.status],fontWeight:700 }}>{SL[lastContract.status]}</span>
                    <span style={{ fontSize:9,color:"var(--muted)" }}>· آخر عقد</span>
                  </div>
                )}
              </div>
              <WABtn phone={cl.phone} sm/>
            </div>
          );
        })}
    </div>
  );
}

// ─── Income Screen ────────────────────────────────────────────────
function IncomeScreen({ contracts, clients }) {
  const [incomeTab, setIncomeTab] = useState("overview");
  const videoOnly=c=>Number(c.videoAmount||0);
  const thirtyAgo=new Date(); thirtyAgo.setDate(thirtyAgo.getDate()-30);
  const last30=contracts.filter(c=>c.startDate&&new Date(c.startDate)>=thirtyAgo).reduce((s,c)=>s+videoOnly(c),0);
  const yearT=contracts.filter(c=>c.startDate&&new Date(c.startDate).getFullYear()===NOW.getFullYear()).reduce((s,c)=>s+videoOnly(c),0);
  const allCollected=contracts.reduce((s,c)=>s+videoOnly(c)*((c.deposit50Paid?0.5:0)+(c.final50Paid?0.5:0)),0);
  const pend=contracts.filter(c=>c.status!=="cancelled").reduce((s,c)=>s+videoOnly(c)*((!c.deposit50Paid?0.5:0)+(!c.final50Paid?0.5:0)),0);
  const totalC=contracts.reduce((s,c)=>s+videoOnly(c),0);
  const activeT=contracts.filter(c=>c.status==="active").reduce((s,c)=>s+videoOnly(c),0);

  const clientTotals=clients.map(cl=>{ const clc=contracts.filter(c=>c.clientId===cl.id); const total=clc.reduce((s,c)=>s+videoOnly(c),0); const collected=clc.reduce((s,c)=>s+videoOnly(c)*((c.deposit50Paid?.5:0)+(c.final50Paid?.5:0)),0); return {id:cl.id,name:cl.name,total,collected,count:clc.length}; }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  const months6=[];
  for(let i=5;i>=0;i--){const d=new Date(NOW.getFullYear(),NOW.getMonth()-i,1);const label=d.toLocaleDateString("ar-LY",{month:"short",year:"2-digit"});const amount=contracts.filter(c=>c.startDate&&new Date(c.startDate).getMonth()===d.getMonth()&&new Date(c.startDate).getFullYear()===d.getFullYear()).reduce((s,c)=>s+videoOnly(c),0);months6.push({label,amount});}

  const unpaidInvoices=contracts.filter(c=>c.status!=="cancelled"&&(!c.deposit50Paid||!c.final50Paid)).map(c=>({...c,unpaidAmt:videoOnly(c)*((!c.deposit50Paid?0.5:0)+(!c.final50Paid?0.5:0)),unpaidLabel:!c.deposit50Paid&&!c.final50Paid?"كلا الدفعتين":!c.deposit50Paid?"الدفعة الأولى":"الدفعة الثانية"})).filter(c=>c.unpaidAmt>0).sort((a,b)=>b.unpaidAmt-a.unpaidAmt);

  const stats=[
    {l:"آخر 30 يوم",v:fmt(last30),icon:"clock",color:"#38bdf8"},
    {l:String(NOW.getFullYear()),v:fmt(yearT),icon:"income",color:"#a78bfa"},
    {l:"محصّل",v:fmt(allCollected),icon:"check",ac:true,color:"#00ff88"},
    {l:"متوقع",v:fmt(pend),icon:"calendar",color:"#ffd600"},
    {l:"إجمالي العقود",v:fmt(totalC),icon:"contracts",color:"#fb923c"},
    {l:"العقود النشطة",v:fmt(activeT),icon:"check",color:"#00ff88"},
  ];

  const exportReport=()=>{
    const w=window.open("","_blank");
    const rows=contracts.map(c=>`<tr><td>${c.clientName}</td><td>${fmt(videoOnly(c),c.currency)}</td><td>${fmt(videoOnly(c)*((c.deposit50Paid?.5:0)+(c.final50Paid?.5:0)),c.currency)}</td><td>${SL[c.status]}</td><td>${fmtDate(c.startDate)}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>تقرير مالي — فارق</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;padding:32px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:8px 12px;text-align:right;}th{background:#f5f5f5;font-weight:700;}h2{margin-bottom:4px;}p{color:#666;font-size:13px;}</style></head><body><h2>تقرير مالي — شركة فارق للإنتاج</h2><p>تاريخ التصدير: ${new Date().toLocaleDateString("ar-LY")}</p><p>إجمالي المحصّل: ${fmt(allCollected)} | غير محصّل: ${fmt(pend)}</p><table><thead><tr><th>العميل</th><th>إجمالي العقد</th><th>المحصّل</th><th>الحالة</th><th>تاريخ البدء</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); setTimeout(()=>{ w.focus(); w.print(); },500);
  };

  return (
    <div className="screen" style={{ paddingTop:8 }}>
      <div className="hero-card hero-card-shadow">
        <div className="hero-dots"/>
        <div style={{ position:"relative",zIndex:1 }}>
          <div className="hero-lbl">إجمالي المحصّل</div>
          <div className="hero-amount">{allCollected.toLocaleString("en-US",{minimumFractionDigits:2})} <span style={{ fontSize:16,fontWeight:400,color:"rgba(255,255,255,0.4)",WebkitTextFillColor:"rgba(255,255,255,0.4)" }}>LYD</span></div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <div className="hero-change"><Icon name="check" size={12} color="var(--ac)"/>{String(NOW.getFullYear())} · الفيديوهات فقط</div>
            <button onClick={exportReport} style={{ padding:"4px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"var(--font)",display:"flex",alignItems:"center",gap:5 }}><Icon name="download" size={10} color="rgba(255,255,255,0.8)"/>تصدير PDF</button>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom:14 }}>
        {[{key:"overview",label:"نظرة عامة"},{key:"clients",label:"حسب العميل"},{key:"monthly",label:"شهري"},{key:"cashflow",label:"توقع النقدي"},{key:"unpaid",label:`غير محصّل (${unpaidInvoices.length})`}].map(t=><button key={t.key} className={`tab${incomeTab===t.key?" on":""}`} onClick={()=>setIncomeTab(t.key)}>{t.label}</button>)}
      </div>

      {incomeTab==="overview"&&(
        <>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {stats.map((s,i)=>(
              <div key={s.l} className="stat-card stagger-item" style={{ animationDelay:`${i*50}ms`,boxShadow:`0 4px 20px ${s.color}18`,border:`1px solid ${s.color}22` }}>
                <div className="stat-lbl" style={{ color:s.color }}><Icon name={s.icon} size={12} color={s.color}/>{s.l}</div>
                <div className={`stat-val sm${s.ac?" ac":""}`} style={{ color:s.color }}>{s.v}</div>
              </div>
            ))}
          </div>
          <MonthlyBarChart contracts={contracts}/>
          <div className="sec-hdr"><span className="sec-title">المحصّل حديثاً</span></div>
          {contracts.filter(c=>c.deposit50Paid||c.final50Paid).length===0
            ? <EmptyState type="income"/>
            : contracts.filter(c=>c.deposit50Paid||c.final50Paid).slice(0,6).map((c,i)=>(
              <div key={c.id} className="tx-card stagger-item" style={{ animationDelay:`${i*40}ms`,boxShadow:"0 4px 16px rgba(0,255,136,0.12)" }}>
                <div className="tx-icon" style={{ boxShadow:"0 2px 10px rgba(0,255,136,0.2)" }}><Icon name="income" size={16} color="var(--ac)"/></div>
                <div style={{ flex:1,minWidth:0 }}><div className="tx-name">{c.clientName}</div><div className="tx-sub">{c.deposit50Paid&&c.final50Paid?"مدفوع بالكامل":c.deposit50Paid?"الدفعة الأولى":"الدفعة الثانية"}</div></div>
                <div className="tx-amt pos">{fmt(videoOnly(c)*((c.deposit50Paid?0.5:0)+(c.final50Paid?0.5:0)),c.currency)}</div>
              </div>
            ))
          }
        </>
      )}

      {incomeTab==="clients"&&(
        <>
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:14 }}>توزيع الإيرادات</div>
            <PieChart data={clientTotals.map(c=>({name:c.name,value:c.total}))}/>
          </div>
          {clientTotals.length===0?<EmptyState type="income"/>:clientTotals.map((cl,i)=>(
            <div key={cl.id} className="card stagger-item" style={{ marginBottom:8,animationDelay:`${i*40}ms` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}><GradientAvatar name={cl.name} size={32}/><div><div style={{ fontSize:14,fontWeight:700 }}>{cl.name}</div><div style={{ fontSize:10,color:"var(--muted)",marginTop:2 }}>{cl.count} عقد</div></div></div>
                <div style={{ textAlign:"left" }}><div style={{ fontSize:14,fontWeight:800,color:"var(--ac)" }}>{fmt(cl.total)}</div><div style={{ fontSize:10,color:"var(--muted)",marginTop:1 }}>محصّل: {fmt(cl.collected)}</div></div>
              </div>
              <div className="pbar"><div className="pfill" style={{ width:`${cl.total>0?(cl.collected/cl.total)*100:0}%` }}/></div>
            </div>
          ))}
        </>
      )}

      {incomeTab==="monthly"&&months6.map((m,i)=>(
        <div key={i} className="card stagger-item" style={{ marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",animationDelay:`${i*50}ms` }}>
          <div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{m.label}</div>
          <div style={{ fontSize:14,fontWeight:800,color:m.amount>0?"var(--ac)":"var(--muted)" }}>{m.amount>0?fmt(m.amount):"—"}</div>
        </div>
      ))}

      {incomeTab==="cashflow"&&<CashFlowProjection contracts={contracts}/>}

      {incomeTab==="unpaid"&&(
        <>
          {unpaidInvoices.length===0
            ? <div style={{ textAlign:"center",padding:"30px 0" }}><div style={{ fontSize:32,marginBottom:10 }}>✅</div><div style={{ fontWeight:700,color:"var(--ac)",fontSize:14 }}>كل المدفوعات محصّلة!</div></div>
            : unpaidInvoices.map((c,i)=>(
              <div key={c.id} className="unpaid-row stagger-item" style={{ animationDelay:`${i*40}ms` }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{c.clientName}</div>
                  <div style={{ fontSize:10,color:"var(--muted)",marginTop:2 }}>{c.unpaidLabel} · {c.final50Date?fmtDate(c.final50Date):fmtDate(c.deposit50Date)}</div>
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--danger)" }}>{fmt(c.unpaidAmt,c.currency)}</div>
                  <span className="badge" style={{ color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44" }}>{SL[c.status]}</span>
                </div>
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────
export default function App() {
  const initSettings = getSettings();
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [cm, setCm] = useState(null);
  const [clm, setClm] = useState(null);
  const [vm, setVm] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(()=>getStoredNotifs());
  const [readNotifs, setReadNotifs] = useState([]);
  const [theme, setTheme] = useState(()=>{
    const saved=initSettings.theme||"dark";
    document.documentElement.setAttribute("data-theme",saved);
    return saved;
  });
  const [settings, setSettings] = useState(initSettings);
  const [confirm, setConfirm] = useState(null);
  const [selClient, setSelClient] = useState(null);
  const [auth, setAuth] = useState(()=>sessionStorage.getItem("auth")==="ok");
  const [loginF, setLoginF] = useState({ u:"", p:"", err:"" });

  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); },[theme]);
  const handleThemeChange = t => { setTheme(t); const ns={...settings,theme:t}; setSettings(ns); saveSettings(ns); };
  const handleSettingsSave = ns => { setSettings(ns); saveSettings(ns); };

  const loadData = async () => {
    const [{ data:c },{ data:cl }] = await Promise.all([
      supabase.from("contracts").select("*").order("id",{ascending:false}),
      supabase.from("clients").select("*").order("id",{ascending:false}),
    ]);
    setContracts((c||[]).map(toApp));
    setClients((cl||[]).map(toAppCl));
  };

  useEffect(()=>{ if(!auth) return; loadData().then(()=>setLoading(false)); },[auth]);
  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const doLogin = () => {
    const creds = JSON.parse(localStorage.getItem("fareq_pw")||JSON.stringify(DEFAULT_CREDENTIALS));
    if (loginF.u===creds.user&&loginF.p===creds.pass) { sessionStorage.setItem("auth","ok"); setAuth(true); }
    else setLoginF(f=>({...f,err:"اسم المستخدم أو كلمة المرور غلط"}));
  };

  const addHist=(c,ns)=>c.status===ns?c.statusHistory||[]:[...(c.statusHistory||[]),{status:ns,date:new Date().toISOString()}];

  const saveContract = async c => {
    const hist=addHist(c,c.status);
    const d2s={...c,statusHistory:hist};
    if (c.id) {
      const {data}=await supabase.from("contracts").update(toDB(d2s)).eq("id",c.id).select().single();
      if(data) setContracts(p=>p.map(x=>x.id===c.id?toApp(data):x));
    } else {
      const ih=[{status:c.status,date:new Date().toISOString()}];
      const {data}=await supabase.from("contracts").insert(toDB({...c,statusHistory:ih})).select().single();
      if(data) setContracts(p=>[toApp(data),...p]);
    }
    setCm(null);
  };

  const delContract=id=>setConfirm({ msg:"هل تريد حذف هذا العقد نهائياً؟", confirmLabel:"تأكيد الحذف", confirmColor:"var(--danger)",
    onConfirm:async()=>{ await supabase.from("contracts").delete().eq("id",id); setContracts(p=>p.filter(c=>c.id!==id)); setConfirm(null); }
  });

  const cancelContract=id=>setConfirm({ msg:"هل تريد إلغاء هذا العقد؟", confirmLabel:"نعم، إلغاء", confirmColor:"var(--warn)", icon:"cancel", iconColor:"var(--warn)",
    onConfirm:async()=>{ const c=contracts.find(x=>x.id===id); if(!c) return; const hist=addHist(c,"cancelled"); const updated={...c,status:"cancelled",statusHistory:hist}; const {data}=await supabase.from("contracts").update(toDB(updated)).eq("id",id).select().single(); if(data) setContracts(p=>p.map(x=>x.id===id?toApp(data):x)); setConfirm(null); }
  });

  const togglePay=async(id,field)=>{
    const c=contracts.find(x=>x.id===id); if(!c) return;
    const updated={...c,[field]:!c[field]};
    const vc=Number(updated.videoCount||0),vd=Number(updated.videoDone||0);
    if(updated.deposit50Paid&&updated.final50Paid&&(vc===0||vd>=vc)){ updated.status="completed"; updated.statusHistory=addHist(c,"completed"); }
    const {data}=await supabase.from("contracts").update(toDB(updated)).eq("id",id).select().single();
    if(data) setContracts(p=>p.map(x=>x.id===id?toApp(data):x));
  };

  const updateVideoDone=async(id,count)=>{
    const c=contracts.find(x=>x.id===id); if(!c) return;
    const {data}=await supabase.from("contracts").update(toDB({...c,videoDone:count})).eq("id",id).select().single();
    if(data) setContracts(p=>p.map(x=>x.id===id?toApp(data):x));
  };

  const handlePdfExported=async id=>{
    const c=contracts.find(x=>x.id===id); if(!c) return;
    const hist=addHist(c,"active");
    const updated={...c,deposit50Paid:true,status:"active",statusHistory:hist};
    const {data}=await supabase.from("contracts").update(toDB(updated)).eq("id",id).select().single();
    if(data) setContracts(p=>p.map(x=>x.id===id?toApp(data):x));
  };

  const saveClient=async c=>{ if(c.id){ const {data}=await supabase.from("clients").update(toDBCl(c)).eq("id",c.id).select().single(); if(data) setClients(p=>p.map(x=>x.id===c.id?toAppCl(data):x)); } else { const {data}=await supabase.from("clients").insert(toDBCl(c)).select().single(); if(data) setClients(p=>[toAppCl(data),...p]); } setClm(null); };
  const delClient=async id=>{ await supabase.from("clients").delete().eq("id",id); setClients(p=>p.filter(c=>c.id!==id)); };
  const goToClient=id=>{ setSelClient(id); setTab("clients"); };
  const goTo=t=>{ if(t==="contracts_new"){setTab("contracts");setTimeout(()=>setCm("new"),100);} else if(t==="clients_new"){setTab("clients");setTimeout(()=>setClm("new"),100);} else setTab(t); };

  // Notifications
  const notifications = useMemo(()=>buildNotifications(contracts, dismissedNotifs),[contracts,dismissedNotifs]);
  const unreadCount = notifications.filter(n=>!readNotifs.includes(n.id)).length;
  const notifsWithRead = notifications.map(n=>({...n, read:readNotifs.includes(n.id)}));

  const handleMarkAllRead = () => setReadNotifs(notifications.map(n=>n.id));
  const handleDismissNotif = (id) => {
    const newDismissed = [...dismissedNotifs, id];
    setDismissedNotifs(newDismissed);
    saveNotifs(newDismissed);
  };

  const pdfOptions={
    includeTerms:settings.pdfIncludeTerms!==false,
    includePayment:settings.pdfIncludePayment!==false,
    includeSignature:settings.pdfIncludeSignature!==false,
    includeLogo:settings.pdfIncludeLogo!==false,
  };
  const companyProfile={ name:settings.companyName, phone:settings.companyPhone };

  const nav=[
    {key:"dashboard",label:"الرئيسية",icon:"dashboard"},
    {key:"clients",label:"العملاء",icon:"clients"},
    {key:"contracts",label:"العقود",icon:"contracts"},
    {key:"income",label:"الدخل",icon:"income"},
    {key:"settings",label:"الإعدادات",icon:"settings"},
  ];

  const cssEl=<style dangerouslySetInnerHTML={{ __html:CSS }}/>;

  if (!auth) return (
    <>
      {cssEl}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:"var(--bg)",padding:24 }}>
        <div style={{ background:"var(--glass-bg)",backdropFilter:"blur(20px)",border:"1px solid var(--card-border)",borderRadius:24,padding:32,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,255,136,0.1),var(--shadow-float)" }}>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <div className="lmark" style={{ width:52,height:52,borderRadius:16,fontSize:22,margin:"0 auto 12px" }}>F</div>
            <div style={{ fontSize:20,fontWeight:900,color:"var(--text)" }}>فارق للإنتاج</div>
            <div style={{ fontSize:12,color:"var(--muted)",marginTop:4 }}>تسجيل الدخول</div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <input className="finp" placeholder="اسم المستخدم" value={loginF.u} onChange={e=>setLoginF(f=>({...f,u:e.target.value}))}/>
            <input className="finp" type="password" placeholder="كلمة المرور" value={loginF.p} onChange={e=>setLoginF(f=>({...f,p:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
            {loginF.err&&<div style={{ color:"var(--danger)",fontSize:12,textAlign:"center" }}>{loginF.err}</div>}
            <button className="btn bngf" style={{ width:"100%",marginTop:4 }} onClick={doLogin}>دخول</button>
          </div>
        </div>
      </div>
    </>
  );

  if (loading) return (
    <>
      {cssEl}
      <div style={{ display:"flex",flexDirection:"column",height:"100dvh",background:"var(--bg)",overflow:"hidden" }}>
        <div style={{ padding:"14px 14px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--glass-bg)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--card-border)" }}>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}><Skeleton w={36} h={36} r={11} style={{ flexShrink:0 }}/><div><Skeleton w={40} h={14} style={{ marginBottom:4 }}/><Skeleton w={28} h={10}/></div></div>
          <div style={{ display:"flex",gap:8 }}><Skeleton w={38} h={38} r={12}/><Skeleton w={38} h={38} r={12}/></div>
        </div>
        <div style={{ flex:1,overflow:"hidden",padding:"8px 14px" }}>
          <SkeletonHero/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>{[0,1,2,3].map(i=><Skeleton key={i} h={72} r={18}/>)}</div>
          <Skeleton w="40%" h={15} style={{ marginBottom:12 }}/>
          {[0,1,2,3].map(i=><SkeletonCard key={i}/>)}
        </div>
      </div>
    </>
  );

  return (
    <>
      {cssEl}
      <div className="app">
        <div className="topbar">
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:11,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,border:"1px solid rgba(0,255,136,0.2)",boxShadow:"0 0 12px rgba(0,255,136,0.2)" }}>
              <FareqLogo size={30}/>
            </div>
            <div>
              <div style={{ fontSize:16,fontWeight:800,color:"var(--text)",lineHeight:1.1 }}>فارق</div>
              <div style={{ fontSize:10,color:"var(--muted)",fontWeight:500 }}>للإنتاج</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <NotifBell count={unreadCount} onClick={()=>{ setShowNotifs(true); setReadNotifs(notifications.map(n=>n.id)); }}/>
            <button className="tb-btn" onClick={()=>setShowSearch(true)}><Icon name="search" size={16} color="var(--text2)"/></button>
            <button className="tb-btn" onClick={()=>handleThemeChange(theme==="dark"?"light":"dark")}><Icon name={theme==="dark"?"sun":"moon"} size={16} color="var(--text2)"/></button>
          </div>
        </div>

        {tab==="dashboard"&&<Dashboard contracts={contracts} clients={clients} goTo={goTo} onViewContract={setVm} onRefresh={handleRefresh} refreshing={refreshing}/>}
        {tab==="contracts"&&<ContractsScreen contracts={contracts} clients={clients} onAdd={()=>setCm("new")} onEdit={setCm} onDelete={delContract} onToggle={togglePay} onView={setVm} onVideoUpdate={updateVideoDone} onCancel={cancelContract} defaultCurrency={settings.defaultCurrency}/>}
        {tab==="clients"&&<ClientsScreen clients={clients} contracts={contracts} onAdd={()=>setClm("new")} onEdit={c=>setClm(c)} onDelete={delClient} initialSel={selClient}/>}
        {tab==="income"&&<IncomeScreen contracts={contracts} clients={clients}/>}
        {tab==="settings"&&<SettingsScreen settings={settings} onSave={handleSettingsSave} theme={theme} onThemeChange={handleThemeChange}/>}

        <nav className="bnav">
          {nav.map(n=>(
            <div key={n.key} className={`bni${tab===n.key?" on":""}`}
              onClick={()=>{ setTab(n.key); if(n.key!=="clients") setSelClient(null); }}>
              {n.key==="contracts"
                ? <div className="bni-fab"><Icon name={n.icon} size={20} color="#000"/></div>
                : <Icon name={n.icon} size={20} color={tab===n.key?"var(--ac)":"var(--muted)"}/>
              }
              <div className="bni-lbl">{n.label}</div>
            </div>
          ))}
        </nav>

        {cm!==null&&<ContractModal contract={cm==="new"?null:cm} clients={clients} onClose={()=>setCm(null)} onSave={saveContract} defaultCurrency={settings.defaultCurrency}/>}
        {clm!==null&&<ClientModal client={clm==="new"?null:clm} onClose={()=>setClm(null)} onSave={saveClient}/>}
        {vm&&<ContractViewModal c={vm} onClose={()=>setVm(null)} onPdfExported={handlePdfExported} companyProfile={companyProfile} pdfOptions={pdfOptions}/>}
        {showSearch&&<GlobalSearch contracts={contracts} clients={clients} onClose={()=>setShowSearch(false)} onViewContract={c=>{ setVm(c); setShowSearch(false); }} goToClient={id=>{ goToClient(id); setShowSearch(false); }}/>}
        {showNotifs&&<NotificationCenter notifications={notifsWithRead} onClose={()=>setShowNotifs(false)} onMarkAllRead={handleMarkAllRead} onDismiss={handleDismissNotif}/>}
        {confirm&&<ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} confirmLabel={confirm.confirmLabel} confirmColor={confirm.confirmColor} icon={confirm.icon} iconColor={confirm.iconColor}/>}
      </div>
    </>
  );
}