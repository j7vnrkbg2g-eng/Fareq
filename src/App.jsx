import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "fareq_contracts_v3";
const CLIENTS_KEY = "fareq_clients_v1";

const fmt = (n, cur = "LYD") => { const x = Number(n); if (!x) return `0.00 ${cur}`; return `${x.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" }) : "";
const daysDiff = d => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };

const SL = { active:"جارٍ", pending:"معلق", completed:"مكتمل", cancelled:"ملغي" };
const SC = { active:"#00ff88", pending:"#ffd600", completed:"#7c6eff", cancelled:"#ff4d4d" };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#050505;--surface:#0a0a0a;--surface2:#111;--surface3:#161616;
  --ng:#00ff88;--ng2:#00e57a;--ng-glow:rgba(0,255,136,0.22);
  --ng-faint:rgba(0,255,136,0.07);--ng-border:rgba(0,255,136,0.3);
  --text:#f0f0f0;--muted:#555;--muted2:#222;--font:'Tajawal',sans-serif;
}
html,body{background:var(--bg);color:var(--text);font-family:var(--font);direction:rtl;height:100%;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--ng-border);border-radius:4px;}
.app{display:flex;flex-direction:column;height:100dvh;background:var(--bg);overflow:hidden;}
.screen{flex:1;overflow-y:auto;padding:22px 14px 90px;animation:fu .3s cubic-bezier(.4,0,.2,1);}
@keyframes fu{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}

.bnav{
  position:fixed;bottom:0;left:0;right:0;z-index:100;
  background:rgba(5,5,5,.95);backdrop-filter:blur(24px);
  border-top:1px solid var(--ng-border);
  display:flex;justify-content:space-around;align-items:center;
  padding:8px 0 max(8px,env(safe-area-inset-bottom));
  box-shadow:0 -8px 40px rgba(0,255,136,0.1);
}
.bni{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 16px;border-radius:14px;transition:all .22s cubic-bezier(.4,0,.2,1);flex:1;}
.bni:hover{background:var(--ng-faint);}
.bni.on{background:var(--ng-faint);}
.bni.on .bni-lbl{color:var(--ng);}
.bni-ico{transition:transform .2s;}
.bni:hover .bni-ico{transform:translateY(-2px);}
.bni-lbl{font-size:10px;color:var(--muted);font-weight:700;transition:color .2s;}

.nbox{
  width:42px;height:42px;border-radius:12px;
  border:1.5px solid var(--ng-border);background:transparent;
  display:flex;align-items:center;justify-content:center;
  transition:all .2s;flex-shrink:0;
  box-shadow:inset 0 0 14px var(--ng-faint);
}
.nbox.sm{width:32px;height:32px;border-radius:9px;}

.card{background:var(--surface);border:1px solid var(--muted2);border-radius:16px;padding:14px;transition:all .22s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden;}
.card:hover{border-color:var(--ng-border);box-shadow:0 0 24px var(--ng-faint);}
.card-gl{border-color:var(--ng-border)!important;box-shadow:0 0 32px var(--ng-glow)!important;}

.stat{background:var(--surface);border:1px solid var(--muted2);border-radius:14px;padding:14px;transition:all .22s;}
.stat:hover{border-color:var(--ng-border);transform:translateY(-2px);box-shadow:0 6px 20px var(--ng-faint);}
.slbl{font-size:10px;color:var(--muted);font-weight:700;margin-bottom:5px;}
.sval{font-size:22px;font-weight:900;color:var(--ng);text-shadow:0 0 14px rgba(0,255,136,0.4);}
.sval.sm{font-size:14px;}

.sh{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin:22px 0 10px;}
.pt{font-size:20px;font-weight:900;color:var(--text);margin-bottom:3px;}
.ps{font-size:12px;color:var(--muted);}

.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;border:1px solid;}
.badge::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:11px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:700;transition:all .2s cubic-bezier(.4,0,.2,1);}
.btn:hover{transform:translateY(-1px);}
.btn:active{transform:scale(.97);}
.bng{background:transparent;color:var(--ng);border:1.5px solid var(--ng-border);box-shadow:0 0 14px var(--ng-faint);}
.bng:hover{background:var(--ng-faint);box-shadow:0 0 24px var(--ng-glow);}
.bngf{background:var(--ng);color:#050505;border:1.5px solid var(--ng);box-shadow:0 0 20px var(--ng-glow);font-weight:900;}
.bngf:hover{background:var(--ng2);box-shadow:0 0 32px rgba(0,255,136,.45);}
.bgh{background:var(--surface2);color:var(--muted);border:1px solid var(--muted2);font-size:12px;}
.bgh:hover{color:var(--text);}
.bico{width:32px;height:32px;padding:0;border-radius:9px;background:var(--surface2);border:1px solid var(--muted2);color:var(--muted);font-size:14px;display:flex;align-items:center;justify-content:center;}
.bico:hover{color:var(--ng);border-color:var(--ng-border);background:var(--ng-faint);}
.bico.dx:hover{color:#ff4d4d;border-color:#ff4d4d44;background:#ff4d4d11;}

.cc{background:var(--surface);border:1px solid var(--muted2);border-radius:18px;overflow:hidden;margin-bottom:12px;transition:all .22s cubic-bezier(.4,0,.2,1);}
.cc:hover{border-color:var(--ng-border);transform:translateY(-2px);box-shadow:0 8px 30px var(--ng-faint);}
.cc-h{padding:16px 18px;border-bottom:1px solid var(--muted2);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.cc-b{padding:14px 18px;}
.cc-n{font-size:15px;font-weight:800;color:var(--text);}
.cc-p{font-size:11px;color:var(--muted);margin-top:3px;}

.psec{background:var(--bg);border-radius:12px;padding:12px 14px;border:1px solid var(--muted2);margin-top:12px;}
.pbar{height:3px;background:var(--muted2);border-radius:4px;margin:8px 0 10px;overflow:hidden;}
.pfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ng),#00ffcc);transition:width .6s cubic-bezier(.4,0,.2,1);box-shadow:0 0 8px var(--ng-glow);}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.pitem{background:var(--surface);border-radius:10px;padding:10px;border:1px solid var(--muted2);display:flex;justify-content:space-between;align-items:center;gap:8px;}
.ptog{padding:4px 10px;border-radius:7px;border:1px solid;font-size:10px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .2s;white-space:nowrap;}
.ptog.ok{background:rgba(0,255,136,.08);color:var(--ng);border-color:rgba(0,255,136,.3);}
.ptog.no{background:var(--surface2);color:var(--muted);border-color:var(--muted2);}
.ptog.no:hover{color:var(--text);}

.mgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:12px;}
.mbox{background:var(--bg);border:1px solid var(--muted2);border-radius:10px;padding:9px 12px;}
.mlbl{font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;}
.mval{font-size:12px;font-weight:700;color:var(--text);}
.mval.ng{color:var(--ng);text-shadow:0 0 8px rgba(0,255,136,.3);}

.mov{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(8px);}
.mod{background:var(--surface);border:1px solid var(--ng-border);border-radius:22px;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 0 60px var(--ng-glow);animation:fu .25s cubic-bezier(.4,0,.2,1);}
.mhd{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.mtitle{font-size:17px;font-weight:900;color:var(--ng);text-shadow:0 0 10px rgba(0,255,136,.3);}
.mclose{width:30px;height:30px;border-radius:8px;background:var(--surface2);border:1px solid var(--muted2);color:var(--muted);font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
.mclose:hover{color:var(--ng);border-color:var(--ng-border);}
.mft{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid var(--muted2);}

.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ffl{grid-column:1/-1;}
.fg{display:flex;flex-direction:column;gap:5px;}
.flbl{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.5px;}
.finp,.fsel,.fta{background:var(--bg);border:1px solid var(--muted2);border-radius:9px;padding:9px 12px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
.finp:focus,.fsel:focus,.fta:focus{border-color:var(--ng);box-shadow:0 0 12px var(--ng-faint);}
.fta{min-height:65px;resize:vertical;}
.fsel option{background:var(--surface);}
.fck{display:flex;align-items:center;gap:8px;cursor:pointer;}
.fck input{accent-color:var(--ng);width:15px;height:15px;}
.fck label{font-size:12px;color:var(--muted);cursor:pointer;}

.sb{background:var(--surface);border:1px solid var(--muted2);border-radius:11px;padding:10px 14px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;width:100%;transition:border-color .2s,box-shadow .2s;}
.sb:focus{border-color:var(--ng);box-shadow:0 0 14px var(--ng-faint);}
.sb::placeholder{color:var(--muted);}

.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
.tab{padding:7px 12px;border-radius:9px;border:1px solid var(--muted2);background:var(--surface);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;}
.tab.on{background:var(--ng-faint);color:var(--ng);border-color:var(--ng-border);box-shadow:0 0 10px var(--ng-faint);}

.alr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;margin-bottom:8px;font-size:12px;font-weight:700;border:1px solid;border-right-width:3px;animation:fu .3s;}
.au{background:rgba(255,77,77,.05);border-color:#ff4d4d33;border-right-color:#ff4d4d;color:#ff4d4d;}
.aw{background:rgba(255,214,0,.05);border-color:#ffd60033;border-right-color:#ffd600;color:#ffd600;}

.gbar-w{display:flex;align-items:flex-end;gap:4px;height:80px;}
.gbar{border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--ng),var(--ng2));min-width:14px;transition:height .6s cubic-bezier(.4,0,.2,1);cursor:pointer;position:relative;}
.gbar:hover{filter:brightness(1.15);box-shadow:0 -4px 18px var(--ng-glow);}
.gbar:hover::after{content:attr(data-v);position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:var(--surface3);color:var(--ng);border:1px solid var(--ng-border);padding:2px 6px;border-radius:6px;font-size:9px;white-space:nowrap;font-family:var(--font);}

.clic{background:var(--surface);border:1px solid var(--muted2);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;transition:all .22s;cursor:pointer;}
.clic:hover{border-color:var(--ng-border);transform:translateX(-3px);box-shadow:0 4px 20px var(--ng-faint);}
.cav{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--ng-border);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:var(--ng);background:var(--ng-faint);flex-shrink:0;box-shadow:0 0 14px var(--ng-faint);}

.lmark{width:38px;height:38px;border-radius:11px;border:1.5px solid var(--ng-border);background:var(--ng-faint);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:var(--ng);box-shadow:0 0 16px var(--ng-faint);}
.empty{text-align:center;padding:60px 16px;color:var(--muted);}
.eico{font-size:44px;margin-bottom:12px;opacity:.35;}

.cv-wrap{background:#fff;color:#111;padding:34px 42px;font-family:var(--font);direction:rtl;font-size:14px;line-height:1.9;}
.cv-s{font-weight:800;font-size:14px;margin:14px 0 7px;border-right:3px solid #111;padding-right:9px;}
.cv-b{margin:4px 0;padding-right:14px;position:relative;}
.cv-b::before{content:'•';position:absolute;right:0;font-weight:700;}

[data-tip]{position:relative;}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--surface3);color:var(--ng);border:1px solid var(--ng-border);padding:4px 8px;border-radius:7px;font-size:10px;white-space:nowrap;z-index:50;pointer-events:none;}

@media(max-width:500px){.fgrid{grid-template-columns:1fr;}.ffl{grid-column:1;}.pgrid{grid-template-columns:1fr;}}
`;

const Icon = ({ name, size = 20, color = "var(--ng)" }) => {
  const s = { width: size, height: size, stroke: color, fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0, display: "block" };
  const p = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    contracts: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    clients: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    income: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    back: <><polyline points="15,18 9,12 15,6"/></>,
  };
  return <svg style={s} viewBox="0 0 24 24">{p[name]}</svg>;
};

