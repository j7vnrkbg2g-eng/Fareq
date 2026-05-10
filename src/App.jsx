import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseclient";

const fmt = (n, cur = "LYD") => { const x = Number(n); if (!x) return `0.00 ${cur}`; return `${x.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" }) : "";
const daysDiff = d => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };
const addMonths = (dateStr, months) => { const d = new Date(dateStr); d.setMonth(d.getMonth()+months); return d.toISOString().split("T")[0]; };
const NOW = new Date();

const SL = { active:"جارٍ", pending:"معلق", completed:"مكتمل", cancelled:"ملغي" };
const SC = { active:"#00ff88", pending:"#ffd600", completed:"#a78bfa", cancelled:"#ff4444" };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#050505;--surface:#0a0a0a;--surface2:#111;--surface3:#161616;
  --ac:#00ff88;--ac2:#00e57a;--ac-glow:rgba(0,255,136,0.22);
  --ac-faint:rgba(0,255,136,0.07);--ac-border:rgba(0,255,136,0.3);
  --text:#f0f0f0;--muted:#555;--muted2:#222;--font:'Tajawal',sans-serif;
  --danger:#ff4d4d;--warn:#ffd600;
}
[data-theme="light"]{
  --bg:#f4f4f4;--surface:#fff;--surface2:#eee;--surface3:#e0e0e0;
  --ac:#009955;--ac2:#007a44;--ac-glow:rgba(0,153,85,0.18);
  --ac-faint:rgba(0,153,85,0.07);--ac-border:rgba(0,153,85,0.3);
  --text:#111;--muted:#888;--muted2:#ddd;
}
html,body{background:var(--bg);color:var(--text);font-family:var(--font);direction:rtl;height:100%;transition:background .3s,color .3s;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--ac-border);border-radius:4px;}
.app{display:flex;flex-direction:column;height:100dvh;background:var(--bg);overflow:hidden;}
.screen{flex:1;overflow-y:auto;padding:16px 14px 90px;animation:fu .3s cubic-bezier(.4,0,.2,1);}
@keyframes fu{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}

/* Top bar */
.topbar{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 0;gap:10px;}
.topbar-actions{display:flex;gap:8px;align-items:center;}
.tb-btn{width:36px;height:36px;border-radius:10px;background:var(--ac-faint);border:1px solid var(--ac-border);color:var(--ac);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;box-shadow:0 0 10px var(--ac-faint);}
.tb-btn:hover{background:rgba(0,255,136,0.15);box-shadow:0 0 16px var(--ac-glow);}

/* Nav */
.bnav{position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(5,5,5,.96);backdrop-filter:blur(24px);border-top:1px solid var(--ac-border);display:flex;justify-content:space-around;align-items:center;padding:8px 0 max(8px,env(safe-area-inset-bottom));box-shadow:0 -6px 30px rgba(0,255,136,0.08);}
[data-theme="light"] .bnav{background:rgba(244,244,244,.96);}
.bni{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 14px;border-radius:12px;transition:all .2s;flex:1;}
.bni:hover{background:var(--ac-faint);}
.bni.on{background:var(--ac-faint);}
.bni.on .bni-lbl{color:var(--ac);}
.bni-lbl{font-size:10px;color:var(--muted);font-weight:700;transition:color .2s;}

.nbox{width:36px;height:36px;border-radius:10px;border:1px solid var(--ac-border);background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 0 12px var(--ac-faint);}
.nbox.sm{width:28px;height:28px;border-radius:8px;}

.card{background:var(--surface);border:1px solid var(--muted2);border-radius:14px;padding:12px;transition:all .2s;position:relative;overflow:hidden;}
.card:hover{border-color:var(--ac-border);box-shadow:0 0 20px var(--ac-faint);}
.card-gl{border-color:var(--ac-border)!important;box-shadow:0 0 28px var(--ac-glow)!important;}

/* Stats */
.stat{background:var(--surface);border:1px solid var(--muted2);border-radius:13px;padding:14px 16px;transition:all .2s;position:relative;overflow:hidden;}
.stat:hover{border-color:var(--ac-border);transform:translateY(-1px);box-shadow:0 4px 16px var(--ac-faint);}
.slbl{font-size:12px;color:var(--ac);font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:6px;text-shadow:0 0 10px var(--ac-glow);}
.sval{font-size:18px;font-weight:800;color:var(--text);}
.sval.sm{font-size:13px;color:var(--text);}

.sh{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin:18px 0 8px;}
.pt{font-size:20px;font-weight:900;color:var(--text);margin-bottom:3px;}
.ps{font-size:12px;color:var(--muted);}

.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:800;border:1px solid;}
.badge::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor;flex-shrink:0;}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:10px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:700;transition:all .2s;}
.btn:hover{transform:translateY(-1px);}
.btn:active{transform:scale(.97);}
.bng{background:transparent;color:var(--ac);border:1.5px solid var(--ac-border);box-shadow:0 0 12px var(--ac-faint);}
.bng:hover{background:var(--ac-faint);}
.bngf{background:var(--ac);color:#050505;border:1.5px solid var(--ac);box-shadow:0 0 18px var(--ac-glow);font-weight:900;}
.bngf:hover{background:var(--ac2);}
.bgh{background:var(--surface2);color:var(--muted);border:1px solid var(--muted2);font-size:12px;}
.bgh:hover{color:var(--text);}

/* Icon buttons - small */
.ico-btn{width:30px;height:30px;border-radius:8px;background:var(--surface2);border:1px solid var(--muted2);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;}
.ico-btn:hover{color:var(--ac);border-color:var(--ac-border);background:var(--ac-faint);}
.ico-btn.red{color:var(--danger);}
.ico-btn.red:hover{color:var(--danger);border-color:#ff4d4d44;background:#ff4d4d11;}
.ico-btn.wa:hover{color:#25D366;border-color:#25D36644;background:#25D36611;}

/* Contract card - compact */
.cc{background:var(--surface);border:1px solid var(--muted2);border-radius:13px;overflow:hidden;margin-bottom:8px;transition:all .2s;}
.cc:hover{border-color:var(--ac-border);box-shadow:0 3px 18px var(--ac-faint);}
.cc-h{padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;}
.cc-b{padding:6px 12px 10px;}
.cc-n{font-size:13px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cc-sub{font-size:9px;color:var(--muted);margin-top:1px;}

/* Compact single amount box */
.amt-box{background:var(--bg);border:1px solid var(--muted2);border-radius:7px;padding:6px 10px;margin-bottom:6px;}
.amt-lbl{font-size:8px;color:var(--muted);font-weight:700;margin-bottom:2px;}
.amt-val{font-size:12px;font-weight:800;color:var(--ac);text-shadow:0 0 6px var(--ac-glow);}

/* Payment - horizontal squares */
.psec{background:var(--bg);border-radius:7px;padding:7px 9px;border:1px solid var(--muted2);margin-top:5px;}
.pbar{height:2px;background:var(--muted2);border-radius:4px;margin:4px 0 6px;overflow:hidden;}
.pfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ac),#00ffcc);transition:width .5s cubic-bezier(.4,0,.2,1);box-shadow:0 0 6px var(--ac-glow);}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
.pitem{background:var(--surface);border-radius:7px;padding:6px 8px;border:1px solid var(--muted2);display:flex;justify-content:space-between;align-items:center;gap:4px;}
.ptog{padding:3px 7px;border-radius:5px;border:1px solid;font-size:9px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .2s;white-space:nowrap;}
.ptog.ok{background:rgba(0,255,136,.08);color:var(--ac);border-color:rgba(0,255,136,.3);}
.ptog.no{background:var(--surface2);color:var(--muted);border-color:var(--muted2);}

/* Video progress */
.vpsec{background:var(--bg);border-radius:7px;padding:7px 9px;border:1px solid var(--muted2);margin-top:5px;}
.vpbar{height:2px;background:var(--muted2);border-radius:4px;margin:4px 0 6px;overflow:hidden;}
.vpfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ac),#00ffcc);transition:width .5s cubic-bezier(.4,0,.2,1);box-shadow:0 0 6px var(--ac-glow);}
.vp-btn{padding:4px 14px;border-radius:6px;border:1px solid var(--ac-border);background:var(--ac-faint);color:var(--ac);font-size:10px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .2s;}
.vp-btn:hover{background:var(--ac);color:#050505;}

/* Modal */
.mov{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(8px);}
.mod{background:var(--surface);border:1px solid var(--ac-border);border-radius:20px;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;padding:22px;box-shadow:0 0 50px var(--ac-glow);animation:fu .25s cubic-bezier(.4,0,.2,1);}
.mhd{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.mtitle{font-size:16px;font-weight:900;color:var(--ac);}
.mclose{width:28px;height:28px;border-radius:7px;background:var(--surface2);border:1px solid var(--muted2);color:var(--muted);font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
.mclose:hover{color:var(--ac);border-color:var(--ac-border);}
.mft{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--muted2);}

.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.ffl{grid-column:1/-1;}
.fg{display:flex;flex-direction:column;gap:4px;}
.flbl{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.4px;}
.finp,.fsel,.fta{background:var(--bg);border:1px solid var(--muted2);border-radius:8px;padding:8px 11px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;transition:border-color .2s;width:100%;}
.finp:focus,.fsel:focus,.fta:focus{border-color:var(--ac);box-shadow:0 0 10px var(--ac-faint);}
.finp[readonly]{color:var(--muted);cursor:default;}
.fta{min-height:60px;resize:vertical;}
.fsel option{background:var(--surface);}
.fck{display:flex;align-items:center;gap:7px;cursor:pointer;}
.fck input{accent-color:var(--ac);width:14px;height:14px;}
.fck label{font-size:12px;color:var(--muted);cursor:pointer;}
.dur-btns{display:flex;gap:5px;}
.dur-btn{flex:1;padding:7px 5px;border-radius:7px;border:1px solid var(--muted2);background:var(--bg);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;text-align:center;}
.dur-btn.on{background:var(--ac-faint);color:var(--ac);border-color:var(--ac-border);}

.sb{background:var(--surface);border:1px solid var(--muted2);border-radius:10px;padding:9px 13px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;width:100%;transition:border-color .2s;}
.sb:focus{border-color:var(--ac);box-shadow:0 0 12px var(--ac-faint);}
.sb::placeholder{color:var(--muted);}
.sb-wrap{position:relative;margin-bottom:10px;}
.sb-ico{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;}

.tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;}
.tab{padding:6px 11px;border-radius:8px;border:1px solid var(--muted2);background:var(--surface);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;}
.tab.on{background:var(--ac-faint);color:var(--ac);border-color:var(--ac-border);}

.alr{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:10px;margin-bottom:7px;font-size:11px;font-weight:700;border:1px solid;border-right-width:3px;animation:fu .3s;}
.au{background:rgba(255,77,77,.05);border-color:#ff4d4d33;border-right-color:#ff4d4d;color:#ff4d4d;}
.aw{background:rgba(255,214,0,.05);border-color:#ffd60033;border-right-color:#ffd600;color:#ffd600;}

.clic{background:var(--surface);border:1px solid var(--muted2);border-radius:13px;padding:13px 15px;margin-bottom:9px;display:flex;align-items:center;gap:13px;transition:all .2s;cursor:pointer;}
.clic:hover{border-color:var(--ac-border);transform:translateX(-2px);box-shadow:0 3px 16px var(--ac-faint);}
.cav{width:42px;height:42px;border-radius:50%;border:1.5px solid var(--ac-border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:var(--ac);background:var(--ac-faint);flex-shrink:0;}
.lmark{width:36px;height:36px;border-radius:10px;border:1.5px solid var(--ac-border);background:var(--ac-faint);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:var(--ac);}
.empty{text-align:center;padding:50px 16px;color:var(--muted);}

.cv-wrap{background:#fff;color:#111;padding:30px 38px;font-family:'Tajawal',sans-serif;direction:rtl;font-size:14px;line-height:1.9;}

/* Status history */
.hist-line{display:flex;align-items:flex-start;gap:9px;padding:5px 0;position:relative;}
.hist-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.hist-line::before{content:'';position:absolute;right:3px;top:17px;bottom:-5px;width:1px;background:var(--muted2);}
.hist-line:last-child::before{display:none;}

/* Global search */
.gsearch-wrap{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.93);backdrop-filter:blur(12px);display:flex;flex-direction:column;padding:20px 14px;}
.gsearch-inp{background:var(--surface2);border:1.5px solid var(--ac-border);border-radius:13px;padding:13px 16px;color:var(--text);font-size:15px;font-family:var(--font);outline:none;width:100%;box-shadow:0 0 24px var(--ac-glow);}
.gresult{background:var(--surface);border:1px solid var(--muted2);border-radius:11px;padding:11px 13px;margin-bottom:7px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:11px;}
.gresult:hover{border-color:var(--ac-border);background:var(--ac-faint);}

/* Confirm */
.conf-ov{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);}
.conf-box{background:var(--surface);border:1px solid #ff4d4d33;border-radius:16px;padding:22px;max-width:320px;width:100%;text-align:center;box-shadow:0 0 36px #ff4d4d18;}

/* File upload */
.file-zone{border:2px dashed var(--muted2);border-radius:10px;padding:18px;text-align:center;cursor:pointer;transition:all .2s;}
.file-zone:hover,.file-zone.drag{border-color:var(--ac-border);background:var(--ac-faint);}

[data-tip]{position:relative;}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:var(--surface3);color:var(--ac);border:1px solid var(--ac-border);padding:3px 7px;border-radius:6px;font-size:9px;white-space:nowrap;z-index:50;pointer-events:none;}

@media(max-width:500px){.fgrid{grid-template-columns:1fr;}.ffl{grid-column:1;}.pgrid{grid-template-columns:1fr;}}
`;

const Icon = ({ name, size = 20, color = "var(--ac)" }) => {
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
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    user_plus: <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    contract_plus: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>,
    check: <><polyline points="20,6 9,17 4,12"/></>,
    sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    whatsapp: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    cancel: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    history: <><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></>,
    upload: <><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    file: <><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></>,
  };
  return <svg style={s} viewBox="0 0 24 24">{p[name] || null}</svg>;
};

