import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseclient";

const fmt = (n, cur = "LYD") => { const x = Number(n); if (!x) return `0.00 ${cur}`; return `${x.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${cur}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" }) : "";
const daysDiff = d => { if (!d) return null; const t = new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };
const addMonths = (dateStr, months) => { const d = new Date(dateStr); d.setMonth(d.getMonth()+months); return d.toISOString().split("T")[0]; };
const NOW = new Date();
const CREDENTIALS = { user: "fahed", pass: "771997" };

const SL = { active:"جارٍ", pending:"معلق", completed:"مكتمل", cancelled:"ملغي" };
const SC = { active:"#00ff88", pending:"#ffd600", completed:"#a78bfa", cancelled:"#ff4d4d" };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root {
  --bg: #f0f2f7; --surface: #ffffff; --surface2: #e8ebf4; --surface3: #dde1ef;
  --ac: #00c96e; --ac2: #00a85a; --ac-glow: rgba(0,201,110,0.25); --ac-faint: rgba(0,201,110,0.10); --ac-border: rgba(0,201,110,0.35);
  --text: #0d1b2a; --text2: #4a5568; --muted: #94a3b8; --muted2: #e2e8f0;
  --danger: #ff4d6d; --warn: #f59e0b; --card-border: rgba(255,255,255,0.8); --card-gap: 10px; --font: 'Tajawal', sans-serif;
  --grad-card: linear-gradient(135deg, #1a2340 0%, #0f1829 60%, #0a1020 100%);
  --grad-accent: linear-gradient(135deg, #00ff88, #00c96e);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
  --shadow-float: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
  --shadow-inner: inset 0 2px 8px rgba(0,0,0,0.06); --nav-bg: rgba(255,255,255,0.95);
}
[data-theme="dark"] {
  --bg: #0a0f1e; --surface: #111827; --surface2: #1a2340; --surface3: #1e2a4a;
  --ac: #00ff88; --ac2: #00e07a; --ac-glow: rgba(0,255,136,0.30); --ac-faint: rgba(0,255,136,0.08); --ac-border: rgba(0,255,136,0.35);
  --text: #f0f4ff; --text2: #94a3b8; --muted: #4a5568; --muted2: #1e2a4a;
  --danger: #ff4d6d; --warn: #fbbf24; --card-border: rgba(255,255,255,0.06);
  --grad-card: linear-gradient(135deg, #1e2d50 0%, #151f38 60%, #0f1829 100%);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-float: 0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4);
  --shadow-inner: inset 0 2px 8px rgba(0,0,0,0.3); --nav-bg: rgba(10,15,30,0.97);
}
html,body { background: var(--bg); color: var(--text); font-family: var(--font); direction: rtl; height: 100%; transition: background .3s, color .3s; }
::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--ac-border); border-radius: 4px; }
.app { display: flex; flex-direction: column; height: 100dvh; background: var(--bg); overflow: hidden; }
.screen { flex: 1; overflow-y: auto; padding: 0 14px 90px; animation: fu .3s cubic-bezier(.4,0,.2,1); }
@keyframes fu { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px var(--ac-glow); } 50% { box-shadow: 0 0 40px var(--ac-glow), 0 0 60px var(--ac-glow); } }
@keyframes expandCard { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: none; } }
.hero-card { background: linear-gradient(135deg, #0f1e3a 0%, #0a1428 50%, #060e1f 100%); border-radius: 24px; padding: 24px 20px 20px; margin: 14px 0 16px; position: relative; overflow: hidden; box-shadow: var(--shadow-float), 0 0 40px rgba(0,201,110,0.15); border: 1px solid rgba(0,255,136,0.12); }
.hero-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%); border-radius: 50%; }
.hero-card::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; background: radial-gradient(circle, rgba(0,150,255,0.08) 0%, transparent 70%); border-radius: 50%; }
.hero-lbl { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 500; margin-bottom: 6px; letter-spacing: 0.5px; }
.hero-amount { font-size: 34px; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 4px; }
.hero-change { font-size: 11px; color: var(--ac); font-weight: 600; display: flex; align-items: center; gap: 4px; }
.quick-actions { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-top: 20px; position: relative; z-index: 1; }
.qa-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 12px 6px; cursor: pointer; transition: all .2s; backdrop-filter: blur(10px); }
.qa-btn:hover { background: rgba(0,255,136,0.15); border-color: rgba(0,255,136,0.3); transform: translateY(-2px); }
.qa-btn:active { transform: scale(.96); }
.qa-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.qa-lbl { font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 600; }
.tx-card { background: var(--surface); border: 1px solid var(--card-border); border-radius: 16px; padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-card); transition: all .2s; cursor: pointer; position: relative; overflow: hidden; }
.tx-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,255,136,0.02), transparent); opacity: 0; transition: opacity .2s; }
.tx-card:hover::before { opacity: 1; }
.tx-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-float); border-color: var(--ac-border); }
.tx-icon { width: 44px; height: 44px; border-radius: 13px; background: linear-gradient(135deg, var(--surface2), var(--surface3)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.tx-name { font-size: 13px; font-weight: 600; color: var(--text); }
.tx-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
.tx-amt { font-size: 13px; font-weight: 700; } .tx-amt.pos { color: var(--ac); } .tx-amt.neg { color: var(--danger); }
.sec-hdr { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 10px; }
.sec-title { font-size: 15px; font-weight: 800; color: var(--text); }
.sec-link { font-size: 11px; color: var(--ac); font-weight: 700; cursor: pointer; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px; }
.stat-card { background: var(--surface); border: 1px solid var(--card-border); border-radius: 18px; padding: 16px; box-shadow: var(--shadow-card); transition: all .25s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-float); }
.stat-card.wide { grid-column: 1/-1; }
.stat-lbl { font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.stat-val { font-size: 18px; font-weight: 800; color: var(--text); } .stat-val.ac { color: var(--ac); } .stat-val.sm { font-size: 14px; }
.bnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: var(--nav-bg); backdrop-filter: blur(24px) saturate(180%); border-top: 1px solid var(--card-border); display: flex; align-items: center; padding: 6px 8px max(6px, env(safe-area-inset-bottom)); box-shadow: 0 -8px 32px rgba(0,0,0,0.12); gap: 4px; }
.bni { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 7px 6px; border-radius: 14px; transition: all .2s; flex: 1; position: relative; }
.bni:hover { background: var(--ac-faint); }
.bni-lbl { font-size: 9px; color: var(--muted); font-weight: 700; transition: color .2s; }
.bni.on .bni-lbl { color: var(--ac); }
.bni-fab { width: 50px; height: 50px; border-radius: 16px; background: linear-gradient(135deg, #00ff88, #00c96e); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,201,110,0.5), 0 0 0 4px rgba(0,201,110,0.15); margin-bottom: 2px; transition: all .2s; cursor: pointer; animation: pulse-glow 3s ease-in-out infinite; }
.bni-fab:hover { transform: scale(1.08); } .bni-fab:active { transform: scale(.95); }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 14px 0; gap: 10px; }
.tb-btn { width: 38px; height: 38px; border-radius: 12px; background: var(--surface); border: 1px solid var(--card-border); color: var(--text2); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; box-shadow: var(--shadow-card); }
.tb-btn:hover { border-color: var(--ac-border); color: var(--ac); }
.card { background: var(--surface); border: 1px solid var(--card-border); border-radius: 18px; padding: 14px; box-shadow: var(--shadow-card); margin-bottom: var(--card-gap); transition: all .25s; }
.card:hover { box-shadow: var(--shadow-float); border-color: var(--ac-border); }
.cc { background: var(--surface); border: 1px solid var(--card-border); border-radius: 16px; overflow: hidden; margin-bottom: 8px; box-shadow: var(--shadow-card); transition: all .25s; }
.cc:hover { box-shadow: var(--shadow-float); border-color: var(--ac-border); }
.cc-compact { padding: 11px 14px; display: flex; align-items: center; gap: 12px; }
.cc-compact-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--surface2); display: flex; align-items: center; justify-content: center; border: 1px solid var(--card-border); flex-shrink: 0; }
.cc-compact-body { flex: 1; min-width: 0; }
.cc-compact-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-compact-sub { font-size: 10px; color: var(--muted); margin-top: 1px; font-weight: 500; }
.cc-compact-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.cc-compact-amt { font-size: 12px; font-weight: 800; color: var(--ac); }
.cc-expand-btn { width: 26px; height: 26px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--card-border); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; flex-shrink: 0; color: var(--muted); }
.cc-expand-btn:hover { border-color: var(--ac-border); color: var(--ac); }
.cc-expand-btn svg { transition: transform .25s cubic-bezier(.4,0,.2,1); }
.cc-expand-btn.open svg { transform: rotate(180deg); }
.cc-expanded { animation: expandCard .22s cubic-bezier(.4,0,.2,1); border-top: 1px solid var(--muted2); padding: 10px 14px 14px; }
.cc-actions { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.cc-h { padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cc-b { padding: 4px 14px 12px; }
.cc-n { font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-sub { font-size: 10px; color: var(--muted); margin-top: 2px; font-weight: 500; }
.amt-box { background: var(--surface2); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--card-border); }
.amt-lbl { font-size: 9px; color: var(--muted); font-weight: 600; }
.amt-val { font-size: 14px; font-weight: 800; color: var(--ac); }
.psec { background: var(--surface2); border-radius: 12px; padding: 10px 12px; border: 1px solid var(--card-border); margin-top: 6px; }
.pbar { height: 4px; background: var(--muted2); border-radius: 4px; margin: 6px 0 8px; overflow: hidden; }
.pfill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--ac), #00ffcc); transition: width .5s cubic-bezier(.4,0,.2,1); box-shadow: 0 0 8px var(--ac-glow); }
.pgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.pgrid-full { display: grid; grid-template-columns: 1fr; gap: 7px; }
.pitem { background: var(--surface); border-radius: 10px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 6px; border: 1px solid var(--card-border); box-shadow: var(--shadow-card); }
.ptog { padding: 4px 10px; border-radius: 7px; border: none; font-size: 9px; font-weight: 800; cursor: pointer; font-family: var(--font); transition: all .2s; white-space: nowrap; }
.ptog.ok { background: rgba(0,255,136,0.15); color: var(--ac); } .ptog.no { background: var(--surface2); color: var(--muted); }
.vpsec { background: var(--surface2); border-radius: 12px; padding: 10px 12px; border: 1px solid var(--card-border); margin-top: 8px; }
.vpbar { height: 4px; background: var(--muted2); border-radius: 4px; margin: 6px 0 8px; overflow: hidden; }
.vpfill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--ac), #00ffcc); transition: width .5s cubic-bezier(.4,0,.2,1); }
.vp-btn { padding: 6px 18px; border-radius: 8px; border: none; background: linear-gradient(135deg, var(--ac), var(--ac2)); color: #000; font-size: 11px; font-weight: 800; cursor: pointer; font-family: var(--font); transition: all .2s; box-shadow: 0 3px 12px var(--ac-glow); }
.vp-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 18px var(--ac-glow); } .vp-btn:active { transform: scale(.96); }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 9px; font-weight: 800; border: 1px solid; }
.badge::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 12px; border: none; cursor: pointer; font-family: var(--font); font-size: 13px; font-weight: 700; transition: all .2s; }
.btn:hover { transform: translateY(-1px); } .btn:active { transform: scale(.97); }
.bng { background: var(--surface); color: var(--text); border: 1px solid var(--card-border); box-shadow: var(--shadow-card); }
.bng:hover { border-color: var(--ac-border); color: var(--ac); }
.bngf { background: linear-gradient(135deg, var(--ac), var(--ac2)); color: #000; font-weight: 800; box-shadow: 0 4px 20px var(--ac-glow); }
.bngf:hover { box-shadow: 0 6px 28px var(--ac-glow); }
.bgh { background: var(--surface2); color: var(--muted); border: 1px solid var(--card-border); }
.bgh:hover { color: var(--text); }
.btn-danger { background: rgba(255,77,109,0.12); color: var(--danger); border: 1px solid rgba(255,77,109,0.2); }
.ico-btn { width: 32px; height: 32px; border-radius: 9px; background: var(--surface2); border: 1px solid var(--card-border); color: var(--text2); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; flex-shrink: 0; box-shadow: var(--shadow-card); }
.ico-btn:hover { color: var(--ac); border-color: var(--ac-border); }
.ico-btn.red:hover { color: var(--danger); border-color: rgba(255,77,109,0.3); }
.ico-btn.wa:hover { color: #25D366; border-color: rgba(37,211,102,0.3); }
.mov { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 14px; backdrop-filter: blur(12px); }
.mod { background: var(--surface); border: 1px solid var(--card-border); border-radius: 24px; width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto; padding: 24px; box-shadow: var(--shadow-float), 0 0 60px var(--ac-glow); animation: fu .25s cubic-bezier(.4,0,.2,1); }
.mhd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.mtitle { font-size: 17px; font-weight: 900; color: var(--text); display: flex; align-items: center; gap: 8px; }
.mclose { width: 30px; height: 30px; border-radius: 9px; background: var(--surface2); border: 1px solid var(--card-border); color: var(--muted); font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; }
.mclose:hover { color: var(--danger); border-color: rgba(255,77,109,0.3); }
.mft { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--muted2); }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ffl { grid-column: 1/-1; } .fg { display: flex; flex-direction: column; gap: 5px; }
.flbl { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: .3px; }
.finp,.fsel,.fta { background: var(--surface2); border: 1px solid var(--card-border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; font-family: var(--font); outline: none; transition: all .2s; width: 100%; }
.finp:focus,.fsel:focus,.fta:focus { border-color: var(--ac-border); box-shadow: 0 0 0 3px var(--ac-faint); }
.finp[readonly] { color: var(--muted); cursor: default; }
.fta { min-height: 60px; resize: vertical; } .fsel option { background: var(--surface); }
.fck { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.fck input { accent-color: var(--ac); width: 15px; height: 15px; }
.fck label { font-size: 12px; color: var(--text2); cursor: pointer; font-weight: 500; }
.dur-btns { display: flex; gap: 6px; }
.dur-btn { flex: 1; padding: 9px 5px; border-radius: 10px; border: 1px solid var(--card-border); background: var(--surface2); color: var(--muted); cursor: pointer; font-family: var(--font); font-size: 12px; font-weight: 700; transition: all .2s; text-align: center; }
.dur-btn.on { background: var(--ac-faint); color: var(--ac); border-color: var(--ac-border); }
.sb { background: var(--surface); border: 1px solid var(--card-border); border-radius: 14px; padding: 10px 14px; color: var(--text); font-size: 13px; font-family: var(--font); outline: none; width: 100%; transition: all .2s; box-shadow: var(--shadow-inner); }
.sb:focus { border-color: var(--ac-border); box-shadow: 0 0 0 3px var(--ac-faint); }
.sb::placeholder { color: var(--muted); }
.sb-wrap { position: relative; margin-bottom: 12px; }
.sb-ico { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.tab { padding: 7px 14px; border-radius: 10px; border: 1px solid var(--card-border); background: var(--surface); color: var(--muted); cursor: pointer; font-family: var(--font); font-size: 11px; font-weight: 700; transition: all .2s; box-shadow: var(--shadow-card); }
.tab.on { background: var(--ac); color: #000; border-color: var(--ac); box-shadow: 0 4px 16px var(--ac-glow); }
.alr { display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 14px; margin-bottom: 8px; font-size: 11px; font-weight: 700; border: 1px solid; animation: fu .3s; }
.au { background: rgba(255,77,109,.06); border-color: rgba(255,77,109,.2); color: var(--danger); }
.aw { background: rgba(251,191,36,.06); border-color: rgba(251,191,36,.2); color: var(--warn); }
.clic { background: var(--surface); border: 1px solid var(--card-border); border-radius: 16px; padding: 12px 14px; margin-bottom: var(--card-gap); display: flex; align-items: center; gap: 12px; transition: all .25s; cursor: pointer; box-shadow: var(--shadow-card); }
.clic:hover { box-shadow: var(--shadow-float); border-color: var(--ac-border); transform: translateX(-2px); }
.cav { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--card-border); display: flex; align-items: center; justify-content: center; background: var(--surface2); flex-shrink: 0; }
.clic-name { font-weight: 700; font-size: 14px; color: var(--text); }
.clic-sub { font-size: 10px; color: var(--muted); margin-top: 2px; font-weight: 500; }
.conf-ov { position: fixed; inset: 0; z-index: 600; background: rgba(0,0,0,.75); display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(12px); }
.conf-box { background: var(--surface); border: 1px solid var(--card-border); border-radius: 22px; padding: 26px; max-width: 320px; width: 100%; text-align: center; box-shadow: var(--shadow-float); }
.gsearch-wrap { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.88); backdrop-filter: blur(16px); display: flex; flex-direction: column; padding: 20px 14px; }
.gsearch-inp { background: var(--surface); border: 1px solid var(--ac-border); border-radius: 16px; padding: 14px 16px; color: var(--text); font-size: 15px; font-family: var(--font); outline: none; width: 100%; box-shadow: 0 0 30px var(--ac-glow); }
.gresult { background: var(--surface); border: 1px solid var(--card-border); border-radius: 14px; padding: 12px 14px; margin-bottom: 7px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-card); }
.gresult:hover { box-shadow: var(--shadow-float); border-color: var(--ac-border); }
.wallet-hero { background: linear-gradient(135deg, #0f1e3a 0%, #0a1428 50%, #060e1f 100%); border-radius: 24px; padding: 22px 20px 20px; margin: 14px 0 16px; position: relative; overflow: hidden; box-shadow: var(--shadow-float), 0 0 40px rgba(0,201,110,0.15); border: 1px solid rgba(0,255,136,0.12); }
.wallet-hero::before { content: ''; position: absolute; top: -50px; right: -50px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(0,255,136,0.18) 0%, transparent 70%); border-radius: 50%; }
.wallet-tabs { display: flex; background: rgba(255,255,255,0.07); border-radius: 12px; padding: 3px; margin-bottom: 18px; position: relative; z-index: 1; border: 1px solid rgba(255,255,255,0.1); }
.wallet-tab-btn { flex: 1; padding: 8px; border: none; border-radius: 9px; cursor: pointer; font-family: var(--font); font-size: 12px; font-weight: 700; transition: all .2s; background: transparent; color: rgba(255,255,255,0.5); }
.wallet-tab-btn.on { background: rgba(0,255,136,0.2); color: var(--ac); box-shadow: 0 0 12px rgba(0,255,136,0.2); }
.wallet-balance-lbl { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; margin-bottom: 4px; position: relative; z-index: 1; }
.wallet-balance-amt { font-size: 36px; font-weight: 900; color: #fff; margin-bottom: 16px; position: relative; z-index: 1; line-height: 1; }
.wallet-actions { display: flex; gap: 10px; position: relative; z-index: 1; }
.wa-btn { flex: 1; padding: 11px; border: none; border-radius: 14px; cursor: pointer; font-family: var(--font); font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all .2s; }
.wa-btn.income-btn { background: rgba(0,255,136,0.18); color: var(--ac); border: 1px solid rgba(0,255,136,0.3); }
.wa-btn.expense-btn { background: rgba(255,77,109,0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.25); }
.wa-btn.savings-btn { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
.wa-btn:hover { transform: translateY(-1px); } .wa-btn:active { transform: scale(.97); }
.wallet-tx-card { background: var(--surface); border: 1px solid var(--card-border); border-radius: 16px; padding: 13px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-card); transition: all .2s; animation: fu .3s; }
.wallet-tx-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-float); }
.wtx-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wtx-icon.green { background: rgba(0,255,136,0.12); } .wtx-icon.red { background: rgba(255,77,109,0.12); } .wtx-icon.purple { background: rgba(167,139,250,0.12); }
.wtx-name { font-size: 13px; font-weight: 700; color: var(--text); }
.wtx-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
.wtx-amt { font-size: 14px; font-weight: 800; } .wtx-amt.pos { color: var(--ac); } .wtx-amt.neg { color: var(--danger); } .wtx-amt.purple { color: #a78bfa; }
.pt { font-size: 22px; font-weight: 900; color: var(--text); margin-bottom: 2px; }
.ps { font-size: 12px; color: var(--muted); }
.sh { font-size: 10px; font-weight: 800; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin: 18px 0 8px; }
.lmark { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--ac), var(--ac2)); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #000; box-shadow: 0 4px 14px var(--ac-glow); }
.empty { text-align: center; padding: 50px 16px; color: var(--muted); }
.client-info-row { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--muted2); align-items: center; }
.client-info-icon { width: 32px; height: 32px; border-radius: 9px; background: var(--surface2); border: 1px solid var(--card-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.client-info-text { font-size: 13px; color: var(--text2); flex: 1; }
@media(max-width:500px) { .fgrid { grid-template-columns: 1fr; } .ffl { grid-column: 1; } .pgrid { grid-template-columns: 1fr; } .pgrid-full { grid-template-columns: 1fr; } }
`;

const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const s = { width: size, height: size, stroke: color, fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0, display: "block" };
  const p = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    contracts: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    clients: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    income: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M16 12h2"/><path d="M2 10h20"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <><line x1="5" y1="12" x2="19" y2="12"/></>,
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
    file: <><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
    arrow_up: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></>,
    arrow_down: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></>,
    chevron_down: <><polyline points="6,9 12,15 18,9"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82a19.79 19.79 0 01-3-8.59A2 2 0 012.27 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>,
    map_pin: <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    notes: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="13" y1="17" x2="8" y2="17"/></>,
  };
  return <svg style={s} viewBox="0 0 24 24">{p[name] || null}</svg>;
};