const NBox = ({ name, sm }) => (
  <div className={`nbox${sm ? " sm" : ""}`}>
    <Icon name={name} size={sm ? 14 : 18} />
  </div>
);

const loadContracts = () => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const saveC = d => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };
const loadClients = () => { try { const s = localStorage.getItem(CLIENTS_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const saveCl = d => { try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(d)); } catch {} };

function Alerts({ contracts }) {
  const a = [];
  contracts.forEach(c => {
    if (c.status === "cancelled" || c.status === "completed") return;
    if (!c.final50Paid && c.final50Date) { const d = daysDiff(c.final50Date); if (d !== null && d >= 0 && d <= 7) a.push({ id: c.id, msg: `${d === 0 ? "اليوم" : d + " أيام"} — الدفعة الثانية لـ ${c.clientName}`, type: d <= 2 ? "u" : "w" }); }
    if (!c.deposit50Paid && c.deposit50Date && daysDiff(c.deposit50Date) <= 0) a.push({ id: c.id + "d", msg: `المقدم غير مدفوع — ${c.clientName}`, type: "u" });
  });
  if (!a.length) return null;
  return <div style={{ marginBottom: 14 }}>{a.map(x => <div key={x.id} className={`alr ${x.type === "u" ? "au" : "aw"}`}><Icon name="alert" size={13} color="currentColor" />{x.msg}</div>)}</div>;
}

function MiniGraph({ data }) {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div>
      <div className="gbar-w">
        {data.map((d, i) => (
          <div key={i} className="gbar" style={{ height: `${Math.max(4, Math.round((d.val / max) * 100))}%`, flex: 1 }}
            data-v={d.val > 0 ? `${Math.round(d.val).toLocaleString()}` : "0"} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 6 }}>
        {data.map((d, i) => <span key={i} style={{ fontSize: 9, color: "var(--muted)", flex: 1, textAlign: "center" }}>{d.lbl}</span>)}
      </div>
    </div>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [f, setF] = useState(client ? { ...client } : { name: "", phone: "", address: "", email: "", notes: "" });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle">{client ? "✏️ تعديل عميل" : "➕ عميل جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div className="fgrid">
          <div className="fg ffl"><label className="flbl">اسم العميل / الشركة</label><input className="finp" value={f.name} onChange={e => s("name", e.target.value)} placeholder="الطرف الثاني" /></div>
          <div className="fg"><label className="flbl">رقم الهاتف</label><input className="finp" value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="09..." /></div>
          <div className="fg"><label className="flbl">البريد الإلكتروني</label><input className="finp" value={f.email} onChange={e => s("email", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">العنوان</label><input className="finp" value={f.address} onChange={e => s("address", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
        </div>
        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" onClick={() => { if (!f.name) { alert("أدخل الاسم"); return; } onSave({ ...f, id: f.id || Date.now().toString() }); }}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

const EC = { clientId: "", clientName: "", clientAddress: "", clientPhone: "", projectName: "", videoCount: "", totalAmount: "", videoAmount: "", presenterAmount: "", currency: "LYD", startDate: "", endDate: "", deposit50Date: "", deposit50Paid: false, final50Date: "", final50Paid: false, status: "pending", notes: "" };

function ContractModal({ contract, clients, onClose, onSave }) {
  const [f, setF] = useState(contract ? { ...contract } : { ...EC });
  const [drop, setDrop] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const pick = c => { setF(p => ({ ...p, clientId: c.id, clientName: c.name, clientPhone: c.phone || "", clientAddress: c.address || "" })); setDrop(false); };
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle">{contract ? "✏️ تعديل" : "➕ عقد جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>

        <div style={{ marginBottom: 14, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span className="flbl">العميل</span>
            {f.clientName && <span style={{ fontSize: 10, color: "var(--ng)", fontWeight: 800 }}>✓ {f.clientName}</span>}
          </div>
          <button className="btn bng" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setDrop(p => !p)}>
            <span>{f.clientName || "اختر عميلاً..."}</span>
            <Icon name="clients" size={13} />
          </button>
          {drop && (
            <div style={{ position: "absolute", top: "100%", insetInline: 0, zIndex: 50, background: "var(--surface2)", border: "1px solid var(--ng-border)", borderRadius: 12, padding: 8, marginTop: 4, maxHeight: 180, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,255,136,.15)" }}>
              {clients.length === 0 && <div style={{ padding: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>لا يوجد عملاء — أضف من قسم العملاء</div>}
              {clients.map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10, transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--ng-faint)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ng-faint)", border: "1px solid var(--ng-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "var(--ng)" }}>{c.name[0]}</div>
                  <div><div style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>{c.name}</div>{c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fgrid">
          <div className="fg ffl"><label className="flbl">اسم المشروع</label><input className="finp" value={f.projectName} onChange={e => s("projectName", e.target.value)} /></div>
          <div className="fg"><label className="flbl">عدد الفيديوهات</label><input className="finp" type="number" value={f.videoCount} onChange={e => s("videoCount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">العملة</label><select className="fsel" value={f.currency} onChange={e => s("currency", e.target.value)}><option value="LYD">دينار ليبي</option><option value="SAR">ريال سعودي</option><option value="AED">درهم إماراتي</option><option value="USD">دولار</option></select></div>
          <div className="fg"><label className="flbl">قيمة الفيديوهات</label><input className="finp" type="number" value={f.videoAmount} onChange={e => s("videoAmount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">قيمة الوجه الإعلامي</label><input className="finp" type="number" value={f.presenterAmount} onChange={e => s("presenterAmount", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">إجمالي المبلغ</label><input className="finp" type="number" value={f.totalAmount} onChange={e => s("totalAmount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">تاريخ البدء</label><input className="finp" type="date" value={f.startDate} onChange={e => s("startDate", e.target.value)} /></div>
          <div className="fg"><label className="flbl">تاريخ الانتهاء</label><input className="finp" type="date" value={f.endDate} onChange={e => s("endDate", e.target.value)} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الأولى</label><input className="finp" type="date" value={f.deposit50Date} onChange={e => s("deposit50Date", e.target.value)} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الثانية</label><input className="finp" type="date" value={f.final50Date} onChange={e => s("final50Date", e.target.value)} /></div>
          <div className="fck"><input type="checkbox" id="d1" checked={f.deposit50Paid} onChange={e => s("deposit50Paid", e.target.checked)} /><label htmlFor="d1">تم استلام الدفعة الأولى</label></div>
          <div className="fck"><input type="checkbox" id="d2" checked={f.final50Paid} onChange={e => s("final50Paid", e.target.checked)} /><label htmlFor="d2">تم استلام الدفعة الثانية</label></div>
          <div className="fg ffl"><label className="flbl">الحالة</label><select className="fsel" value={f.status} onChange={e => s("status", e.target.value)}><option value="pending">معلق</option><option value="active">جارٍ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
        </div>
        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" onClick={() => { if (!f.clientName) { alert("اختر عميلاً"); return; } onSave({ ...f, id: f.id || Date.now().toString() }); }}>حفظ العقد</button>
        </div>
      </div>
    </div>
  );
}

function ContractViewModal({ c, onClose }) {
  const ref = useRef();
  const cur = c.currency || "LYD";
  const half = c.totalAmount ? (Number(c.totalAmount)/2).toLocaleString("en-US",{minimumFractionDigits:2}) : "___";
  const total = c.totalAmount ? Number(c.totalAmount).toLocaleString("en-US",{minimumFractionDigits:2}) : "___";
  const dFmt = d => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"long",day:"numeric"}) : "___";
  const exportPDF = () => {
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>عقد</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;background:#fff;padding:34px 46px;font-size:14px;line-height:1.9;}.s{font-weight:800;font-size:14px;margin:14px 0 7px;border-right:3px solid #111;padding-right:9px;}.b{margin:4px 0;padding-right:14px;position:relative;}.b::before{content:"•";position:absolute;right:0;font-weight:700;}hr{border:none;border-top:1.5px solid #ddd;margin:18px 0;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}.bx{border:1px solid #ddd;border-radius:8px;padding:11px;}.lbl{font-size:10px;color:#888;margin-bottom:5px;font-weight:700;}.ag{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0;}.ab{border:1px solid #ddd;border-radius:8px;padding:9px;text-align:center;}.sg{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px;}.sb{text-align:center;}.sl{margin-top:36px;border-bottom:1.5px dashed #bbb;}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); setTimeout(()=>{w.focus();w.print();},600);
  };
  return (
    <div className="mov" style={{alignItems:"flex-start",overflowY:"auto"}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--ng-border)",borderRadius:20,width:"100%",maxWidth:760,margin:"14px 0",overflow:"hidden",boxShadow:"0 0 60px var(--ng-glow)"}}>
        <div style={{background:"var(--bg)",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--ng-border)"}}>
          <span style={{color:"var(--ng)",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}><Icon name="doc" size={14}/>نموذج العقد</span>
          <div style={{display:"flex",gap:8}}>
            <button className="btn bngf" style={{fontSize:12,padding:"7px 14px"}} onClick={exportPDF}>⬇ تصدير PDF</button>
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>
        <div ref={ref} className="cv-wrap">
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:"#111",color:"#fff",fontSize:28,fontWeight:900,width:58,height:58,borderRadius:12,marginBottom:8}}>ف</div>
            <div style={{fontWeight:800,fontSize:18}}>شركة فارق للإنتاج</div>
            <div style={{color:"#555",fontSize:12}}>FAREQ Productions — 0920953918</div>
          </div>
          <hr/>
          <div style={{textAlign:"center",marginBottom:12}}><span style={{fontSize:12,color:"#555"}}>تاريخ التوقيع: </span><strong>{dFmt(c.startDate)}</strong></div>
          <div className="cv-s">أطراف العقد</div>
          <div className="g2">
            {[{t:"الطرف الأول",r:[["الاسم","شركة فارق للإنتاج"],["الهاتف","0920953918"]]},{t:"الطرف الثاني",r:[["الاسم",c.clientName],["العنوان",c.clientAddress],["الهاتف",c.clientPhone]]}].map((p,i)=>(
              <div key={i} className="bx"><div className="lbl">{p.t}</div>{p.r.map(([l,v])=><div key={l} style={{display:"flex",gap:6,margin:"3px 0"}}><span style={{color:"#555",fontSize:12,minWidth:55}}>{l}:</span><span style={{fontWeight:700,borderBottom:"1px solid #ddd",flex:1}}>{v||""}</span></div>)}</div>
            ))}
          </div>
          <div className="cv-s">موضوع العقد</div>
          <p>يلتزم الطرف الأول بتقديم خدمات إنتاج محتوى فيديو تشمل:</p>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>تصوير وإنتاج عدد <strong>({c.videoCount||"___"})</strong> فيديوهات خلال مدة شهر واحد</div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>يلتزم الطرف الثاني بتوفير المواد اللازمة</div>
          <div className="cv-s">مدة العقد</div>
          <p>من <strong>{dFmt(c.startDate)}</strong> إلى <strong>{dFmt(c.endDate)}</strong></p>
          <div className="cv-s">القيمة المالية</div>
          <div className="ag">
            {[["الفيديوهات",c.videoAmount?`${Number(c.videoAmount).toLocaleString()} ${cur}`:`___ ${cur}`],["الوجه الإعلامي",c.presenterAmount?`${Number(c.presenterAmount).toLocaleString()} ${cur}`:`___ ${cur}`],["الإجمالي",`${total} ${cur}`]].map(([l,v])=><div key={l} className="ab"><div style={{fontSize:10,color:"#888",marginBottom:3}}>{l}</div><div style={{fontWeight:800,fontSize:13}}>{v}</div></div>)}
          </div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>50% مقدماً بتاريخ <strong>{dFmt(c.deposit50Date)}</strong> — المبلغ: <strong>{half} {cur}</strong></div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>50% عند التسليم بتاريخ <strong>{dFmt(c.final50Date)}</strong> — المبلغ: <strong>{half} {cur}</strong></div>
          <div className="cv-s">التعديلات والإلغاء</div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>تعديل واحد لكل فيديو — إضافية بتكلفة إضافية</div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>لا إلغاء بعد تنفيذ نصف الفيديوهات، والمقدم غير مسترجع</div>
          <div className="cv-s">حقوق الاستخدام</div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>يحق للعميل استخدام الفيديوهات لأغراضه التسويقية</div>
          <div className="cv-b"><span style={{position:"absolute",right:0}}>•</span>يحق للطرف الأول استخدام الأعمال في معرض أعماله</div>
          {c.notes&&<><div className="cv-s">ملاحظات</div><p>{c.notes}</p></>}
          <hr/>
          <div className="sg">{["الطرف الأول — شركة فارق للإنتاج",`الطرف الثاني — ${c.clientName||"___"}`].map((p,i)=><div key={i} className="sb"><div style={{fontSize:12,color:"#555"}}>{p}</div><div style={{fontWeight:700,marginTop:4}}>التوقيع</div><div className="sl"/></div>)}</div>
        </div>
      </div>
    </div>
  );
}

function ContractCard({ c, onEdit, onDelete, onToggle, onView }) {
  const pct = Math.round(((c.deposit50Paid?.5:0)+(c.final50Paid?.5:0))*100);
  const f50d = c.final50Date ? daysDiff(c.final50Date) : null;
  return (
    <div className="cc">
      <div className="cc-h">
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div className="cc-n">{c.clientName||"عميل"}</div>
            <span className="badge" style={{color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44"}}>{SL[c.status]}</span>
          </div>
          <div className="cc-p">{c.projectName}{c.videoCount?` — ${c.videoCount} فيديو`:""}</div>
        </div>
        <div style={{display:"flex",gap:5}}>
          <button className="btn bico" onClick={()=>onView(c)} data-tip="عرض العقد"><Icon name="doc" size={13}/></button>
          <button className="btn bico" onClick={()=>onEdit(c)} data-tip="تعديل"><Icon name="edit" size={13}/></button>
          <button className="btn bico dx" onClick={()=>onDelete(c.id)} data-tip="حذف"><Icon name="trash" size={13} color="#ff4d4d"/></button>
        </div>
      </div>
      <div className="cc-b">
        <div className="mgrid">
          <div className="mbox"><div className="mlbl">إجمالي العقد</div><div className="mval ng">{fmt(c.totalAmount,c.currency)}</div></div>
          {c.startDate&&<div className="mbox"><div className="mlbl">البدء</div><div className="mval">{fmtDate(c.startDate)}</div></div>}
          {c.endDate&&<div className="mbox"><div className="mlbl">الانتهاء</div><div className="mval">{fmtDate(c.endDate)}</div></div>}
        </div>
        <div className="psec">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:"var(--muted)",fontWeight:700}}>حالة الدفع</span>
            <span style={{fontSize:11,fontWeight:800,color:pct===100?"var(--ng)":"#ffd600",textShadow:pct===100?"0 0 8px rgba(0,255,136,.4)":"none"}}>{pct}% مدفوع</span>
          </div>
          <div className="pbar"><div className="pfill" style={{width:`${pct}%`}}/></div>
          <div className="pgrid">
            {[{label:"الدفعة الأولى (50%)",paid:c.deposit50Paid,date:c.deposit50Date,field:"deposit50Paid",diff:null},{label:"الدفعة الثانية (50%)",paid:c.final50Paid,date:c.final50Date,field:"final50Paid",diff:f50d}].map(p=>(
              <div key={p.field} className="pitem">
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:9,color:"var(--muted)",fontWeight:700}}>{p.label}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{fmt(Number(c.totalAmount||0)*0.5,c.currency)}</div>
                  {p.date&&<div style={{fontSize:9,color:!p.paid&&p.diff!==null&&p.diff<=7&&p.diff>=0?"#ffd600":"var(--muted)",fontWeight:600}}>{fmtDate(p.date)}{!p.paid&&p.diff!==null&&p.diff<=7&&p.diff>=0&&` (${p.diff===0?"اليوم!":p.diff+" أيام"})`}</div>}
                </div>
                <button className={`ptog ${p.paid?"ok":"no"}`} onClick={()=>onToggle(c.id,p.field)}>{p.paid?"✓ مدفوع":"تحديد"}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {c.notes&&<div style={{fontSize:11,color:"var(--muted)",padding:"8px 18px 14px",borderTop:"1px solid var(--muted2)",display:"flex",gap:6}}><Icon name="doc" size={11}/>{c.notes}</div>}
    </div>
  );
}

function Dashboard({ contracts, clients, goTo }) {
  const collected = contracts.reduce((s,c)=>s+Number(c.totalAmount||0)*((c.deposit50Paid?.5:0)+(c.final50Paid?.5:0)),0);
  const now = new Date();
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const mdata = months.slice(0, now.getMonth()+1).map((m,i)=>({
    lbl: m.slice(0,3),
    val: contracts.filter(c=>c.startDate&&new Date(c.startDate).getMonth()===i&&new Date(c.startDate).getFullYear()===now.getFullYear()).reduce((s,c)=>s+Number(c.totalAmount||0),0)
  }));
  const recent = [...contracts].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,3);
  return (
    <div className="screen">
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <div className="lmark">F</div>
        <div>
          <div style={{fontSize:17,fontWeight:900,color:"var(--ng)",textShadow:"0 0 18px rgba(0,255,136,.35)"}}>فارق للإنتاج</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>FAREQ Productions</div>
        </div>
      </div>
      <Alerts contracts={contracts}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
        <div className="stat" style={{gridColumn:"1/-1"}}><div className="slbl">💰 إجمالي المحصّل</div><div className="sval sm">{fmt(collected)}</div></div>
        {[{l:"📋 العقود",v:contracts.length},{l:"🚀 نشطة",v:contracts.filter(c=>c.status==="active").length},{l:"⏳ معلقة",v:contracts.filter(c=>c.status==="pending").length},{l:"👥 العملاء",v:clients.length}].map(s=><div key={s.l} className="stat"><div className="slbl">{s.l}</div><div className="sval">{s.v}</div></div>)}
      </div>
      {mdata.some(d=>d.val>0)&&<><div className="sh">الدخل الشهري {now.getFullYear()}</div><div className="card"><MiniGraph data={mdata}/></div></>}
      {recent.length>0&&<>
        <div className="sh" style={{display:"flex",justifyContent:"space-between"}}>
          <span>آخر العقود</span>
          <span style={{cursor:"pointer",color:"var(--ng)",fontSize:10,fontWeight:700}} onClick={()=>goTo("contracts")}>عرض الكل ←</span>
        </div>
        {recent.map(c=>(
          <div key={c.id} className="card" style={{marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
            <NBox name="contracts" sm/>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{c.clientName}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.projectName}</div></div>
            <span className="badge" style={{color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44"}}>{SL[c.status]}</span>
          </div>
        ))}
      </>}
      {contracts.length===0&&<div className="empty"><div className="eico">🎬</div><div style={{fontWeight:700,color:"var(--muted)"}}>ابدأ بإضافة أول عقد</div></div>}
    </div>
  );
}

function ContractsScreen({ contracts, clients, onAdd, onEdit, onDelete, onToggle, onView }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const tabs = [{key:"all",label:"الكل",count:contracts.length},{key:"active",label:"جارٍ",count:contracts.filter(c=>c.status==="active").length},{key:"pending",label:"معلق",count:contracts.filter(c=>c.status==="pending").length},{key:"completed",label:"مكتمل",count:contracts.filter(c=>c.status==="completed").length},{key:"cancelled",label:"ملغي",count:contracts.filter(c=>c.status==="cancelled").length}];
  const filtered = contracts.filter(c=>(filter==="all"||c.status===filter)&&(!search||c.clientName?.includes(search)||c.projectName?.includes(search)));
  return (
    <div className="screen">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div className="pt">العقود</div><div className="ps">{contracts.length} عقد</div></div>
        <button className="btn bngf" onClick={onAdd}><Icon name="plus" size={13} color="#050505"/>جديد</button>
      </div>
      <input className="sb" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 بحث..." style={{marginBottom:12}}/>
      <div className="tabs">
        {tabs.map(t=>(
          <button key={t.key} className={`tab${filter===t.key?" on":""}`} onClick={()=>setFilter(t.key)}>
            {t.label}
            {t.count>0&&<span style={{marginRight:5,background:filter===t.key?"var(--ng)":"var(--muted2)",color:filter===t.key?"#050505":"var(--muted)",borderRadius:20,padding:"0 5px",fontSize:9,fontWeight:900}}>{t.count}</span>}
          </button>
        ))}
      </div>
      {filtered.length===0?<div className="empty"><div className="eico">📂</div><div style={{fontWeight:700,color:"var(--muted)",marginBottom:14}}>{contracts.length===0?"لا توجد عقود":"لا توجد نتائج"}</div>{contracts.length===0&&<button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        :filtered.map(c=><ContractCard key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView}/>)}
    </div>
  );
}

function ClientsScreen({ clients, contracts, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const filtered = clients.filter(c=>!search||c.name.includes(search)||c.phone?.includes(search));

  if (sel) {
    const cl = clients.find(c=>c.id===sel);
    if (!cl){setSel(null);return null;}
    const clc = contracts.filter(c=>c.clientId===cl.id);
    return (
      <div className="screen">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button className="btn bgh" style={{padding:"6px 10px",display:"flex",alignItems:"center",gap:6}} onClick={()=>setSel(null)}><Icon name="back" size={13} color="var(--muted)"/>رجوع</button>
          <div className="pt">{cl.name}</div>
        </div>
        <div className="card card-gl" style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
            <div className="cav" style={{width:54,height:54,fontSize:22}}>{cl.name[0]}</div>
            <div><div style={{fontSize:16,fontWeight:900}}>{cl.name}</div>{cl.email&&<div style={{fontSize:11,color:"var(--muted)"}}>{cl.email}</div>}</div>
          </div>
          {[["📞",cl.phone],["📍",cl.address],["📝",cl.notes]].filter(([,v])=>v).map(([i,v])=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderTop:"1px solid var(--muted2)",fontSize:13}}>
              <span style={{fontSize:14}}>{i}</span><span style={{color:"var(--muted)",flex:1}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="btn bng" style={{flex:1}} onClick={()=>onEdit(cl)}>تعديل</button>
            <button className="btn bgh" style={{color:"#ff4d4d",borderColor:"#ff4d4d33"}} onClick={()=>{if(confirm("حذف العميل؟")){onDelete(cl.id);setSel(null);}}}>حذف</button>
          </div>
        </div>
        <div className="sh">عقوده ({clc.length})</div>
        {clc.length===0&&<div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:"20px 0"}}>لا توجد عقود لهذا العميل</div>}
        {clc.map(c=>(
          <div key={c.id} className="card" style={{marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
            <NBox name="contracts" sm/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{c.projectName||"مشروع"}</div><div style={{fontSize:11,color:"var(--ng)",fontWeight:700}}>{fmt(c.totalAmount,c.currency)}</div></div>
            <span className="badge" style={{color:SC[c.status],background:SC[c.status]+"18",borderColor:SC[c.status]+"44"}}>{SL[c.status]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="screen">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div className="pt">العملاء</div><div className="ps">{clients.length} عميل</div></div>
        <button className="btn bngf" onClick={onAdd}><Icon name="plus" size={13} color="#050505"/>عميل</button>
      </div>
      <input className="sb" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 بحث..." style={{marginBottom:14}}/>
      {filtered.length===0?<div className="empty"><div className="eico">👥</div><div style={{fontWeight:700,color:"var(--muted)",marginBottom:14}}>{clients.length===0?"أضف أول عميل":"لا نتائج"}</div>{clients.length===0&&<button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        :filtered.map(cl=>(
          <div key={cl.id} className="clic" onClick={()=>setSel(cl.id)}>
            <div className="cav">{cl.name[0]}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:14}}>{cl.name}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{[cl.phone,`${contracts.filter(c=>c.clientId===cl.id).length} عقد`].filter(Boolean).join(" · ")}</div></div>
            <Icon name="contracts" size={13}/>
          </div>
        ))}
    </div>
  );
}

function IncomeScreen({ contracts }) {
  const now = new Date();
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const mIncome = months.map((m,i)=>({
    lbl: m.slice(0,3),
    val: contracts.filter(c=>c.deposit50Paid&&c.startDate&&new Date(c.startDate).getMonth()===i&&new Date(c.startDate).getFullYear()===now.getFullYear()).reduce((s,c)=>s+Number(c.totalAmount||0)*0.5,0)
      + contracts.filter(c=>c.final50Paid&&c.endDate&&new Date(c.endDate).getMonth()===i&&new Date(c.endDate).getFullYear()===now.getFullYear()).reduce((s,c)=>s+Number(c.totalAmount||0)*0.5,0)
  }));
  const wk = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{lbl:d.toLocaleDateString("ar",{weekday:"short"}),val:contracts.filter(c=>{const sd=c.startDate?new Date(c.startDate):null;return sd&&sd.toDateString()===d.toDateString();}).reduce((s,c)=>s+Number(c.totalAmount||0),0)};});
  const thisM = mIncome[now.getMonth()]?.val||0;
  const yearT = mIncome.reduce((s,m)=>s+m.val,0);
  const allT = contracts.reduce((s,c)=>s+Number(c.totalAmount||0)*((c.deposit50Paid?.5:0)+(c.final50Paid?.5:0)),0);
  const pend = contracts.filter(c=>c.status!=="cancelled").reduce((s,c)=>s+Number(c.totalAmount||0)*((!c.deposit50Paid?.5:0)+(!c.final50Paid?.5:0)),0);
  return (
    <div className="screen">
      <div style={{marginBottom:20}}><div className="pt">الدخل والإيرادات</div><div className="ps">تحليل مالي شامل</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[{l:`دخل ${months[now.getMonth()]}`,v:fmt(thisM)},{l:`دخل ${now.getFullYear()}`,v:fmt(yearT)},{l:"إجمالي محصّل",v:fmt(allT)},{l:"مدفوعات متوقعة",v:fmt(pend)}].map(s=><div key={s.l} className="stat"><div className="slbl">{s.l}</div><div className="sval sm">{s.v}</div></div>)}
      </div>
      <div className="sh">الأسبوع الحالي</div>
      <div className="card"><MiniGraph data={wk}/></div>
      <div className="sh">الدخل الشهري {now.getFullYear()}</div>
      <div className="card"><MiniGraph data={mIncome}/></div>
      <div className="sh">توزيع العقود</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {Object.entries(SL).map(([k,l])=>{
          const cnt=contracts.filter(c=>c.status===k).length;
          const tot=contracts.filter(c=>c.status===k).reduce((s,c)=>s+Number(c.totalAmount||0),0);
          return <div key={k} className="card" style={{borderColor:SC[k]+"33"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:8,height:8,borderRadius:"50%",background:SC[k],boxShadow:`0 0 8px ${SC[k]}`}}/><span style={{fontSize:12,fontWeight:700,color:SC[k]}}>{l}</span></div>
            <div style={{fontSize:22,fontWeight:900}}>{cnt}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{fmt(tot)}</div>
          </div>;
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [contracts, setContracts] = useState(loadContracts);
  const [clients, setClients] = useState(loadClients);
  const [tab, setTab] = useState("dashboard");
  const [cm, setCm] = useState(null);
  const [clm, setClm] = useState(null);
  const [vm, setVm] = useState(null);

  useEffect(()=>saveC(contracts),[contracts]);
  useEffect(()=>saveCl(clients),[clients]);

  const saveContract = c => { setContracts(p=>p.find(x=>x.id===c.id)?p.map(x=>x.id===c.id?c:x):[...p,c]); setCm(null); };
  const delContract = id => { if(confirm("حذف هذا العقد؟")) setContracts(p=>p.filter(c=>c.id!==id)); };
  const togglePay = (id,f) => setContracts(p=>p.map(c=>{if(c.id!==id)return c;const u={...c,[f]:!c[f]};if(u.deposit50Paid&&u.final50Paid)u.status="completed";return u;}));
  const saveClient = c => { setClients(p=>p.find(x=>x.id===c.id)?p.map(x=>x.id===c.id?c:x):[...p,c]); setClm(null); };
  const delClient = id => setClients(p=>p.filter(c=>c.id!==id));

  const nav = [{key:"dashboard",label:"الرئيسية",icon:"dashboard"},{key:"contracts",label:"العقود",icon:"contracts"},{key:"clients",label:"العملاء",icon:"clients"},{key:"income",label:"الدخل",icon:"income"}];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div className="app">
        {tab==="dashboard"&&<Dashboard contracts={contracts} clients={clients} goTo={setTab}/>}
        {tab==="contracts"&&<ContractsScreen contracts={contracts} clients={clients} onAdd={()=>setCm("new")} onEdit={setCm} onDelete={delContract} onToggle={togglePay} onView={setVm}/>}
        {tab==="clients"&&<ClientsScreen clients={clients} contracts={contracts} onAdd={()=>setClm("new")} onEdit={c=>setClm(c)} onDelete={delClient}/>}
        {tab==="income"&&<IncomeScreen contracts={contracts}/>}

        <nav className="bnav">
          {nav.map(n=>(
            <div key={n.key} className={`bni${tab===n.key?" on":""}`} onClick={()=>setTab(n.key)}>
              <div className="bni-ico"><Icon name={n.icon} size={20} color={tab===n.key?"var(--ng)":"var(--muted)"}/></div>
              <div className="bni-lbl">{n.label}</div>
            </div>
          ))}
        </nav>

        {cm!==null&&<ContractModal contract={cm==="new"?null:cm} clients={clients} onClose={()=>setCm(null)} onSave={saveContract}/>}
        {clm!==null&&<ClientModal client={clm==="new"?null:clm} onClose={()=>setClm(null)} onSave={saveClient}/>}
        {vm&&<ContractViewModal c={vm} onClose={()=>setVm(null)}/>}
      </div>
    </>
  );
}