const NBox = ({ name, sm }) => (
  <div className={`nbox${sm ? " sm" : ""}`}>
    <Icon name={name} size={sm ? 13 : 17} />
  </div>
);

// ─── Supabase helpers ─────────────────────────────────────────────
const toApp = r => ({
  id: String(r.id),
  clientId: r.client_id ? String(r.client_id) : "",
  clientName: r.client_name || "",
  clientAddress: r.client_address || "",
  clientPhone: r.client_phone || "",
  videoCount: r.video_count || "",
  videoDone: r.video_done || 0,
  totalAmount: r.total_amount || "",
  videoAmount: r.video_amount || "",
  presenterAmount: r.presenter_amount || "",
  currency: r.currency || "LYD",
  startDate: r.start_date || "",
  endDate: r.end_date || "",
  deposit50Date: r.deposit50_date || "",
  deposit50Paid: r.deposit50_paid || false,
  final50Date: r.final50_date || "",
  final50Paid: r.final50_paid || false,
  status: r.status || "pending",
  notes: r.notes || "",
  statusHistory: r.status_history || [],
  fileUrl: r.file_url || "",
  fileName: r.file_name || "",
});

const toDB = c => ({
  client_id: c.clientId ? Number(c.clientId) : null,
  client_name: c.clientName,
  client_address: c.clientAddress,
  client_phone: c.clientPhone,
  video_count: c.videoCount,
  video_done: Number(c.videoDone || 0),
  total_amount: c.totalAmount ? Number(c.totalAmount) : null,
  video_amount: c.videoAmount ? Number(c.videoAmount) : null,
  presenter_amount: c.presenterAmount ? Number(c.presenterAmount) : null,
  currency: c.currency,
  start_date: c.startDate || null,
  end_date: c.endDate || null,
  deposit50_date: c.deposit50Date || null,
  deposit50_paid: c.deposit50Paid,
  final50_date: c.final50Date || null,
  final50_paid: c.final50Paid,
  status: c.status,
  notes: c.notes,
  status_history: c.statusHistory || [],
  file_url: c.fileUrl || "",
  file_name: c.fileName || "",
});

