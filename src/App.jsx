import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseclient";

const fmt = (n, cur = "LYD") => { const x = Number(n); if (!x) return `0.00 ${cur}`; return `${x.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" }) : "";
const daysDiff = d => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };
const addMonths = (dateStr, months) => { const d = new Date(dateStr); d.setMonth(d.getMonth()+months); return d.toISOString().split("T")[0]; };
const now = new Date();

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
  --danger:#ff4d4d;--warn:#ffd600;
}
[data-theme="light"]{
  --bg:#f4f4f4;--surface:#fff;--surface2:#eee;--surface3:#e0e0e0;
  --ng:#009955;--ng2:#007a44;--ng-glow:rgba(0,153,85,0.18);
  --ng-faint:rgba(0,153,85,0.07);--ng-border:rgba(0,153,85,0.3);
  --text:#111;--muted:#888;--muted2:#ddd;
}
html,body{background:var(--bg);color:var(--text);font-family:var(--font);direction:rtl;height:100%;transition:background .3s,color .3s;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--ng-border);border-radius:4px;}
.app{display:flex;flex-direction:column;height:100dvh;background:var(--bg);overflow:hidden;}
.screen{flex:1;overflow-y:auto;padding:22px 14px 90px;animation:fu .3s cubic-bezier(.4,0,.2,1);}
@keyframes fu{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
@keyframes swipe-hint{0%{transform:translateX(0)}50%{transform:translateX(-8px)}100%{transform:translateX(0)}}

.bnav{position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(5,5,5,.95);backdrop-filter:blur(24px);border-top:1px solid var(--ng-border);display:flex;justify-content:space-around;align-items:center;padding:8px 0 max(8px,env(safe-area-inset-bottom));box-shadow:0 -8px 40px rgba(0,255,136,0.1);}
[data-theme="light"] .bnav{background:rgba(244,244,244,.95);}
.bni{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 16px;border-radius:14px;transition:all .22s cubic-bezier(.4,0,.2,1);flex:1;}
.bni:hover{background:var(--ng-faint);}
.bni.on{background:var(--ng-faint);}
.bni.on .bni-lbl{color:var(--ng);}
.bni-ico{transition:transform .2s;}
.bni:hover .bni-ico{transform:translateY(-2px);}
.bni-lbl{font-size:10px;color:var(--muted);font-weight:700;transition:color .2s;}

.nbox{width:42px;height:42px;border-radius:12px;border:1.5px solid var(--ng-border);background:transparent;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;box-shadow:inset 0 0 14px var(--ng-faint);}
.nbox.sm{width:32px;height:32px;border-radius:9px;}

.card{background:var(--surface);border:1px solid var(--muted2);border-radius:16px;padding:14px;transition:all .22s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden;}
.card:hover{border-color:var(--ng-border);box-shadow:0 0 24px var(--ng-faint);}
.card-gl{border-color:var(--ng-border)!important;box-shadow:0 0 32px var(--ng-glow)!important;}

/* Dashboard stats - new style */
.stat{background:var(--surface);border:1px solid var(--muted2);border-radius:14px;padding:14px 16px;transition:all .22s;position:relative;overflow:hidden;}
.stat::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--ng-faint),transparent);opacity:0;transition:opacity .3s;}
.stat:hover::before{opacity:1;}
.stat:hover{border-color:var(--ng-border);transform:translateY(-2px);box-shadow:0 6px 20px var(--ng-faint);}
.slbl{font-size:11px;color:var(--ng);font-weight:800;margin-bottom:6px;display:flex;align-items:center;gap:6px;text-shadow:0 0 10px var(--ng-glow);}
.sval{font-size:24px;font-weight:900;color:var(--text);}
.sval.sm{font-size:15px;color:var(--text);}

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
.bico{width:32px;height:32px;padding:0;border-radius:9px;background:var(--surface2);border:1px solid var(--muted2);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;border:none;}
.bico:hover{color:var(--ng);border:1px solid var(--ng-border);background:var(--ng-faint);}
.bico.dx:hover{color:var(--danger);border:1px solid #ff4d4d44;background:#ff4d4d11;}
.bico.wa:hover{color:#25D366;border:1px solid #25D36644;background:#25D36611;}
.bico.cn:hover{color:var(--danger);border:1px solid #ff4d4d44;background:#ff4d4d11;}

/* Contract card - compact redesign */
.cc{background:var(--surface);border:1px solid var(--muted2);border-radius:16px;overflow:hidden;margin-bottom:10px;transition:all .22s cubic-bezier(.4,0,.2,1);position:relative;}
.cc:hover{border-color:var(--ng-border);box-shadow:0 4px 24px var(--ng-faint);}
.cc-h{padding:11px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;}
.cc-b{padding:8px 14px 12px;}
.cc-n{font-size:14px;font-weight:800;color:var(--text);}
.cc-p{font-size:10px;color:var(--muted);margin-top:2px;}

/* Swipe container */
.swipe-wrap{position:relative;overflow:hidden;border-radius:16px;margin-bottom:10px;}
.swipe-inner{transition:transform .25s cubic-bezier(.4,0,.2,1);touch-action:pan-y;}
.swipe-actions{position:absolute;top:0;right:0;bottom:0;display:flex;align-items:center;padding:0 12px;gap:6px;background:linear-gradient(270deg,#ff4d4d22,transparent);}

/* Compact mini-boxes */
.mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;}
.mbox{background:var(--bg);border:1px solid var(--muted2);border-radius:8px;padding:7px 10px;}
.mlbl{font-size:8px;color:var(--muted);font-weight:700;margin-bottom:2px;}
.mval{font-size:11px;font-weight:700;color:var(--text);}
.mval.ng{color:var(--ng);text-shadow:0 0 8px rgba(0,255,136,.3);}

/* Compact payment */
.psec{background:var(--bg);border-radius:8px;padding:8px 10px;border:1px solid var(--muted2);margin-top:6px;}
.pbar{height:2px;background:var(--muted2);border-radius:4px;margin:5px 0 7px;overflow:hidden;}
.pfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ng),#00ffcc);transition:width .6s cubic-bezier(.4,0,.2,1);box-shadow:0 0 8px var(--ng-glow);}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
.pitem{background:var(--surface);border-radius:7px;padding:6px 8px;border:1px solid var(--muted2);display:flex;justify-content:space-between;align-items:center;gap:5px;}
.ptog{padding:3px 7px;border-radius:5px;border:1px solid;font-size:9px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .2s;white-space:nowrap;}
.ptog.ok{background:rgba(0,255,136,.08);color:var(--ng);border-color:rgba(0,255,136,.3);}
.ptog.no{background:var(--surface2);color:var(--muted);border-color:var(--muted2);}

/* Video progress */
.vpsec{background:var(--bg);border-radius:8px;padding:8px 10px;border:1px solid var(--muted2);margin-top:6px;}
.vpbar{height:2px;background:var(--muted2);border-radius:4px;margin:5px 0 7px;overflow:hidden;}
.vpfill{height:100%;border-radius:4px;background:linear-gradient(90deg,#7c6eff,#a78bfa);transition:width .6s cubic-bezier(.4,0,.2,1);box-shadow:0 0 8px rgba(124,110,255,.4);}
.vp-btns{display:flex;gap:4px;flex-wrap:wrap;}
.vp-btn{padding:3px 8px;border-radius:5px;border:1px solid #7c6eff44;background:#7c6eff11;color:#a78bfa;font-size:9px;font-weight:800;cursor:pointer;font-family:var(--font);transition:all .2s;}
.vp-btn:hover{background:#7c6eff22;border-color:#7c6eff88;}
.vp-btn.rst{border-color:#ff4d4d44;background:#ff4d4d11;color:#ff4d4d;}

/* Modal */
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
.finp[readonly]{color:var(--muted);cursor:default;}
.fta{min-height:65px;resize:vertical;}
.fsel option{background:var(--surface);}
.fck{display:flex;align-items:center;gap:8px;cursor:pointer;}
.fck input{accent-color:var(--ng);width:15px;height:15px;}
.fck label{font-size:12px;color:var(--muted);cursor:pointer;}

.dur-btns{display:flex;gap:6px;}
.dur-btn{flex:1;padding:7px 6px;border-radius:8px;border:1px solid var(--muted2);background:var(--bg);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;text-align:center;}
.dur-btn.on{background:var(--ng-faint);color:var(--ng);border-color:var(--ng-border);}

.sb{background:var(--surface);border:1px solid var(--muted2);border-radius:11px;padding:10px 14px;color:var(--text);font-size:13px;font-family:var(--font);outline:none;width:100%;transition:border-color .2s,box-shadow .2s;}
.sb:focus{border-color:var(--ng);box-shadow:0 0 14px var(--ng-faint);}
.sb::placeholder{color:var(--muted);}
.sb-wrap{position:relative;margin-bottom:12px;}
.sb-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;}

.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
.tab{padding:7px 12px;border-radius:9px;border:1px solid var(--muted2);background:var(--surface);color:var(--muted);cursor:pointer;font-family:var(--font);font-size:11px;font-weight:700;transition:all .2s;}
.tab.on{background:var(--ng-faint);color:var(--ng);border-color:var(--ng-border);box-shadow:0 0 10px var(--ng-faint);}

.alr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;margin-bottom:8px;font-size:12px;font-weight:700;border:1px solid;border-right-width:3px;animation:fu .3s;}
.au{background:rgba(255,77,77,.05);border-color:#ff4d4d33;border-right-color:#ff4d4d;color:#ff4d4d;}
.aw{background:rgba(255,214,0,.05);border-color:#ffd60033;border-right-color:#ffd600;color:#ffd600;}

.clic{background:var(--surface);border:1px solid var(--muted2);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;transition:all .22s;cursor:pointer;}
.clic:hover{border-color:var(--ng-border);transform:translateX(-3px);box-shadow:0 4px 20px var(--ng-faint);}
.cav{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--ng-border);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:var(--ng);background:var(--ng-faint);flex-shrink:0;box-shadow:0 0 14px var(--ng-faint);}
.lmark{width:38px;height:38px;border-radius:11px;border:1.5px solid var(--ng-border);background:var(--ng-faint);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:var(--ng);box-shadow:0 0 16px var(--ng-faint);}
.empty{text-align:center;padding:60px 16px;color:var(--muted);}

.cv-wrap{background:#fff;color:#111;padding:32px 40px;font-family:'Tajawal',sans-serif;direction:rtl;font-size:14px;line-height:1.9;}

/* Status history */
.hist-line{display:flex;align-items:flex-start;gap:10px;padding:6px 0;position:relative;}
.hist-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.hist-line::before{content:'';position:absolute;right:3.5px;top:18px;bottom:-6px;width:1px;background:var(--muted2);}
.hist-line:last-child::before{display:none;}

/* Global search */
.gsearch-wrap{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);display:flex;flex-direction:column;padding:20px 14px;}
.gsearch-inp{background:var(--surface2);border:1.5px solid var(--ng-border);border-radius:14px;padding:14px 18px;color:var(--text);font-size:16px;font-family:var(--font);outline:none;width:100%;box-shadow:0 0 30px var(--ng-glow);}
.gresult{background:var(--surface);border:1px solid var(--muted2);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:12px;}
.gresult:hover{border-color:var(--ng-border);background:var(--ng-faint);}

/* Confirm dialog */
.conf-ov{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);}
.conf-box{background:var(--surface);border:1px solid #ff4d4d44;border-radius:18px;padding:24px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 40px #ff4d4d22;}

/* File upload */
.file-zone{border:2px dashed var(--muted2);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;}
.file-zone:hover,.file-zone.drag{border-color:var(--ng-border);background:var(--ng-faint);}
.file-item{background:var(--bg);border:1px solid var(--muted2);border-radius:9px;padding:8px 12px;display:flex;align-items:center;gap:10px;margin-top:8px;}

[data-tip]{position:relative;}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--surface3);color:var(--ng);border:1px solid var(--ng-border);padding:4px 8px;border-radius:7px;font-size:10px;white-space:nowrap;z-index:50;pointer-events:none;}

@media(max-width:500px){.fgrid{grid-template-columns:1fr;}.ffl{grid-column:1;}.pgrid{grid-template-columns:1fr;}.mgrid{grid-template-columns:1fr 1fr;}}
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
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    user_plus: <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    contract_plus: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></>,
    check: <><polyline points="20,6 9,17 4,12"/></>,
    sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    whatsapp: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9 10c0 .6.2 1 .5 1.5L8 14l2.5-1.5c.5.3 1 .5 1.5.5 1.7 0 3-1.3 3-3S13.7 7 12 7 9 8.3 9 10z" strokeWidth="0" fill="currentColor"/></>,
    cancel: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    history: <><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></>,
    upload: <><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    file: <><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></>,
    video: <><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>,
  };
  return <svg style={s} viewBox="0 0 24 24">{p[name] || null}</svg>;
};

const NBox = ({ name, sm }) => (
  <div className={`nbox${sm ? " sm" : ""}`}>
    <Icon name={name} size={sm ? 14 : 18} />
  </div>
);

// ─── Supabase helpers ───────────────────────────────────────────────
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

const toAppCl = r => ({
  id: String(r.id),
  name: r.name || "",
  phone: r.phone || "",
  address: r.address || "",
  notes: r.notes || "",
});

const toDBCl = c => ({
  name: c.name,
  phone: c.phone || "",
  address: c.address || "",
  notes: c.notes || "",
});

// ─── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div className="conf-ov">
      <div className="conf-box">
        <div style={{ fontSize: 32, marginBottom: 12 }}>
          <Icon name="alert" size={36} color="var(--danger)" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, color: "var(--text)" }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn bgh" style={{ flex: 1 }} onClick={onCancel}>إلغاء</button>
          <button className="btn" style={{ flex: 1, background: "#ff4d4d22", color: "var(--danger)", border: "1px solid #ff4d4d44" }} onClick={onConfirm}>تأكيد الحذف</button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────
function GlobalSearch({ contracts, clients, onClose, onViewContract, goToClient }) {
  const [q, setQ] = useState("");
  const inp = useRef();
  useEffect(() => { setTimeout(() => inp.current?.focus(), 100); }, []);

  const results = q.trim().length < 1 ? [] : [
    ...clients.filter(c => c.name.includes(q) || c.phone?.includes(q)).map(c => ({ type: "client", label: c.name, sub: c.phone, id: c.id, obj: c })),
    ...contracts.filter(c => c.clientName.includes(q) || String(c.totalAmount).includes(q) || String(c.videoAmount).includes(q)).map(c => ({ type: "contract", label: c.clientName, sub: `${fmt(c.videoAmount || c.totalAmount, c.currency)} — ${c.videoCount ? c.videoCount + " فيديو" : ""}`, id: c.id, obj: c })),
  ].slice(0, 10);

  return (
    <div className="gsearch-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Icon name="search" size={20} color="var(--ng)" />
        <input ref={inp} className="gsearch-inp" value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن عميل، عقد، مبلغ..." />
        <button className="btn bgh" style={{ padding: "10px 14px", flexShrink: 0 }} onClick={onClose}>إغلاق</button>
      </div>
      {q && results.length === 0 && <div style={{ color: "var(--muted)", textAlign: "center", padding: 30 }}>لا توجد نتائج</div>}
      {results.map((r, i) => (
        <div key={i} className="gresult" onClick={() => { if (r.type === "contract") { onViewContract(r.obj); } else { goToClient(r.id); } onClose(); }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: r.type === "contract" ? "rgba(124,110,255,.15)" : "var(--ng-faint)", border: `1px solid ${r.type === "contract" ? "#7c6eff44" : "var(--ng-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={r.type === "contract" ? "contracts" : "clients"} size={14} color={r.type === "contract" ? "#a78bfa" : "var(--ng)"} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{r.type === "contract" ? "عقد" : "عميل"} · {r.sub}</div>
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
    if (c.endDate) { const d = daysDiff(c.endDate); if (d !== null && d >= 0 && d <= 2) a.push({ id: c.id + "e", msg: `ينتهي ${d === 0 ? "اليوم" : "خلال " + d + " أيام"} — عقد ${c.clientName}`, type: "u" }); }
  });
  if (!a.length) return null;
  return <div style={{ marginBottom: 14 }}>{a.map(x => <div key={x.id} className={`alr ${x.type === "u" ? "au" : "aw"}`}><Icon name="alert" size={13} color="currentColor" />{x.msg}</div>)}</div>;
}