const toApp = r => ({
  id: String(r.id), clientId: r.client_id ? String(r.client_id) : "", clientName: r.client_name || "",
  clientAddress: r.client_address || "", clientPhone: r.client_phone || "",
  videoCount: r.video_count || "", videoDone: r.video_done || 0,
  totalAmount: r.total_amount || "", videoAmount: r.video_amount || "", presenterAmount: r.presenter_amount || "",
  currency: r.currency || "LYD", startDate: r.start_date || "", endDate: r.end_date || "",
  deposit50Date: r.deposit50_date || "", deposit50Paid: r.deposit50_paid || false,
  final50Date: r.final50_date || "", final50Paid: r.final50_paid || false,
  status: r.status || "pending", notes: r.notes || "", statusHistory: r.status_history || [],
  fileUrl: r.file_url || "", fileName: r.file_name || "",
  noDuration: r.no_duration || false,
  fullPayment: r.full_payment || false,
  fullPaymentPaid: r.full_payment_paid || false,
});

const toDB = c => ({
  client_id: c.clientId ? Number(c.clientId) : null, client_name: c.clientName,
  client_address: c.clientAddress, client_phone: c.clientPhone, video_count: c.videoCount,
  video_done: Number(c.videoDone || 0), total_amount: c.totalAmount ? Number(c.totalAmount) : null,
  video_amount: c.videoAmount ? Number(c.videoAmount) : null,
  presenter_amount: c.presenterAmount ? Number(c.presenterAmount) : null,
  currency: c.currency, start_date: c.startDate || null, end_date: c.noDuration ? null : (c.endDate || null),
  deposit50_date: c.noDuration ? null : (c.deposit50Date || null),
  deposit50_paid: c.noDuration ? false : c.deposit50Paid,
  final50_date: c.noDuration ? null : (c.final50Date || null),
  final50_paid: c.noDuration ? false : c.final50Paid,
  status: c.status, notes: c.notes, status_history: c.statusHistory || [],
  file_url: c.fileUrl || "", file_name: c.fileName || "",
  no_duration: c.noDuration || false,
  full_payment: c.noDuration ? true : false,
  full_payment_paid: c.noDuration ? (c.fullPaymentPaid || false) : false,
});