const toAppCl = r => ({ id: String(r.id), name: r.name || "", phone: r.phone || "", address: r.address || "", notes: r.notes || "" });
const toDBCl = c => ({ name: c.name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });

// ─── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div className="conf-ov">
      <div className="conf-box">
        <Icon name="alert" size={34} color="var(--danger)" />
        <div style={{ fontWeight: 800, fontSize: 14, margin: "12px 0 6px", color: "var(--text)" }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn bgh" style={{ flex: 1 }} onClick={onCancel}>إلغاء</button>
          <button className="btn" style={{ flex: 1, background: "#ff4d4d22", color: "var(--danger)", border: "1px solid #ff4d4d44" }} onClick={onConfirm}>تأكيد</button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────
function GlobalSearch({ contracts, clients, onClose, onViewContract, goToClient }) {
  const [q, setQ] = useState("");
  const inp = useRef();
  useEffect(() => { setTimeout(() => inp.current?.focus(), 80); }, []);
  const results = q.trim().length < 1 ? [] : [
    ...clients.filter(c => c.name.includes(q) || c.phone?.includes(q)).map(c => ({ type: "client", label: c.name, sub: c.phone, obj: c })),
    ...contracts.filter(c => c.clientName.includes(q) || String(c.totalAmount).includes(q) || String(c.videoAmount).includes(q)).map(c => ({ type: "contract", label: c.clientName, sub: `${fmt(c.videoAmount || c.totalAmount, c.currency)}`, obj: c })),
  ].slice(0, 10);
  return (
    <div className="gsearch-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <Icon name="search" size={18} />
        <input ref={inp} className="gsearch-inp" value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن عميل، عقد، مبلغ..." />
        <button className="btn bgh" style={{ padding: "9px 12px", flexShrink: 0 }} onClick={onClose}>إغلاق</button>
      </div>
      {q && results.length === 0 && <div style={{ color: "var(--muted)", textAlign: "center", padding: 28, fontSize: 13 }}>لا توجد نتائج</div>}
      {results.map((r, i) => (
        <div key={i} className="gresult" onClick={() => { r.type === "contract" ? onViewContract(r.obj) : goToClient(r.obj.id); onClose(); }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ac-faint)", border: "1px solid var(--ac-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={r.type === "contract" ? "contracts" : "clients"} size={13} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{r.type === "contract" ? "عقد" : "عميل"} · {r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────
function Alerts({ contracts }) {
  const a = [];
  contracts.forEach(c => {
    if (c.status === "cancelled" || c.status === "completed") return;
    if (!c.final50Paid && c.final50Date) { const d = daysDiff(c.final50Date); if (d !== null && d >= 0 && d <= 7) a.push({ id: c.id, msg: `${d === 0 ? "اليوم" : d + " أيام"} — الدفعة الثانية لـ ${c.clientName}`, type: d <= 2 ? "u" : "w" }); }
    if (!c.deposit50Paid && c.deposit50Date && daysDiff(c.deposit50Date) <= 0) a.push({ id: c.id + "d", msg: `المقدم غير مدفوع — ${c.clientName}`, type: "u" });
    if (c.endDate) { const d = daysDiff(c.endDate); if (d !== null && d >= 0 && d <= 2) a.push({ id: c.id + "e", msg: `ينتهي ${d === 0 ? "اليوم" : "خلال " + d + " أيام"} — ${c.clientName}`, type: "u" }); }
  });
  if (!a.length) return null;
  return <div style={{ marginBottom: 12 }}>{a.map(x => <div key={x.id} className={`alr ${x.type === "u" ? "au" : "aw"}`}><Icon name="alert" size={12} color="currentColor" />{x.msg}</div>)}</div>;
}

// ─── WhatsApp Button ──────────────────────────────────────────────
function WABtn({ phone, sm }) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("0") ? "218" + clean.slice(1) : clean;
  const sz = sm ? 28 : 30;
  return (
    <button className="ico-btn wa" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${num}`, "_blank"); }} data-tip="واتساب"
      style={{ width: sz, height: sz, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <Icon name="whatsapp" size={sm ? 12 : 13} color="#25D366" />
    </button>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────
function ClientModal({ client, onClose, onSave }) {
  const [f, setF] = useState(client ? { ...client } : { name: "", phone: "", address: "", notes: "" });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle" style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon name={client ? "edit" : "user_plus"} size={15} />{client ? "تعديل عميل" : "عميل جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div className="fgrid">
          <div className="fg ffl"><label className="flbl">اسم العميل</label><input className="finp" value={f.name} onChange={e => s("name", e.target.value)} placeholder="الطرف الثاني" /></div>
          <div className="fg ffl"><label className="flbl">رقم الهاتف</label><input className="finp" value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="09..." /></div>
          <div className="fg ffl"><label className="flbl">العنوان</label><input className="finp" value={f.address} onChange={e => s("address", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
        </div>
        <div className="mft"><button className="btn bgh" onClick={onClose}>إلغاء</button><button className="btn bngf" onClick={() => { if (!f.name) { alert("أدخل الاسم"); return; } onSave({ ...f, id: f.id || null }); }}>حفظ</button></div>
      </div>
    </div>
  );
}

// ─── Contract Modal ───────────────────────────────────────────────
const EC = { clientId: "", clientName: "", clientAddress: "", clientPhone: "", videoCount: "", videoDone: 0, totalAmount: "", videoAmount: "", presenterAmount: "", currency: "LYD", startDate: "", endDate: "", deposit50Date: "", deposit50Paid: false, final50Date: "", final50Paid: false, status: "pending", notes: "", statusHistory: [], fileUrl: "", fileName: "" };

function ContractModal({ contract, clients, onClose, onSave }) {
  const [f, setF] = useState(contract ? { ...contract } : { ...EC });
  const [drop, setDrop] = useState(false);
  const [dur, setDur] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => { const v = Number(f.videoAmount || 0), p = Number(f.presenterAmount || 0); if (v || p) s("totalAmount", String(v + p)); }, [f.videoAmount, f.presenterAmount]);
  useEffect(() => { if (f.startDate) s("deposit50Date", f.startDate); }, [f.startDate]);
  useEffect(() => { if (f.endDate) s("final50Date", f.endDate); }, [f.endDate]);

  const handleDur = m => { setDur(m); if (f.startDate) s("endDate", addMonths(f.startDate, m)); };
  const handleStart = v => { s("startDate", v); if (dur && v) s("endDate", addMonths(v, dur)); };
  const pick = c => { setF(p => ({ ...p, clientId: c.id, clientName: c.name, clientPhone: c.phone || "", clientAddress: c.address || "" })); setDrop(false); };

  const handleFile = async file => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `contracts/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true });
    if (!error) { const { data: url } = supabase.storage.from("contracts").getPublicUrl(path); s("fileUrl", url.publicUrl); s("fileName", file.name); }
    setUploading(false);
  };

  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle" style={{ display: "flex", alignItems: "center", gap: 7 }}><Icon name={contract ? "edit" : "contract_plus"} size={15} />{contract ? "تعديل" : "عقد جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div style={{ marginBottom: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}><span className="flbl">العميل</span>{f.clientName && <span style={{ fontSize: 10, color: "var(--ac)", fontWeight: 800 }}>✓ {f.clientName}</span>}</div>
          <button className="btn bng" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setDrop(p => !p)}><span>{f.clientName || "اختر عميلاً..."}</span><Icon name="clients" size={12} /></button>
          {drop && (
            <div style={{ position: "absolute", top: "100%", insetInline: 0, zIndex: 50, background: "var(--surface2)", border: "1px solid var(--ac-border)", borderRadius: 11, padding: 7, marginTop: 3, maxHeight: 170, overflowY: "auto", boxShadow: "0 8px 28px var(--ac-glow)" }}>
              {clients.length === 0 && <div style={{ padding: 10, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>لا يوجد عملاء</div>}
              {clients.map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: "8px 11px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 9 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--ac-faint)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--ac-faint)", border: "1px solid var(--ac-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "var(--ac)" }}>{c.name[0]}</div>
                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>{c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="fgrid">
          <div className="fg"><label className="flbl">عدد الفيديوهات</label><input className="finp" type="number" value={f.videoCount} onChange={e => s("videoCount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">العملة</label><select className="fsel" value={f.currency} onChange={e => s("currency", e.target.value)}><option value="LYD">دينار ليبي</option><option value="SAR">ريال سعودي</option><option value="AED">درهم إماراتي</option><option value="USD">دولار</option></select></div>
          <div className="fg"><label className="flbl">قيمة الفيديوهات</label><input className="finp" type="number" value={f.videoAmount} onChange={e => s("videoAmount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">قيمة الوجه الإعلامي</label><input className="finp" type="number" value={f.presenterAmount} onChange={e => s("presenterAmount", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">الإجمالي (تلقائي)</label><input className="finp" type="number" value={f.totalAmount} readOnly style={{ color: "var(--ac)", fontWeight: 700 }} /></div>
          <div className="fg"><label className="flbl">تاريخ البدء</label><input className="finp" type="date" value={f.startDate} onChange={e => handleStart(e.target.value)} /></div>
          <div className="fg"><label className="flbl">المدة</label><div className="dur-btns"><button className={`dur-btn${dur === 1 ? " on" : ""}`} onClick={() => handleDur(1)}>شهر</button><button className={`dur-btn${dur === 3 ? " on" : ""}`} onClick={() => handleDur(3)}>3 أشهر</button></div></div>
          <div className="fg"><label className="flbl">تاريخ الانتهاء</label><input className="finp" type="date" value={f.endDate} onChange={e => s("endDate", e.target.value)} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الأولى</label><input className="finp" type="date" value={f.deposit50Date} readOnly style={{ color: "var(--muted)" }} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الثانية</label><input className="finp" type="date" value={f.final50Date} readOnly style={{ color: "var(--muted)" }} /></div>
          <div className="fck"><input type="checkbox" id="d1" checked={f.deposit50Paid} onChange={e => s("deposit50Paid", e.target.checked)} /><label htmlFor="d1">تم استلام الدفعة الأولى</label></div>
          <div className="fck"><input type="checkbox" id="d2" checked={f.final50Paid} onChange={e => s("final50Paid", e.target.checked)} /><label htmlFor="d2">تم استلام الدفعة الثانية</label></div>
          <div className="fg ffl"><label className="flbl">الحالة</label><select className="fsel" value={f.status} onChange={e => s("status", e.target.value)}><option value="pending">معلق</option><option value="active">جارٍ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
          <div className="fg ffl">
            <label className="flbl">رفع نسخة العقد الموقّعة</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div className={`file-zone${uploading ? " drag" : ""}`} onClick={() => fileRef.current?.click()}>
              {uploading ? <div style={{ color: "var(--ac)", fontSize: 12 }}>جارٍ الرفع...</div> : f.fileName ? <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}><Icon name="file" size={13} /><span style={{ fontSize: 11, color: "var(--ac)" }}>{f.fileName}</span></div> : <div style={{ color: "var(--muted)", fontSize: 11 }}><div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}><Icon name="upload" size={16} color="var(--muted)" /></div>اضغط لرفع الملف</div>}
            </div>
          </div>
        </div>
        <div className="mft"><button className="btn bgh" onClick={onClose}>إلغاء</button><button className="btn bngf" onClick={() => { if (!f.clientName) { alert("اختر عميلاً"); return; } onSave({ ...f, id: f.id || null }); }}>حفظ العقد</button></div>
      </div>
    </div>
  );
}

// ─── Contract View Modal ──────────────────────────────────────────
function ContractViewModal({ c, onClose, onPdfExported }) {
  const ref = useRef();
  const dParts = d => { if (!d) return { d: "", m: "", y: "" }; const dt = new Date(d); return { d: String(dt.getDate()).padStart(2, "0"), m: String(dt.getMonth() + 1).padStart(2, "0"), y: String(dt.getFullYear()) }; };
  const sd = dParts(c.startDate), ed = dParts(c.endDate);
  const cur = c.currency || "LYD";
  const vAmt = c.videoAmount ? Number(c.videoAmount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "__________";
  const pAmt = c.presenterAmount ? Number(c.presenterAmount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "__________";
  const pct = Math.round(((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)) * 100);
  const vc = Number(c.videoCount || 0), vd = Number(c.videoDone || 0);

  const exportPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>عقد - ${c.clientName || ""}</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;background:#fff;padding:32px 44px;font-size:14px;line-height:1.9;}.sec{font-weight:800;font-size:14px;margin:13px 0 5px;border-right:3px solid #111;padding-right:8px;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:11px 0;}.bx{border:1px solid #ddd;border-radius:7px;padding:10px 12px;}.bl{font-weight:800;font-size:10px;color:#555;margin-bottom:5px;border-right:3px solid #111;padding-right:6px;}hr{border:none;border-top:2px solid #111;margin:12px 0;}hr.t{border-top:1px solid #ddd;margin:16px 0;}.sg{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:22px;}.s{text-align:center;}.sl{margin-top:34px;border-bottom:1.5px dashed #bbb;}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 500);
    onPdfExported(c.id);
  };

  return (
    <div className="mov" style={{ alignItems: "flex-start", overflowY: "auto" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--ac-border)", borderRadius: 18, width: "100%", maxWidth: 740, margin: "12px 0", overflow: "hidden", boxShadow: "0 0 50px var(--ac-glow)" }}>
        <div style={{ background: "var(--bg)", padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--ac-border)" }}>
          <span style={{ color: "var(--ac)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}><Icon name="doc" size={13} />تفاصيل العقد</span>
          <div style={{ display: "flex", gap: 7 }}>
            {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn bng" style={{ fontSize: 11, padding: "5px 11px", display: "flex", alignItems: "center", gap: 5 }}><Icon name="file" size={11} />نسخة العقد</button></a>}
            <button className="btn bngf" style={{ fontSize: 11, padding: "6px 13px", display: "flex", alignItems: "center", gap: 5 }} onClick={exportPDF}><Icon name="doc" size={11} color="#050505" />تصدير PDF</button>
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div><div style={{ fontSize: 17, fontWeight: 900 }}>{c.clientName}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.videoCount ? `${c.videoCount} فيديو` : ""}</div></div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
          <div style={{ background: "var(--bg)", border: "1px solid var(--muted2)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, marginBottom: 3 }}>الإجمالي</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ac)" }}>{fmt(c.totalAmount, c.currency)}</div>
          </div>
          <div className="psec">
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الدفع</span><span style={{ fontSize: 10, fontWeight: 800, color: pct === 100 ? "var(--ac)" : "var(--warn)" }}>{pct}%</span></div>
            <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
            <div className="pgrid">
              {[{ l: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date }, { l: "الثانية 50%", paid: c.final50Paid, date: c.final50Date }].map(p => (
                <div key={p.l} className="pitem">
                  <div><div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{p.l}</div><div style={{ fontSize: 11, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>{p.date && <div style={{ fontSize: 9, color: "var(--muted)" }}>{fmtDate(p.date)}</div>}</div>
                  <div style={{ fontSize: 10, color: p.paid ? "var(--ac)" : "var(--muted)", fontWeight: 800 }}>{p.paid ? "✓" : "—"}</div>
                </div>
              ))}
            </div>
          </div>
          {vc > 0 && <div className="vpsec" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الفيديوهات</span><span style={{ fontSize: 10, fontWeight: 800, color: "var(--ac)" }}>{vd}/{vc}</span></div>
            <div className="vpbar"><div className="vpfill" style={{ width: `${vc > 0 ? (vd / vc) * 100 : 0}%` }} /></div>
          </div>}
          {c.statusHistory && c.statusHistory.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}><Icon name="history" size={10} color="var(--muted)" />سجل الحالات</div>
              {c.statusHistory.map((h, i) => (
                <div key={i} className="hist-line">
                  <div className="hist-dot" style={{ background: SC[h.status] || "var(--muted)" }} />
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: SC[h.status] || "var(--muted)" }}>{SL[h.status] || h.status}</div><div style={{ fontSize: 9, color: "var(--muted)" }}>{new Date(h.date).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" })}</div></div>
                </div>
              ))}
            </div>
          )}
          {c.notes && <div style={{ marginTop: 9, fontSize: 11, color: "var(--muted)", padding: "7px 9px", background: "var(--bg)", borderRadius: 7, border: "1px solid var(--muted2)" }}>📝 {c.notes}</div>}
        </div>
        {/* Hidden PDF content */}
        <div ref={ref} style={{ display: "none", background: "#fff", color: "#111", padding: "30px 38px", fontFamily: "'Tajawal',sans-serif", direction: "rtl", fontSize: 14, lineHeight: 1.9 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}><div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff", fontSize: 24, fontWeight: 900, width: 52, height: 52, borderRadius: 11, marginBottom: 7 }}>ف</div><div style={{ fontWeight: 800, fontSize: 16 }}>شركة فارق للإنتاج</div><div style={{ color: "#555", fontSize: 11 }}>FAREQ Productions — 0920953918</div></div>
          <hr style={{ border: "none", borderTop: "2px solid #111", margin: "12px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, margin: "11px 0" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 7, padding: "9px 11px" }}><div style={{ fontWeight: 800, fontSize: 10, color: "#555", marginBottom: 5, borderRight: "3px solid #111", paddingRight: 6 }}>الطرف الأول</div>{[["الاسم", "شركة فارق للإنتاج FAREQ productions"], ["الهاتف", "0920953918"]].map(([l, v]) => <div key={l} style={{ display: "flex", gap: 4, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 45 }}>{l}:</span><span style={{ fontWeight: 600 }}>{v}</span></div>)}</div>
            <div style={{ border: "1px solid #ddd", borderRadius: 7, padding: "9px 11px" }}><div style={{ fontWeight: 800, fontSize: 10, color: "#555", marginBottom: 5, borderRight: "3px solid #111", paddingRight: 6 }}>الطرف الثاني</div>{[["الاسم", c.clientName], ["العنوان", c.clientAddress], ["الهاتف", c.clientPhone]].map(([l, v]) => <div key={l} style={{ display: "flex", gap: 4, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 45 }}>{l}:</span><span style={{ fontWeight: 600, borderBottom: "1px solid #ddd", flex: 1 }}>{v || ""}</span></div>)}</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>موضوع العقد</div>
          <div>يلتزم الطرف الأول بتقديم خدمات إنتاج محتوى فيديو تشمل:</div>
          <div>- تصوير وإنتاج عدد ({c.videoCount || "          "}) فيديوهات</div>
          <div>يلتزم الطرف الثاني بتوفير المعلومات/ المنتجات</div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>مدة العقد:</div>
          <div>مدة العقد تبدأ من تاريخ {sd.d} / {sd.m} / {sd.y} وتنتهي في {ed.d} / {ed.m} / {ed.y}</div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>القيمة المالية وطريقة الدفع:</div>
          <div>- القيمة الخاصة بالفيديوهات: {vAmt} {cur}</div>
          <div>- القيمة الخاصة بالوجه الإعلامي: {pAmt} {cur}</div>
          <div style={{ margin: "9px 0 3px", fontWeight: 700 }}>طريقة الدفع:</div>
          <div>  - 50% مقدماً</div><div>  - 50% عند تسليم آخر فيديو</div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>التعديلات:</div>
          <div>- يحق للعميل طلب تعديل فقط لكل فيديو</div><div>- أي تعديلات إضافية يتم احتسابها بتكلفة إضافية</div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>الإلغاء:</div>
          <div>- لا يحق للعميل الغاء العقد بعد تنفيذ نصف عدد الفيديوهات المتفق عليها</div><div>- في حالة الإلغاء بعد بدء العمل، لا يتم استرجاع الدفعة المقدمة</div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>حقوق الاستخدام:</div>
          <div>- يحق للعميل استخدام الفيديوهات لأغراضه التسويقية</div><div>- يحق للطرف الأول استخدام الأعمال في معرض أعماله</div>
          {c.notes && <><div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7 }}>ملاحظات:</div><div>{c.notes}</div></>}
          <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "18px 0 14px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
            {["الطرف الأول — شركة فارق للإنتاج", `الطرف الثاني — ${c.clientName || "___________"}`].map((p, i) => <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{p}</div><div style={{ fontWeight: 700 }}>التوقيع</div><div style={{ marginTop: 34, borderBottom: "1.5px dashed #bbb" }} /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contract Card ────────────────────────────────────────────────
function ContractCard({ c, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel }) {
  const pct = Math.round(((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)) * 100);
  const f50d = c.final50Date ? daysDiff(c.final50Date) : null;
  const vc = Number(c.videoCount || 0), vd = Number(c.videoDone || 0);
  const vpct = vc > 0 ? Math.round((vd / vc) * 100) : 0;
  const ibtn = { width: 30, height: 30, borderRadius: 8, background: "var(--ac-faint)", border: "1px solid var(--ac-border)", color: "var(--ac)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", flexShrink: 0, boxShadow: "0 0 8px var(--ac-faint)" };
  const rbtn = { width: 30, height: 30, borderRadius: 8, background: "var(--surface2)", border: "1px solid #ff4d4d30", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", flexShrink: 0 };

  return (
    <div className="cc">
      <div className="cc-h">
        {/* Name + badge */}
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onView(c)}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div className="cc-n">{c.clientName || "عميل"}</div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44", flexShrink: 0 }}>{SL[c.status]}</span>
          </div>
          <div className="cc-sub">{vc > 0 ? `${vd}/${vc} فيديو` : ""}{vc > 0 && c.startDate ? " — " : ""}{fmtDate(c.startDate)}</div>
        </div>
        {/* Buttons: 2 rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {/* Row 1: edit, pdf, wa */}
          <div style={{ display: "flex", gap: 4 }}>
            <button style={ibtn} onClick={() => onEdit(c)} data-tip="تعديل" onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.15)"; e.currentTarget.style.boxShadow = "0 0 14px var(--ac-glow)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ac-faint)"; e.currentTarget.style.boxShadow = "0 0 8px var(--ac-faint)"; }}><Icon name="edit" size={12} color="var(--ac)" /></button>
            <button style={ibtn} onClick={() => onView(c)} data-tip="عرض PDF" onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.15)"; e.currentTarget.style.boxShadow = "0 0 14px var(--ac-glow)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ac-faint)"; e.currentTarget.style.boxShadow = "0 0 8px var(--ac-faint)"; }}><Icon name="doc" size={12} color="var(--ac)" /></button>
            <WABtn phone={c.clientPhone} sm />
          </div>
          {/* Row 2: cancel, delete */}
          <div style={{ display: "flex", gap: 4 }}>
            <button style={rbtn} onClick={() => onCancel(c.id)} data-tip="إلغاء" onMouseEnter={e => { e.currentTarget.style.background = "#ff4d4d15"; e.currentTarget.style.borderColor = "#ff4d4d55"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "#ff4d4d30"; }}><Icon name="cancel" size={12} color="var(--danger)" /></button>
            <button style={{ ...rbtn, flex: 1 }} onClick={() => onDelete(c.id)} data-tip="حذف" onMouseEnter={e => { e.currentTarget.style.background = "#ff4d4d15"; e.currentTarget.style.borderColor = "#ff4d4d55"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "#ff4d4d30"; }}><Icon name="trash" size={12} color="var(--danger)" /></button>
          </div>
        </div>
      </div>

      <div className="cc-b">
        {/* Only total amount */}
        <div className="amt-box">
          <div className="amt-lbl">الإجمالي</div>
          <div className="amt-val">{fmt(c.totalAmount, c.currency)}</div>
        </div>

        {/* Payment */}
        <div className="psec">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الدفع</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: pct === 100 ? "var(--ac)" : "var(--warn)" }}>{pct}%</span>
          </div>
          <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
          <div className="pgrid">
            {[{ label: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date, field: "deposit50Paid", diff: null }, { label: "الثانية 50%", paid: c.final50Paid, date: c.final50Date, field: "final50Paid", diff: f50d }].map(p => (
              <div key={p.field} className="pitem">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: "var(--muted)", fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>
                  {p.date && <div style={{ fontSize: 8, color: !p.paid && p.diff !== null && p.diff <= 7 && p.diff >= 0 ? "var(--warn)" : "var(--muted)" }}>{fmtDate(p.date)}</div>}
                </div>
                <button className={`ptog ${p.paid ? "ok" : "no"}`} onClick={() => onToggle(c.id, p.field)}>{p.paid ? "✓" : "تحديد"}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Video progress */}
        {vc > 0 && (
          <div className="vpsec">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الفيديوهات</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: "var(--ac)" }}>{vd}/{vc}</span>
            </div>
            <div className="vpbar"><div className="vpfill" style={{ width: `${vpct}%` }} /></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="vp-btn" onClick={() => onVideoUpdate(c.id, Math.min(vc, vd + 2))}>+2 فيديو</button>
              <button className="vp-btn" style={{ background: "#ff4d4d10", borderColor: "#ff4d4d40", color: "var(--danger)" }} onClick={() => onVideoUpdate(c.id, 0)}>صفر</button>
            </div>
          </div>
        )}
      </div>
      {c.notes && <div style={{ fontSize: 10, color: "var(--muted)", padding: "4px 12px 9px", borderTop: "1px solid var(--muted2)", display: "flex", gap: 4 }}><Icon name="doc" size={10} />{c.notes}</div>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────
function Dashboard({ contracts, clients, goTo, onViewContract }) {
  const collected = contracts.reduce((s, c) => s + Number(c.videoAmount || 0) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)), 0);
  const recent = [...contracts].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 3);
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <Alerts contracts={contracts} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 4 }}>
        <div className="stat" style={{ gridColumn: "1/-1" }}>
          <div className="slbl"><Icon name="income" size={13} />إجمالي المحصّل</div>
          <div className="sval sm">{fmt(collected)}</div>
        </div>
        {[{ l: "العقود", v: contracts.length, icon: "contracts" }, { l: "نشطة", v: contracts.filter(c => c.status === "active").length, icon: "check" }, { l: "معلقة", v: contracts.filter(c => c.status === "pending").length, icon: "clock" }, { l: "العملاء", v: clients.length, icon: "clients" }].map(s => (
          <div key={s.l} className="stat">
            <div className="slbl"><Icon name={s.icon} size={13} />{s.l}</div>
            <div className="sval">{s.v}</div>
          </div>
        ))}
      </div>
      {recent.length > 0 && <>
        <div className="sh" style={{ display: "flex", justifyContent: "space-between" }}><span>آخر العقود</span><span style={{ cursor: "pointer", color: "var(--ac)", fontSize: 10, fontWeight: 700 }} onClick={() => goTo("contracts")}>عرض الكل ←</span></div>
        {recent.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onViewContract(c)}>
            <NBox name="contracts" sm />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{c.clientName}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{c.videoCount ? `${c.videoCount} فيديو — ` : ""}{fmt(c.videoAmount || c.totalAmount, c.currency)}</div></div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
        ))}
      </>}
      {contracts.length === 0 && <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="contracts" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)", fontSize: 13 }}>ابدأ بإضافة أول عقد</div></div>}
    </div>
  );
}

// ─── Contracts Screen ─────────────────────────────────────────────
function ContractsScreen({ contracts, clients, onAdd, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const tabs = [
    { key: "all", label: "الكل", count: contracts.filter(c => c.status !== "completed" && c.status !== "cancelled").length },
    { key: "active", label: "جارٍ", count: contracts.filter(c => c.status === "active").length },
    { key: "pending", label: "معلق", count: contracts.filter(c => c.status === "pending").length },
    { key: "completed", label: "مكتمل", count: contracts.filter(c => c.status === "completed").length },
    { key: "cancelled", label: "ملغي", count: contracts.filter(c => c.status === "cancelled").length }
  ];
  const filtered = [...contracts].sort((a, b) => Number(b.id) - Number(a.id)).filter(c => { if (filter === "all") return c.status !== "completed" && c.status !== "cancelled"; return c.status === filter; }).filter(c => !search || c.clientName?.includes(search));
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div><div className="pt">العقود</div><div className="ps">{contracts.length} عقد</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 12 }}><Icon name="contract_plus" size={13} color="#050505" />جديد</button>
      </div>
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)" /></span><input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 34 }} /></div>
      <div className="tabs">{tabs.map(t => <button key={t.key} className={`tab${filter === t.key ? " on" : ""}`} onClick={() => setFilter(t.key)}>{t.label}{t.count > 0 && <span style={{ marginRight: 4, background: filter === t.key ? "var(--ac)" : "var(--muted2)", color: filter === t.key ? "#050505" : "var(--muted)", borderRadius: 20, padding: "0 5px", fontSize: 9, fontWeight: 900 }}>{t.count}</span>}</button>)}</div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="contracts" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>{contracts.length === 0 ? "لا توجد عقود" : "لا توجد نتائج"}</div>{contracts.length === 0 && <button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(c => <ContractCard key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView} onVideoUpdate={onVideoUpdate} onCancel={onCancel} />)}
    </div>
  );
}

// ─── Clients Screen ───────────────────────────────────────────────
function ClientsScreen({ clients, contracts, onAdd, onEdit, onDelete, initialSel }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(initialSel || null);
  useEffect(() => { if (initialSel) setSel(initialSel); }, [initialSel]);
  const filtered = clients.filter(c => !search || c.name.includes(search) || c.phone?.includes(search));
  if (sel) {
    const cl = clients.find(c => c.id === sel);
    if (!cl) { setSel(null); return null; }
    const clc = contracts.filter(c => c.clientId === cl.id);
    return (
      <div className="screen" style={{ paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button className="btn bgh" style={{ padding: "5px 9px", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }} onClick={() => setSel(null)}><Icon name="back" size={12} color="var(--muted)" />رجوع</button>
          <div className="pt">{cl.name}</div>
        </div>
        <div className="card card-gl" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div className="cav">{cl.name[0]}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 900 }}>{cl.name}</div></div>
            <WABtn phone={cl.phone} />
          </div>
          {[["📞", cl.phone], ["📍", cl.address], ["📝", cl.notes]].filter(([, v]) => v).map(([i, v]) => <div key={i} style={{ display: "flex", gap: 9, padding: "7px 0", borderTop: "1px solid var(--muted2)", fontSize: 12 }}><span>{i}</span><span style={{ color: "var(--muted)", flex: 1 }}>{v}</span></div>)}
          <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
            <button className="btn bng" style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, justifyContent: "center", fontSize: 12 }} onClick={() => onEdit(cl)}><Icon name="edit" size={12} />تعديل</button>
            <button className="btn bgh" style={{ color: "var(--danger)", borderColor: "#ff4d4d33", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }} onClick={() => { if (confirm("حذف العميل؟")) { onDelete(cl.id); setSel(null); } }}><Icon name="trash" size={12} color="var(--danger)" />حذف</button>
          </div>
        </div>
        <div className="sh">عقوده ({clc.length})</div>
        {clc.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>لا توجد عقود</div>}
        {clc.map(c => <div key={c.id} className="card" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><NBox name="contracts" sm /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 12 }}>{c.videoCount ? `${c.videoCount} فيديو` : "عقد"}</div><div style={{ fontSize: 11, color: "var(--ac)", fontWeight: 700 }}>{fmt(c.videoAmount || c.totalAmount, c.currency)}</div></div><span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span></div>)}
      </div>
    );
  }
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div><div className="pt">العملاء</div><div className="ps">{clients.length} عميل</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 12 }}><Icon name="user_plus" size={13} color="#050505" />عميل</button>
      </div>
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)" /></span><input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 34 }} /></div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="clients" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>{clients.length === 0 ? "أضف أول عميل" : "لا نتائج"}</div>{clients.length === 0 && <button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(cl => <div key={cl.id} className="clic" onClick={() => setSel(cl.id)}><div className="cav">{cl.name[0]}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14 }}>{cl.name}</div><div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{[cl.phone, `${contracts.filter(c => c.clientId === cl.id).length} عقد`].filter(Boolean).join(" · ")}</div></div><WABtn phone={cl.phone} sm /></div>)}
    </div>
  );
}