// ─── WhatsApp Button ──────────────────────────────────────────────
function WABtn({ phone }) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("0") ? "218" + clean.slice(1) : clean;
  return (
    <button className="bico wa" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${num}`, "_blank"); }} data-tip="واتساب" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", flexShrink: 0 }}>
      <Icon name="whatsapp" size={13} color="#25D366" />
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
        <div className="mhd">
          <div className="mtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={client ? "edit" : "user_plus"} size={16} />
            {client ? "تعديل عميل" : "عميل جديد"}
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="fgrid">
          <div className="fg ffl"><label className="flbl">اسم العميل / الشركة</label><input className="finp" value={f.name} onChange={e => s("name", e.target.value)} placeholder="الطرف الثاني" /></div>
          <div className="fg ffl"><label className="flbl">رقم الهاتف</label><input className="finp" value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="09..." /></div>
          <div className="fg ffl"><label className="flbl">العنوان</label><input className="finp" value={f.address} onChange={e => s("address", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
        </div>
        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" onClick={() => { if (!f.name) { alert("أدخل الاسم"); return; } onSave({ ...f, id: f.id || null }); }}>حفظ</button>
        </div>
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

  useEffect(() => {
    const v = Number(f.videoAmount || 0), p = Number(f.presenterAmount || 0);
    if (v || p) s("totalAmount", String(v + p));
  }, [f.videoAmount, f.presenterAmount]);

  useEffect(() => { if (f.startDate) s("deposit50Date", f.startDate); }, [f.startDate]);
  useEffect(() => { if (f.endDate) s("final50Date", f.endDate); }, [f.endDate]);

  const handleDur = m => { setDur(m); if (f.startDate) s("endDate", addMonths(f.startDate, m)); };
  const handleStart = v => { s("startDate", v); if (dur && v) s("endDate", addMonths(v, dur)); };
  const pick = c => { setF(p => ({ ...p, clientId: c.id, clientName: c.name, clientPhone: c.phone || "", clientAddress: c.address || "" })); setDrop(false); };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `contracts/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true });
    if (!error) {
      const { data: url } = supabase.storage.from("contracts").getPublicUrl(path);
      s("fileUrl", url.publicUrl);
      s("fileName", file.name);
    }
    setUploading(false);
  };

  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd">
          <div className="mtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={contract ? "edit" : "contract_plus"} size={16} />
            {contract ? "تعديل" : "عقد جديد"}
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>

        {/* Client picker */}
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
              {clients.length === 0 && <div style={{ padding: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>لا يوجد عملاء</div>}
              {clients.map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}
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
          <div className="fg"><label className="flbl">عدد الفيديوهات</label><input className="finp" type="number" value={f.videoCount} onChange={e => s("videoCount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">العملة</label><select className="fsel" value={f.currency} onChange={e => s("currency", e.target.value)}><option value="LYD">دينار ليبي</option><option value="SAR">ريال سعودي</option><option value="AED">درهم إماراتي</option><option value="USD">دولار</option></select></div>
          <div className="fg"><label className="flbl">قيمة الفيديوهات</label><input className="finp" type="number" value={f.videoAmount} onChange={e => s("videoAmount", e.target.value)} /></div>
          <div className="fg"><label className="flbl">قيمة الوجه الإعلامي</label><input className="finp" type="number" value={f.presenterAmount} onChange={e => s("presenterAmount", e.target.value)} /></div>
          <div className="fg ffl"><label className="flbl">إجمالي المبلغ (محسوب تلقائياً)</label><input className="finp" type="number" value={f.totalAmount} readOnly style={{ color: "var(--ng)", fontWeight: 700 }} /></div>
          <div className="fg"><label className="flbl" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="calendar" size={10} color="var(--muted)" />تاريخ البدء</label><input className="finp" type="date" value={f.startDate} onChange={e => handleStart(e.target.value)} /></div>
          <div className="fg"><label className="flbl" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={10} color="var(--muted)" />مدة العقد</label><div className="dur-btns"><button className={`dur-btn${dur === 1 ? " on" : ""}`} onClick={() => handleDur(1)}>شهر</button><button className={`dur-btn${dur === 3 ? " on" : ""}`} onClick={() => handleDur(3)}>3 أشهر</button></div></div>
          <div className="fg"><label className="flbl" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="calendar" size={10} color="var(--muted)" />تاريخ الانتهاء</label><input className="finp" type="date" value={f.endDate} onChange={e => s("endDate", e.target.value)} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الأولى</label><input className="finp" type="date" value={f.deposit50Date} readOnly style={{ color: "var(--muted)" }} /></div>
          <div className="fg"><label className="flbl">موعد الدفعة الثانية</label><input className="finp" type="date" value={f.final50Date} readOnly style={{ color: "var(--muted)" }} /></div>
          <div className="fck"><input type="checkbox" id="d1" checked={f.deposit50Paid} onChange={e => s("deposit50Paid", e.target.checked)} /><label htmlFor="d1">تم استلام الدفعة الأولى</label></div>
          <div className="fck"><input type="checkbox" id="d2" checked={f.final50Paid} onChange={e => s("final50Paid", e.target.checked)} /><label htmlFor="d2">تم استلام الدفعة الثانية</label></div>
          <div className="fg ffl"><label className="flbl">الحالة</label><select className="fsel" value={f.status} onChange={e => s("status", e.target.value)}><option value="pending">معلق</option><option value="active">جارٍ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>

          {/* File upload */}
          <div className="fg ffl">
            <label className="flbl" style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="upload" size={10} color="var(--muted)" />رفع نسخة العقد الموقّعة</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div className={`file-zone${uploading ? " drag" : ""}`} onClick={() => fileRef.current?.click()}>
              {uploading ? <div style={{ color: "var(--ng)", fontSize: 12 }}>جارٍ الرفع...</div> :
                f.fileName ? <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="file" size={14} color="var(--ng)" /><span style={{ fontSize: 12, color: "var(--ng)" }}>{f.fileName}</span></div> :
                  <div style={{ color: "var(--muted)", fontSize: 12 }}><Icon name="upload" size={18} color="var(--muted)" /><div style={{ marginTop: 6 }}>اضغط لرفع الملف</div></div>}
            </div>
          </div>
        </div>

        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" onClick={() => { if (!f.clientName) { alert("اختر عميلاً"); return; } onSave({ ...f, id: f.id || null }); }}>حفظ العقد</button>
        </div>
      </div>
    </div>
  );
}

// ─── Contract View Modal ──────────────────────────────────────────
function ContractViewModal({ c, onClose, onPdfExported }) {
  const ref = useRef();
  const dParts = dateStr => { if (!dateStr) return { d: "", m: "", y: "" }; const dt = new Date(dateStr); return { d: String(dt.getDate()).padStart(2, "0"), m: String(dt.getMonth() + 1).padStart(2, "0"), y: String(dt.getFullYear()) }; };
  const sd = dParts(c.startDate), ed = dParts(c.endDate);
  const cur = c.currency || "LYD";
  const vAmt = c.videoAmount ? `${Number(c.videoAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "__________";
  const pAmt = c.presenterAmount ? `${Number(c.presenterAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "__________";

  const exportPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>عقد - ${c.clientName || ""}</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;background:#fff;padding:34px 46px;font-size:14px;line-height:2;}.sec{font-weight:800;font-size:14px;margin:14px 0 6px;border-right:3px solid #111;padding-right:8px;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 0;}.bx{border:1px solid #ddd;border-radius:8px;padding:11px 13px;}.bl{font-weight:800;font-size:11px;color:#555;margin-bottom:6px;border-right:3px solid #111;padding-right:7px;}.row{display:flex;gap:5px;margin:2px 0;font-size:13px;}.rl{color:#666;min-width:50px;}.rv{font-weight:600;border-bottom:1px solid #ddd;flex:1;}hr{border:none;border-top:2px solid #111;margin:14px 0;}hr.t{border-top:1px solid #ddd;margin:18px 0;}.sg{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;}.s{text-align:center;}.sn{font-size:12px;color:#555;margin-bottom:3px;}.sl{margin-top:36px;border-bottom:1.5px dashed #bbb;}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
    onPdfExported(c.id);
  };

  const pct = Math.round(((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)) * 100);
  const vc = Number(c.videoCount || 0);
  const vd = Number(c.videoDone || 0);

  return (
    <div className="mov" style={{ alignItems: "flex-start", overflowY: "auto" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--ng-border)", borderRadius: 20, width: "100%", maxWidth: 760, margin: "14px 0", overflow: "hidden", boxShadow: "0 0 60px var(--ng-glow)" }}>
        <div style={{ background: "var(--bg)", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--ng-border)" }}>
          <span style={{ color: "var(--ng)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon name="doc" size={14} />تفاصيل العقد</span>
          <div style={{ display: "flex", gap: 8 }}>
            {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn bng" style={{ fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}><Icon name="file" size={12} />عرض نسخة العقد</button></a>}
            <button className="btn bngf" style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }} onClick={exportPDF}><Icon name="doc" size={12} color="#050505" />تصدير PDF</button>
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Details panel */}
        <div style={{ padding: "16px 20px", background: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{c.clientName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{c.videoCount ? `${c.videoCount} فيديو` : ""}</div>
            </div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {[["إجمالي", fmt(c.totalAmount, c.currency)], ["فيديوهات", fmt(c.videoAmount, c.currency)], ["وجه إعلامي", fmt(c.presenterAmount, c.currency)], ["البدء", fmtDate(c.startDate)], ["الانتهاء", fmtDate(c.endDate)], ["الهاتف", c.clientPhone || "—"]].map(([l, v]) => (
              <div key={l} className="mbox"><div className="mlbl">{l}</div><div className="mval" style={{ fontSize: 10 }}>{v}</div></div>
            ))}
          </div>

          {/* Payment progress */}
          <div className="psec">
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الدفع</span><span style={{ fontSize: 10, fontWeight: 800, color: pct === 100 ? "var(--ng)" : "var(--warn)" }}>{pct}%</span></div>
            <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
            <div className="pgrid">
              {[{ label: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date }, { label: "الثانية 50%", paid: c.final50Paid, date: c.final50Date }].map(p => (
                <div key={p.label} className="pitem">
                  <div><div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{p.label}</div><div style={{ fontSize: 11, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>{p.date && <div style={{ fontSize: 9, color: "var(--muted)" }}>{fmtDate(p.date)}</div>}</div>
                  <div style={{ fontSize: 10, color: p.paid ? "var(--ng)" : "var(--muted)", fontWeight: 800 }}>{p.paid ? "✓ مدفوع" : "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Video progress */}
          {vc > 0 && <div className="vpsec" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الفيديوهات المنجزة</span><span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa" }}>{vd} / {vc}</span></div>
            <div className="vpbar"><div className="vpfill" style={{ width: `${(vd / vc) * 100}%` }} /></div>
          </div>}

          {/* Status history */}
          {c.statusHistory && c.statusHistory.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="history" size={11} color="var(--muted)" />سجل الحالات</div>
              {c.statusHistory.map((h, i) => (
                <div key={i} className="hist-line">
                  <div className="hist-dot" style={{ background: SC[h.status] || "var(--muted)" }} />
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: SL[h.status] ? SC[h.status] : "var(--muted)" }}>{SL[h.status] || h.status}</div><div style={{ fontSize: 9, color: "var(--muted)" }}>{new Date(h.date).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>
                </div>
              ))}
            </div>
          )}

          {c.notes && <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", padding: "8px 10px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--muted2)" }}>📝 {c.notes}</div>}
        </div>

        {/* PDF preview content */}
        <div ref={ref} className="cv-wrap" style={{ display: "none" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff", fontSize: 26, fontWeight: 900, width: 56, height: 56, borderRadius: 12, marginBottom: 8 }}>ف</div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>شركة فارق للإنتاج</div>
            <div style={{ color: "#555", fontSize: 12 }}>FAREQ Productions — 0920953918</div>
          </div>
          <hr style={{ border: "none", borderTop: "2px solid #111", margin: "14px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: "#555", marginBottom: 6, borderRight: "3px solid #111", paddingRight: 7 }}>الطرف الأول</div>
              {[["الاسم", "شركة فارق للإنتاج FAREQ productions"], ["الهاتف", "0920953918"]].map(([l, v]) => (<div key={l} style={{ display: "flex", gap: 5, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 50 }}>{l}:</span><span style={{ fontWeight: 600 }}>{v}</span></div>))}
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: "#555", marginBottom: 6, borderRight: "3px solid #111", paddingRight: 7 }}>الطرف الثاني</div>
              {[["الاسم", c.clientName], ["العنوان", c.clientAddress], ["الهاتف", c.clientPhone]].map(([l, v]) => (<div key={l} style={{ display: "flex", gap: 5, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 50 }}>{l}:</span><span style={{ fontWeight: 600, borderBottom: "1px solid #ddd", flex: 1 }}>{v || ""}</span></div>))}
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>موضوع العقد</div>
          <div>يلتزم الطرف الأول بتقديم خدمات إنتاج محتوى فيديو تشمل:</div>
          <div>- تصوير وإنتاج عدد ({c.videoCount || "          "}) فيديوهات</div>
          <div>يلتزم الطرف الثاني بتوفير المعلومات/ المنتجات</div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>مدة العقد:</div>
          <div>مدة العقد تبدأ من تاريخ {sd.d} / {sd.m} / {sd.y} وتنتهي في {ed.d} / {ed.m} / {ed.y}</div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>القيمة المالية وطريقة الدفع:</div>
          <div>- القيمة الخاصة بالفيديوهات: {vAmt} {cur}</div>
          <div>- القيمة الخاصة بالوجه الإعلامي: {pAmt} {cur}</div>
          <div style={{ margin: "10px 0 4px", fontWeight: 700 }}>طريقة الدفع:</div>
          <div>  - 50% مقدماً</div>
          <div>  - 50% عند تسليم آخر فيديو</div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>التعديلات:</div>
          <div>- يحق للعميل طلب تعديل فقط لكل فيديو</div>
          <div>- أي تعديلات إضافية يتم احتسابها بتكلفة إضافية</div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>الإلغاء:</div>
          <div>- لا يحق للعميل الغاء العقد بعد تنفيذ نصف عدد الفيديوهات المتفق عليها</div>
          <div>- في حالة الإلغاء بعد بدء العمل، لا يتم استرجاع الدفعة المقدمة</div>
          <div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>حقوق الاستخدام:</div>
          <div>- يحق للعميل استخدام الفيديوهات لأغراضه التسويقية</div>
          <div>- يحق للطرف الأول استخدام الأعمال في معرض أعماله</div>
          {c.notes && <><div style={{ fontWeight: 800, fontSize: 14, margin: "14px 0 6px", borderRight: "3px solid #111", paddingRight: 8 }}>ملاحظات:</div><div>{c.notes}</div></>}
          <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0 16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {["الطرف الأول — شركة فارق للإنتاج", `الطرف الثاني — ${c.clientName || "___________"}`].map((p, i) => (
              <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>{p}</div><div style={{ fontWeight: 700 }}>التوقيع</div><div style={{ marginTop: 38, borderBottom: "1.5px dashed #bbb" }} /></div>
            ))}
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
  const vc = Number(c.videoCount || 0);
  const vd = Number(c.videoDone || 0);
  const vpct = vc > 0 ? Math.round((vd / vc) * 100) : 0;

  return (
    <div className="cc">
      <div className="cc-h">
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onView(c)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div className="cc-n">{c.clientName || "عميل"}</div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
          <div className="cc-p">{c.videoCount ? `${vd}/${vc} فيديو` : ""}{c.startDate ? ` — ${fmtDate(c.startDate)}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <WABtn phone={c.clientPhone} />
          <button className="bico" onClick={() => onView(c)} data-tip="عرض" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }}><Icon name="doc" size={13} /></button>
          <button className="bico" onClick={() => onEdit(c)} data-tip="تعديل" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }}><Icon name="edit" size={13} /></button>
          <button className="bico cn" onClick={() => onCancel(c.id)} data-tip="إلغاء" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }}><Icon name="cancel" size={13} /></button>
          <button className="bico dx" onClick={() => onDelete(c.id)} data-tip="حذف" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--muted2)", color: "#ff4d4d", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }}><Icon name="trash" size={13} color="#ff4d4d" /></button>
        </div>
      </div>
      <div className="cc-b">
        <div className="mgrid">
          <div className="mbox"><div className="mlbl">الإجمالي</div><div className="mval ng" style={{ fontSize: 10 }}>{fmt(c.totalAmount, c.currency)}</div></div>
          <div className="mbox"><div className="mlbl">البدء</div><div className="mval" style={{ fontSize: 10 }}>{fmtDate(c.startDate) || "—"}</div></div>
          <div className="mbox"><div className="mlbl">الانتهاء</div><div className="mval" style={{ fontSize: 10, color: c.endDate && daysDiff(c.endDate) <= 2 && daysDiff(c.endDate) >= 0 ? "var(--danger)" : "var(--text)" }}>{fmtDate(c.endDate) || "—"}</div></div>
        </div>

        {/* Payment compact */}
        <div className="psec">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>الدفع</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: pct === 100 ? "var(--ng)" : "var(--warn)" }}>{pct}%</span>
          </div>
          <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
          <div className="pgrid">
            {[{ label: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date, field: "deposit50Paid", diff: null }, { label: "الثانية 50%", paid: c.final50Paid, date: c.final50Date, field: "final50Paid", diff: f50d }].map(p => (
              <div key={p.field} className="pitem">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>
                  {p.date && <div style={{ fontSize: 9, color: !p.paid && p.diff !== null && p.diff <= 7 && p.diff >= 0 ? "var(--warn)" : "var(--muted)" }}>{fmtDate(p.date)}{!p.paid && p.diff !== null && p.diff <= 7 && p.diff >= 0 && ` (${p.diff === 0 ? "اليوم!" : p.diff + "ي"})`}</div>}
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
              <span style={{ fontSize: 10, fontWeight: 800, color: vpct === 100 ? "var(--ng)" : "#a78bfa" }}>{vd}/{vc}</span>
            </div>
            <div className="vpbar"><div className="vpfill" style={{ width: `${vpct}%` }} /></div>
            <div className="vp-btns">
              {[1, 2, 3].map(n => (
                <button key={n} className="vp-btn" onClick={() => onVideoUpdate(c.id, Math.min(vc, vd + n))}>+{n}</button>
              ))}
              <button className="vp-btn rst" onClick={() => onVideoUpdate(c.id, 0)}>صفر</button>
            </div>
          </div>
        )}
      </div>
      {c.notes && <div style={{ fontSize: 10, color: "var(--muted)", padding: "5px 14px 10px", borderTop: "1px solid var(--muted2)", display: "flex", gap: 5 }}><Icon name="doc" size={10} />{c.notes}</div>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────
function Dashboard({ contracts, clients, goTo, onViewContract }) {
  const collected = contracts.reduce((s, c) => s + Number(c.videoAmount || 0) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)), 0);
  const recent = [...contracts].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 3);
  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div className="lmark">F</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "var(--ng)", textShadow: "0 0 18px var(--ng-glow)" }}>فارق للإنتاج</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>FAREQ Productions</div>
        </div>
      </div>
      <Alerts contracts={contracts} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div className="stat" style={{ gridColumn: "1/-1" }}>
          <div className="slbl"><Icon name="income" size={13} color="var(--ng)" />إجمالي المحصّل</div>
          <div className="sval sm">{fmt(collected)}</div>
        </div>
        {[
          { l: "العقود", v: contracts.length, icon: "contracts" },
          { l: "نشطة", v: contracts.filter(c => c.status === "active").length, icon: "check" },
          { l: "معلقة", v: contracts.filter(c => c.status === "pending").length, icon: "clock" },
          { l: "العملاء", v: clients.length, icon: "clients" }
        ].map(s => (
          <div key={s.l} className="stat">
            <div className="slbl"><Icon name={s.icon} size={13} color="var(--ng)" />{s.l}</div>
            <div className="sval">{s.v}</div>
          </div>
        ))}
      </div>
      {recent.length > 0 && <>
        <div className="sh" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>آخر العقود</span>
          <span style={{ cursor: "pointer", color: "var(--ng)", fontSize: 10, fontWeight: 700 }} onClick={() => goTo("contracts")}>عرض الكل ←</span>
        </div>
        {recent.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onViewContract(c)}>
            <NBox name="contracts" sm />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.clientName}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.videoCount ? `${c.videoCount} فيديو — ` : ""}{fmt(c.videoAmount || c.totalAmount, c.currency)}</div>
            </div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
        ))}
      </>}
      {contracts.length === 0 && <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: .35 }}><Icon name="contracts" size={44} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)" }}>ابدأ بإضافة أول عقد</div></div>}
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
  const filtered = [...contracts].sort((a, b) => Number(b.id) - Number(a.id)).filter(c => {
    if (filter === "all") return c.status !== "completed" && c.status !== "cancelled";
    return c.status === filter;
  }).filter(c => !search || c.clientName?.includes(search));

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div><div className="pt">العقود</div><div className="ps">{contracts.length} عقد</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="contract_plus" size={14} color="#050505" />جديد</button>
      </div>
      <div className="sb-wrap">
        <span className="sb-ico"><Icon name="search" size={15} color="var(--muted)" /></span>
        <input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 36 }} />
      </div>
      <div className="tabs">{tabs.map(t => (<button key={t.key} className={`tab${filter === t.key ? " on" : ""}`} onClick={() => setFilter(t.key)}>{t.label}{t.count > 0 && <span style={{ marginRight: 5, background: filter === t.key ? "var(--ng)" : "var(--muted2)", color: filter === t.key ? "#050505" : "var(--muted)", borderRadius: 20, padding: "0 5px", fontSize: 9, fontWeight: 900 }}>{t.count}</span>}</button>))}</div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: .35 }}><Icon name="contracts" size={44} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 14 }}>{contracts.length === 0 ? "لا توجد عقود" : "لا توجد نتائج"}</div>{contracts.length === 0 && <button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(c => <ContractCard key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView} onVideoUpdate={onVideoUpdate} onCancel={onCancel} />)}
    </div>
  );
}

// ─── Clients Screen ───────────────────────────────────────────────
function ClientsScreen({ clients, contracts, onAdd, onEdit, onDelete, initialSel }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(initialSel || null);
  const filtered = clients.filter(c => !search || c.name.includes(search) || c.phone?.includes(search));

  useEffect(() => { if (initialSel) setSel(initialSel); }, [initialSel]);

  if (sel) {
    const cl = clients.find(c => c.id === sel);
    if (!cl) { setSel(null); return null; }
    const clc = contracts.filter(c => c.clientId === cl.id);
    return (
      <div className="screen">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="btn bgh" style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setSel(null)}><Icon name="back" size={13} color="var(--muted)" />رجوع</button>
          <div className="pt">{cl.name}</div>
        </div>
        <div className="card card-gl" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div className="cav" style={{ width: 54, height: 54, fontSize: 22 }}>{cl.name[0]}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 900 }}>{cl.name}</div></div>
            <WABtn phone={cl.phone} />
          </div>
          {[["📞", cl.phone], ["📍", cl.address], ["📝", cl.notes]].filter(([, v]) => v).map(([i, v]) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--muted2)", fontSize: 13 }}><span style={{ fontSize: 14 }}>{i}</span><span style={{ color: "var(--muted)", flex: 1 }}>{v}</span></div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn bng" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }} onClick={() => onEdit(cl)}><Icon name="edit" size={13} />تعديل</button>
            <button className="btn bgh" style={{ color: "var(--danger)", borderColor: "#ff4d4d33", display: "flex", alignItems: "center", gap: 6 }} onClick={() => { if (confirm("حذف العميل؟")) { onDelete(cl.id); setSel(null); } }}><Icon name="trash" size={13} color="var(--danger)" />حذف</button>
          </div>
        </div>
        <div className="sh">عقوده ({clc.length})</div>
        {clc.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>لا توجد عقود</div>}
        {clc.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <NBox name="contracts" sm /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{c.videoCount ? `${c.videoCount} فيديو` : "عقد"}</div><div style={{ fontSize: 11, color: "var(--ng)", fontWeight: 700 }}>{fmt(c.videoAmount || c.totalAmount, c.currency)}</div></div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div><div className="pt">العملاء</div><div className="ps">{clients.length} عميل</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="user_plus" size={14} color="#050505" />عميل</button>
      </div>
      <div className="sb-wrap">
        <span className="sb-ico"><Icon name="search" size={15} color="var(--muted)" /></span>
        <input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 36 }} />
      </div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: .35 }}><Icon name="clients" size={44} color="var(--muted)" /></div><div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 14 }}>{clients.length === 0 ? "أضف أول عميل" : "لا نتائج"}</div>{clients.length === 0 && <button className="btn bng" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(cl => (
          <div key={cl.id} className="clic" onClick={() => setSel(cl.id)}>
            <div className="cav">{cl.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{cl.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{[cl.phone, `${contracts.filter(c => c.clientId === cl.id).length} عقد`].filter(Boolean).join(" · ")}</div>
            </div>
            <WABtn phone={cl.phone} />
          </div>
        ))}
    </div>
  );
}

// ─── Income Screen ────────────────────────────────────────────────
function IncomeScreen({ contracts }) {
  const videoOnly = c => Number(c.videoAmount || 0);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const last30 = contracts.filter(c => c.startDate && new Date(c.startDate) >= thirtyDaysAgo).reduce((s, c) => s + videoOnly(c), 0);
  const yearT = contracts.filter(c => c.startDate && new Date(c.startDate).getFullYear() === now.getFullYear()).reduce((s, c) => s + videoOnly(c), 0);
  const allCollected = contracts.reduce((s, c) => s + videoOnly(c) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)), 0);
  const pend = contracts.filter(c => c.status !== "cancelled").reduce((s, c) => s + videoOnly(c) * ((!c.deposit50Paid ? 0.5 : 0) + (!c.final50Paid ? 0.5 : 0)), 0);
  const totalContracts = contracts.reduce((s, c) => s + videoOnly(c), 0);
  const activeTotal = contracts.filter(c => c.status === "active").reduce((s, c) => s + videoOnly(c), 0);

  return (
    <div className="screen">
      <div style={{ marginBottom: 20 }}><div className="pt">الدخل</div><div className="ps">التحليل المالي — الفيديوهات فقط</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { l: "آخر 30 يوم", v: fmt(last30), icon: "clock" },
          { l: `${now.getFullYear()}`, v: fmt(yearT), icon: "income" },
          { l: "محصّل", v: fmt(allCollected), icon: "check" },
          { l: "متوقع", v: fmt(pend), icon: "calendar" },
          { l: "إجمالي العقود", v: fmt(totalContracts), icon: "contracts" },
          { l: "العقود النشطة", v: fmt(activeTotal), icon: "contracts" },
        ].map(s => (
          <div key={s.l} className="stat">
            <div className="slbl"><Icon name={s.icon} size={13} color="var(--ng)" />{s.l}</div>
            <div className="sval sm">{s.v}</div>
          </div>
        ))}
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
  const [confirm, setConfirm] = useState(null); // {msg, onConfirm}
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

  const addStatusHistory = (c, newStatus) => {
    if (c.status === newStatus) return c.statusHistory || [];
    return [...(c.statusHistory || []), { status: newStatus, date: new Date().toISOString() }];
  };

  const saveContract = async (c) => {
    const history = addStatusHistory(c, c.status);
    const data2save = { ...c, statusHistory: history };
    if (c.id) {
      const { data } = await supabase.from("contracts").update(toDB(data2save)).eq("id", c.id).select().single();
      if (data) setContracts(p => p.map(x => x.id === c.id ? toApp(data) : x));
    } else {
      const initHistory = [{ status: c.status, date: new Date().toISOString() }];
      const { data } = await supabase.from("contracts").insert(toDB({ ...c, statusHistory: initHistory })).select().single();
      if (data) setContracts(p => [toApp(data), ...p]);
    }
    setCm(null);
  };

  const delContract = (id) => {
    setConfirm({ msg: "هل تريد حذف هذا العقد نهائياً؟", onConfirm: async () => { await supabase.from("contracts").delete().eq("id", id); setContracts(p => p.filter(c => c.id !== id)); setConfirm(null); } });
  };

  const cancelContract = async (id) => {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    const history = addStatusHistory(c, "cancelled");
    const updated = { ...c, status: "cancelled", statusHistory: history };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const togglePay = async (id, field) => {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    const updated = { ...c, [field]: !c[field] };
    if (updated.deposit50Paid && updated.final50Paid) {
      updated.status = "completed";
      updated.statusHistory = addStatusHistory(c, "completed");
    }
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const updateVideoDone = async (id, count) => {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    const updated = { ...c, videoDone: count };
    if (count >= Number(c.videoCount) && Number(c.videoCount) > 0) {
      updated.status = "completed";
      updated.statusHistory = addStatusHistory(c, "completed");
    }
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const handlePdfExported = async (id) => {
    const c = contracts.find(x => x.id === id);
    if (!c) return;
    const history = addStatusHistory(c, "active");
    const updated = { ...c, deposit50Paid: true, status: "active", statusHistory: history };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const saveClient = async (c) => {
    if (c.id) {
      const { data } = await supabase.from("clients").update(toDBCl(c)).eq("id", c.id).select().single();
      if (data) setClients(p => p.map(x => x.id === c.id ? toAppCl(data) : x));
    } else {
      const { data } = await supabase.from("clients").insert(toDBCl(c)).select().single();
      if (data) setClients(p => [toAppCl(data), ...p]);
    }
    setClm(null);
  };

  const delClient = async (id) => {
    await supabase.from("clients").delete().eq("id", id);
    setClients(p => p.filter(c => c.id !== id));
  };

  const goToClient = (id) => { setSelClient(id); setTab("clients"); };
  const goTo = (t) => setTab(t);

  const nav = [
    { key: "dashboard", label: "الرئيسية", icon: "dashboard" },
    { key: "clients", label: "العملاء", icon: "clients" },
    { key: "contracts", label: "العقود", icon: "contracts" },
    { key: "income", label: "الدخل", icon: "income" },
  ];

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "var(--bg)", flexDirection: "column", gap: 14 }}>
        <div className="lmark" style={{ width: 52, height: 52, fontSize: 22 }}>F</div>
        <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>جارٍ التحميل...</div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        {tab === "dashboard" && <Dashboard contracts={contracts} clients={clients} goTo={goTo} onViewContract={setVm} />}
        {tab === "contracts" && <ContractsScreen contracts={contracts} clients={clients} onAdd={() => setCm("new")} onEdit={setCm} onDelete={delContract} onToggle={togglePay} onView={setVm} onVideoUpdate={updateVideoDone} onCancel={cancelContract} />}
        {tab === "clients" && <ClientsScreen clients={clients} contracts={contracts} onAdd={() => setClm("new")} onEdit={c => setClm(c)} onDelete={delClient} initialSel={selClient} />}
        {tab === "income" && <IncomeScreen contracts={contracts} />}

        <nav className="bnav">
          {/* Search button */}
          <div className="bni" onClick={() => setShowSearch(true)}>
            <div className="bni-ico"><Icon name="search" size={20} color="var(--muted)" /></div>
            <div className="bni-lbl">بحث</div>
          </div>
          {nav.map(n => (
            <div key={n.key} className={`bni${tab === n.key ? " on" : ""}`} onClick={() => { setTab(n.key); if (n.key !== "clients") setSelClient(null); }}>
              <div className="bni-ico"><Icon name={n.icon} size={20} color={tab === n.key ? "var(--ng)" : "var(--muted)"} /></div>
              <div className="bni-lbl">{n.label}</div>
            </div>
          ))}
          {/* Theme toggle */}
          <div className="bni" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            <div className="bni-ico"><Icon name={theme === "dark" ? "sun" : "moon"} size={20} color="var(--muted)" /></div>
            <div className="bni-lbl">{theme === "dark" ? "فاتح" : "داكن"}</div>
          </div>
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