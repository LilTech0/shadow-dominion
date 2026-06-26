import { useState, useEffect } from "react";

const THEMES = {
  dark: {
    bg:"#060a06", card:"#0b0f0b", border:"#1a2e1a", border2:"#243824",
    red:"#00ff88", redBg:"#001a0e",
    green:"#a8ff3e", greenBg:"#0d1a00",
    blue:"#00e5ff", orange:"#f0ff00", orangeBg:"#1a1a00",
    purple:"#cc00ff", gold:"#00ff88", goldBg:"#001a0e",
    text:"#c8ffc8", muted:"#3a5a3a", dim:"#1e3a1e",
    topBar:"#080f08", statBar:"#090f09", navBg:"#0b0f0b",
    inp:"#060d06", logBg:"#040d04", barBg:"#060d06", authGrad:"#001a08",
  },
  light: {
    bg:"#f0f7f0", card:"#ffffff", border:"#b8d8b8", border2:"#8fbc8f",
    red:"#007a3d", redBg:"#d4f0e0",
    green:"#2a7a00", greenBg:"#e8f5d0",
    blue:"#006688", orange:"#886600", orangeBg:"#fff8cc",
    purple:"#770088", gold:"#007a3d", goldBg:"#d4f0e0",
    text:"#1a2e1a", muted:"#5a8a5a", dim:"#b0ccb0",
    topBar:"#e0f0e0", statBar:"#e8f5e8", navBg:"#ddeedd",
    inp:"#f8fff8", logBg:"#f0f8f0", barBg:"#e0ece0", authGrad:"#c8f0d8",
  },
};

let _isDark = localStorage.getItem("theme") !== "light";
let _themeListeners = [];
function getC() { return _isDark ? THEMES.dark : THEMES.light; }
function onThemeChange(fn) { _themeListeners.push(fn); return ()=>{ _themeListeners=_themeListeners.filter(f=>f!==fn); }; }
function toggleTheme() {
  _isDark = !_isDark;
  localStorage.setItem("theme", _isDark ? "dark" : "light");
  _themeListeners.forEach(fn=>fn(_isDark));
}

let C = getC();

function buildS(C) { return {
  app: { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Courier New',monospace", fontSize:13 },
  authWrap: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at center,${C.authGrad} 0%,${C.bg} 70%)` },
  authBox: { background:C.card, border:`1px solid ${C.border2}`, borderRadius:8, padding:32, width:"100%", maxWidth:400 },
  card: (x={}) => ({ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:16, marginBottom:12, ...x }),
  ct: { color:C.red, fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:12, fontWeight:700 },
  inp: { width:"100%", background:C.inp, border:`1px solid ${C.border2}`, borderRadius:4, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10 },
  btn: (c=C.red,b=C.redBg) => ({ background:b, border:`1px solid ${c}44`, borderRadius:4, padding:"9px 18px", color:c, fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:700 }),
  btnF: (c=C.red,b=C.redBg) => ({ width:"100%", background:b, border:`1px solid ${c}44`, borderRadius:4, padding:"11px", color:c, fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:700 }),
  badge: (c) => ({ display:"inline-block", padding:"2px 7px", borderRadius:10, fontSize:9, background:c+"18", color:c, border:`1px solid ${c}33`, letterSpacing:1 }),
  bar: (p,c) => ({ height:"100%", width:`${Math.min(100,Math.max(0,p))}%`, background:`linear-gradient(90deg,${c}88,${c})`, transition:"width 0.4s", boxShadow:`0 0 6px ${c}66` }),
  barW: { background:C.barBg, borderRadius:2, height:10, overflow:"hidden", flex:1, border:`1px solid ${C.border}`, position:"relative" },
  row: { display:"flex", gap:8, alignItems:"center", marginBottom:6 },
  g2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  logB: { background:C.logBg, border:`1px solid ${C.dim}`, borderRadius:4, padding:10, maxHeight:180, overflowY:"auto", fontSize:11, lineHeight:1.9 },
  nav: (a) => ({ padding:"12px 8px", cursor:"pointer", fontSize:9, letterSpacing:1, color:a?"#fff":C.muted, background:a?C.red+"33":"transparent", borderBottom:`2px solid ${a?C.red:"transparent"}`, display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1, textAlign:"center", fontWeight:a?700:400, userSelect:"none" }),
  topBar: { background:C.topBar, borderBottom:`1px solid ${C.border}`, padding:"6px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 },
  statBar: { background:C.statBar, borderBottom:`1px solid ${C.border}`, padding:"8px 14px", flexShrink:0 },
  navBar: { background:C.navBg, borderBottom:`1px solid ${C.border}`, display:"flex", flexShrink:0, overflowX:"auto" },
}; }

let S = buildS(C);

function useTheme() {
  const [dark, setDark] = useState(_isDark);
  useEffect(()=>onThemeChange(d=>{ setDark(d); C=getC(); S=buildS(C); }),[]);
  return dark;
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
export { THEMES, getC, onThemeChange, toggleTheme, C, buildS, S, useTheme };