// ─── Income Screen ────────────────────────────────────────────────
function IncomeScreen({ contracts }) {
  const videoOnly = c => Number(c.videoAmount || 0);
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const last30 = contracts.filter(c => c.startDate && new Date(c.startDate) >= thirtyAgo).reduce((s, c) => s + videoOnly(c), 0);
  const yearT = contracts.filter(c => c.startDate && new Date(c.startDate).getFullYear() === NOW.getFullYear()).reduce((s, c) => s + videoOnly(c), 0);
  const allCollected = contracts.reduce((s, c) => s + videoOnly(c) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)), 0);
  const pend = contracts.filter(c => c.status !== "cancelled").reduce((s, c) => s + videoOnly(c) * ((!c.deposit50Paid ? 0.5 : 0) + (!c.final50Paid ? 0.5 : 0)), 0);
  const totalC = contracts.reduce((s, c) => s + videoOnly(c), 0);
  const activeT = contracts.filter(c => c.status === "active").reduce((s, c) => s + videoOnly(c), 0);
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 16 }}><div className="pt">الدخل</div><div className="ps">التحليل المالي — الفيديوهات فقط</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {[
          { l: "آخر 30 يوم", v: fmt(last30), icon: "clock" },
          { l: String(NOW.getFullYear()), v: fmt(yearT), icon: "income" },
          { l: "محصّل", v: fmt(allCollected), icon: "check" },
          { l: "متوقع", v: fmt(pend), icon: "calendar" },
          { l: "إجمالي العقود", v: fmt(totalC), icon: "contracts" },
          { l: "العقود النشطة", v: fmt(activeT), icon: "contracts" },
        ].map(s => <div key={s.l} className="stat"><div className="slbl"><Icon name={s.icon} size={13} />{s.l}</div><div className="sval sm">{s.v}</div></div>)}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [cm, setCm] = useState(null);
  const [clm, setClm] = useState(null);
  const [vm, setVm] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [confirm, setConfirm] = useState(null);
  const [selClient, setSelClient] = useState(null);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { data: cl }] = await Promise.all([
        supabase.from("contracts").select("*").order("id", { ascending: false }),
        supabase.from("clients").select("*").order("id", { ascending: false }),
      ]);
      setContracts((c || []).map(toApp));
      setClients((cl || []).map(toAppCl));
      setLoading(false);
    };
    load();
  }, []);

  const addHist = (c, newStatus) => { if (c.status === newStatus) return c.statusHistory || []; return [...(c.statusHistory || []), { status: newStatus, date: new Date().toISOString() }]; };

  const saveContract = async (c) => {
    const hist = addHist(c, c.status);
    const d2s = { ...c, statusHistory: hist };
    if (c.id) { const { data } = await supabase.from("contracts").update(toDB(d2s)).eq("id", c.id).select().single(); if (data) setContracts(p => p.map(x => x.id === c.id ? toApp(data) : x)); }
    else { const ih = [{ status: c.status, date: new Date().toISOString() }]; const { data } = await supabase.from("contracts").insert(toDB({ ...c, statusHistory: ih })).select().single(); if (data) setContracts(p => [toApp(data), ...p]); }
    setCm(null);
  };

  const delContract = id => setConfirm({ msg: "هل تريد حذف هذا العقد نهائياً؟", onConfirm: async () => { await supabase.from("contracts").delete().eq("id", id); setContracts(p => p.filter(c => c.id !== id)); setConfirm(null); } });

  const cancelContract = async id => {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    const hist = addHist(c, "cancelled");
    const updated = { ...c, status: "cancelled", statusHistory: hist };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const togglePay = async (id, field) => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const updated = { ...c, [field]: !c[field] };
    if (updated.deposit50Paid && updated.final50Paid) { updated.status = "completed"; updated.statusHistory = addHist(c, "completed"); }
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const updateVideoDone = async (id, count) => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const updated = { ...c, videoDone: count };
    if (count >= Number(c.videoCount) && Number(c.videoCount) > 0) { updated.status = "completed"; updated.statusHistory = addHist(c, "completed"); }
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const handlePdfExported = async id => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const hist = addHist(c, "active");
    const updated = { ...c, deposit50Paid: true, status: "active", statusHistory: hist };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const saveClient = async c => {
    if (c.id) { const { data } = await supabase.from("clients").update(toDBCl(c)).eq("id", c.id).select().single(); if (data) setClients(p => p.map(x => x.id === c.id ? toAppCl(data) : x)); }
    else { const { data } = await supabase.from("clients").insert(toDBCl(c)).select().single(); if (data) setClients(p => [toAppCl(data), ...p]); }
    setClm(null);
  };

  const delClient = async id => { await supabase.from("clients").delete().eq("id", id); setClients(p => p.filter(c => c.id !== id)); };
  const goToClient = id => { setSelClient(id); setTab("clients"); };
  const goTo = t => setTab(t);

  const nav = [
    { key: "dashboard", label: "الرئيسية", icon: "dashboard" },
    { key: "clients", label: "العملاء", icon: "clients" },
    { key: "contracts", label: "العقود", icon: "contracts" },
    { key: "income", label: "الدخل", icon: "income" },
  ];

  const titles = { dashboard: "فارق للإنتاج", clients: "العملاء", contracts: "العقود", income: "الدخل" };

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "var(--bg)", flexDirection: "column", gap: 12 }}>
        <div className="lmark">F</div>
        <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>جارٍ التحميل...</div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        {/* Top bar */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="lmark" style={{ width: 32, height: 32, fontSize: 14 }}>F</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--ac)" }}>{titles[tab]}</div>
          </div>
          <div className="topbar-actions">
            <button className="tb-btn" onClick={() => setShowSearch(true)} data-tip="بحث"><Icon name="search" size={16} color="var(--ac)" /></button>
            <button className="tb-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} data-tip={theme === "dark" ? "وضع فاتح" : "وضع داكن"}><Icon name={theme === "dark" ? "sun" : "moon"} size={16} color="var(--ac)" /></button>
          </div>
        </div>

        {tab === "dashboard" && <Dashboard contracts={contracts} clients={clients} goTo={goTo} onViewContract={setVm} />}
        {tab === "contracts" && <ContractsScreen contracts={contracts} clients={clients} onAdd={() => setCm("new")} onEdit={setCm} onDelete={delContract} onToggle={togglePay} onView={setVm} onVideoUpdate={updateVideoDone} onCancel={cancelContract} />}
        {tab === "clients" && <ClientsScreen clients={clients} contracts={contracts} onAdd={() => setClm("new")} onEdit={c => setClm(c)} onDelete={delClient} initialSel={selClient} />}
        {tab === "income" && <IncomeScreen contracts={contracts} />}

        <nav className="bnav">
          {nav.map(n => (
            <div key={n.key} className={`bni${tab === n.key ? " on" : ""}`} onClick={() => { setTab(n.key); if (n.key !== "clients") setSelClient(null); }}>
              <div><Icon name={n.icon} size={19} color={tab === n.key ? "var(--ac)" : "var(--muted)"} /></div>
              <div className="bni-lbl">{n.label}</div>
            </div>
          ))}
        </nav>

        {cm !== null && <ContractModal contract={cm === "new" ? null : cm} clients={clients} onClose={() => setCm(null)} onSave={saveContract} />}
        {clm !== null && <ClientModal client={clm === "new" ? null : clm} onClose={() => setClm(null)} onSave={saveClient} />}
        {vm && <ContractViewModal c={vm} onClose={() => setVm(null)} onPdfExported={handlePdfExported} />}
        {showSearch && <GlobalSearch contracts={contracts} clients={clients} onClose={() => setShowSearch(false)} onViewContract={c => { setVm(c); setShowSearch(false); }} goToClient={id => { goToClient(id); setShowSearch(false); }} />}
        {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      </div>
    </>
  );
}