const toAppCl = r => ({ id: String(r.id), name: r.name || "", phone: r.phone || "", address: r.address || "", notes: r.notes || "" });
const toDBCl = c => ({ name: c.name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });

function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div className="conf-ov" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="conf-box">
        <Icon name="alert" size={36} color="var(--danger)" />
        <div style={{ fontWeight: 700, fontSize: 15, margin: "14px 0 6px", color: "var(--text)" }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn bgh" style={{ flex: 1 }} onClick={onCancel}>إلغاء</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>تأكيد الحذف</button>
        </div>
      </div>
    </div>
  );
}

function GlobalSearch({ contracts, clients, onClose, onViewContract, goToClient }) {
  const [q, setQ] = useState("");
  const inp = useRef();
  useEffect(() => { setTimeout(() => inp.current?.focus(), 80); }, []);
  const results = q.trim().length < 1 ? [] : [
    ...clients.filter(c => c.name.includes(q) || c.phone?.includes(q)).map(c => ({ type: "client", label: c.name, sub: c.phone, obj: c })),
    ...contracts.filter(c => c.clientName.includes(q) || String(c.totalAmount).includes(q)).map(c => ({ type: "contract", label: c.clientName, sub: fmt(c.videoAmount || c.totalAmount, c.currency), obj: c })),
  ].slice(0, 10);
  return (
    <div className="gsearch-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <Icon name="search" size={18} color="var(--ac)" />
        <input ref={inp} className="gsearch-inp" value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن عميل، عقد، مبلغ..." />
        <button className="btn bgh" style={{ padding: "9px 12px", flexShrink: 0 }} onClick={onClose}>إغلاق</button>
      </div>
      {q && results.length === 0 && <div style={{ color: "var(--muted)", textAlign: "center", padding: 28, fontSize: 13 }}>لا توجد نتائج</div>}
      {results.map((r, i) => (
        <div key={i} className="gresult" onClick={() => { r.type === "contract" ? onViewContract(r.obj) : goToClient(r.obj.id); onClose(); }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={r.type === "contract" ? "contracts" : "person"} size={15} color="var(--ac)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{r.type === "contract" ? "عقد" : "عميل"} · {r.sub}</div>
          </div>
          <Icon name="back" size={14} color="var(--muted)" />
        </div>
      ))}
    </div>
  );
}

function Alerts({ contracts }) {
  const a = [];
  contracts.forEach(c => {
    if (c.status === "cancelled" || c.status === "completed") return;
    const vc = Number(c.videoCount || 0), vd = Number(c.videoDone || 0);
    if (c.noDuration) {
      if (!c.fullPaymentPaid)
        a.push({ id: c.id + "fp", msg: `الدفعة الكاملة غير مستلمة — ${c.clientName}`, type: "w" });
    } else {
      if (!c.final50Paid && c.final50Date) {
        const d = daysDiff(c.final50Date);
        if (d !== null && d >= 0 && d <= 7) a.push({ id: c.id, msg: `${d === 0 ? "اليوم" : d + " أيام"} — الدفعة الثانية لـ ${c.clientName}`, type: d <= 2 ? "u" : "w" });
      }
      if (!c.deposit50Paid && c.deposit50Date && daysDiff(c.deposit50Date) <= 0)
        a.push({ id: c.id + "d", msg: `المقدم غير مدفوع — ${c.clientName}`, type: "u" });
      if (c.endDate && daysDiff(c.endDate) !== null && daysDiff(c.endDate) < 0 && vc > 0 && vd < vc)
        a.push({ id: c.id + "exp", msg: `انتهى العقد ولم تكتمل الفيديوهات (${vd}/${vc}) — ${c.clientName}`, type: "u" });
      if (c.endDate) { const d = daysDiff(c.endDate); if (d !== null && d >= 0 && d <= 2) a.push({ id: c.id + "e", msg: `ينتهي ${d === 0 ? "اليوم" : "خلال " + d + " أيام"} — ${c.clientName}`, type: "u" }); }
    }
    if (vc > 0 && vd >= vc && !c.noDuration && c.endDate && daysDiff(c.endDate) !== null && daysDiff(c.endDate) > 0)
      a.push({ id: c.id + "vdone", msg: `اكتملت الفيديوهات قبل موعد انتهاء العقد — ${c.clientName}`, type: "w" });
  });
  if (!a.length) return null;
  return <div style={{ marginBottom: 14 }}>{a.map(x => <div key={x.id} className={`alr ${x.type === "u" ? "au" : "aw"}`}><Icon name="alert" size={13} color="currentColor" />{x.msg}</div>)}</div>;
}

function WABtn({ phone, sm }) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("0") ? "218" + clean.slice(1) : clean;
  const sz = sm ? 28 : 32;
  return (
    <button className="ico-btn wa" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${num}`, "_blank"); }} title="واتساب" style={{ width: sz, height: sz }}>
      <Icon name="whatsapp" size={sm ? 12 : 14} color="#25D366" />
    </button>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [f, setF] = useState(client ? { ...client } : { name: "", phone: "", address: "", notes: "" });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle"><Icon name={client ? "edit" : "user_plus"} size={17} color="var(--ac)" />{client ? "تعديل عميل" : "عميل جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
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

const EC = { clientId: "", clientName: "", clientAddress: "", clientPhone: "", videoCount: "", videoDone: 0, totalAmount: "", videoAmount: "", presenterAmount: "", currency: "LYD", startDate: "", endDate: "", deposit50Date: "", deposit50Paid: false, final50Date: "", final50Paid: false, status: "pending", notes: "", statusHistory: [], fileUrl: "", fileName: "", noDuration: false, fullPaymentPaid: false };

function ContractModal({ contract, clients, onClose, onSave }) {
  const [f, setF] = useState(contract ? { ...contract } : { ...EC });
  const [drop, setDrop] = useState(false);
  const [dur, setDur] = useState(null);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { const v = Number(f.videoAmount || 0), p = Number(f.presenterAmount || 0); if (v || p) s("totalAmount", String(v + p)); }, [f.videoAmount, f.presenterAmount]);
  useEffect(() => { if (f.startDate && !f.noDuration) s("deposit50Date", f.startDate); }, [f.startDate]);
  useEffect(() => { if (f.endDate && !f.noDuration) s("final50Date", f.endDate); }, [f.endDate]);
  const handleDur = m => {
    if (m === "none") { setDur("none"); s("noDuration", true); s("endDate", ""); s("deposit50Date", ""); s("final50Date", ""); }
    else { setDur(m); s("noDuration", false); if (f.startDate) s("endDate", addMonths(f.startDate, m)); }
  };
  const handleStart = v => { s("startDate", v); if (dur && dur !== "none" && v) s("endDate", addMonths(v, dur)); };
  const pick = c => { setF(p => ({ ...p, clientId: c.id, clientName: c.name, clientPhone: c.phone || "", clientAddress: c.address || "" })); setDrop(false); };
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod">
        <div className="mhd"><div className="mtitle"><Icon name={contract ? "edit" : "contract_plus"} size={17} color="var(--ac)" />{contract ? "تعديل" : "عقد جديد"}</div><button className="mclose" onClick={onClose}>×</button></div>
        <div style={{ marginBottom: 14, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><span className="flbl">العميل</span>{f.clientName && <span style={{ fontSize: 11, color: "var(--ac)", fontWeight: 700 }}>✓ {f.clientName}</span>}</div>
          <button className="btn bng" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setDrop(p => !p)}><span>{f.clientName || "اختر عميلاً..."}</span><Icon name="clients" size={13} color="var(--ac)" /></button>
          {drop && (
            <div style={{ position: "absolute", top: "100%", insetInline: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 8, marginTop: 6, maxHeight: 170, overflowY: "auto", boxShadow: "var(--shadow-float)" }}>
              {clients.length === 0 && <div style={{ padding: 10, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>لا يوجد عملاء</div>}
              {clients.map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--ac-faint)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="person" size={13} color="var(--ac)" />
                  </div>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>{c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}</div>
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
          <div className="fg ffl"><label className="flbl">الإجمالي (تلقائي)</label><input className="finp" type="number" value={f.totalAmount} readOnly style={{ color: "var(--ac)", fontWeight: 800 }} /></div>
          <div className="fg"><label className="flbl">تاريخ البدء</label><input className="finp" type="date" value={f.startDate} onChange={e => handleStart(e.target.value)} /></div>
          <div className="fg"><label className="flbl">المدة</label>
            <div className="dur-btns">
              <button className={`dur-btn${dur === 1 ? " on" : ""}`} onClick={() => handleDur(1)}>شهر</button>
              <button className={`dur-btn${dur === 3 ? " on" : ""}`} onClick={() => handleDur(3)}>3 أشهر</button>
              <button className={`dur-btn${dur === "none" ? " on" : ""}`} onClick={() => handleDur("none")}>بدون</button>
            </div>
          </div>
          {!f.noDuration && <>
            <div className="fg"><label className="flbl">تاريخ الانتهاء</label><input className="finp" type="date" value={f.endDate} onChange={e => s("endDate", e.target.value)} /></div>
            <div className="fg"><label className="flbl">موعد الدفعة الأولى</label><input className="finp" type="date" value={f.deposit50Date} readOnly style={{ color: "var(--muted)" }} /></div>
            <div className="fg"><label className="flbl">موعد الدفعة الثانية</label><input className="finp" type="date" value={f.final50Date} readOnly style={{ color: "var(--muted)" }} /></div>
            <div className="fck"><input type="checkbox" id="d1" checked={f.deposit50Paid} onChange={e => s("deposit50Paid", e.target.checked)} /><label htmlFor="d1">تم استلام الدفعة الأولى</label></div>
            <div className="fck"><input type="checkbox" id="d2" checked={f.final50Paid} onChange={e => s("final50Paid", e.target.checked)} /><label htmlFor="d2">تم استلام الدفعة الثانية</label></div>
          </>}
          {f.noDuration && (
            <div className="fg ffl" style={{ marginTop: 2 }}>
              <div className="fck"><input type="checkbox" id="fp" checked={f.fullPaymentPaid || false} onChange={e => s("fullPaymentPaid", e.target.checked)} /><label htmlFor="fp">تم استلام الدفعة الكاملة</label></div>
            </div>
          )}
          <div className="fg ffl"><label className="flbl">الحالة</label><select className="fsel" value={f.status} onChange={e => s("status", e.target.value)}><option value="pending">معلق</option><option value="active">جارٍ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
          <div className="fg ffl"><label className="flbl">ملاحظات</label><textarea className="fta" value={f.notes} onChange={e => s("notes", e.target.value)} /></div>
        </div>
        <div className="mft"><button className="btn bgh" onClick={onClose}>إلغاء</button><button className="btn bngf" onClick={() => { if (!f.clientName) { alert("اختر عميلاً"); return; } onSave({ ...f, id: f.id || null }); }}>حفظ العقد</button></div>
      </div>
    </div>
  );
}

function ContractViewModal({ c, onClose, onPdfExported }) {
  const ref = useRef();
  const dParts = d => { if (!d) return { d: "", m: "", y: "" }; const dt = new Date(d); return { d: String(dt.getDate()).padStart(2, "0"), m: String(dt.getMonth() + 1).padStart(2, "0"), y: String(dt.getFullYear()) }; };
  const sd = dParts(c.startDate), ed = dParts(c.endDate);
  const cur = c.currency || "LYD";
  const vAmt = c.videoAmount ? Number(c.videoAmount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "__________";
  const pAmt = c.presenterAmount ? Number(c.presenterAmount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "__________";
  const pct = c.noDuration
    ? (c.fullPaymentPaid ? 100 : 0)
    : Math.round(((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)) * 100);
  const vc = Number(c.videoCount || 0), vd = Number(c.videoDone || 0);
  const exportPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/><title>عقد - ${c.clientName || ""}</title><style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;background:#fff;padding:32px 44px;font-size:14px;line-height:1.9;}.sec{font-weight:800;font-size:14px;margin:13px 0 5px;border-right:3px solid #111;padding-right:8px;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:11px 0;}.bx{border:1px solid #ddd;border-radius:7px;padding:10px 12px;}.bl{font-weight:800;font-size:10px;color:#555;margin-bottom:5px;border-right:3px solid #111;padding-right:6px;}hr{border:none;border-top:2px solid #111;margin:12px 0;}hr.t{border-top:1px solid #ddd;margin:16px 0;}.sg{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:22px;}.s{text-align:center;}.sl{margin-top:34px;border-bottom:1.5px dashed #bbb;}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 500);
    onPdfExported(c.id);
  };
  return (
    <div className="mov" style={{ alignItems: "flex-start", overflowY: "auto" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--card-border)", borderRadius: 22, width: "100%", maxWidth: 740, margin: "12px 0", overflow: "hidden", boxShadow: "var(--shadow-float)" }}>
        <div style={{ background: "var(--surface2)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--muted2)" }}>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}><Icon name="doc" size={14} color="var(--ac)" />تفاصيل العقد</span>
          <div style={{ display: "flex", gap: 7 }}>
            {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn bng" style={{ fontSize: 11, padding: "5px 11px" }}><Icon name="file" size={11} color="var(--ac)" />نسخة العقد</button></a>}
            <button className="btn bngf" style={{ fontSize: 11, padding: "6px 13px" }} onClick={exportPDF}><Icon name="doc" size={11} color="#000" />تصدير PDF</button>
            <button className="mclose" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div><div style={{ fontSize: 17, fontWeight: 700 }}>{c.clientName}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.videoCount ? `${c.videoCount} فيديو` : ""}</div></div>
            <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          </div>
          <div className="amt-box"><div className="amt-lbl">الإجمالي</div><div className="amt-val">{fmt(c.totalAmount, c.currency)}</div></div>
          <div className="psec">
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>الدفع</span><span style={{ fontSize: 11, fontWeight: 800, color: pct === 100 ? "var(--ac)" : "var(--warn)" }}>{pct}%</span></div>
            <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
            {c.noDuration ? (
              <div className="pgrid-full">
                <div className="pitem">
                  <div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>دفعة كاملة 100%</div><div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0), c.currency)}</div></div>
                  <div style={{ fontSize: 11, color: c.fullPaymentPaid ? "var(--ac)" : "var(--muted)", fontWeight: 800 }}>{c.fullPaymentPaid ? "✓" : "—"}</div>
                </div>
              </div>
            ) : (
              <div className="pgrid">
                {[{ l: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date }, { l: "الثانية 50%", paid: c.final50Paid, date: c.final50Date }].map(p => (
                  <div key={p.l} className="pitem">
                    <div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{p.l}</div><div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>{p.date && <div style={{ fontSize: 9, color: "var(--muted)" }}>{fmtDate(p.date)}</div>}</div>
                    <div style={{ fontSize: 11, color: p.paid ? "var(--ac)" : "var(--muted)", fontWeight: 800 }}>{p.paid ? "✓" : "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {vc > 0 && <div className="vpsec" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>الفيديوهات</span><span style={{ fontSize: 11, fontWeight: 800, color: "var(--ac)" }}>{vd}/{vc}</span></div>
            <div className="vpbar"><div className="vpfill" style={{ width: `${vc > 0 ? (vd / vc) * 100 : 0}%` }} /></div>
          </div>}
          {c.statusHistory && c.statusHistory.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="history" size={11} color="var(--muted)" />سجل الحالات</div>
              {c.statusHistory.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: SC[h.status] || "var(--muted)", flexShrink: 0, marginTop: 5 }} />
                  <div><div style={{ fontSize: 12, fontWeight: 700, color: SC[h.status] || "var(--muted)" }}>{SL[h.status] || h.status}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{new Date(h.date).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" })}</div></div>
                </div>
              ))}
            </div>
          )}
          {c.notes && <div style={{ marginTop: 10, fontSize: 12, color: "var(--text2)", padding: "9px 12px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--card-border)" }}>📝 {c.notes}</div>}
        </div>
        {/* Hidden PDF content */}
        <div ref={ref} style={{ display: "none" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 22, fontFamily: "'Tajawal',sans-serif", letterSpacing: 1 }}>FAREQ</div>
            <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Tajawal',sans-serif" }}>شركة فارق للإنتاج</div>
            <div style={{ color: "#555", fontSize: 11, fontFamily: "'Tajawal',sans-serif" }}>FAREQ Productions — 0920953918</div>
          </div>
          <hr style={{ border: "none", borderTop: "2px solid #111", margin: "12px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, margin: "11px 0", fontFamily: "'Tajawal',sans-serif" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 7, padding: "9px 11px" }}><div style={{ fontWeight: 800, fontSize: 10, color: "#555", marginBottom: 5, borderRight: "3px solid #111", paddingRight: 6 }}>الطرف الأول</div>{[["الاسم", "شركة فارق للإنتاج FAREQ productions"], ["الهاتف", "0920953918"]].map(([l, v]) => <div key={l} style={{ display: "flex", gap: 4, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 45 }}>{l}:</span><span style={{ fontWeight: 600 }}>{v}</span></div>)}</div>
            <div style={{ border: "1px solid #ddd", borderRadius: 7, padding: "9px 11px" }}><div style={{ fontWeight: 800, fontSize: 10, color: "#555", marginBottom: 5, borderRight: "3px solid #111", paddingRight: 6 }}>الطرف الثاني</div>{[["الاسم", c.clientName], ["العنوان", c.clientAddress], ["الهاتف", c.clientPhone]].map(([l, v]) => <div key={l} style={{ display: "flex", gap: 4, margin: "2px 0", fontSize: 13 }}><span style={{ color: "#666", minWidth: 45 }}>{l}:</span><span style={{ fontWeight: 600, borderBottom: "1px solid #ddd", flex: 1 }}>{v || ""}</span></div>)}</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>موضوع العقد</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif", lineHeight: 1.9 }}>
            <div>يلتزم الطرف الأول بتقديم خدمات إنتاج محتوى فيديو تشمل:</div>
            <div>- تصوير وإنتاج عدد ({c.videoCount || "          "}) فيديوهات</div>
            <div>يلتزم الطرف الثاني بتوفير المعلومات/ المنتجات</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>مدة العقد:</div>
          {c.noDuration ? (
            <div style={{ fontFamily: "'Tajawal',sans-serif" }}>تاريخ البدء: {sd.d} / {sd.m} / {sd.y} — بدون تاريخ انتهاء محدد</div>
          ) : (
            <div style={{ fontFamily: "'Tajawal',sans-serif" }}>مدة العقد تبدأ من تاريخ {sd.d} / {sd.m} / {sd.y} وتنتهي في {ed.d} / {ed.m} / {ed.y}</div>
          )}
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>القيمة المالية وطريقة الدفع:</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif" }}>
            <div>- القيمة الخاصة بالفيديوهات: {vAmt} {cur}</div>
            <div>- القيمة الخاصة بالوجه الإعلامي: {pAmt} {cur}</div>
            <div style={{ margin: "9px 0 3px", fontWeight: 700 }}>طريقة الدفع:</div>
            {c.noDuration ? (
              <div>  - دفعة كاملة 100% عند الاستحقاق</div>
            ) : (
              <><div>  - 50% مقدماً</div><div>  - 50% عند تسليم آخر فيديو</div></>
            )}
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>التعديلات:</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif" }}><div>- يحق للعميل طلب تعديل فقط لكل فيديو</div><div>- أي تعديلات إضافية يتم احتسابها بتكلفة إضافية</div></div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>الإلغاء:</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif" }}><div>- لا يحق للعميل الغاء العقد بعد تنفيذ نصف عدد الفيديوهات المتفق عليها</div><div>- في حالة الإلغاء بعد بدء العمل، لا يتم استرجاع الدفعة المقدمة</div></div>
          <div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>حقوق الاستخدام:</div>
          <div style={{ fontFamily: "'Tajawal',sans-serif" }}><div>- يحق للعميل استخدام الفيديوهات لأغراضه التسويقية</div><div>- يحق للطرف الأول استخدام الأعمال في معرض أعماله</div></div>
          {c.notes && <><div style={{ fontWeight: 800, fontSize: 13, margin: "13px 0 5px", borderRight: "3px solid #111", paddingRight: 7, fontFamily: "'Tajawal',sans-serif" }}>ملاحظات:</div><div style={{ fontFamily: "'Tajawal',sans-serif" }}>{c.notes}</div></>}
          <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "18px 0 14px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, fontFamily: "'Tajawal',sans-serif" }}>
            {["الطرف الأول — شركة فارق للإنتاج", `الطرف الثاني — ${c.clientName || "___________"}`].map((p, i) => <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{p}</div><div style={{ fontWeight: 700 }}>التوقيع</div><div style={{ marginTop: 34, borderBottom: "1.5px dashed #bbb" }} /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractCard({ c, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const pct = c.noDuration
    ? (c.fullPaymentPaid ? 100 : 0)
    : Math.round(((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)) * 100);
  const f50d = c.final50Date ? daysDiff(c.final50Date) : null;
  const vc = Number(c.videoCount || 0), vd = Number(c.videoDone || 0);
  const vpct = vc > 0 ? Math.round((vd / vc) * 100) : 0;
  return (
    <div className="cc">
      <div className="cc-compact">
        <div className="cc-compact-icon" onClick={() => onView(c)} style={{ cursor: "pointer" }}><Icon name="contracts" size={15} color="var(--ac)" /></div>
        <div className="cc-compact-body" onClick={() => onView(c)} style={{ cursor: "pointer" }}>
          <div className="cc-compact-name">{c.clientName || "عميل"}</div>
          <div className="cc-compact-sub">{vc > 0 ? `${vd}/${vc} فيديو` : ""}{vc > 0 && c.startDate ? " · " : ""}{fmtDate(c.startDate)}{!c.noDuration && c.endDate ? ` · حتى ${fmtDate(c.endDate)}` : ""}{c.noDuration ? " · بدون مدة" : ""}</div>
        </div>
        <div className="cc-compact-right">
          <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
          <div className="cc-compact-amt">{fmt(c.videoAmount || c.totalAmount, c.currency)}</div>
        </div>
        <button className={`cc-expand-btn${expanded ? " open" : ""}`} onClick={e => { e.stopPropagation(); setExpanded(p => !p); }} title={expanded ? "طي" : "توسيع"}>
          <Icon name="chevron_down" size={14} color="currentColor" />
        </button>
      </div>
      {expanded && (
        <div className="cc-expanded">
          <div className="cc-actions">
            <div style={{ display: "flex", gap: 5 }}>
              <button className="ico-btn" onClick={() => onEdit(c)} title="تعديل"><Icon name="edit" size={12} color="var(--text2)" /></button>
              <button className="ico-btn" onClick={() => onView(c)} title="عرض PDF"><Icon name="doc" size={12} color="var(--text2)" /></button>
              <WABtn phone={c.clientPhone} sm />
              <button className="ico-btn red" onClick={() => onCancel(c.id)} title="إلغاء"><Icon name="cancel" size={12} color="var(--danger)" /></button>
              <button className="ico-btn red" onClick={() => onDelete(c.id)} title="حذف"><Icon name="trash" size={12} color="var(--danger)" /></button>
            </div>
          </div>
          <div className="amt-box"><div className="amt-lbl">الإجمالي</div><div className="amt-val">{fmt(c.totalAmount, c.currency)}</div></div>
          <div className="psec">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>الدفع</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: pct === 100 ? "var(--ac)" : "var(--warn)" }}>{pct}%</span>
            </div>
            <div className="pbar"><div className="pfill" style={{ width: `${pct}%` }} /></div>
            {c.noDuration ? (
              <div className="pgrid-full">
                <div className="pitem">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>دفعة كاملة 100%</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0), c.currency)}</div>
                  </div>
                  <button className={`ptog ${c.fullPaymentPaid ? "ok" : "no"}`} onClick={() => onToggle(c.id, "fullPaymentPaid")}>{c.fullPaymentPaid ? "✓ مدفوع" : "تحديد"}</button>
                </div>
              </div>
            ) : (
              <div className="pgrid">
                {[
                  { label: "الأولى 50%", paid: c.deposit50Paid, date: c.deposit50Date, field: "deposit50Paid", diff: null },
                  { label: "الثانية 50%", paid: c.final50Paid, date: c.final50Date, field: "final50Paid", diff: f50d }
                ].map(p => (
                  <div key={p.field} className="pitem">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{p.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{fmt(Number(c.totalAmount || 0) * 0.5, c.currency)}</div>
                      {p.date && <div style={{ fontSize: 9, color: !p.paid && p.diff !== null && p.diff <= 7 && p.diff >= 0 ? "var(--warn)" : "var(--muted)" }}>{fmtDate(p.date)}</div>}
                    </div>
                    <button className={`ptog ${p.paid ? "ok" : "no"}`} onClick={() => onToggle(c.id, p.field)}>{p.paid ? "✓ مدفوع" : "تحديد"}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {vc > 0 && (
            <div className="vpsec">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>الفيديوهات</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ac)" }}>{vd}/{vc}</span>
              </div>
              <div className="vpbar"><div className="vpfill" style={{ width: `${vpct}%` }} /></div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="vp-btn" onClick={() => onVideoUpdate(c.id, Math.min(vc, vd + 1))}>+1 فيديو</button>
                <button className="vp-btn" onClick={() => onVideoUpdate(c.id, Math.min(vc, vd + 2))}>+2 فيديو</button>
              </div>
            </div>
          )}
          {c.notes && (
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", padding: "7px 10px", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--card-border)", display: "flex", gap: 5 }}>
              <Icon name="doc" size={10} />{c.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WalletModal({ type, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const labels = {
    income: { title: "إضافة رصيد", color: "var(--ac)", icon: "arrow_up" },
    expense: { title: "إضافة مصروف", color: "var(--danger)", icon: "arrow_down" },
    savings_add: { title: "إضافة للادخار", color: "#a78bfa", icon: "arrow_up" },
    savings_withdraw: { title: "سحب من الادخار", color: "var(--warn)", icon: "arrow_down" },
  };
  const lbl = labels[type] || labels.income;
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod" style={{ maxWidth: 380 }}>
        <div className="mhd">
          <div className="mtitle" style={{ color: lbl.color }}><Icon name={lbl.icon} size={17} color={lbl.color} />{lbl.title}</div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="fg">
            <label className="flbl">المبلغ (LYD)</label>
            <input className="finp" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus style={{ fontSize: 22, fontWeight: 800, color: lbl.color, textAlign: "center" }} />
          </div>
          {(type === "expense" || type === "savings_withdraw") && (
            <div className="fg">
              <label className="flbl">{type === "expense" ? "البند / الوصف" : "سبب السحب"}</label>
              <input className="finp" value={desc} onChange={e => setDesc(e.target.value)} placeholder={type === "expense" ? "مثل: بنزين، طعام، إيجار..." : "وصف اختياري..."} />
            </div>
          )}
        </div>
        <div className="mft">
          <button className="btn bgh" onClick={onClose}>إلغاء</button>
          <button className="btn bngf" style={{ background: lbl.color, color: type === "income" ? "#000" : "#fff", boxShadow: `0 4px 20px ${lbl.color}44` }}
            onClick={() => {
              if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { alert("أدخل مبلغاً صحيحاً"); return; }
              onSave({ type, amount: Number(amount), desc: desc || (type === "income" ? "إضافة رصيد" : type === "savings_add" ? "إضافة ادخار" : type === "savings_withdraw" ? "سحب ادخار" : "مصروف"), date: new Date().toISOString() });
            }}>
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletScreen() {
  const [walletTab, setWalletTab] = useState("expense");
  const [modal, setModal] = useState(null);
  const [txns, setTxns] = useState(() => { try { return JSON.parse(localStorage.getItem("wallet_txns") || "[]"); } catch { return []; } });
  const save = (newTxns) => { setTxns(newTxns); try { localStorage.setItem("wallet_txns", JSON.stringify(newTxns)); } catch {} };
  const expenseTxns = txns.filter(t => t.type === "income" || t.type === "expense");
  const savingsTxns = txns.filter(t => t.type === "savings_add" || t.type === "savings_withdraw");
  const expenseBalance = expenseTxns.reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0);
  const savingsBalance = savingsTxns.reduce((s, t) => t.type === "savings_add" ? s + t.amount : s - t.amount, 0);
  const balance = walletTab === "expense" ? expenseBalance : savingsBalance;
  const currentTxns = walletTab === "expense" ? [...expenseTxns].reverse() : [...savingsTxns].reverse();
  const handleAdd = (data) => { save([...txns, data]); setModal(null); };
  const deleteTx = (idx) => { const all = walletTab === "expense" ? expenseTxns : savingsTxns; const item = [...all].reverse()[idx]; save(txns.filter(t => t !== item)); };
  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div className="wallet-hero">
        <div className="wallet-tabs">
          <button className={`wallet-tab-btn${walletTab === "expense" ? " on" : ""}`} onClick={() => setWalletTab("expense")}>💳 المصروف</button>
          <button className={`wallet-tab-btn${walletTab === "savings" ? " on" : ""}`} onClick={() => setWalletTab("savings")}>🏦 الادخار</button>
        </div>
        <div className="wallet-balance-lbl">{walletTab === "expense" ? "رصيد المحفظة" : "رصيد الادخار"}</div>
        <div className="wallet-balance-amt" style={{ color: balance < 0 ? "#ff4d6d" : "#fff" }}>{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>LYD</span></div>
        <div className="wallet-actions">
          {walletTab === "expense" ? (
            <><button className="wa-btn income-btn" onClick={() => setModal("income")}><Icon name="plus" size={14} color="var(--ac)" /> إضافة رصيد</button><button className="wa-btn expense-btn" onClick={() => setModal("expense")}><Icon name="minus" size={14} color="#ff4d6d" /> إضافة مصروف</button></>
          ) : (
            <><button className="wa-btn savings-btn" onClick={() => setModal("savings_add")}><Icon name="plus" size={14} color="#a78bfa" /> إضافة للادخار</button><button className="wa-btn expense-btn" onClick={() => setModal("savings_withdraw")}><Icon name="minus" size={14} color="#ff4d6d" /> سحب</button></>
          )}
        </div>
      </div>
      <div className="sec-hdr"><span className="sec-title">آخر العمليات</span><span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{currentTxns.length} عملية</span></div>
      {currentTxns.length === 0 && <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="wallet" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 500, color: "var(--muted)", fontSize: 13 }}>لا توجد عمليات بعد</div></div>}
      {currentTxns.map((t, i) => {
        const isPos = t.type === "income" || t.type === "savings_add";
        const iconColor = isPos ? "green" : t.type === "savings_withdraw" ? "purple" : "red";
        const amtColor = isPos ? "pos" : t.type === "savings_withdraw" ? "purple" : "neg";
        return (
          <div key={i} className="wallet-tx-card" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className={`wtx-icon ${iconColor}`}><Icon name={isPos ? "arrow_up" : "arrow_down"} size={18} color={isPos ? "var(--ac)" : t.type === "savings_withdraw" ? "#a78bfa" : "var(--danger)"} /></div>
              <div><div className="wtx-name">{t.desc}</div><div className="wtx-sub">{new Date(t.date).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={`wtx-amt ${amtColor}`}>{isPos ? "+" : "-"}{t.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} LYD</div>
              <button className="ico-btn red" style={{ width: 26, height: 26 }} onClick={() => deleteTx(i)}><Icon name="trash" size={11} color="var(--danger)" /></button>
            </div>
          </div>
        );
      })}
      {modal && <WalletModal type={modal} onClose={() => setModal(null)} onSave={handleAdd} />}
    </div>
  );
}

function Dashboard({ contracts, clients, goTo, onViewContract }) {
  const collected = contracts.reduce((s, c) => {
    if (c.noDuration) return s + Number(c.videoAmount || 0) * (c.fullPaymentPaid ? 1 : 0);
    return s + Number(c.videoAmount || 0) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0));
  }, 0);
  const recent = [...contracts].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 4);
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative", zIndex: 1 }}>
          <div><div className="hero-lbl">إجمالي المحصّل</div><div className="hero-amount">{collected.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>LYD</span></div></div>
          <div style={{ textAlign: "left" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>العقود</div><div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{contracts.length}</div></div>
        </div>
        <div className="hero-change" style={{ position: "relative", zIndex: 1 }}><Icon name="check" size={12} color="var(--ac)" />{contracts.filter(c => c.status === "active").length} نشط · {contracts.filter(c => c.status === "pending").length} معلق</div>
        <div className="quick-actions">
          {[
            { label: "عقد جديد", icon: "contract_plus", action: () => goTo("contracts_new") },
            { label: "عميل جديد", icon: "user_plus", action: () => goTo("clients_new") },
          ].map(q => (
            <button key={q.label} className="qa-btn" onClick={q.action}>
              <div className="qa-icon"><Icon name={q.icon} size={16} color="rgba(255,255,255,0.85)" /></div>
              <span className="qa-lbl">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
      <Alerts contracts={contracts} />
      <div className="stat-grid">
        {[
          { l: "نشطة", v: contracts.filter(c => c.status === "active").length, icon: "check", ac: true },
          { l: "معلقة", v: contracts.filter(c => c.status === "pending").length, icon: "clock" },
          { l: "مكتملة", v: contracts.filter(c => c.status === "completed").length, icon: "history" },
          { l: "العملاء", v: clients.length, icon: "clients" },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-lbl"><Icon name={s.icon} size={12} color={s.ac ? "var(--ac)" : "var(--muted)"} />{s.l}</div>
            <div className={`stat-val${s.ac ? " ac" : ""}`}>{s.v}</div>
          </div>
        ))}
      </div>
      {recent.length > 0 && <>
        <div className="sec-hdr"><span className="sec-title">آخر العقود</span><span className="sec-link" onClick={() => goTo("contracts")}>عرض الكل ←</span></div>
        {recent.map(c => (
          <div key={c.id} className="tx-card" onClick={() => onViewContract(c)}>
            <div className="tx-icon"><Icon name="contracts" size={18} color="var(--ac)" /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div className="tx-name">{c.clientName}</div><div className="tx-sub">{c.videoCount ? `${c.videoCount} فيديو · ` : ""}{fmtDate(c.startDate)}</div></div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ac)" }}>{fmt(c.videoAmount || c.totalAmount, c.currency)}</div>
              <span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span>
            </div>
          </div>
        ))}
      </>}
      {contracts.length === 0 && <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="contracts" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 500, color: "var(--muted)", fontSize: 13 }}>ابدأ بإضافة أول عقد</div></div>}
    </div>
  );
}

function ContractsScreen({ contracts, clients, onAdd, onEdit, onDelete, onToggle, onView, onVideoUpdate, onCancel }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const tabs = [
    { key: "all", label: "الكل", count: contracts.filter(c => c.status !== "completed" && c.status !== "cancelled").length },
    { key: "active", label: "جارٍ", count: contracts.filter(c => c.status === "active").length },
    { key: "pending", label: "معلق", count: contracts.filter(c => c.status === "pending").length },
    { key: "completed", label: "مكتمل", count: contracts.filter(c => c.status === "completed").length },
    { key: "cancelled", label: "ملغي", count: contracts.filter(c => c.status === "cancelled").length },
  ];
  const filtered = [...contracts].sort((a, b) => Number(b.id) - Number(a.id))
    .filter(c => { if (filter === "all") return c.status !== "completed" && c.status !== "cancelled"; return c.status === filter; })
    .filter(c => !search || c.clientName?.includes(search));
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div className="pt">العقود</div><div className="ps">{contracts.length} عقد</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ padding: "8px 16px", fontSize: 13 }}><Icon name="contract_plus" size={14} color="#000" />جديد</button>
      </div>
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)" /></span><input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 36 }} /></div>
      <div className="tabs">{tabs.map(t => <button key={t.key} className={`tab${filter === t.key ? " on" : ""}`} onClick={() => setFilter(t.key)}>{t.label}{t.count > 0 && <span style={{ marginRight: 5, background: filter === t.key ? "rgba(0,0,0,0.2)" : "var(--surface2)", color: filter === t.key ? "#000" : "var(--muted)", borderRadius: 20, padding: "0 6px", fontSize: 9, fontWeight: 800 }}>{t.count}</span>}</button>)}</div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="contracts" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 500, color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>{contracts.length === 0 ? "لا توجد عقود" : "لا توجد نتائج"}</div>{contracts.length === 0 && <button className="btn bngf" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(c => <ContractCard key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView} onVideoUpdate={onVideoUpdate} onCancel={onCancel} />)}
    </div>
  );
}

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
          <button className="btn bng" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setSel(null)}><Icon name="back" size={13} color="var(--text2)" />رجوع</button>
          <div className="pt">{cl.name}</div>
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div className="cav" style={{ width: 50, height: 50 }}><Icon name="person" size={22} color="var(--ac)" /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{cl.name}</div></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <WABtn phone={cl.phone} />
              <button className="ico-btn" onClick={() => onEdit(cl)} title="تعديل"><Icon name="edit" size={14} color="var(--text2)" /></button>
              <button className="ico-btn red" onClick={() => { if (confirm("حذف العميل؟")) { onDelete(cl.id); setSel(null); } }} title="حذف"><Icon name="trash" size={14} color="var(--danger)" /></button>
            </div>
          </div>
          {cl.phone && (
            <div className="client-info-row">
              <div className="client-info-icon"><Icon name="phone" size={14} color="var(--ac)" /></div>
              <span className="client-info-text">{cl.phone}</span>
            </div>
          )}
          {cl.address && (
            <div className="client-info-row">
              <div className="client-info-icon"><Icon name="map_pin" size={14} color="var(--ac)" /></div>
              <span className="client-info-text">{cl.address}</span>
            </div>
          )}
          {cl.notes && (
            <div className="client-info-row">
              <div className="client-info-icon"><Icon name="notes" size={14} color="var(--ac)" /></div>
              <span className="client-info-text">{cl.notes}</span>
            </div>
          )}
        </div>
        <div className="sec-hdr"><span className="sec-title">عقوده ({clc.length})</span></div>
        {clc.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>لا توجد عقود</div>}
        {clc.map(c => (
          <div key={c.id} className="tx-card">
            <div className="tx-icon"><Icon name="contracts" size={16} color="var(--ac)" /></div>
            <div style={{ flex: 1 }}><div className="tx-name">{c.videoCount ? `${c.videoCount} فيديو` : "عقد"}</div><div className="tx-sub">{fmtDate(c.startDate)}</div></div>
            <div><div style={{ fontSize: 13, fontWeight: 800, color: "var(--ac)" }}>{fmt(c.videoAmount || c.totalAmount, c.currency)}</div><span className="badge" style={{ color: SC[c.status], background: SC[c.status] + "18", borderColor: SC[c.status] + "44" }}>{SL[c.status]}</span></div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div className="pt">العملاء</div><div className="ps">{clients.length} عميل</div></div>
        <button className="btn bngf" onClick={onAdd} style={{ padding: "8px 16px", fontSize: 13 }}><Icon name="user_plus" size={14} color="#000" />عميل</button>
      </div>
      <div className="sb-wrap"><span className="sb-ico"><Icon name="search" size={14} color="var(--muted)" /></span><input className="sb" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ paddingRight: 36 }} /></div>
      {filtered.length === 0
        ? <div className="empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: .3 }}><Icon name="clients" size={40} color="var(--muted)" /></div><div style={{ fontWeight: 500, color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>{clients.length === 0 ? "أضف أول عميل" : "لا نتائج"}</div>{clients.length === 0 && <button className="btn bngf" onClick={onAdd}>+ إضافة</button>}</div>
        : filtered.map(cl => (
          <div key={cl.id} className="clic" onClick={() => setSel(cl.id)}>
            <div className="cav"><Icon name="person" size={18} color="var(--ac)" /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div className="clic-name">{cl.name}</div><div className="clic-sub">{[cl.phone, `${contracts.filter(c => c.clientId === cl.id).length} عقد`].filter(Boolean).join(" · ")}</div></div>
            <WABtn phone={cl.phone} sm />
          </div>
        ))}
    </div>
  );
}

function IncomeScreen({ contracts }) {
  const videoOnly = c => Number(c.videoAmount || 0);
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const last30 = contracts.filter(c => c.startDate && new Date(c.startDate) >= thirtyAgo).reduce((s, c) => s + videoOnly(c), 0);
  const yearT = contracts.filter(c => c.startDate && new Date(c.startDate).getFullYear() === NOW.getFullYear()).reduce((s, c) => s + videoOnly(c), 0);
  const allCollected = contracts.reduce((s, c) => {
    if (c.noDuration) return s + videoOnly(c) * (c.fullPaymentPaid ? 1 : 0);
    return s + videoOnly(c) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0));
  }, 0);
  const pend = contracts.filter(c => c.status !== "cancelled").reduce((s, c) => {
    if (c.noDuration) return s + videoOnly(c) * (c.fullPaymentPaid ? 0 : 1);
    return s + videoOnly(c) * ((!c.deposit50Paid ? 0.5 : 0) + (!c.final50Paid ? 0.5 : 0));
  }, 0);
  const totalC = contracts.reduce((s, c) => s + videoOnly(c), 0);
  const activeT = contracts.filter(c => c.status === "active").reduce((s, c) => s + videoOnly(c), 0);
  const stats = [
    { l: "آخر 30 يوم", v: fmt(last30), icon: "clock" },
    { l: String(NOW.getFullYear()), v: fmt(yearT), icon: "income" },
    { l: "محصّل", v: fmt(allCollected), icon: "check", ac: true },
    { l: "متوقع", v: fmt(pend), icon: "calendar" },
    { l: "إجمالي العقود", v: fmt(totalC), icon: "contracts" },
    { l: "العقود النشطة", v: fmt(activeT), icon: "check" },
  ];
  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="hero-card">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-lbl">إجمالي المحصّل</div>
          <div className="hero-amount">{allCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>LYD</span></div>
          <div className="hero-change"><Icon name="check" size={12} color="var(--ac)" />{String(NOW.getFullYear())} · الفيديوهات فقط</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {stats.map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-lbl" style={{ color: s.ac ? "var(--ac)" : "var(--muted)" }}><Icon name={s.icon} size={12} color={s.ac ? "var(--ac)" : "var(--muted)"} />{s.l}</div>
            <div className={`stat-val sm${s.ac ? " ac" : ""}`}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="sec-hdr"><span className="sec-title">المحصّل حديثاً</span></div>
      {contracts.filter(c => c.deposit50Paid || c.final50Paid || c.fullPaymentPaid).slice(0, 6).map(c => (
        <div key={c.id} className="tx-card">
          <div className="tx-icon"><Icon name="income" size={16} color="var(--ac)" /></div>
          <div style={{ flex: 1, minWidth: 0 }}><div className="tx-name">{c.clientName}</div>
            <div className="tx-sub">
              {c.noDuration ? "دفعة كاملة" : (c.deposit50Paid && c.final50Paid ? "مدفوع بالكامل" : c.deposit50Paid ? "الدفعة الأولى" : "الدفعة الثانية")}
            </div>
          </div>
          <div className="tx-amt pos">
            {fmt(c.noDuration
              ? videoOnly(c) * (c.fullPaymentPaid ? 1 : 0)
              : videoOnly(c) * ((c.deposit50Paid ? 0.5 : 0) + (c.final50Paid ? 0.5 : 0)), c.currency)}
          </div>
        </div>
      ))}
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
  const [theme, setTheme] = useState(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return "dark";
  });
  const [confirm, setConfirm] = useState(null);
  const [selClient, setSelClient] = useState(null);
  const [auth, setAuth] = useState(() => sessionStorage.getItem("auth") === "ok");
  const [loginF, setLoginF] = useState({ u: "", p: "", err: "" });

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  useEffect(() => {
    if (!auth) return;
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
  }, [auth]);

  const doLogin = () => {
    if (loginF.u === CREDENTIALS.user && loginF.p === CREDENTIALS.pass) {
      sessionStorage.setItem("auth", "ok");
      setAuth(true);
    } else {
      setLoginF(f => ({ ...f, err: "اسم المستخدم أو كلمة المرور غلط" }));
    }
  };

  const addHist = (c, newStatus) => {
    if (c.status === newStatus) return c.statusHistory || [];
    return [...(c.statusHistory || []), { status: newStatus, date: new Date().toISOString() }];
  };

  const saveContract = async (c) => {
    const hist = addHist(c, c.status);
    const d2s = { ...c, statusHistory: hist };
    if (c.id) {
      const { data } = await supabase.from("contracts").update(toDB(d2s)).eq("id", c.id).select().single();
      if (data) setContracts(p => p.map(x => x.id === c.id ? toApp(data) : x));
    } else {
      const ih = [{ status: c.status, date: new Date().toISOString() }];
      const { data } = await supabase.from("contracts").insert(toDB({ ...c, statusHistory: ih })).select().single();
      if (data) setContracts(p => [toApp(data), ...p]);
    }
    setCm(null);
  };

  const delContract = id => setConfirm({
    msg: "هل تريد حذف هذا العقد نهائياً؟",
    onConfirm: async () => {
      await supabase.from("contracts").delete().eq("id", id);
      setContracts(p => p.filter(c => c.id !== id));
      setConfirm(null);
    }
  });

  const cancelContract = async id => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const hist = addHist(c, "cancelled");
    const updated = { ...c, status: "cancelled", statusHistory: hist };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const togglePay = async (id, field) => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const updated = { ...c, [field]: !c[field] };
    if (c.noDuration) {
      if (updated.fullPaymentPaid) { updated.status = "completed"; updated.statusHistory = addHist(c, "completed"); }
    } else {
      const vc = Number(updated.videoCount || 0), vd = Number(updated.videoDone || 0);
      const videosDone = vc === 0 || vd >= vc;
      if (updated.deposit50Paid && updated.final50Paid && videosDone) {
        updated.status = "completed";
        updated.statusHistory = addHist(c, "completed");
      }
    }
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const updateVideoDone = async (id, count) => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const updated = { ...c, videoDone: count };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const handlePdfExported = async id => {
    const c = contracts.find(x => x.id === id); if (!c) return;
    const hist = addHist(c, "active");
    const updated = { ...c, deposit50Paid: c.noDuration ? false : true, status: "active", statusHistory: hist };
    const { data } = await supabase.from("contracts").update(toDB(updated)).eq("id", id).select().single();
    if (data) setContracts(p => p.map(x => x.id === id ? toApp(data) : x));
  };

  const saveClient = async c => {
    if (c.id) {
      const { data } = await supabase.from("clients").update(toDBCl(c)).eq("id", c.id).select().single();
      if (data) setClients(p => p.map(x => x.id === c.id ? toAppCl(data) : x));
    } else {
      const { data } = await supabase.from("clients").insert(toDBCl(c)).select().single();
      if (data) setClients(p => [toAppCl(data), ...p]);
    }
    setClm(null);
  };

  const delClient = async id => { await supabase.from("clients").delete().eq("id", id); setClients(p => p.filter(c => c.id !== id)); };
  const goToClient = id => { setSelClient(id); setTab("clients"); };
  const goTo = t => {
    if (t === "contracts_new") { setTab("contracts"); setTimeout(() => setCm("new"), 100); }
    else if (t === "clients_new") { setTab("clients"); setTimeout(() => setClm("new"), 100); }
    else setTab(t);
  };

  const nav = [
    { key: "dashboard", label: "الرئيسية", icon: "dashboard" },
    { key: "clients", label: "العملاء", icon: "clients" },
    { key: "contracts", label: "العقود", icon: "contracts" },
    { key: "income", label: "الدخل", icon: "income" },
    { key: "wallet", label: "المحفظة", icon: "wallet" },
  ];

  const cssEl = <style dangerouslySetInnerHTML={{ __html: CSS }} />;

  if (!auth) return (
    <>
      {cssEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "var(--bg)", padding: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--card-border)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 360, boxShadow: "var(--shadow-float)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="lmark" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 22, margin: "0 auto 12px" }}>F</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>فارق للإنتاج</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>تسجيل الدخول</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="finp" placeholder="اسم المستخدم" value={loginF.u} onChange={e => setLoginF(f => ({ ...f, u: e.target.value }))} />
            <input className="finp" type="password" placeholder="كلمة المرور" value={loginF.p}
              onChange={e => setLoginF(f => ({ ...f, p: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && doLogin()} />
            {loginF.err && <div style={{ color: "var(--danger)", fontSize: 12, textAlign: "center" }}>{loginF.err}</div>}
            <button className="btn bngf" style={{ width: "100%", marginTop: 4 }} onClick={doLogin}>دخول</button>
          </div>
        </div>
      </div>
    </>
  );

  if (loading) return (
    <>
      {cssEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "var(--bg)", flexDirection: "column", gap: 14 }}>
        <div className="lmark" style={{ width: 60, height: 60, borderRadius: 18, fontSize: 26 }}>F</div>
        <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>جارٍ التحميل...</div>
      </div>
    </>
  );

  return (
    <>
      {cssEl}
      <div className="app">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="lmark" style={{ width: 36, height: 36, borderRadius: 11, fontSize: 15 }}>F</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>فارق</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>للإنتاج</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="tb-btn" onClick={() => setShowSearch(true)}><Icon name="search" size={16} color="var(--text2)" /></button>
            <button className="tb-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} size={16} color="var(--text2)" /></button>
          </div>
        </div>

        {tab === "dashboard" && <Dashboard contracts={contracts} clients={clients} goTo={goTo} onViewContract={setVm} />}
        {tab === "contracts" && <ContractsScreen contracts={contracts} clients={clients} onAdd={() => setCm("new")} onEdit={setCm} onDelete={delContract} onToggle={togglePay} onView={setVm} onVideoUpdate={updateVideoDone} onCancel={cancelContract} />}
        {tab === "clients" && <ClientsScreen clients={clients} contracts={contracts} onAdd={() => setClm("new")} onEdit={c => setClm(c)} onDelete={delClient} initialSel={selClient} />}
        {tab === "income" && <IncomeScreen contracts={contracts} />}
        {tab === "wallet" && <WalletScreen />}

        <nav className="bnav">
          {nav.map(n => (
            <div key={n.key} className={`bni${tab === n.key ? " on" : ""}`}
              onClick={() => { setTab(n.key); if (n.key !== "clients") setSelClient(null); }}>
              {n.key === "contracts" ? (
                <div className="bni-fab"><Icon name={n.icon} size={20} color="#000" /></div>
              ) : (
                <Icon name={n.icon} size={20} color={tab === n.key ? "var(--ac)" : "var(--muted)"} />
              )}
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