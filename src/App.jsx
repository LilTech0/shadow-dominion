const SUPABASE_URL = "https://uarwnztqtlmxdxpnunup.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_d2yDU8qFdcWuI33jhOjSyA_DDr9y2fN";
import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// GAME CONSTANTS & FORMULAS
// ============================================================
const CRIMES = [
  { id: "pickpocket",  name: "Pickpocket",   baseChance: 70, baseReward: 200,   nerve: 3,  xp: 10,  difficulty: 5,  desc: "Lift wallets from distracted marks" },
  { id: "shoplifting", name: "Shoplifting",  baseChance: 65, baseReward: 400,   nerve: 5,  xp: 20,  difficulty: 10, desc: "Five-finger discount at the mall" },
  { id: "mugging",     name: "Mugging",      baseChance: 55, baseReward: 700,   nerve: 8,  xp: 35,  difficulty: 18, desc: "Strong-arm a civilian for cash" },
  { id: "carjacking",  name: "Car Theft",    baseChance: 50, baseReward: 1000,  nerve: 12, xp: 60,  difficulty: 20, desc: "Boost a ride from the parking garage" },
  { id: "robbery",     name: "Armed Robbery",baseChance: 40, baseReward: 2500,  nerve: 18, xp: 100, difficulty: 30, desc: "Hit a convenience store at gunpoint" },
  { id: "heist",       name: "Bank Heist",   baseChance: 25, baseReward: 8000,  nerve: 30, xp: 250, difficulty: 50, desc: "Crack a downtown vault with the crew" },
];

const ITEMS = [
  { id: "knife",    name: "Switchblade",   type: "weapon", weaponDmg: 8,  armorRating: 0,  price: 500,   rarity: "common" },
  { id: "pipe",     name: "Lead Pipe",     type: "weapon", weaponDmg: 14, armorRating: 0,  price: 1200,  rarity: "common" },
  { id: "pistol",   name: "9mm Pistol",    type: "weapon", weaponDmg: 25, armorRating: 0,  price: 4000,  rarity: "rare" },
  { id: "shotgun",  name: "Sawn-Off",      type: "weapon", weaponDmg: 38, armorRating: 0,  price: 8000,  rarity: "rare" },
  { id: "uzi",      name: "Micro Uzi",     type: "weapon", weaponDmg: 52, armorRating: 0,  price: 18000, rarity: "legendary" },
  { id: "vest",     name: "Stab Vest",     type: "armor",  weaponDmg: 0,  armorRating: 10, price: 800,   rarity: "common" },
  { id: "jacket",   name: "Kevlar Jacket", type: "armor",  weaponDmg: 0,  armorRating: 22, price: 5000,  rarity: "rare" },
  { id: "plate",    name: "Tactical Plate",type: "armor",  weaponDmg: 0,  armorRating: 38, price: 15000, rarity: "legendary" },
  { id: "lockpick", name: "Lockpick Set",  type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 600,   crimeBonus: 10, rarity: "common" },
  { id: "scanner",  name: "Police Scanner",type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 1500,  crimeBonus: 18, rarity: "rare" },
];

const GYMS = [
  { id:"street", name:"Street Gym",       base:5,  mult:1.0, cost:10,  unlockLevel:1,  desc:"Rusted weights in an alley." },
  { id:"local",  name:"Local Gym",        base:10, mult:1.5, cost:20,  unlockLevel:5,  desc:"A proper gym with real equipment." },
  { id:"pro",    name:"Professional Gym", base:20, mult:2.0, cost:50,  unlockLevel:15, desc:"Coaches and serious athletes." },
  { id:"elite",  name:"Elite Gym",        base:35, mult:3.0, cost:100, unlockLevel:30, desc:"Private trainers, top machines." },
  { id:"lab",    name:"Underground Lab",  base:50, mult:4.0, cost:200, unlockLevel:50, desc:"No rules. Maximum gains. Legends only." },
];

const TRAIN_STATS = [
  { id:"strength",  name:"Strength",  icon:"💪", desc:"Increases attack power" },
  { id:"defense",   name:"Defense",   icon:"🛡", desc:"Reduces damage taken" },
  { id:"dexterity", name:"Dexterity", icon:"⚡", desc:"Hit chance & crit rate" },
];

const DAILY_REWARDS = {
  1: { cash:500,   label:"$500" },
  2: { cash:1000,  label:"$1,000" },
  3: { cash:2000,  label:"$2,000" },
  4: { cash:1500,  label:"$1,500" },
  5: { cash:2500,  label:"$2,500" },
  6: { cash:3000,  label:"$3,000" },
  7: { cash:5000,  label:"$5,000 + Rare Item", itemId:"scanner" },
};

const XP_FOR_LEVEL = (lvl) => Math.floor(100 * Math.pow(lvl, 1.5));
const MAX_ENERGY = 100, MAX_NERVE = 50, MAX_HEALTH = 100;
const SYNDICATE_COST = 100000000;
const ADMIN_USER = "admin", ADMIN_PASS = "ShadowAdmin@2024";

// ── PROPERTIES ──────────────────────────────────────────────
const PROPERTIES = [
  { id:"safehouse",  name:"Safe House",        icon:"🏠", price:50000,    incomePerHour:500,   unlockLevel:5,  desc:"A quiet bolt-hole. Trickles in rent money." },
  { id:"chopshop",   name:"Chop Shop",         icon:"🔧", price:250000,   incomePerHour:2500,  unlockLevel:15, desc:"Strip and sell stolen rides. Steady work." },
  { id:"warehouse",  name:"Warehouse",         icon:"🏭", price:1000000,  incomePerHour:8000,  unlockLevel:25, desc:"Store and move product. Real money here." },
  { id:"nightclub",  name:"Nightclub",         icon:"🎰", price:5000000,  incomePerHour:25000, unlockLevel:40, desc:"Front for the operation. Prints cash nightly." },
  { id:"casino",     name:"Underground Casino",icon:"♠", price:25000000, incomePerHour:100000,unlockLevel:60, desc:"High stakes. The house always wins — yours." },
];

// ── BLACK MARKET ─────────────────────────────────────────────
const BM_POOL = [
  { id:"bm_silencer", name:"Silencer Kit",    type:"weapon", weaponDmg:45, armorRating:0, rarity:"rare",      basePrice:12000 },
  { id:"bm_smg",      name:"Compact SMG",     type:"weapon", weaponDmg:60, armorRating:0, rarity:"legendary", basePrice:30000 },
  { id:"bm_ceramic",  name:"Ceramic Plate",   type:"armor",  weaponDmg:0,  armorRating:50,rarity:"legendary", basePrice:22000 },
  { id:"bm_chainmail",name:"Dragon-Skin Vest",type:"armor",  weaponDmg:0,  armorRating:30,rarity:"rare",      basePrice:9000  },
  { id:"bm_jammer",   name:"Signal Jammer",   type:"tool",   weaponDmg:0,  armorRating:0, rarity:"rare",      basePrice:8000,  crimeBonus:25 },
  { id:"bm_drone",    name:"Recon Drone",     type:"tool",   weaponDmg:0,  armorRating:0, rarity:"legendary", basePrice:20000, crimeBonus:35 },
  { id:"bm_stim",     name:"Combat Stims",    type:"consumable",weaponDmg:0,armorRating:0,rarity:"rare",      basePrice:5000  },
  { id:"bm_medkit",   name:"Field Medkit",    type:"consumable",weaponDmg:0,armorRating:0,rarity:"common",    basePrice:2000  },
];

// ── PRESTIGE ─────────────────────────────────────────────────
const PRESTIGE_BONUS = [
  { tier:1, label:"GHOST",    color:"#aaa",    cashMult:1.10, xpMult:1.10, crimeBonus:5  },
  { tier:2, label:"PHANTOM",  color:"#4d9fff", cashMult:1.25, xpMult:1.20, crimeBonus:10 },
  { tier:3, label:"WRAITH",   color:"#9b6dff", cashMult:1.50, xpMult:1.35, crimeBonus:18 },
  { tier:4, label:"SPECTER",  color:"#ff8c00", cashMult:1.80, xpMult:1.50, crimeBonus:25 },
  { tier:5, label:"SHADOW",   color:"#e8001e", cashMult:2.20, xpMult:2.00, crimeBonus:35 },
];
const PRESTIGE_REQ_LEVEL = 50;

// ── JAIL ─────────────────────────────────────────────────────
const BAIL_COST = (level) => Math.floor(500 * Math.pow(level, 1.3));
const JAIL_SENTENCES = {
  "pickpocket":    { time: 1 },
  "shoplifting":   { time: 2 },
  "mugging":       { time: 4 },
  "car theft":     { time: 6 },
  "armed robbery": { time: 10 },
  "bank heist":    { time: 20 },
};

// ── TRAVEL ───────────────────────────────────────────────────
const CITIES = [
  {
    id:"hometown", name:"Maplewood", flag:"🏙", unlockLevel:1, travelCost:0, travelHours:0,
    desc:"Your turf. Familiar streets, familiar risks.",
    crimeBonus:0, cashMult:1.0, xpMult:1.0,
    crimes:["pickpocket","shoplifting","mugging","carjacking","robbery","heist"],
    lootTable:["knife","pipe","lockpick","vest"],
    flavor:"The city you grew up in. Every alley tells a story.",
  },
  {
    id:"portclay", name:"Port Clay", flag:"⚓", unlockLevel:5, travelCost:5000, travelHours:1,
    desc:"A port city thick with smugglers and bent cops.",
    crimeBonus:5, cashMult:1.15, xpMult:1.1,
    crimes:["shoplifting","mugging","carjacking","robbery","heist"],
    lootTable:["pipe","pistol","lockpick","scanner","vest"],
    flavor:"Salt air and dirty money. The docks never sleep.",
  },
  {
    id:"neonridge", name:"Neon Ridge", flag:"🌆", unlockLevel:15, travelCost:25000, travelHours:3,
    desc:"Vice city. Casinos, clubs, and corporate crime.",
    crimeBonus:10, cashMult:1.35, xpMult:1.2,
    crimes:["mugging","carjacking","robbery","heist"],
    lootTable:["pistol","shotgun","jacket","scanner","bm_jammer"],
    flavor:"Everything's for sale here. Even the law.",
  },
  {
    id:"irongate", name:"Iron Gate", flag:"🏭", unlockLevel:25, travelCost:100000, travelHours:6,
    desc:"Industrial wasteland run by rival syndicates.",
    crimeBonus:15, cashMult:1.6, xpMult:1.35,
    crimes:["carjacking","robbery","heist"],
    lootTable:["shotgun","uzi","jacket","plate","bm_chainmail","bm_jammer"],
    flavor:"Smoke stacks and gunfire. Survival is the only rule.",
  },
  {
    id:"ghosthaven", name:"Ghost Haven", flag:"💀", unlockLevel:40, travelCost:500000, travelHours:12,
    desc:"The underworld capital. No rules. No mercy.",
    crimeBonus:25, cashMult:2.0, xpMult:1.6,
    crimes:["robbery","heist"],
    lootTable:["uzi","plate","bm_silencer","bm_smg","bm_ceramic","bm_drone"],
    flavor:"You came here to make a name — or lose one forever.",
  },
];

const TRAVEL_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between trips

function calcTravelArrival(hours) { return Date.now() + hours * 3600000; }

function calcAttack(p)  { const w = ITEMS.find(i=>i.id===p.equippedWeapon); return p.strength+(w?.weaponDmg||0)+p.level*2; }
function calcDefense(p) { const a = ITEMS.find(i=>i.id===p.equippedArmor);  return p.defense+(a?.armorRating||0)+p.level*2; }
function calcHitChance(ad,dd) { return Math.min(95,Math.max(20,75+ad/10-dd/10)); }
function calcDamage(atk,def)  { return Math.max(1,atk-def*0.5); }
function calcCritChance(dex)  { return 5+dex/50; }
function calcEnergyRegen(ts)  { return Math.floor((Date.now()-ts)/300000); }
function calcNerveRegen(ts)   { return Math.floor((Date.now()-ts)/600000); }
function calcHealthRegen(ts)  { return Math.floor((Date.now()-ts)/180000); }
function gymGain(cur,base,mult,rep) {
  const repBonus = Math.sqrt(Math.max(1,rep));
  return Math.max(1,parseFloat(((base*repBonus*mult)/(1+(cur/500000))).toFixed(2)));
}

function createPlayer(name,username) {
  return {
    name, username, level:1, xp:0, cash:1000, reputation:0,
    strength:10, defense:10, dexterity:10, statPoints:0,
    energy:MAX_ENERGY, nerve:MAX_NERVE, health:MAX_HEALTH,
    lastEnergyRegen:Date.now(), lastNerveRegen:Date.now(), lastHealthRegen:Date.now(),
    inventory:[], equippedWeapon:null, equippedArmor:null,
    syndicate:null, loginStreak:0, lastLoginDate:null, loginRewardClaimed:false,
    wins:0, losses:0, crimeStats:{total:0,success:0},
    properties:{}, propUpgrades:{}, lastPropertyCollect:Date.now(), currentCity:"hometown", travellingTo:null, travelArrival:null, lastTravel:null, citiesVisited:["hometown"],
    prestigeTier:0, prestigeCount:0,
    bmSeed:Date.now(),
    notifications:[], notifUnread:0,
    jailUntil:null, jailSentence:0, timesJailed:0, breakouts:0, bailPaid:0,
  };
}

// ── helpers ──────────────────────────────────────────────────
function getPrestige(tier){ return PRESTIGE_BONUS.find(p=>p.tier===tier)||null; }
function calcPropertyIncome(props, lastCollect) {
  const hours = Math.min(24, (Date.now()-lastCollect)/3600000);
  return PROPERTIES.reduce((sum,p)=>{
    const qty = props[p.id]||0;
    return sum + Math.floor(p.incomePerHour * qty * hours);
  },0);
}
function getDailyBMItems(seed) {
  const dateKey = new Date().toDateString();
  let h = 0;
  for(let i=0;i<(seed+dateKey).length;i++) h = Math.imul(31,h)+(seed+dateKey).charCodeAt(i)|0;
  const rng = (n) => { h = Math.imul(h^(h>>>16),0x45d9f3b); h = Math.imul(h^(h>>>16),0x45d9f3b); return Math.abs(h^(h>>>16)) % n; };
  const pool = [...BM_POOL];
  for(let i=pool.length-1;i>0;i--){ const j=rng(i+1); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool.slice(0,4).map(item=>({
    ...item,
    price: Math.floor(item.basePrice*(0.7+rng(60)/100)),
    stock: 1+rng(3),
  }));
}

// ── NOTIFICATION HELPERS ─────────────────────────────────────
const NOTIF_TYPES = {
  combat:  { icon:"⚔",  color:"#e8001e" },
  crime:   { icon:"🔪",  color:"#ff8c00" },
  income:  { icon:"💰",  color:"#ffd700" },
  level:   { icon:"🆙",  color:"#9b6dff" },
  prestige:{ icon:"⚡",  color:"#e8001e" },
  system:  { icon:"📢",  color:"#4d9fff" },
  reward:  { icon:"🎁",  color:"#ffd700" },
  buy:     { icon:"🛒",  color:"#00e87a" },
  jail:    { icon:"🔒",  color:"#ff4d4d" },
};
function makeNotif(type, text) {
  return { id: Date.now()+Math.random(), type, text, ts: Date.now(), read: false };
}
function addNotif(player, type, text) {
  const n = makeNotif(type, text);
  const notifications = [n, ...(player.notifications||[])].slice(0, 100);
  return { ...player, notifications, notifUnread: (player.notifUnread||0)+1 };
}
function tsAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return s+"s ago";
  if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

function createEnemy(playerLevel) {
  const lvl = Math.max(1,playerLevel+Math.floor(Math.random()*5)-2);
  const names = ["Street Rat","Corner Boy","Blood Hawk","Iron Mask","The Warden","Ghost Nine","Viper","Cold Cut","Razor","The Judge"];
  return {
    id:`e_${Date.now()}`, name:names[Math.floor(Math.random()*names.length)],
    level:lvl, strength:8+lvl*2, defense:6+lvl*2, dexterity:5+lvl,
    health:MAX_HEALTH, equippedWeapon:lvl>=5?"pistol":lvl>=3?"pipe":"knife",
    equippedArmor:lvl>=4?"vest":null, cash:Math.floor(Math.random()*lvl*300+100), xp:lvl*15,
  };
}

// Storage
function getAccounts()   { try { return JSON.parse(localStorage.getItem("sd_accounts")||"{}"); }  catch { return {}; } }
function saveAccounts(a) { try { localStorage.setItem("sd_accounts",JSON.stringify(a)); }         catch {} }
function getSyndicates() { try { return JSON.parse(localStorage.getItem("sd_syndicates")||"[]"); } catch { return []; } }
function saveSyndicates(s){ try { localStorage.setItem("sd_syndicates",JSON.stringify(s)); }       catch {} }
function getAnnouncements(){ try { return JSON.parse(localStorage.getItem("sd_announcements")||"[]"); } catch { return []; } }
function saveAnnouncements(a){ try { localStorage.setItem("sd_announcements",JSON.stringify(a)); } catch {} }

// ============================================================
// STYLES
// ============================================================
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
function TopStatBar({label,val,max,color,regen}) {
  const pct=Math.min(100,Math.max(0,(val/max)*100));
  const full=Math.floor(val)>=max;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{color:C.muted,fontSize:9,minWidth:46,letterSpacing:1}}>{label}</span>
      <div style={{...S.barW,height:14}}>
        <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${color}88,${color})`,transition:"width 0.4s",boxShadow:`0 0 8px ${color}55`}}/>
        <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,textShadow:"0 0 4px #000"}}>{Math.floor(val)}/{max}</span>
      </div>
      <span style={{color:full?"#333":color,fontSize:8,minWidth:46}}>{full?"FULL":"+1 "+regen}</span>
    </div>
  );
}

function Toast({msg,onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return()=>clearTimeout(t); },[onClose]);
  const good=/✅|🆙|🏆|🏴|🎁|\+\$/.test(msg);
  return(<div style={{position:"fixed",top:16,right:16,background:good?C.greenBg:C.redBg,border:`1px solid ${good?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:good?C.green:"#ff6e6e",fontSize:12,zIndex:9999,maxWidth:320,lineHeight:1.5,boxShadow:"0 4px 20px #00000080"}}>{msg}</div>);
}

function Tabs({tabs,active,onSelect}) {
  return(<div style={{display:"flex",gap:6,marginBottom:14}}>
    {tabs.map(t=>(<button key={t} onClick={()=>onSelect(t)} style={{padding:"7px 18px",background:active===t?C.red:"#0d140d",border:`1px solid ${active===t?C.red:C.border}`,borderRadius:4,color:active===t?"#fff":C.muted,cursor:"pointer",fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>{t}</button>))}
  </div>);
}

function Confirm({msg,onYes,onNo}) {
  return(<div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:28,maxWidth:320,textAlign:"center"}}>
      <div style={{marginBottom:20,lineHeight:1.6}}>{msg}</div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button style={S.btn()} onClick={onYes}>CONFIRM</button>
        <button style={S.btn(C.muted,"#0d140d")} onClick={onNo}>CANCEL</button>
      </div>
    </div>
  </div>);
}

// ============================================================
// DAILY LOGIN MODAL
// ============================================================
function DailyModal({player,onClaim,onClose}) {
  const streak=Math.min(7,Math.max(1,player.loginStreak||1));
  const reward=DAILY_REWARDS[streak];
  return(<div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998}}>
    <div style={{background:C.card,border:`1px solid ${C.gold}44`,borderRadius:10,padding:32,maxWidth:360,width:"100%",textAlign:"center"}}>
      <div style={{color:C.gold,fontSize:22,fontWeight:900,letterSpacing:3,marginBottom:4}}>DAILY REWARD</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:20}}>Login Streak: Day {streak}</div>
      <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:24}}>
        {[1,2,3,4,5,6,7].map(d=>(<div key={d} style={{width:36,height:36,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:d<streak?C.goldBg:d===streak?C.gold:"#0d140d",color:d<streak?C.gold:d===streak?"#000":C.dim,border:`1px solid ${d<=streak?C.gold:C.dim}`}}>{d}</div>))}
      </div>
      <div style={{color:C.gold,fontSize:20,fontWeight:900,marginBottom:6}}>{reward.label}</div>
      {reward.itemId&&<div style={{color:C.orange,fontSize:12,marginBottom:16}}>+ {ITEMS.find(i=>i.id===reward.itemId)?.name}</div>}
      <button style={S.btnF(C.gold,C.goldBg)} onClick={()=>onClaim(reward)}>CLAIM REWARD</button>
      <div style={{marginTop:10,color:C.muted,fontSize:10,cursor:"pointer"}} onClick={onClose}>skip for now</div>
    </div>
  </div>);
}

// ============================================================
// ANNOUNCEMENT BANNER
// ============================================================
function AnnouncementBanner() {
  const [ann,setAnn]=useState(null);
  const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{
    const list=getAnnouncements();
    if(list.length>0)setAnn(list[0]);
  },[]);
  if(!ann||dismissed)return null;
  return(<div style={{background:"#1a1a00",border:`1px solid ${C.orange}44`,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,flexShrink:0}}>
    <span>📢 <span style={{color:C.orange,fontWeight:700}}>ANNOUNCEMENT:</span> <span style={{color:C.text}}>{ann.text}</span></span>
    <button style={{...S.btn(C.muted,"transparent"),padding:"2px 8px",fontSize:10}} onClick={()=>setDismissed(true)}>✕</button>
  </div>);
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({onLogin}) {
  const [tab,setTab]=useState("login");
  const [form,setForm]=useState({username:"",password:"",name:""});
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);

  async function handle() {
    setErr(""); setBusy(true);
    if(tab==="login") {
      const accs=getAccounts();
      if(!accs[form.username.toLowerCase()]){setBusy(false);return setErr("Account not found.");}
      if(accs[form.username.toLowerCase()].password!==form.password){setBusy(false);return setErr("Wrong password.");}
      const player=accs[form.username.toLowerCase()].player;
      const today=new Date().toDateString();
      const yesterday=new Date(Date.now()-86400000).toDateString();
      let streak=player.loginStreak||0, claimed=false;
      if(player.lastLoginDate===today){claimed=player.loginRewardClaimed;}
      else if(player.lastLoginDate===yesterday){streak=Math.min(7,streak+1);claimed=false;}
      else{streak=1;claimed=false;}
      const updated={...player,loginStreak:streak,lastLoginDate:today,loginRewardClaimed:claimed};
      accs[form.username.toLowerCase()].player=updated;
      saveAccounts(accs);
      setBusy(false);
      onLogin(updated);
    } else {
      if(!form.name||!form.username||!form.password){setBusy(false);return setErr("All fields required.");}
      if(form.username.length<3){setBusy(false);return setErr("Username: min 3 chars.");}
      if(form.password.length<4){setBusy(false);return setErr("Password: min 4 chars.");}
      const uname=form.username.toLowerCase().trim();
      const accs=getAccounts();
      if(accs[uname]){setBusy(false);return setErr("Username taken.");}
      const player=createPlayer(form.name.trim(),uname);
      const today=new Date().toDateString();
      player.loginStreak=1; player.lastLoginDate=today; player.loginRewardClaimed=false;
      accs[uname]={password:form.password,player};
      saveAccounts(accs);
      setBusy(false);
      onLogin(player);
    }
  }

  return(<div style={S.authWrap}>
    <div style={{marginBottom:24,textAlign:"center"}}>
      <div style={{color:C.red,fontSize:32,fontWeight:900,letterSpacing:6,textShadow:`0 0 30px ${C.red}88`}}>SHADOW</div>
      <div style={{color:C.red,fontSize:32,fontWeight:900,letterSpacing:6,textShadow:`0 0 30px ${C.red}88`}}>DOMINION</div>
      <div style={{color:C.muted,fontSize:10,letterSpacing:4,marginTop:6}}>ALPHA v0.1 — THE STREETS DON'T SLEEP</div>
    </div>
    <div style={S.authBox}>
      <Tabs tabs={["login","register"]} active={tab} onSelect={t=>{setTab(t);setErr("");}}/>
      {tab==="register"&&<input style={S.inp} placeholder="Display Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>}
      <input style={S.inp} placeholder="Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
      <input style={S.inp} type="password" placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handle()}/>
      {err&&<div style={{color:C.red,fontSize:11,marginBottom:10}}>⚠ {err}</div>}
      <button style={{...S.btnF(),opacity:busy?0.5:1}} onClick={handle} disabled={busy}>
        {busy?"LOADING...":(tab==="login"?"ENTER THE DOMINION":"JOIN THE UNDERWORLD")}
      </button>
    </div>
  </div>);
}

// ============================================================
// PROFILE PAGE
// ============================================================
function ProfilePage({player,onStatUp}) {
  const xpN=XP_FOR_LEVEL(player.level+1);
  const wpn=ITEMS.find(i=>i.id===player.equippedWeapon);
  const arm=ITEMS.find(i=>i.id===player.equippedArmor);
  const wr=player.wins+player.losses>0?((player.wins/(player.wins+player.losses))*100).toFixed(0):"—";
  return(<div>
    <div style={S.card()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{color:"#fff",fontSize:20,fontWeight:900,letterSpacing:2}}>{player.name}</div>
          <div style={{color:C.muted,fontSize:10}}>@{player.username}</div>
          {player.syndicate&&<div style={{marginTop:4}}><span style={S.badge(C.purple)}>🏴 {player.syndicate}</span></div>}
          {player.prestigeTier>0&&<div style={{marginTop:4}}><span style={S.badge(getPrestige(player.prestigeTier)?.color||C.muted)}>{getPrestige(player.prestigeTier)?.label} T{player.prestigeTier}</span></div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:C.red,fontSize:24,fontWeight:900}}>LVL {player.level}</div>
          <span style={S.badge(C.orange)}>⭐ {player.reputation} REP</span>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:3}}><span>✨ XP</span><span>{player.xp.toLocaleString()}/{xpN.toLocaleString()}</span></div>
        <div style={S.barW}><div style={{...S.bar((player.xp/xpN)*100,C.purple),height:"100%"}}/></div>
      </div>
      <div style={{display:"flex",gap:20,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[["CASH","$"+player.cash.toLocaleString(),C.green],["WINS",player.wins,C.blue],["LOSSES",player.losses,C.red],["WIN%",wr==="—"?wr:wr+"%",C.orange],["CRIMES",player.crimeStats?.total||0,C.muted]].map(([l,v,c])=>(
          <div key={l}><div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div><div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div></div>
        ))}
      </div>
    </div>
    <div style={S.g2}>
      <div style={S.card()}>
        <div style={S.ct}>⚔ COMBAT STATS</div>
        {[["STR","strength",C.red],["DEF","defense",C.blue],["DEX","dexterity",C.orange]].map(([l,k,c])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:C.muted,fontSize:11}}>{l}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:c,fontWeight:900,fontSize:15}}>{player[k]}</span>
              {player.statPoints>0&&<button onClick={()=>onStatUp(k)} style={{...S.btn(C.green,C.greenBg),padding:"2px 8px",fontSize:10}}>+</button>}
            </div>
          </div>
        ))}
        {player.statPoints>0&&<div style={{color:C.green,fontSize:10,marginTop:6}}>● {player.statPoints} points to spend</div>}
        <div style={{borderTop:`1px solid ${C.border}`,marginTop:10,paddingTop:10}}>
          {[["ATK PWR",calcAttack(player),C.red],["DEF PWR",calcDefense(player),C.blue],["HIT %",calcHitChance(player.dexterity,10).toFixed(0)+"%","#fff"],["CRIT %",calcCritChance(player.dexterity).toFixed(1)+"%",C.orange]].map(([l,v,c])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between"}}>
              <span style={{color:C.muted,fontSize:10}}>{l}</span>
              <span style={{color:c,fontWeight:900}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card()}>
        <div style={S.ct}>🎒 LOADOUT</div>
        <div style={{marginBottom:12}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>WEAPON</div><div style={{color:wpn?C.orange:"#333",fontWeight:wpn?700:400}}>{wpn?.name||"Bare Hands"}</div>{wpn&&<div style={{color:C.muted,fontSize:10}}>+{wpn.weaponDmg} ATK</div>}</div>
        <div style={{marginBottom:12}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>ARMOR</div><div style={{color:arm?C.blue:"#333",fontWeight:arm?700:400}}>{arm?.name||"None"}</div>{arm&&<div style={{color:C.muted,fontSize:10}}>+{arm.armorRating} DEF</div>}</div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>LOGIN STREAK</div><div style={{display:"flex",gap:4}}>{[1,2,3,4,5,6,7].map(d=>(<div key={d} style={{width:22,height:22,borderRadius:3,background:d<=(player.loginStreak||0)?C.gold:"#0d140d",border:`1px solid ${d<=(player.loginStreak||0)?C.gold:C.dim}`,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:d<=(player.loginStreak||0)?"#000":C.dim,fontWeight:700}}>{d}</div>))}</div></div>
      </div>
    </div>
  </div>);
}

// ============================================================
// CRIMES PAGE
// ============================================================
function CrimesPage({player,onCrime}) {
  const [log,setLog]=useState([]);
  const tool=ITEMS.find(i=>i.type==="tool"&&player.inventory.includes(i.id)&&i.crimeBonus);
  const eb=tool?.crimeBonus||0;
  const inJail=player.jailUntil&&player.jailUntil>Date.now();
  const jailLeft=inJail?Math.ceil((player.jailUntil-Date.now())/60000):0;

  function commit(crime) {
    if(inJail){setLog(l=>[{t:`🔒 You're in jail for ${jailLeft} more min!`,g:false},...l]);return;}
    if(player.nerve<crime.nerve){setLog(l=>[{t:`❌ Not enough nerve (need ${crime.nerve})`,g:false},...l]);return;}
    const chance=Math.min(95,Math.max(5,crime.baseChance+Math.floor(player.level*1.5)+eb-crime.difficulty));
    if(Math.random()*100<=chance){
      const reward=Math.floor(crime.baseReward*(0.8+Math.random()*0.4));
      onCrime({success:true,nerveCost:crime.nerve,cash:reward,xp:crime.xp,rep:1,crimeName:crime.name});
      setLog(l=>[{t:`✅ ${crime.name} — +$${reward.toLocaleString()} | +${crime.xp}xp | +1 REP`,g:true},...l.slice(0,29)]);
    } else {
      onCrime({success:false,nerveCost:crime.nerve,cash:0,xp:Math.floor(crime.xp*0.1),rep:-1,crimeName:crime.name});
      setLog(l=>[{t:`❌ BUSTED — ${crime.name} | -1 REP`,g:false},...l.slice(0,29)]);
    }
  }
  return(<div>
    {inJail&&<div style={S.card({borderColor:C.red+"55",background:"#160006"})}>
      <div style={S.ct}>🔒 IN JAIL</div>
      <div style={{color:C.red,fontWeight:700,fontSize:13,marginBottom:4}}>You cannot commit crimes while jailed.</div>
      <div style={{color:C.muted,fontSize:11}}>Released in <span style={{color:"#fff",fontWeight:700}}>{jailLeft} min</span> · Go to the Jail tab to bail out or break free.</div>
    </div>}
    <div style={S.card()}><div style={S.ct}>🔪 CRIMINAL ACTIVITY</div><div style={{color:C.muted,fontSize:11}}>NERVE: <span style={{color:C.orange}}>{player.nerve}/{MAX_NERVE}</span> · Regens 1/10min{tool&&<span style={{color:C.green,marginLeft:12}}>🔧 {tool.name} (+{eb}%)</span>}</div></div>
    {CRIMES.map(crime=>{
      const chance=Math.min(95,Math.max(5,crime.baseChance+Math.floor(player.level*1.5)+eb-crime.difficulty));
      const can=player.nerve>=crime.nerve;
      return(<div key={crime.id} style={S.card({opacity:can?1:0.45})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div><div style={{color:"#fff",fontWeight:700,marginBottom:3}}>{crime.name}</div><div style={{color:C.muted,fontSize:11}}>{crime.desc}</div></div>
          <button onClick={()=>commit(crime)} disabled={!can} style={{...S.btn(),cursor:can?"pointer":"not-allowed",opacity:can?1:0.5}}>DO IT</button>
        </div>
        <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
          <span style={{color:C.orange}}>⚡ {crime.nerve}</span>
          <span style={{color:C.green}}>+${crime.baseReward.toLocaleString()}</span>
          <span style={{color:C.purple}}>+{crime.xp}xp</span>
          <span style={{color:chance>=60?C.green:chance>=40?C.orange:"#ff4d4d"}}>{chance}%</span>
        </div>
      </div>);
    })}
    {log.length>0&&<div style={S.card()}><div style={S.ct}>📋 CRIME LOG</div><div style={S.logB}>{log.map((l,i)=><div key={i} style={{color:l.g?C.green:"#ff6e6e"}}>{l.t}</div>)}</div></div>}
  </div>);
}

// ============================================================
// GYM PAGE
// ============================================================
function GymPage({player,onTrain}) {
  const [selGym,setSelGym]=useState("street");
  const [log,setLog]=useState([]);
  const gym=GYMS.find(g=>g.id===selGym);
  const bonusMult=player.syndicate?1.15:1;
  const repSqrt=parseFloat(Math.sqrt(Math.max(1,player.reputation)).toFixed(2));
  function train(statId) {
    if(player.energy<gym.cost){setLog(l=>[{t:`❌ Need ${gym.cost}⚡`,g:false},...l]);return;}
    const cur=parseFloat(player[statId])||10;
    const gain=gymGain(cur,gym.base,gym.mult*bonusMult,player.reputation);
    const stat=TRAIN_STATS.find(s=>s.id===statId);
    onTrain({statId,gain,energyCost:gym.cost});
    setLog(l=>[{t:`${stat.icon} ${stat.name} +${gain.toLocaleString()} [${gym.name}]`,g:true},...l.slice(0,49)]);
  }
  return(<div>
    <div style={S.card()}>
      <div style={S.ct}>🏋 GYM</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:8}}>Energy: <span style={{color:C.blue}}>{Math.floor(player.energy)}/{MAX_ENERGY}</span> · Gains scale with REP</div>
      <div style={{display:"flex",gap:16,fontSize:11,flexWrap:"wrap"}}>
        <span>⭐ REP Bonus: <span style={{color:C.gold,fontWeight:700}}>×{repSqrt}</span></span>
        {player.syndicate&&<span style={{color:C.purple}}>🏴 Syndicate: ×1.15</span>}
      </div>
    </div>
    <div style={S.card()}>
      <div style={S.ct}>SELECT GYM</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {GYMS.map(g=>{
          const unlocked=player.level>=g.unlockLevel, active=selGym===g.id;
          return(<div key={g.id} onClick={()=>unlocked&&setSelGym(g.id)} style={{padding:"12px",borderRadius:6,border:`1px solid ${active?C.orange:unlocked?C.border:C.dim}`,background:active?"#1a1a00":"#0d0d18",cursor:unlocked?"pointer":"not-allowed",opacity:unlocked?1:0.4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{color:active?C.orange:"#fff",fontWeight:700}}>{g.name}{active?" ✓":""}</div><div style={{color:C.muted,fontSize:10,marginTop:2}}>{g.desc}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:C.gold,fontWeight:900}}>×{g.mult}</div><div style={{color:C.blue,fontSize:10}}>{g.cost}⚡</div>{!unlocked&&<span style={S.badge(C.red)}>LVL {g.unlockLevel}</span>}</div>
            </div>
          </div>);
        })}
      </div>
    </div>
    <div style={S.card()}>
      <div style={S.ct}>TRAIN — {gym.name.toUpperCase()} <span style={S.badge(C.gold)}>×{gym.mult}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {TRAIN_STATS.map(stat=>{
          const cur=parseFloat(player[stat.id])||10;
          const preview=gymGain(cur,gym.base,gym.mult*bonusMult,player.reputation);
          const canT=player.energy>=gym.cost;
          return(<div key={stat.id} style={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:6,padding:12}}>
            <div style={{color:"#fff",fontWeight:700,marginBottom:2}}>{stat.icon} {stat.name}</div>
            <div style={{color:C.muted,fontSize:10,marginBottom:6}}>{stat.desc}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{color:C.purple,fontWeight:900,fontSize:14}}>{(cur||0).toLocaleString()}</span>
              <span style={{color:C.green,fontSize:11}}>+{preview}</span>
            </div>
            <button onClick={()=>train(stat.id)} disabled={!canT} style={{...S.btnF(canT?C.green:C.muted,canT?C.greenBg:"#0d140d"),fontSize:10,padding:"7px",opacity:canT?1:0.5,cursor:canT?"pointer":"not-allowed"}}>TRAIN ({gym.cost}⚡)</button>
          </div>);
        })}
      </div>
    </div>
    {log.length>0&&<div style={S.card()}><div style={S.ct}>📋 TRAINING LOG</div><div style={S.logB}>{log.map((l,i)=><div key={i} style={{color:l.g?C.green:"#ff6e6e"}}>{l.t}</div>)}</div></div>}
  </div>);
}

// ============================================================
// COMBAT PAGE — NPC + PvP
// ============================================================
const ATK_COOLDOWN=60000, MAX_APT=5;

function runFight(attacker, defender, onTick, onDone) {
  let pH=attacker.health, eH=defender.health, round=0;
  const nl=[];
  const eWpn=ITEMS.find(i=>i.id===defender.equippedWeapon);
  const eArm=ITEMS.find(i=>i.id===defender.equippedArmor);
  const eAtk=(defender.strength||10)+(eWpn?.weaponDmg||0)+(defender.level||1)*2;
  const eDef=(defender.defense||10)+(eArm?.armorRating||0)+(defender.level||1)*2;
  function tick() {
    if(pH<=0||eH<=0||round>=20){
      const won=eH<=0&&pH>0;
      nl.push(won?`🏆 YOU WIN — +2 REP`:`💀 DEFEATED — sent to hospital`);
      onTick([...nl]);
      onDone({won,healthLost:Math.max(0,attacker.health-pH),enemyHealthLost:Math.max(0,defender.health-eH),rounds:round});
      return;
    }
    round++;
    if(Math.random()*100<=calcHitChance(attacker.dexterity,defender.dexterity||10)){
      const crit=Math.random()*100<=calcCritChance(attacker.dexterity);
      let dmg=calcDamage(calcAttack(attacker),eDef);
      if(crit){dmg*=2;nl.push(`⚡ CRIT! You deal ${Math.floor(dmg)} dmg`);}
      else nl.push(`👊 R${round}: You hit for ${Math.floor(dmg)}`);
      eH=Math.max(0,eH-dmg);
    } else nl.push(`💨 R${round}: You missed`);
    if(eH>0&&Math.random()*100<=calcHitChance(defender.dexterity||10,attacker.dexterity)){
      const dmg=calcDamage(eAtk,calcDefense(attacker));
      nl.push(`🔴 ${defender.name} hits for ${Math.floor(dmg)}`);
      pH=Math.max(0,pH-dmg);
    } else if(eH>0) nl.push(`💨 ${defender.name} missed`);
    onTick([...nl]);
    setTimeout(tick,300);
  }
  tick();
}

function CombatPage({player,onCombat,initTarget}) {
  const [mode,setMode]=useState(initTarget?"pvp":"npc");
  const [enemy,setEnemy]=useState(null);
  const [npcLog,setNpcLog]=useState([]);
  const [npcFighting,setNpcFighting]=useState(false);
  const [npcResult,setNpcResult]=useState(null);
  const [pvpSearch,setPvpSearch]=useState(initTarget?.username||"");
  const [pvpTarget,setPvpTarget]=useState(initTarget||null);
  const [pvpLog,setPvpLog]=useState([]);
  const [pvpFighting,setPvpFighting]=useState(false);
  const [pvpResult,setPvpResult]=useState(null);
  const [pvpErr,setPvpErr]=useState("");
  const [cdLeft,setCdLeft]=useState(0);
  const cdRef=useRef(null);

  useEffect(()=>{
    if(!initTarget)return;
    setMode("pvp");
    setPvpSearch(initTarget.username||"");
    setPvpTarget(initTarget);
    setPvpLog([]);
    setPvpResult(null);
    setPvpErr("");
  },[initTarget]);

  useEffect(()=>{
    if(!pvpTarget)return;
    const cds=JSON.parse(localStorage.getItem("sd_pvp_cds")||"{}");
    const last=cds[pvpTarget.username]||0;
    const left=Math.max(0,ATK_COOLDOWN-(Date.now()-last));
    setCdLeft(left);
    if(left>0){
      cdRef.current=setInterval(()=>{
        const l2=Math.max(0,ATK_COOLDOWN-(Date.now()-last));
        setCdLeft(l2);
        if(l2===0)clearInterval(cdRef.current);
      },500);
    }
    return()=>clearInterval(cdRef.current);
  },[pvpTarget]);

  function getAttacksToday(username){
    const today=new Date().toDateString();
    const data=JSON.parse(localStorage.getItem("sd_pvp_atks")||"{}");
    if(data.date!==today)return 0;
    return data[username]||0;
  }

  function recordAttack(username){
    const today=new Date().toDateString();
    const data=JSON.parse(localStorage.getItem("sd_pvp_atks")||"{}");
    if(data.date!==today){localStorage.setItem("sd_pvp_atks",JSON.stringify({date:today,[username]:1}));return;}
    data[username]=(data[username]||0)+1;
    localStorage.setItem("sd_pvp_atks",JSON.stringify(data));
  }

  function searchPlayer(){
    setPvpErr(""); setPvpTarget(null); setPvpLog([]); setPvpResult(null);
    if(!pvpSearch.trim())return;
    const accs=getAccounts();
    const uname=pvpSearch.trim().toLowerCase();
    if(uname===player.username){setPvpErr("❌ Can't attack yourself");return;}
    if(!accs[uname]){setPvpErr("❌ Player not found");return;}
    setPvpTarget(accs[uname].player);
  }

  function attackPlayer(){
    if(!pvpTarget||pvpFighting)return;
    if(player.energy<5){setPvpErr("❌ Need 5 energy");return;}
    if(player.health<=20){setPvpErr("❌ Too injured to fight (need >20 HP)");return;}
    const atks=getAttacksToday(pvpTarget.username);
    if(atks>=MAX_APT){setPvpErr(`❌ Max ${MAX_APT} attacks per player per day`);return;}
    if(cdLeft>0){setPvpErr(`❌ Cooldown: wait ${Math.ceil(cdLeft/1000)}s`);return;}
    setPvpFighting(true);setPvpErr("");
    runFight(
      player, pvpTarget,
      logs=>setPvpLog(logs),
      ({won,healthLost,rounds})=>{
        setPvpResult(won?"WIN":"LOSE");
        setPvpFighting(false);
        const cds=JSON.parse(localStorage.getItem("sd_pvp_cds")||"{}");
        cds[pvpTarget.username]=Date.now();
        localStorage.setItem("sd_pvp_cds",JSON.stringify(cds));
        recordAttack(pvpTarget.username);
        const accs=getAccounts();
        if(accs[pvpTarget.username]){
          const def=accs[pvpTarget.username].player;
          if(won){
            accs[pvpTarget.username].player={
              ...def,
              health:Math.max(1,Math.floor(def.health*0.25)),
              inHospitalUntil:Date.now()+5*60000,
            };
          }
          saveAccounts(accs);
        }
        onCombat({won,cash:0,xp:won?pvpTarget.level*10:0,rep:won?3:-1,healthLost,energyCost:5,isPvp:true,targetName:pvpTarget.name});
      }
    );
  }

  function fightNPC(){
    if(!enemy||npcFighting)return;
    if(player.energy<5){setNpcLog(["❌ Need 5 energy"]);return;}
    setNpcFighting(true);
    runFight(
      player, enemy,
      logs=>setNpcLog(logs),
      ({won,healthLost})=>{
        setNpcResult(won?"WIN":"LOSE");
        setNpcFighting(false);
        onCombat({won,cash:won?enemy.cash:0,xp:won?enemy.xp:0,rep:won?2:-1,healthLost,energyCost:5,isPvp:false});
      }
    );
  }

  const inHosp=player.inHospitalUntil&&player.inHospitalUntil>Date.now();
  const hospLeft=inHosp?Math.ceil((player.inHospitalUntil-Date.now())/60000):0;
  const pvpAtksToday=pvpTarget?getAttacksToday(pvpTarget.username):0;

  return(<div>
    {inHosp&&<div style={S.card({borderColor:"#1a4a7a",background:"#060d18"})}>
      <div style={S.ct}>🏥 IN HOSPITAL</div>
      <div style={{color:C.blue,fontSize:12,marginBottom:6}}>Recovering from injuries — <span style={{color:"#fff",fontWeight:700}}>{hospLeft} min remaining</span>.</div>
      <div style={{color:C.muted,fontSize:11}}>You cannot fight while hospitalized. Health regens over time.</div>
    </div>}

    <div style={{display:"flex",gap:8,marginBottom:12}}>
      {["npc","pvp"].map(m=>(
        <button key={m} onClick={()=>setMode(m)} style={{padding:"8px 20px",background:mode===m?C.red:"#0d140d",border:`1px solid ${mode===m?C.red:C.border}`,borderRadius:4,color:mode===m?"#fff":C.muted,cursor:"pointer",fontSize:11,letterSpacing:2}}>
          {m==="npc"?"🤖 STREET FIGHT":"⚔ PvP ATTACK"}
        </button>
      ))}
    </div>

    {mode==="npc"&&<div>
      <div style={S.card()}><div style={S.ct}>🤖 STREET FIGHT</div><div style={{color:C.muted,fontSize:11}}>Fight NPCs for cash & XP · Costs 5 energy</div></div>
      <div style={S.g2}>
        <div style={S.card()}><div style={S.ct}>YOU</div>
          {[["ATK",calcAttack(player),C.red],["DEF",calcDefense(player),C.blue],["HP",player.health,C.green]].map(([l,v,c])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>
          ))}
        </div>
        <div style={S.card()}><div style={S.ct}>ENEMY</div>
          {enemy?(<>
            <div style={{color:C.red,fontWeight:700,marginBottom:6}}>{enemy.name} LVL{enemy.level}</div>
            <div style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>HP</span><span style={{color:C.green,fontWeight:900}}>{enemy.health}</span></div>
            <div style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>💰</span><span style={{color:C.gold,fontWeight:900}}>${enemy.cash}</span></div>
          </>):<div style={{color:C.dim}}>No target</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button style={S.btn(C.muted,"#0d140d")} onClick={()=>{setEnemy(createEnemy(player.level));setNpcLog([]);setNpcResult(null);}}>🔍 FIND</button>
        {enemy&&!npcResult&&<button style={{...S.btn(),opacity:npcFighting||inHosp?0.5:1}} onClick={fightNPC} disabled={npcFighting||inHosp}>{npcFighting?"FIGHTING...":"⚔ ATTACK"}</button>}
        {npcResult&&<button style={S.btn(C.muted,"#0d140d")} onClick={()=>{setEnemy(null);setNpcResult(null);setNpcLog([]);}}>NEW</button>}
      </div>
      {npcLog.length>0&&<div style={S.card()}>
        <div style={{...S.ct,marginBottom:8}}>BATTLE LOG {npcResult&&<span style={S.badge(npcResult==="WIN"?C.green:"#ff4d4d")}>{npcResult}</span>}</div>
        <div style={S.logB}>{npcLog.map((l,i)=><div key={i} style={{color:/You hit|CRIT|WIN/.test(l)?C.green:/missed/.test(l)?C.muted:"#ff6e6e"}}>{l}</div>)}</div>
      </div>}
    </div>}

    {mode==="pvp"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>⚔ PvP ATTACK</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
          Win = <span style={{color:C.green}}>+3 REP</span> · Lose = <span style={{color:C.red}}>-1 REP + hospital (3 min)</span><br/>
          Loser hospitalized 5 min · 60s cooldown · Max {MAX_APT} attacks/player/day · Need &gt;20 HP
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input style={{...S.inp,marginBottom:0,flex:1}} placeholder="Search by username..." value={pvpSearch} onChange={e=>setPvpSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchPlayer()}/>
          <button style={S.btn(C.orange,C.orangeBg)} onClick={searchPlayer}>SEARCH</button>
        </div>
        {pvpErr&&<div style={{color:C.red,fontSize:11,marginBottom:8}}>{pvpErr}</div>}
      </div>

      {pvpTarget&&<div>
        <div style={S.card({borderColor:C.red+"44"})}>
          <div style={S.ct}>🎯 TARGET</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{pvpTarget.name}</div>
              <div style={{color:C.muted,fontSize:11}}>@{pvpTarget.username}</div>
              {pvpTarget.syndicate&&<div style={{marginTop:3}}><span style={S.badge(C.purple)}>🏴 {pvpTarget.syndicate}</span></div>}
              {pvpTarget.inHospitalUntil&&pvpTarget.inHospitalUntil>Date.now()&&(
                <div style={{marginTop:4}}><span style={S.badge(C.blue)}>🏥 IN HOSPITAL</span></div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:C.red,fontSize:18,fontWeight:900}}>LVL {pvpTarget.level}</div>
              <div style={{color:C.orange,fontSize:11}}>⭐ {pvpTarget.reputation} REP</div>
            </div>
          </div>
          <div style={S.g2}>
            <div>
              {[["ATK",calcAttack(pvpTarget),C.red],["DEF",calcDefense(pvpTarget),C.blue],["HP",pvpTarget.health,C.green],["DEX",pvpTarget.dexterity,C.orange]].map(([l,v,c])=>(
                <div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>
              ))}
            </div>
            <div>
              <div style={{color:C.muted,fontSize:10,marginBottom:6}}>ATTACK STATUS</div>
              <div style={{fontSize:11,marginBottom:4}}>Today: <span style={{color:pvpAtksToday>=MAX_APT?C.red:C.green}}>{pvpAtksToday}/{MAX_APT}</span></div>
              <div style={{fontSize:11,marginBottom:8}}>Cooldown: <span style={{color:cdLeft>0?C.orange:C.green}}>{cdLeft>0?Math.ceil(cdLeft/1000)+"s":"Ready"}</span></div>
              {!pvpResult&&<button
                style={{...S.btn(),opacity:(pvpFighting||inHosp||cdLeft>0||pvpAtksToday>=MAX_APT||player.health<=20)?0.4:1,cursor:"pointer",width:"100%"}}
                onClick={attackPlayer}
                disabled={pvpFighting||inHosp||cdLeft>0||pvpAtksToday>=MAX_APT||player.health<=20}>
                {pvpFighting?"FIGHTING...":inHosp?"🏥 HOSPITALIZED":cdLeft>0?`WAIT ${Math.ceil(cdLeft/1000)}s`:"⚔ ATTACK"}
              </button>}
              {pvpResult&&<div>
                <div style={{...S.badge(pvpResult==="WIN"?C.green:"#ff4d4d"),fontSize:12,padding:"6px 12px",marginBottom:8,display:"block",textAlign:"center"}}>{pvpResult==="WIN"?"🏆 VICTORY +3 REP":"💀 DEFEATED — YOU'RE IN HOSPITAL"}</div>
                <button style={{...S.btn(C.muted,"#0d140d"),width:"100%"}} onClick={()=>{setPvpTarget(null);setPvpResult(null);setPvpLog([]);setPvpSearch("");}}>NEW TARGET</button>
              </div>}
            </div>
          </div>
        </div>
        {pvpLog.length>0&&<div style={S.card()}>
          <div style={{...S.ct,marginBottom:8}}>⚔ BATTLE LOG {pvpResult&&<span style={S.badge(pvpResult==="WIN"?C.green:"#ff4d4d")}>{pvpResult}</span>}</div>
          <div style={S.logB}>{pvpLog.map((l,i)=><div key={i} style={{color:/You hit|CRIT|WIN/.test(l)?C.green:/missed/.test(l)?C.muted:"#ff6e6e"}}>{l}</div>)}</div>
        </div>}
      </div>}
    </div>}
  </div>);
}

// ============================================================
// INVENTORY PAGE
// ============================================================
function InventoryPage({player,onBuy,onEquip}) {
  const [tab,setTab]=useState("inventory");
  const RC={common:C.muted,rare:C.blue,legendary:C.gold};
  return(<div>
    <Tabs tabs={["inventory","shop"]} active={tab} onSelect={setTab}/>
    {tab==="inventory"&&<div style={S.card()}>
      <div style={S.ct}>🎒 YOUR GEAR ({player.inventory.length})</div>
      {player.inventory.length===0&&<div style={{color:C.dim}}>No items. Visit the shop.</div>}
      {player.inventory.map(id=>{
        const item=ITEMS.find(i=>i.id===id);if(!item)return null;
        const isEq=player.equippedWeapon===id||player.equippedArmor===id;
        return(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <div><div style={{color:isEq?C.green:"#fff",fontWeight:isEq?700:400}}>{item.name} {isEq&&"✓"} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div>
          {isEq?<span style={S.badge(C.green)}>EQUIPPED</span>:(item.type==="weapon"||item.type==="armor")&&<button style={S.btn(C.green,C.greenBg)} onClick={()=>onEquip(item)}>EQUIP</button>}
        </div>);
      })}
    </div>}
    {tab==="shop"&&<div>
      <div style={{color:C.green,fontSize:13,marginBottom:12,fontWeight:700}}>💰 ${player.cash.toLocaleString()}</div>
      {["weapon","armor","tool"].map(type=>(
        <div key={type} style={S.card()}>
          <div style={S.ct}>{type==="weapon"?"⚔":type==="armor"?"🛡":"🔧"} {type.toUpperCase()}S</div>
          {ITEMS.filter(i=>i.type===type).map(item=>{
            const owned=player.inventory.includes(item.id),can=player.cash>=item.price;
            return(<div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div><div style={{color:"#fff"}}>{item.name} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:C.green,fontSize:13,marginBottom:4}}>${item.price.toLocaleString()}</div>{owned?<span style={S.badge(C.green)}>OWNED</span>:<button style={{...S.btn(C.orange,C.orangeBg),opacity:can?1:0.4,cursor:can?"pointer":"not-allowed"}} onClick={()=>onBuy(item)} disabled={!can}>BUY</button>}</div>
            </div>);
          })}
        </div>
      ))}
    </div>}
  </div>);
}

// ============================================================
// SYNDICATES PAGE
// ============================================================
const SYN_XP_FOR_LEVEL = (lvl) => Math.floor(500 * Math.pow(lvl, 1.6));
const SYN_PERKS = [
  { level:1,  desc:"🏋 +15% gym gains for all members" },
  { level:3,  desc:"🔪 +10% crime success for all members" },
  { level:5,  desc:"💰 +20% property income for all members" },
  { level:8,  desc:"⚔ +10% combat XP for all members" },
  { level:10, desc:"⚡ +25% all stats training bonus" },
];

function SyndicatesPage({player,onCreate,onJoin,onLeave,onContribute}) {
  const [syndicates,setSyndicates]=useState(getSyndicates);
  const [tab,setTab]=useState(player.syndicate?"home":"browse");
  const [newName,setNewName]=useState("");
  const [newDesc,setNewDesc]=useState("");
  const [amt,setAmt]=useState("");
  const [confirm,setConfirm]=useState(null);
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState("");

  function refresh(){setSyndicates(getSyndicates());}

  function showMsg(msg){setToast(msg);setTimeout(()=>setToast(""),3000);}

  function create() {
    if(player.syndicate)return showMsg("❌ Leave your current syndicate first");
    if(player.cash<SYNDICATE_COST)return showMsg("❌ Need $100,000,000 to found a syndicate");
    if(!newName.trim())return showMsg("❌ Enter a syndicate name");
    if(newName.trim().length<3||newName.trim().length>24)return showMsg("❌ Name must be 3–24 characters");
    if(syndicates.find(s=>s.name.toLowerCase()===newName.trim().toLowerCase()))return showMsg("❌ Name already taken");
    const s={
      name:newName.trim(), desc:newDesc.trim()||"No description set.",
      leader:player.username, officers:[],
      members:[player.username], level:1, xp:0, treasury:0,
      founded:Date.now(), wars:0, warsWon:0,
      log:[{ts:Date.now(),text:`🏴 ${player.name} founded the syndicate`}],
    };
    const updated=[...syndicates,s];
    saveSyndicates(updated); setSyndicates(updated);
    onCreate(s); setNewName(""); setNewDesc(""); setTab("home");
  }

  function join(s) {
    if(player.syndicate)return showMsg("❌ Leave your current syndicate first");
    setConfirm({msg:`Join "${s.name}"? You'll gain a +15% gym bonus and access to syndicate perks.`,action:()=>{
      const log=[{ts:Date.now(),text:`👤 ${player.name} joined the syndicate`},...(s.log||[])].slice(0,50);
      const updated=syndicates.map(x=>x.name===s.name?{...x,members:[...x.members,player.username],log}:x);
      saveSyndicates(updated);setSyndicates(updated);onJoin(s);setTab("home");
    }});
  }

  function leave() {
    if(!player.syndicate)return;
    const syn=syndicates.find(s=>s.name===player.syndicate);
    if(syn?.leader===player.username)return showMsg("❌ Transfer leadership before leaving (contact admin)");
    setConfirm({msg:`Leave "${player.syndicate}"? You will lose all syndicate perks.`,action:()=>{
      const log=[{ts:Date.now(),text:`👤 ${player.name} left the syndicate`},...(syn?.log||[])].slice(0,50);
      const updated=syndicates.map(x=>x.name===player.syndicate?{...x,members:x.members.filter(m=>m!==player.username),officers:(x.officers||[]).filter(o=>o!==player.username),log}:x);
      saveSyndicates(updated);setSyndicates(updated);onLeave();setTab("browse");
    }});
  }

  function contribute() {
    const a=parseInt(amt);
    if(!a||a<100)return showMsg("❌ Minimum contribution is $100");
    if(a>player.cash)return showMsg("❌ Not enough cash");
    const syn=syndicates.find(s=>s.name===player.syndicate);
    if(!syn)return;
    const xpGain=Math.floor(a/1000);
    let newXp=(syn.xp||0)+xpGain;
    let newLevel=syn.level||1;
    while(newXp>=SYN_XP_FOR_LEVEL(newLevel+1)&&newLevel<10){newXp-=SYN_XP_FOR_LEVEL(newLevel+1);newLevel++;}
    const log=[{ts:Date.now(),text:`💰 ${player.name} contributed $${a.toLocaleString()}`},...(syn.log||[])].slice(0,50);
    const updated=syndicates.map(x=>x.name===player.syndicate?{...x,treasury:x.treasury+a,xp:newXp,level:newLevel,log}:x);
    saveSyndicates(updated);setSyndicates(updated);onContribute(a);setAmt("");
    showMsg(`✅ Contributed $${a.toLocaleString()} · +${xpGain} syndicate XP`);
  }

  function promote(username){
    const syn=syndicates.find(s=>s.name===player.syndicate);
    if(!syn||syn.leader!==player.username)return showMsg("❌ Only the leader can promote members");
    if((syn.officers||[]).includes(username))return showMsg("Already an officer");
    const log=[{ts:Date.now(),text:`⭐ ${username} was promoted to Officer`},...(syn.log||[])].slice(0,50);
    const updated=syndicates.map(x=>x.name===player.syndicate?{...x,officers:[...(x.officers||[]),username],log}:x);
    saveSyndicates(updated);setSyndicates(updated);refresh();showMsg(`✅ ${username} promoted to Officer`);
  }

  function demote(username){
    const syn=syndicates.find(s=>s.name===player.syndicate);
    if(!syn||syn.leader!==player.username)return showMsg("❌ Only the leader can demote officers");
    const log=[{ts:Date.now(),text:`🔻 ${username} was demoted from Officer`},...(syn.log||[])].slice(0,50);
    const updated=syndicates.map(x=>x.name===player.syndicate?{...x,officers:(x.officers||[]).filter(o=>o!==username),log}:x);
    saveSyndicates(updated);setSyndicates(updated);refresh();showMsg(`✅ ${username} demoted`);
  }

  function kick(username){
    const syn=syndicates.find(s=>s.name===player.syndicate);
    if(!syn||(syn.leader!==player.username&&!(syn.officers||[]).includes(player.username)))return showMsg("❌ Officers+ only");
    if(username===syn.leader)return showMsg("❌ Cannot kick the leader");
    setConfirm({msg:`Kick "${username}" from the syndicate?`,action:()=>{
      const accs=getAccounts();
      if(accs[username]){accs[username].player={...accs[username].player,syndicate:null};saveAccounts(accs);}
      const log=[{ts:Date.now(),text:`🚫 ${username} was kicked`},...(syn.log||[])].slice(0,50);
      const updated=syndicates.map(x=>x.name===player.syndicate?{...x,members:x.members.filter(m=>m!==username),officers:(x.officers||[]).filter(o=>o!==username),log}:x);
      saveSyndicates(updated);setSyndicates(updated);refresh();showMsg(`✅ ${username} kicked`);
    }});
  }

  const mySyn=syndicates.find(s=>s.name===player.syndicate);
  const isLeader=mySyn?.leader===player.username;
  const isOfficer=(mySyn?.officers||[]).includes(player.username);
  const synXpNext=mySyn?SYN_XP_FOR_LEVEL((mySyn.level||1)+1):1;
  const synXpPct=mySyn?Math.min(100,((mySyn.xp||0)/synXpNext)*100):0;
  const filteredSyns=syndicates.filter(s=>s.name!==player.syndicate&&s.name.toLowerCase().includes(search.toLowerCase()));
  const accs=getAccounts();

  const tabs=player.syndicate?["home","members","perks","log","browse","create"]:["browse","create"];

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}
    {toast&&<div style={{position:"fixed",top:16,right:16,background:toast.startsWith("✅")?C.greenBg:C.redBg,border:`1px solid ${toast.startsWith("✅")?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:toast.startsWith("✅")?C.green:"#ff6e6e",fontSize:12,zIndex:9999,maxWidth:300}}>{toast}</div>}

    {/* Tab bar */}
    <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.purple:"#0d140d",border:`1px solid ${tab===t?C.purple:C.border}`,borderRadius:4,color:tab===t?"#fff":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",whiteSpace:"nowrap",fontWeight:tab===t?700:400}}>
          {t==="home"?"🏴 HOME":t==="members"?"👥 MEMBERS":t==="perks"?"⚡ PERKS":t==="log"?"📋 LOG":t==="browse"?"🔍 BROWSE":"➕ CREATE"}
        </button>
      ))}
    </div>

    {/* ── HOME TAB ── */}
    {tab==="home"&&mySyn&&<div>
      {/* Banner */}
      <div style={S.card({borderColor:C.purple+"55",background:"#080e08"})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{color:C.purple,fontSize:22,fontWeight:900,letterSpacing:3}}>{mySyn.name}</div>
            <div style={{color:C.muted,fontSize:11,marginTop:3,maxWidth:260}}>{mySyn.desc||"No description."}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.gold,fontSize:20,fontWeight:900}}>LVL {mySyn.level||1}</div>
            <div style={{color:C.muted,fontSize:10}}>SYNDICATE</div>
          </div>
        </div>
        {/* XP bar */}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:3}}>
            <span>SYNDICATE XP</span>
            <span>{(mySyn.xp||0).toLocaleString()} / {synXpNext.toLocaleString()}</span>
          </div>
          <div style={S.barW}><div style={{...S.bar(synXpPct,C.purple),height:"100%"}}/></div>
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:0,borderTop:`1px solid ${C.border}`,paddingTop:12,flexWrap:"wrap"}}>
          {[
            ["👑 LEADER",mySyn.leader,C.gold],
            ["👥 MEMBERS",mySyn.members.length,C.blue],
            ["💰 TREASURY","$"+(mySyn.treasury||0).toLocaleString(),C.green],
            ["📅 FOUNDED",mySyn.founded?new Date(mySyn.founded).toLocaleDateString():"—",C.muted],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 45%",marginBottom:10}}>
              <div style={{color:c,fontWeight:900,fontSize:13}}>{v}</div>
              <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
            </div>
          ))}
        </div>
        {/* Role badge */}
        <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
          {isLeader&&<span style={S.badge(C.gold)}>👑 LEADER</span>}
          {isOfficer&&!isLeader&&<span style={S.badge(C.orange)}>⭐ OFFICER</span>}
          {!isLeader&&!isOfficer&&<span style={S.badge(C.muted)}>👤 MEMBER</span>}
          <span style={S.badge(C.purple)}>🏋 +15% GYM</span>
        </div>
      </div>

      {/* Contribute */}
      <div style={S.card()}>
        <div style={S.ct}>💰 CONTRIBUTE TO TREASURY</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
          Donations earn <span style={{color:C.purple}}>Syndicate XP</span> (1 XP per $1,000). Higher level = more perks for all members.
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input style={{...S.inp,marginBottom:0,flex:1}} type="number" placeholder="Amount ($100 min)..." value={amt} onChange={e=>setAmt(e.target.value)}/>
          <button style={S.btn(C.gold,C.goldBg)} onClick={contribute}>DONATE</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[1000,5000,10000,50000].map(v=>(
            <button key={v} style={{...S.btn(C.muted,"#0d140d"),padding:"5px 10px",fontSize:9}} onClick={()=>setAmt(String(v))}>${(v/1000).toFixed(0)}k</button>
          ))}
        </div>
      </div>

      {/* Leave */}
      {!isLeader&&<div style={S.card()}>
        <div style={S.ct}>🚪 LEAVE SYNDICATE</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>You will lose all syndicate perks and bonuses.</div>
        <button style={S.btn(C.red,C.redBg)} onClick={leave}>LEAVE {mySyn.name.toUpperCase()}</button>
      </div>}
    </div>}

    {/* ── MEMBERS TAB ── */}
    {tab==="members"&&mySyn&&<div>
      <div style={S.card({borderColor:C.purple+"33"})}>
        <div style={S.ct}>👥 MEMBERS ({mySyn.members.length})</div>
        {mySyn.members.map(uname=>{
          const acc=accs[uname];
          const p=acc?.player;
          const isMemberLeader=uname===mySyn.leader;
          const isMemberOfficer=(mySyn.officers||[]).includes(uname);
          const isMe=uname===player.username;
          return(
            <div key={uname} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:isMe?C.red:"#fff",fontWeight:700,fontSize:12}}>{p?.name||uname}{isMe?" (you)":""}</span>
                  {isMemberLeader&&<span style={S.badge(C.gold)}>👑</span>}
                  {isMemberOfficer&&!isMemberLeader&&<span style={S.badge(C.orange)}>⭐</span>}
                </div>
                <div style={{color:C.muted,fontSize:10,marginTop:2}}>@{uname} · Lvl {p?.level||"?"} · ⭐{p?.reputation||0} REP</div>
              </div>
              {isLeader&&!isMe&&<div style={{display:"flex",gap:4}}>
                {!isMemberOfficer
                  ?<button style={{...S.btn(C.orange,C.orangeBg),padding:"4px 8px",fontSize:9}} onClick={()=>promote(uname)}>PROMOTE</button>
                  :<button style={{...S.btn(C.muted,"#0d140d"),padding:"4px 8px",fontSize:9}} onClick={()=>demote(uname)}>DEMOTE</button>
                }
                <button style={{...S.btn(C.red,C.redBg),padding:"4px 8px",fontSize:9}} onClick={()=>kick(uname)}>KICK</button>
              </div>}
              {isOfficer&&!isLeader&&!isMe&&!isMemberLeader&&!isMemberOfficer&&(
                <button style={{...S.btn(C.red,C.redBg),padding:"4px 8px",fontSize:9}} onClick={()=>kick(uname)}>KICK</button>
              )}
            </div>
          );
        })}
      </div>
    </div>}

    {/* ── PERKS TAB ── */}
    {tab==="perks"&&mySyn&&<div>
      <div style={S.card({borderColor:C.purple+"33"})}>
        <div style={S.ct}>⚡ SYNDICATE PERKS</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:14}}>Perks unlock as your syndicate levels up. All members benefit.</div>
        {SYN_PERKS.map(perk=>{
          const unlocked=(mySyn.level||1)>=perk.level;
          return(
            <div key={perk.level} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`,opacity:unlocked?1:0.4}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:unlocked?C.purple+"33":"#0d140d",border:`2px solid ${unlocked?C.purple:C.dim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
                {unlocked?"✓":perk.level}
              </div>
              <div style={{flex:1}}>
                <div style={{color:unlocked?"#fff":C.muted,fontWeight:unlocked?700:400,fontSize:12}}>{perk.desc}</div>
                <div style={{color:C.muted,fontSize:9,marginTop:2}}>Requires Syndicate Level {perk.level}</div>
              </div>
              {unlocked&&<span style={S.badge(C.green)}>ACTIVE</span>}
            </div>
          );
        })}
      </div>
      <div style={S.card()}>
        <div style={S.ct}>📈 LEVEL PROGRESS</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
          <span>Level {mySyn.level||1} → {Math.min(10,(mySyn.level||1)+1)}</span>
          <span>{(mySyn.xp||0).toLocaleString()} / {synXpNext.toLocaleString()} XP</span>
        </div>
        <div style={S.barW}><div style={{...S.bar(synXpPct,C.purple),height:"100%"}}/></div>
        {(mySyn.level||1)>=10&&<div style={{color:C.gold,fontWeight:700,fontSize:12,marginTop:8}}>MAX LEVEL REACHED</div>}
      </div>
    </div>}

    {/* ── LOG TAB ── */}
    {tab==="log"&&mySyn&&<div>
      <div style={S.card()}>
        <div style={S.ct}>📋 SYNDICATE LOG</div>
        {(mySyn.log||[]).length===0&&<div style={{color:C.dim}}>No activity yet.</div>}
        {(mySyn.log||[]).map((entry,i)=>(
          <div key={i} style={{padding:"9px 0",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{color:"#ccc",fontSize:12}}>{entry.text}</div>
              <div style={{color:C.muted,fontSize:9,marginTop:2}}>{tsAgo(entry.ts)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>}

    {/* ── BROWSE TAB ── */}
    {tab==="browse"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>🔍 FIND A SYNDICATE</div>
        <input style={S.inp} placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {filteredSyns.length===0&&<div style={{color:C.dim,fontSize:12}}>No syndicates found.</div>}
      </div>
      {filteredSyns.map(s=>{
        const xpPct=Math.min(100,((s.xp||0)/SYN_XP_FOR_LEVEL((s.level||1)+1))*100);
        return(
          <div key={s.name} style={S.card({borderColor:C.purple+"22"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{color:"#fff",fontWeight:900,fontSize:15}}>{s.name}</div>
                <div style={{color:C.muted,fontSize:11,marginTop:2,maxWidth:220}}>{s.desc||"No description."}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:C.gold,fontWeight:900,fontSize:14}}>LVL {s.level||1}</div>
                <div style={{color:C.muted,fontSize:9}}>{s.members.length} members</div>
              </div>
            </div>
            <div style={{display:"flex",gap:16,fontSize:11,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{color:C.gold}}>💰 ${(s.treasury||0).toLocaleString()}</span>
              <span style={{color:C.muted}}>👑 {s.leader}</span>
              {(s.officers||[]).length>0&&<span style={{color:C.orange}}>⭐ {s.officers.length} officers</span>}
            </div>
            <div style={{marginBottom:10}}>
              <div style={S.barW}><div style={{...S.bar(xpPct,C.purple),height:"100%"}}/></div>
            </div>
            {!player.syndicate
              ?<button style={S.btn(C.green,C.greenBg)} onClick={()=>join(s)}>JOIN SYNDICATE</button>
              :<div style={{color:C.muted,fontSize:10}}>Leave your current syndicate to join this one.</div>
            }
          </div>
        );
      })}
    </div>}

    {/* ── CREATE TAB ── */}
    {tab==="create"&&<div>
      {player.syndicate
        ?<div style={{...S.card(),color:C.muted}}>You are already in a syndicate. Leave it first to create a new one.</div>
        :<div style={S.card({borderColor:C.purple+"44"})}>
          <div style={S.ct}>🏴 FOUND A SYNDICATE</div>
          <div style={{color:C.muted,fontSize:11,marginBottom:14,lineHeight:1.7}}>
            Cost: <span style={{color:player.cash>=SYNDICATE_COST?C.green:C.red,fontWeight:700}}>$100,000,000</span>
            <br/>Your cash: <span style={{color:C.green,fontWeight:700}}>${player.cash.toLocaleString()}</span>
            <br/>As leader you can promote officers, kick members, and manage the syndicate.
          </div>
          <div style={{color:C.muted,fontSize:10,marginBottom:4}}>SYNDICATE NAME <span style={{color:C.red}}>*</span></div>
          <input style={S.inp} placeholder="3–24 characters..." value={newName} onChange={e=>setNewName(e.target.value)} maxLength={24}/>
          <div style={{color:C.muted,fontSize:10,marginBottom:4}}>DESCRIPTION <span style={{color:C.dim}}>(optional)</span></div>
          <input style={S.inp} placeholder="What does your syndicate stand for?" value={newDesc} onChange={e=>setNewDesc(e.target.value)} maxLength={80}/>
          <button
            style={{...S.btnF(player.cash>=SYNDICATE_COST?C.purple:C.muted,player.cash>=SYNDICATE_COST?"#080e08":"#0d140d"),opacity:player.cash>=SYNDICATE_COST?1:0.4}}
            onClick={create}
            disabled={player.cash<SYNDICATE_COST}>
            {player.cash>=SYNDICATE_COST?"🏴 FOUND SYNDICATE — $100,000,000":"❌ NEED $100,000,000"}
          </button>
        </div>
      }
    </div>}
  </div>);
}

// ============================================================
// PROPERTIES PAGE
// ============================================================

// Upgrade tiers: each tier multiplies income by 1.5x for that property
const PROP_UPGRADES = {
  safehouse:  [
    { tier:1, name:"Security System",  cost:25000,   incomeBonus:250,  desc:"CCTV and alarm — fewer shake-downs." },
    { tier:2, name:"Extra Tenants",    cost:80000,   incomeBonus:600,  desc:"Pack in more residents. More rent." },
    { tier:3, name:"Renovate",         cost:200000,  incomeBonus:1200, desc:"Upgrade the building. Premium rates." },
  ],
  chopshop:   [
    { tier:1, name:"Better Tools",     cost:100000,  incomeBonus:1000, desc:"Strip cars faster, more parts sold." },
    { tier:2, name:"Night Shift",      cost:350000,  incomeBonus:2500, desc:"24/7 operation doubles throughput." },
    { tier:3, name:"Export Network",   cost:900000,  incomeBonus:6000, desc:"Ship parts overseas — big margins." },
  ],
  warehouse:  [
    { tier:1, name:"Forklift Fleet",   cost:400000,  incomeBonus:3000, desc:"Move more product per shift." },
    { tier:2, name:"Cold Storage",     cost:1200000, incomeBonus:7000, desc:"High-value goods need temperature control." },
    { tier:3, name:"Distribution Hub", cost:3000000, incomeBonus:18000,desc:"Become the regional supplier." },
  ],
  nightclub:  [
    { tier:1, name:"VIP Lounge",       cost:2000000, incomeBonus:8000, desc:"High rollers spend big." },
    { tier:2, name:"Drug Front",       cost:6000000, incomeBonus:20000,desc:"Backroom operations. Don't ask." },
    { tier:3, name:"Franchise",        cost:15000000,incomeBonus:50000,desc:"Open a second location under new name." },
  ],
  casino:     [
    { tier:1, name:"Rigged Tables",    cost:10000000,incomeBonus:30000,desc:"The house edge... adjusted." },
    { tier:2, name:"Loan Shark Desk",  cost:30000000,incomeBonus:80000,desc:"Collect interest. With interest." },
    { tier:3, name:"Money Laundering", cost:80000000,incomeBonus:200000,desc:"Clean cash for the whole city. 10% cut." },
  ],
};

function propUpgradeTier(player, propId) {
  return (player.propUpgrades||{})[propId]||0;
}
function propIncomeRate(player, prop) {
  const qty    = player.properties?.[prop.id]||0;
  const tier   = propUpgradeTier(player, prop.id);
  const ups    = PROP_UPGRADES[prop.id]||[];
  const bonus  = ups.slice(0,tier).reduce((s,u)=>s+u.incomeBonus,0);
  return (prop.incomePerHour + bonus) * qty;
}

function PropertiesPage({player,onBuyProperty,onCollect,onUpgrade}) {
  const [tab,setTab]=useState("empire");
  const [detail,setDetail]=useState(null); // prop.id being viewed
  const [toast,setToast]=useState("");

  function showMsg(m){setToast(m);setTimeout(()=>setToast(""),3000);}

  const prestige    = getPrestige(player.prestigeTier||0);
  const cashMult    = prestige?.cashMult||1;
  const synBonus    = player.syndicate ? 1.20 : 1.0; // syndicate perk lvl5
  const ownedProps  = PROPERTIES.filter(p=>(player.properties?.[p.id]||0)>0);
  const totalPerHour= PROPERTIES.reduce((s,p)=>s+propIncomeRate(player,p),0);
  const pendingIncome=Math.floor(calcPropertyIncome(player.properties||{},player.lastPropertyCollect||Date.now())*cashMult);
  const hoursAccrued= Math.min(24,(Date.now()-(player.lastPropertyCollect||Date.now()))/3600000);
  const ROI_HOURS   = (prop) => {
    const rate = propIncomeRate(player, prop)||prop.incomePerHour;
    return rate>0 ? (prop.price/rate).toFixed(1) : "∞";
  };

  const tabs = ["empire","market","upgrades"];

  return(<div>
    {toast&&<div style={{position:"fixed",top:16,right:16,background:toast.startsWith("✅")?C.greenBg:C.redBg,border:`1px solid ${toast.startsWith("✅")?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:toast.startsWith("✅")?C.green:"#ff6e6e",fontSize:12,zIndex:9999,maxWidth:300}}>{toast}</div>}

    {/* Tab bar */}
    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>{setTab(t);setDetail(null);}} style={{padding:"7px 14px",background:tab===t?C.gold:"#0d140d",border:`1px solid ${tab===t?C.gold:C.border}`,borderRadius:4,color:tab===t?"#000":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400}}>
          {t==="empire"?"🏠 EMPIRE":t==="market"?"🛒 BUY":"⬆ UPGRADES"}
        </button>
      ))}
    </div>

    {/* ── EMPIRE TAB ── */}
    {tab==="empire"&&<div>
      {/* Income banner */}
      <div style={S.card({borderColor:C.gold+"55",background:"#061006"})}>
        <div style={S.ct}>💰 PROPERTY EMPIRE</div>
        <div style={{display:"flex",gap:0,flexWrap:"wrap",marginBottom:14}}>
          {[
            ["PENDING",    "$"+pendingIncome.toLocaleString(),   C.gold],
            ["PER HOUR",   "$"+Math.floor(totalPerHour*cashMult).toLocaleString()+"/hr", C.green],
            ["PROPERTIES", ownedProps.length,                    C.orange],
            ["ACCRUED",    hoursAccrued.toFixed(1)+"h",          C.muted],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 45%",marginBottom:10}}>
              <div style={{color:c,fontWeight:900,fontSize:15}}>{v}</div>
              <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
            </div>
          ))}
        </div>
        {cashMult>1&&<div style={{color:C.purple,fontSize:10,marginBottom:8}}>⚡ ×{cashMult} Prestige multiplier active</div>}
        {player.syndicate&&<div style={{color:C.green,fontSize:10,marginBottom:8}}>🏴 +20% Syndicate income bonus active</div>}
        {pendingIncome>0
          ?<button style={S.btnF(C.gold,C.goldBg)} onClick={()=>onCollect(pendingIncome)}>
              💰 COLLECT ${pendingIncome.toLocaleString()}
            </button>
          :<div style={{color:C.dim,fontSize:11,padding:"10px 0"}}>{ownedProps.length===0?"No properties owned — go buy some below.":"Income accruing... check back soon."}</div>
        }
      </div>

      {/* Owned property breakdown */}
      {ownedProps.length>0&&<div style={S.card()}>
        <div style={S.ct}>📊 BREAKDOWN</div>
        {ownedProps.map(prop=>{
          const qty    = player.properties[prop.id];
          const tier   = propUpgradeTier(player, prop.id);
          const rate   = propIncomeRate(player, prop);
          const upgrades = PROP_UPGRADES[prop.id]||[];
          const nextUp = upgrades[tier];
          return(
            <div key={prop.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:16}}>{prop.icon}</span>
                  <span style={{color:C.gold,fontWeight:700,fontSize:12}}>{prop.name}</span>
                  <span style={S.badge(C.gold)}>×{qty}</span>
                  {tier>0&&<span style={S.badge(C.purple)}>T{tier}</span>}
                </div>
                <div style={{color:C.green,fontSize:11}}>${rate.toLocaleString()}/hr</div>
                {nextUp&&<div style={{color:C.muted,fontSize:9,marginTop:2}}>Next upgrade: {nextUp.name} — ${nextUp.cost.toLocaleString()}</div>}
              </div>
              <button style={{...S.btn(C.purple,"#080e08"),padding:"5px 10px",fontSize:9}} onClick={()=>{setTab("upgrades");setDetail(prop.id);}}>UPGRADE</button>
            </div>
          );
        })}
      </div>}

      {ownedProps.length===0&&<div style={{...S.card(),textAlign:"center",padding:32}}>
        <div style={{fontSize:36,marginBottom:12}}>🏚</div>
        <div style={{color:C.muted,fontSize:12}}>You own nothing yet.</div>
        <div style={{color:C.dim,fontSize:11,marginTop:4}}>Buy your first property to start earning passive income.</div>
        <button style={{...S.btn(C.gold,C.goldBg),marginTop:14}} onClick={()=>setTab("market")}>BROWSE MARKET →</button>
      </div>}
    </div>}

    {/* ── MARKET TAB ── */}
    {tab==="market"&&<div>
      <div style={{...S.card(),background:"#040d04",borderColor:C.border}}>
        <div style={S.ct}>🛒 PROPERTY MARKET</div>
        <div style={{color:C.muted,fontSize:11,lineHeight:1.7}}>
          Each purchase adds one unit of that property to your empire. Multiple units stack income. Income accrues for up to 24 hours before it must be collected.
        </div>
      </div>
      {PROPERTIES.map(prop=>{
        const owned    = player.properties?.[prop.id]||0;
        const unlocked = player.level>=prop.unlockLevel;
        const canAfford= player.cash>=prop.price;
        const rate     = propIncomeRate(player,prop);
        const payback  = ROI_HOURS(prop);
        const tier     = propUpgradeTier(player, prop.id);
        return(
          <div key={prop.id} style={S.card({opacity:unlocked?1:0.4,borderColor:owned>0?C.gold+"44":C.border,background:owned>0?"#050e05":C.card})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:22}}>{prop.icon}</span>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:owned>0?C.gold:"#fff",fontWeight:700,fontSize:14}}>{prop.name}</span>
                      {owned>0&&<span style={S.badge(C.gold)}>×{owned}</span>}
                      {tier>0&&<span style={S.badge(C.purple)}>T{tier} UPGRADED</span>}
                    </div>
                    <div style={{color:C.muted,fontSize:11,marginTop:2}}>{prop.desc}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap",marginTop:6}}>
                  <span style={{color:C.green}}>💵 ${prop.price.toLocaleString()}</span>
                  <span style={{color:C.gold}}>+${prop.incomePerHour.toLocaleString()}/hr base</span>
                  {owned>0&&<span style={{color:C.orange}}>earning ${rate.toLocaleString()}/hr</span>}
                  <span style={{color:C.muted}}>📈 ROI: {payback}h</span>
                  <span style={{color:C.dim}}>🔓 LVL {prop.unlockLevel}</span>
                </div>
              </div>
            </div>
            {!unlocked
              ?<div style={{...S.badge(C.red),fontSize:10}}>Requires Level {prop.unlockLevel}</div>
              :<div style={{display:"flex",gap:8}}>
                <button
                  style={{...S.btn(canAfford?C.orange:C.muted,canAfford?C.orangeBg:"#0d140d"),flex:1,opacity:canAfford?1:0.4}}
                  onClick={()=>canAfford?onBuyProperty(prop):showMsg("❌ Not enough cash")}
                  disabled={!canAfford}>
                  {canAfford?"BUY — $"+prop.price.toLocaleString():"❌ NEED $"+prop.price.toLocaleString()}
                </button>
                {owned>0&&<button style={{...S.btn(C.purple,"#080e08"),padding:"9px 14px"}} onClick={()=>{setTab("upgrades");setDetail(prop.id);}}>⬆</button>}
              </div>
            }
          </div>
        );
      })}
    </div>}

    {/* ── UPGRADES TAB ── */}
    {tab==="upgrades"&&<div>
      {/* Property selector */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {ownedProps.map(prop=>(
          <button key={prop.id} onClick={()=>setDetail(prop.id)} style={{padding:"7px 12px",background:detail===prop.id?C.goldBg:"#0d140d",border:`1px solid ${detail===prop.id?C.gold:C.border}`,borderRadius:4,color:detail===prop.id?C.gold:C.muted,cursor:"pointer",fontSize:10}}>
            {prop.icon} {prop.name}
          </button>
        ))}
      </div>

      {ownedProps.length===0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:28}}>Buy properties first before upgrading them.</div>}

      {detail&&(()=>{
        const prop    = PROPERTIES.find(p=>p.id===detail);
        const upgrades= PROP_UPGRADES[detail]||[];
        const curTier = propUpgradeTier(player, detail);
        const baseRate= propIncomeRate(player, prop);
        if(!prop) return null;
        return(
          <div>
            {/* Current status card */}
            <div style={S.card({borderColor:C.gold+"44",background:"#050e05"})}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{fontSize:26}}>{prop.icon}</span>
                <div>
                  <div style={{color:C.gold,fontWeight:900,fontSize:16}}>{prop.name}</div>
                  <div style={{color:C.muted,fontSize:11}}>×{player.properties[detail]} owned · Tier {curTier}/{upgrades.length}</div>
                </div>
              </div>
              {/* Tier progress bar */}
              <div style={{display:"flex",gap:4,marginBottom:12}}>
                {upgrades.map((_,i)=>(
                  <div key={i} style={{flex:1,height:6,borderRadius:2,background:i<curTier?C.gold:C.dim}}/>
                ))}
              </div>
              <div style={{display:"flex",gap:16,fontSize:12}}>
                <span style={{color:C.green}}>Current income: ${baseRate.toLocaleString()}/hr</span>
              </div>
            </div>

            {/* Upgrade list */}
            {upgrades.map((up,i)=>{
              const done    = i<curTier;
              const isNext  = i===curTier;
              const locked  = i>curTier;
              const canAfford= player.cash>=up.cost;
              return(
                <div key={i} style={S.card({opacity:locked?0.35:1,borderColor:done?C.gold+"44":isNext?C.purple+"44":C.border,background:done?"#050e05":isNext?"#080e08":C.card})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:done?C.goldBg:isNext?C.purple+"22":"#0d140d",border:`2px solid ${done?C.gold:isNext?C.purple:C.dim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,color:done?C.gold:isNext?C.purple:C.muted}}>
                          {done?"✓":i+1}
                        </div>
                        <span style={{color:done?C.gold:isNext?"#fff":C.muted,fontWeight:700,fontSize:13}}>{up.name}</span>
                        {done&&<span style={S.badge(C.gold)}>COMPLETE</span>}
                        {isNext&&<span style={S.badge(C.purple)}>AVAILABLE</span>}
                      </div>
                      <div style={{color:C.muted,fontSize:11,marginLeft:32,marginBottom:6}}>{up.desc}</div>
                      <div style={{marginLeft:32,display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
                        <span style={{color:C.green}}>+${up.incomeBonus.toLocaleString()}/hr per unit</span>
                        <span style={{color:done?C.muted:canAfford?C.gold:C.red}}>Cost: ${up.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {isNext&&(
                    <button
                      style={{...S.btnF(canAfford?C.purple:C.muted,canAfford?"#080e08":"#0d140d"),opacity:canAfford?1:0.4,marginTop:4}}
                      onClick={()=>{
                        if(!canAfford)return showMsg("❌ Not enough cash");
                        onUpgrade(detail, up);
                        showMsg(`✅ ${up.name} installed on ${prop.name}!`);
                      }}
                      disabled={!canAfford}>
                      {canAfford?`⬆ INSTALL — $${up.cost.toLocaleString()}`:`❌ NEED $${up.cost.toLocaleString()}`}
                    </button>
                  )}
                </div>
              );
            })}
            {curTier>=upgrades.length&&<div style={{...S.card({borderColor:C.gold+"44"}),textAlign:"center",color:C.gold,fontWeight:700,fontSize:13,padding:20}}>
              🏆 FULLY UPGRADED — Maximum income achieved
            </div>}
          </div>
        );
      })()}

      {!detail&&ownedProps.length>0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:20}}>
        Select a property above to view its upgrades.
      </div>}
    </div>}
  </div>);
}

// ============================================================
// TRAVEL PAGE
// ============================================================
const ALL_LOOT = [...ITEMS, ...BM_POOL];

function TravelPage({player, onTravel, onArrive, onCityCrime}) {
  const [tab, setTab]     = useState("map");
  const [confirm, setConfirm] = useState(null);
  const [log, setLog]     = useState([]);
  const [busy, setBusy]   = useState(false);

  const now         = Date.now();
  const city        = CITIES.find(c=>c.id===(player.currentCity||"hometown")) || CITIES[0];
  const travelling  = !!player.travellingTo;
  const destCity    = CITIES.find(c=>c.id===player.travellingTo);
  const arrivalMs   = player.travelArrival||0;
  const timeLeft    = Math.max(0, arrivalMs - now);
  const canArrive   = travelling && timeLeft <= 0;
  const cooldownLeft= player.lastTravel ? Math.max(0, TRAVEL_COOLDOWN_MS-(now-player.lastTravel)) : 0;
  const visited     = player.citiesVisited||["hometown"];

  useEffect(()=>{
    if(!canArrive) return;
    onArrive(destCity);
  },[canArrive]);

  function fmtTime(ms) {
    if(ms<=0) return "0s";
    const s=Math.floor(ms/1000);
    if(s<60) return s+"s";
    const m=Math.floor(s/60), sec=s%60;
    if(m<60) return m+"m "+sec+"s";
    return Math.floor(m/60)+"h "+m%60+"m";
  }

  function travel(dest) {
    if(travelling||cooldownLeft>0||player.cash<dest.travelCost||dest.id===city.id) return;
    setConfirm({
      msg:`Travel to ${dest.flag} ${dest.name}?\n\nCost: $${dest.travelCost.toLocaleString()}\nTravel time: ${dest.travelHours===0?"Instant":dest.travelHours+"h"}`,
      action:()=>onTravel(dest),
    });
  }

  function commitCrime(crime) {
    if(busy) return;
    const ALLCRIMES=[
      {id:"pickpocket", name:"Pickpocket",   baseChance:70,baseReward:200,  nerve:3, xp:10,  difficulty:5 },
      {id:"shoplifting",name:"Shoplifting",  baseChance:65,baseReward:400,  nerve:5, xp:20,  difficulty:10},
      {id:"mugging",    name:"Mugging",      baseChance:55,baseReward:700,  nerve:8, xp:35,  difficulty:18},
      {id:"carjacking", name:"Car Theft",    baseChance:50,baseReward:1000, nerve:12,xp:60,  difficulty:20},
      {id:"robbery",    name:"Armed Robbery",baseChance:40,baseReward:2500, nerve:18,xp:100, difficulty:30},
      {id:"heist",      name:"Bank Heist",   baseChance:25,baseReward:8000, nerve:30,xp:250, difficulty:50},
    ];
    const cr=ALLCRIMES.find(c=>c.id===crime);
    if(!cr) return;
    if(player.nerve<cr.nerve){setLog(l=>[`Not enough nerve (need ${cr.nerve})`,...l].slice(0,20));return;}
    setBusy(true);
    setTimeout(()=>{
      const chance=Math.min(95,Math.max(5,cr.baseChance+Math.floor(player.level*1.5)+(city.crimeBonus||0)-cr.difficulty));
      const won=Math.random()*100<=chance;
      const cashEarned=won?Math.floor(cr.baseReward*city.cashMult*(1+Math.random()*0.4)):0;
      const xpEarned=won?Math.floor(cr.xp*city.xpMult):Math.floor(cr.xp*0.2);
      let lootItem=null;
      if(won&&Math.random()<0.10){
        const pool=city.lootTable.map(id=>ALL_LOOT.find(i=>i.id===id)).filter(Boolean);
        if(pool.length)lootItem=pool[Math.floor(Math.random()*pool.length)];
      }
      const lines=won
        ?[`SUCCESS: ${cr.name} +$${cashEarned.toLocaleString()} +${xpEarned}xp${lootItem?` LOOT: ${lootItem.name}`:""}`,`  chance was ${chance}%`]
        :[`FAILED: ${cr.name} caught! +${xpEarned}xp`,`  chance was ${chance}%`];
      setLog(l=>[...lines,...l].slice(0,30));
      onCityCrime({won,cashEarned,xpEarned,lootItem,nerve:cr.nerve,jailId:cr.id,cityId:city.id});
      setBusy(false);
    },600);
  }

  const RARITY_C={common:C.muted,rare:C.blue,legendary:C.gold};

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}

    {travelling&&<div style={{background:"#060e06",border:`1px solid ${C.blue}44`,borderRadius:6,padding:14,marginBottom:12,textAlign:"center"}}>
      <div style={{color:C.blue,fontWeight:900,fontSize:14,marginBottom:4}}>IN TRANSIT to {destCity&&destCity.flag} {destCity&&destCity.name}</div>
      {canArrive
        ?<button style={S.btnF(C.green,C.greenBg)} onClick={()=>onArrive(destCity)}>ARRIVE NOW</button>
        :<div style={{color:C.muted,fontSize:12}}>Arriving in <span style={{color:C.blue,fontWeight:700}}>{fmtTime(timeLeft)}</span></div>
      }
    </div>}

    <div style={S.card({borderColor:C.orange+"44",background:"#050f05"})}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:3}}>CURRENT LOCATION</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>{city.flag} {city.name}</div>
          <div style={{color:C.muted,fontSize:11,marginTop:4,maxWidth:240}}>{city.flavor}</div>
        </div>
        <div style={{textAlign:"right"}}>
          {city.crimeBonus>0&&<div style={S.badge(C.green)}>+{city.crimeBonus}% CRIME</div>}
          {city.cashMult>1&&<div style={{...S.badge(C.gold),marginTop:4}}>x{city.cashMult} CASH</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap",marginTop:6}}>
        <span style={{color:C.muted}}>Cities visited: <span style={{color:"#fff",fontWeight:700}}>{visited.length}/{CITIES.length}</span></span>
        {cooldownLeft>0&&!travelling&&<span style={{color:C.red}}>Cooldown: {fmtTime(cooldownLeft)}</span>}
      </div>
    </div>

    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {["map","crimes","loot"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.orange:"#0d140d",border:`1px solid ${tab===t?C.orange:C.border}`,borderRadius:4,color:tab===t?"#000":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400}}>
          {t==="map"?"MAP":t==="crimes"?"CRIMES":"LOOT"}
        </button>
      ))}
    </div>

    {tab==="map"&&<div>
      {CITIES.map(dest=>{
        const locked=player.level<dest.unlockLevel;
        const isCurrent=dest.id===city.id;
        const isVisited=visited.includes(dest.id);
        const canAfford=player.cash>=dest.travelCost;
        const onCooldown=cooldownLeft>0;
        const canTravel=!locked&&!isCurrent&&!travelling&&!onCooldown&&canAfford;
        return(<div key={dest.id} style={S.card({opacity:locked?0.35:1,borderColor:isCurrent?C.orange+"66":isVisited?C.green+"33":C.border,background:isCurrent?"#050f05":C.card})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:24}}>{dest.flag}</span>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:isCurrent?C.orange:"#fff",fontWeight:900,fontSize:15}}>{dest.name}</span>
                    {isCurrent&&<span style={S.badge(C.orange)}>HERE</span>}
                    {isVisited&&!isCurrent&&<span style={S.badge(C.green)}>VISITED</span>}
                    {locked&&<span style={S.badge(C.red)}>LVL {dest.unlockLevel}</span>}
                  </div>
                  <div style={{color:C.muted,fontSize:11,marginTop:2}}>{dest.desc}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap",marginTop:4}}>
                {dest.crimeBonus>0&&<span style={{color:C.green}}>+{dest.crimeBonus}% crime</span>}
                {dest.cashMult>1&&<span style={{color:C.gold}}>x{dest.cashMult} cash</span>}
                {dest.xpMult>1&&<span style={{color:C.purple}}>x{dest.xpMult} XP</span>}
                {dest.travelCost>0&&<span style={{color:canAfford?C.muted:C.red}}>$${dest.travelCost.toLocaleString()}</span>}
                {dest.travelHours>0&&<span style={{color:C.muted}}>{dest.travelHours}h travel</span>}
                {dest.travelHours===0&&<span style={{color:C.green}}>Instant</span>}
              </div>
            </div>
          </div>
          {!locked&&!isCurrent&&(
            <button style={{...S.btnF(canTravel?C.orange:C.muted,canTravel?C.orangeBg:"#0d140d"),opacity:canTravel?1:0.4}} onClick={()=>canTravel&&travel(dest)} disabled={!canTravel}>
              {travelling?"TRAVELLING":onCooldown?"COOLDOWN "+fmtTime(cooldownLeft):!canAfford?"NEED $"+dest.travelCost.toLocaleString():"TRAVEL TO "+dest.name.toUpperCase()}
            </button>
          )}
        </div>);
      })}
    </div>}

    {tab==="crimes"&&<div>
      {travelling&&<div style={{...S.card(),color:C.muted,textAlign:"center"}}>In transit — arrive first.</div>}
      {!travelling&&<div>
        <div style={S.card({borderColor:C.orange+"33",background:"#050f05"})}>
          <div style={S.ct}>CRIMES IN {city.name.toUpperCase()}</div>
          <div style={{color:C.muted,fontSize:11}}>+{city.crimeBonus}% success · x{city.cashMult} cash · x{city.xpMult} XP</div>
          <div style={{color:C.muted,fontSize:10,marginTop:4}}>Nerve: {Math.floor(player.nerve)}/{MAX_NERVE}</div>
        </div>
        {city.crimes.map(crimeId=>{
          const ALLC=[
            {id:"pickpocket", name:"Pickpocket",   baseChance:70,baseReward:200,  nerve:3, xp:10,  difficulty:5 },
            {id:"shoplifting",name:"Shoplifting",  baseChance:65,baseReward:400,  nerve:5, xp:20,  difficulty:10},
            {id:"mugging",    name:"Mugging",      baseChance:55,baseReward:700,  nerve:8, xp:35,  difficulty:18},
            {id:"carjacking", name:"Car Theft",    baseChance:50,baseReward:1000, nerve:12,xp:60,  difficulty:20},
            {id:"robbery",    name:"Armed Robbery",baseChance:40,baseReward:2500, nerve:18,xp:100, difficulty:30},
            {id:"heist",      name:"Bank Heist",   baseChance:25,baseReward:8000, nerve:30,xp:250, difficulty:50},
          ];
          const cr=ALLC.find(c=>c.id===crimeId);
          if(!cr)return null;
          const chance=Math.min(95,Math.max(5,cr.baseChance+Math.floor(player.level*1.5)+(city.crimeBonus||0)-cr.difficulty));
          const hasNerve=player.nerve>=cr.nerve;
          const estCash=Math.floor(cr.baseReward*city.cashMult);
          return(<div key={crimeId} style={S.card({opacity:hasNerve?1:0.45})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:13,marginBottom:3}}>{cr.name}</div>
                <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap"}}>
                  <span style={{color:chance>=60?C.green:chance>=35?C.orange:C.red}}>{chance}%</span>
                  <span style={{color:C.gold}}>~${estCash.toLocaleString()}</span>
                  <span style={{color:C.purple}}>+{Math.floor(cr.xp*city.xpMult)}xp</span>
                  <span style={{color:hasNerve?C.muted:C.red}}>{cr.nerve} nerve</span>
                  <span style={{color:C.dim}}>10% loot</span>
                </div>
              </div>
              <button style={{...S.btn(hasNerve&&!busy?C.orange:C.muted,hasNerve&&!busy?C.orangeBg:"#0d140d"),opacity:hasNerve&&!busy?1:0.4,marginLeft:8}} onClick={()=>hasNerve&&!busy&&commitCrime(crimeId)} disabled={!hasNerve||busy}>
                {busy?"...":"DO IT"}
              </button>
            </div>
          </div>);
        })}
        {log.length>0&&<div style={S.card()}>
          <div style={S.ct}>ACTIVITY LOG</div>
          <div style={S.logB}>
            {log.map((l,i)=><div key={i} style={{color:l.startsWith("SUCCESS")?C.green:l.startsWith("FAILED")?C.red:C.muted}}>{l}</div>)}
          </div>
        </div>}
      </div>}
    </div>}

    {tab==="loot"&&<div>
      <div style={S.card({background:"#040d04"})}>
        <div style={S.ct}>CITY LOOT TABLES</div>
        <div style={{color:C.muted,fontSize:11}}>10% drop chance on successful crimes. Rarer cities = better loot.</div>
      </div>
      {CITIES.filter(c=>visited.includes(c.id)||(player.level>=c.unlockLevel)).map(dest=>{
        const isHere=dest.id===city.id;
        return(<div key={dest.id} style={S.card({borderColor:isHere?C.orange+"44":C.border})}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>{dest.flag}</span>
            <span style={{color:isHere?C.orange:"#fff",fontWeight:700}}>{dest.name}</span>
            {isHere&&<span style={S.badge(C.orange)}>CURRENT</span>}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {dest.lootTable.map(id=>{
              const item=ALL_LOOT.find(i=>i.id===id);
              if(!item)return null;
              const rc=RARITY_C[item.rarity]||C.muted;
              return(<div key={id} style={{padding:"5px 9px",background:rc+"11",border:`1px solid ${rc}33`,borderRadius:4,fontSize:10}}>
                <span style={{color:rc,fontWeight:700}}>{item.name}</span>
                <span style={{color:C.dim,fontSize:9,marginLeft:4}}>{item.rarity}</span>
              </div>);
            })}
          </div>
        </div>);
      })}
    </div>}
  </div>);
}

// ============================================================
// BLACK MARKET PAGE
// ============================================================
function BlackMarketPage({player,onBuy}) {
  const [purchased,setPurchased]=useState({});
  const items=getDailyBMItems(player.bmSeed||Date.now());
  const RC={common:C.muted,rare:C.blue,legendary:C.gold};
  const prestige=getPrestige(player.prestigeTier||0);

  const today=new Date().toDateString();
  const [lastDay,setLastDay]=useState(today);
  useEffect(()=>{ if(today!==lastDay){setPurchased({});setLastDay(today);} },[today,lastDay]);

  function buyItem(item) {
    const bought=purchased[item.id]||0;
    if(bought>=item.stock)return;
    if(player.cash<item.price)return;
    onBuy({...item, isBM:true});
    setPurchased(p=>({...p,[item.id]:(p[item.id]||0)+1}));
  }

  return(<div>
    <div style={S.card({borderColor:C.purple+"44"})}>
      <div style={S.ct}>🕵 BLACK MARKET</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:6}}>
        Exclusive gear. Refreshes daily at midnight. Limited stock — first come first served.
      </div>
      {prestige&&<div style={{color:prestige.color,fontSize:11}}>✨ {prestige.label}: +{prestige.crimeBonus}% crime bonus active</div>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {items.map(item=>{
        const bought=purchased[item.id]||0;
        const remaining=item.stock-bought;
        const canAfford=player.cash>=item.price;
        const owned=player.inventory?.includes(item.id);
        const soldOut=remaining<=0;
        return(<div key={item.id} style={S.card({borderColor:soldOut?C.dim:item.rarity==="legendary"?C.gold+"44":C.border,opacity:soldOut?0.5:1})}>
          <div style={{marginBottom:6}}>
            <div style={{color:soldOut?C.dim:item.rarity==="legendary"?C.gold:item.rarity==="rare"?C.blue:"#fff",fontWeight:700,fontSize:12,marginBottom:2}}>{item.name}</div>
            <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span>
          </div>
          <div style={{fontSize:10,color:C.muted,marginBottom:6}}>
            {item.type==="weapon"?`+${item.weaponDmg} ATK`:item.type==="armor"?`+${item.armorRating} DEF`:item.type==="tool"?`+${item.crimeBonus} CRIME`:"CONSUMABLE"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:C.green,fontWeight:700}}>${item.price.toLocaleString()}</span>
            <span style={{color:soldOut?C.red:C.orange,fontSize:10}}>{soldOut?"SOLD OUT":`${remaining} left`}</span>
          </div>
          {soldOut||owned
            ?<div style={{...S.badge(soldOut?C.red:C.green),textAlign:"center",padding:"6px",display:"block"}}>{soldOut?"SOLD OUT":"OWNED"}</div>
            :<button
              style={{...S.btnF(canAfford?C.purple:C.muted,canAfford?"#0d0018":"#0d140d"),fontSize:10,padding:"7px",opacity:canAfford?1:0.4,cursor:canAfford?"pointer":"not-allowed"}}
              onClick={()=>canAfford&&buyItem(item)}
              disabled={!canAfford}>
              BUY
            </button>
          }
        </div>);
      })}
    </div>

    <div style={S.card({marginTop:8})}>
      <div style={S.ct}>🕐 NEXT REFRESH</div>
      <div style={{color:C.muted,fontSize:11}}>Market resets at midnight. Check back daily for new stock.</div>
      <div style={{color:C.purple,fontSize:12,marginTop:6,fontWeight:700}}>
        {(() => {
          const now=new Date();
          const midnight=new Date(now); midnight.setHours(24,0,0,0);
          const h=Math.floor((midnight-now)/3600000);
          const m=Math.floor(((midnight-now)%3600000)/60000);
          return `Refreshes in ${h}h ${m}m`;
        })()}
      </div>
    </div>
  </div>);
}

// ============================================================
// PRESTIGE PAGE
// ============================================================
function PrestigePage({player,onPrestige}) {
  const [confirm,setConfirm]=useState(false);
  const currentTier=player.prestigeTier||0;
  const nextTier=currentTier+1;
  const nextPrestige=PRESTIGE_BONUS.find(p=>p.tier===nextTier);
  const currentPrestige=getPrestige(currentTier);
  const canPrestige=player.level>=PRESTIGE_REQ_LEVEL&&nextTier<=5;

  return(<div>
    {confirm&&<Confirm
      msg={`PRESTIGE to ${nextPrestige?.label}? You will reset to Level 1 with +${Math.round((nextPrestige?.cashMult-1)*100)}% cash, +${Math.round((nextPrestige?.xpMult-1)*100)}% XP and +${nextPrestige?.crimeBonus}% crime bonus — permanently.`}
      onYes={()=>{onPrestige(nextPrestige);setConfirm(false);}}
      onNo={()=>setConfirm(false)}
    />}

    <div style={S.card({borderColor:currentPrestige?currentPrestige.color+"44":C.border})}>
      <div style={S.ct}>⚡ PRESTIGE</div>
      {currentPrestige
        ?<div style={{marginBottom:12}}>
          <div style={{color:currentPrestige.color,fontSize:22,fontWeight:900,letterSpacing:3,marginBottom:4}}>{currentPrestige.label} <span style={{fontSize:14}}>TIER {currentTier}</span></div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:11}}>
            <span style={{color:C.green}}>+{Math.round((currentPrestige.cashMult-1)*100)}% CASH</span>
            <span style={{color:C.purple}}>+{Math.round((currentPrestige.xpMult-1)*100)}% XP</span>
            <span style={{color:C.orange}}>+{currentPrestige.crimeBonus}% CRIME</span>
          </div>
        </div>
        :<div style={{color:C.dim,fontSize:12,marginBottom:12}}>No prestige yet. Reach Level {PRESTIGE_REQ_LEVEL} to begin.</div>
      }
      <div style={{color:C.muted,fontSize:11}}>
        Level: <span style={{color:player.level>=PRESTIGE_REQ_LEVEL?C.green:C.orange,fontWeight:700}}>{player.level}/{PRESTIGE_REQ_LEVEL}</span>
        {player.prestigeCount>0&&<span style={{color:C.muted,marginLeft:12}}>Times prestiged: {player.prestigeCount}</span>}
      </div>
    </div>

    <div style={S.card()}>
      <div style={S.ct}>🏅 PRESTIGE TIERS</div>
      {PRESTIGE_BONUS.map(p=>{
        const unlocked=currentTier>=p.tier;
        const isCurrent=currentTier===p.tier;
        const isNext=nextTier===p.tier;
        return(<div key={p.tier} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`,opacity:unlocked||isNext?1:0.4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{color:p.color,fontWeight:900,fontSize:14}}>TIER {p.tier} — {p.label}</span>
                {isCurrent&&<span style={S.badge(p.color)}>CURRENT</span>}
                {unlocked&&!isCurrent&&<span style={S.badge(C.green)}>✓</span>}
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap"}}>
                <span style={{color:C.green}}>+{Math.round((p.cashMult-1)*100)}% cash</span>
                <span style={{color:C.purple}}>+{Math.round((p.xpMult-1)*100)}% XP</span>
                <span style={{color:C.orange}}>+{p.crimeBonus}% crime</span>
              </div>
            </div>
            <span style={{color:C.muted,fontSize:10}}>LVL {PRESTIGE_REQ_LEVEL} req</span>
          </div>
        </div>);
      })}
    </div>

    {nextTier<=5&&<div style={S.card({borderColor:canPrestige?C.red+"44":C.border})}>
      <div style={S.ct}>🔥 PRESTIGE UP</div>
      {nextPrestige&&<>
        <div style={{color:C.muted,fontSize:11,marginBottom:12,lineHeight:1.6}}>
          Reset to <span style={{color:"#fff"}}>Level 1</span> and become <span style={{color:nextPrestige.color,fontWeight:700}}>{nextPrestige.label}</span>.
          Your stats, cash, and inventory carry over. You keep your properties and syndicate.
          Gain permanent: <span style={{color:C.green}}>+{Math.round((nextPrestige.cashMult-1)*100)}% cash</span> · <span style={{color:C.purple}}>+{Math.round((nextPrestige.xpMult-1)*100)}% XP</span> · <span style={{color:C.orange}}>+{nextPrestige.crimeBonus}% crime success</span>
        </div>
        <button
          style={{...S.btnF(canPrestige?C.red:C.muted,canPrestige?C.redBg:"#0d140d"),opacity:canPrestige?1:0.4,cursor:canPrestige?"pointer":"not-allowed"}}
          onClick={()=>canPrestige&&setConfirm(true)}
          disabled={!canPrestige}>
          {canPrestige?`⚡ PRESTIGE → ${nextPrestige.label}`:`REACH LVL ${PRESTIGE_REQ_LEVEL} TO PRESTIGE`}
        </button>
      </>}
      {nextTier>5&&<div style={{color:C.gold,fontSize:13,fontWeight:700}}>MAX PRESTIGE REACHED — You are a true Shadow.</div>}
    </div>}
  </div>);
}

// ============================================================
// NOTIFICATION DRAWER
// ============================================================
function NotifDrawer({player, onClose, onMarkAll}) {
  const [filter, setFilter] = useState("all");
  const notifs = player.notifications||[];
  const filters = ["all","combat","crime","income","level","system","reward","buy"];
  const visible = filter==="all" ? notifs : notifs.filter(n=>n.type===filter);

  return(
    <div style={{position:"fixed",inset:0,background:"#000b",zIndex:10001,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:"12px 12px 0 0",maxHeight:"75vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"16px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{color:"#fff",fontWeight:900,fontSize:15,letterSpacing:2}}>🔔 NOTIFICATIONS</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {(player.notifUnread||0)>0&&<button style={{...S.btn(C.muted,"#0d140d"),padding:"4px 10px",fontSize:9}} onClick={onMarkAll}>MARK ALL READ</button>}
            <button style={{...S.btn(C.muted,"#0d140d"),padding:"4px 10px",fontSize:9}} onClick={onClose}>✕</button>
          </div>
        </div>
        {/* Filter chips */}
        <div style={{display:"flex",gap:6,padding:"8px 16px",overflowX:"auto",flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          {filters.map(f=>{
            const meta=NOTIF_TYPES[f];
            return(<button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${filter===f?(meta?.color||C.blue):C.border}`,background:filter===f?(meta?.color||C.blue)+"22":"transparent",color:filter===f?(meta?.color||C.blue):C.muted,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",fontWeight:filter===f?700:400}}>
              {meta?.icon||"•"} {f.toUpperCase()}
            </button>);
          })}
        </div>
        {/* List */}
        <div style={{overflowY:"auto",flex:1}}>
          {visible.length===0&&<div style={{padding:24,color:C.dim,textAlign:"center",fontSize:12}}>No notifications yet.</div>}
          {visible.map(n=>{
            const meta=NOTIF_TYPES[n.type]||NOTIF_TYPES.system;
            return(
              <div key={n.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,background:n.read?"transparent":"#0d0d18",display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>{meta.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:n.read?"#aaa":"#fff",fontSize:12,lineHeight:1.5}}>{n.text}</div>
                  <div style={{color:C.muted,fontSize:9,marginTop:3}}>{tsAgo(n.ts)}</div>
                </div>
                {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:meta.color,flexShrink:0,marginTop:4}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FEED PAGE
// ============================================================
function FeedPage({player, onMarkAll}) {
  const [filter, setFilter] = useState("all");
  const notifs = player.notifications||[];
  const filters = ["all","combat","crime","income","level","system","reward","buy"];
  const visible = filter==="all" ? notifs : notifs.filter(n=>n.type===filter);

  return(<div>
    <div style={S.card({borderColor:C.blue+"44"})}>
      <div style={S.ct}>📋 ACTIVITY FEED</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:10}}>Your full event history — attacks, crimes, income and more.</div>
      {(player.notifUnread||0)>0&&<button style={S.btn(C.muted,"#0d140d")} onClick={onMarkAll}>✅ Mark all read</button>}
    </div>

    {/* Filter chips */}
    <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
      {filters.map(f=>{
        const meta=NOTIF_TYPES[f];
        return(<button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${filter===f?(meta?.color||C.blue):C.border}`,background:filter===f?(meta?.color||C.blue)+"22":"transparent",color:filter===f?(meta?.color||C.blue):C.muted,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",fontWeight:filter===f?700:400}}>
          {meta?.icon||"•"} {f.toUpperCase()}
        </button>);
      })}
    </div>

    {visible.length===0&&<div style={{...S.card(),color:C.dim,textAlign:"center"}}>No events yet. Go commit some crimes.</div>}
    {visible.map(n=>{
      const meta=NOTIF_TYPES[n.type]||NOTIF_TYPES.system;
      return(
        <div key={n.id} style={{...S.card({background:n.read?"#0c0c14":"#0f0f1c",borderColor:n.read?C.border:meta.color+"33"}),marginBottom:8,padding:"12px 14px"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20,flexShrink:0}}>{meta.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:n.read?"#ccc":"#fff",fontSize:12,lineHeight:1.5,marginBottom:3}}>{n.text}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{...S.badge(meta.color),fontSize:8}}>{n.type.toUpperCase()}</span>
                <span style={{color:C.muted,fontSize:9}}>{tsAgo(n.ts)}</span>
                {!n.read&&<span style={{...S.badge(meta.color),fontSize:8}}>NEW</span>}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>);
}

// ============================================================
// PLAYER PROFILE MODAL
// ============================================================
function PlayerProfileModal({target, viewer, onClose, onAttack}) {
  const isMe = target.username === viewer.username;
  const prestige = getPrestige(target.prestigeTier||0);
  const wpn = ITEMS.find(i=>i.id===target.equippedWeapon);
  const arm = ITEMS.find(i=>i.id===target.equippedArmor);
  const wr = target.wins+target.losses>0
    ? ((target.wins/(target.wins+target.losses))*100).toFixed(0)+"%" : "—";
  const inHosp = target.inHospitalUntil && target.inHospitalUntil > Date.now();
  const hospLeft = inHosp ? Math.ceil((target.inHospitalUntil-Date.now())/60000) : 0;
  const propCount = Object.values(target.properties||{}).reduce((s,v)=>s+(v||0),0);
  const viewerInHosp = viewer.inHospitalUntil && viewer.inHospitalUntil > Date.now();

  return(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:10000}} onClick={onClose}>
      <div
        style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:"12px 12px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{color:"#fff",fontSize:20,fontWeight:900,letterSpacing:2,marginBottom:2}}>{target.name}</div>
            <div style={{color:C.muted,fontSize:11,marginBottom:6}}>@{target.username}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {prestige&&<span style={S.badge(prestige.color)}>{prestige.label} T{target.prestigeTier}</span>}
              {target.syndicate&&<span style={S.badge(C.purple)}>🏴 {target.syndicate}</span>}
              {inHosp&&<span style={S.badge(C.blue)}>🏥 hospital {hospLeft}m</span>}
              {isMe&&<span style={S.badge(C.green)}>YOU</span>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.red,fontSize:26,fontWeight:900,lineHeight:1}}>LVL {target.level}</div>
            <div style={{color:C.orange,fontSize:12,marginTop:2}}>⭐ {target.reputation} REP</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[
            ["⚔ ATK", calcAttack(target), C.red],
            ["🛡 DEF", calcDefense(target), C.blue],
            ["❤ HP",  target.health,        C.green],
            ["💪 STR", target.strength,      "#ff6e6e"],
            ["🧲 DEF", target.defense,       "#6eb4ff"],
            ["⚡ DEX", target.dexterity,     C.orange],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
              <div style={{color:c,fontWeight:900,fontSize:15}}>{typeof v==="number"?Math.floor(v):v}</div>
              <div style={{color:C.muted,fontSize:9,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Record + cash */}
        <div style={S.card({marginBottom:10})}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[
              ["WINS",   target.wins,   C.green],
              ["LOSSES", target.losses, C.red],
              ["W/L",    wr,            C.orange],
              ["CRIMES", target.crimeStats?.total||0, C.muted],
              ["PROPS",  propCount,     C.gold],
            ].map(([l,v,c])=>(
              <div key={l}>
                <div style={{color:c,fontWeight:900,fontSize:15}}>{v}</div>
                <div style={{color:C.muted,fontSize:9}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loadout */}
        <div style={S.card({marginBottom:14})}>
          <div style={S.ct}>🎒 LOADOUT</div>
          <div style={{display:"flex",gap:20}}>
            <div>
              <div style={{color:C.muted,fontSize:9,marginBottom:3}}>WEAPON</div>
              <div style={{color:wpn?C.orange:"#333",fontWeight:700,fontSize:12}}>{wpn?.name||"Bare Hands"}</div>
              {wpn&&<div style={{color:C.muted,fontSize:10}}>+{wpn.weaponDmg} ATK</div>}
            </div>
            <div>
              <div style={{color:C.muted,fontSize:9,marginBottom:3}}>ARMOR</div>
              <div style={{color:arm?C.blue:"#333",fontWeight:700,fontSize:12}}>{arm?.name||"None"}</div>
              {arm&&<div style={{color:C.muted,fontSize:10}}>+{arm.armorRating} DEF</div>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:8}}>
          {!isMe&&(
            <button
              style={{...S.btnF(viewerInHosp?C.muted:C.red, viewerInHosp?C.dim:C.redBg), opacity:viewerInHosp?0.4:1, cursor:viewerInHosp?"not-allowed":"pointer", flex:2}}
              onClick={()=>{ if(!viewerInHosp){onAttack(target); onClose();} }}
              disabled={viewerInHosp}
            >
              {viewerInHosp?"🏥 HOSPITALIZED":"⚔ CHALLENGE"}
            </button>
          )}
          <button style={{...S.btnF(C.muted,"#0d140d"), flex:1}} onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LEADERBOARD PAGE
// ============================================================
function LeaderboardPage({player,onAttackFromLB,onViewProfile}) {
  const [tab,setTab]=useState("players");
  const accounts=getAccounts();
  const players=Object.values(accounts).map(a=>a.player).sort((a,b)=>b.level-a.level||b.reputation-a.reputation);
  const syndicates=getSyndicates().sort((a,b)=>b.level-a.level||b.treasury-a.treasury);
  const inHosp=player.inHospitalUntil&&player.inHospitalUntil>Date.now();

  return(<div>
    <Tabs tabs={["players","syndicates"]} active={tab} onSelect={setTab}/>
    {tab==="players"&&<div style={S.card()}>
      <div style={S.ct}>🏆 TOP PLAYERS</div>
      <div style={{color:C.muted,fontSize:10,marginBottom:10}}>
        Click <span style={{color:C.red,fontWeight:700}}>⚔ ATTACK</span> to challenge any player — takes you straight to combat
        {inHosp&&<span style={{color:C.blue,marginLeft:8}}>· 🏥 You are hospitalized</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 40px 45px 55px 96px",gap:6,color:C.dim,fontSize:9,letterSpacing:1,marginBottom:8,padding:"0 4px"}}>
        <span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span><span></span>
      </div>
      {players.slice(0,100).map((p,i)=>{
        const isMe=p.username===player.username;
        const targetInHosp=p.inHospitalUntil&&p.inHospitalUntil>Date.now();
        return(
          <div key={p.username} style={{display:"grid",gridTemplateColumns:"28px 1fr 40px 45px 55px 96px",gap:6,padding:"8px 4px",borderBottom:`1px solid ${C.border}`,background:isMe?C.redBg:"transparent",borderRadius:2,alignItems:"center"}}>
            <span style={{color:i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.muted,fontWeight:i<3?900:400,fontSize:i<3?13:11}}>
              {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
            </span>
            <div style={{cursor:"pointer"}} onClick={()=>onViewProfile(p)}>
              <div style={{color:isMe?C.red:C.blue,fontWeight:700,fontSize:11,textDecoration:"underline",textDecorationStyle:"dotted"}}>{p.name}{isMe&&" 👈"}</div>
              {targetInHosp&&<div style={{fontSize:9,color:C.blue}}>🏥 hospitalized</div>}
            </div>
            <span style={{color:C.purple,fontWeight:700,fontSize:11}}>{p.level}</span>
            <span style={{color:C.orange,fontSize:11}}>{p.reputation}</span>
            <span style={{color:C.green,fontSize:10}}>${Math.floor(p.cash/1000)}k</span>
            <div style={{display:"flex",gap:4}}>
              {!isMe&&<button
                style={{...S.btn(inHosp?C.muted:C.red,inHosp?C.dim:C.redBg),padding:"4px 6px",fontSize:9,opacity:inHosp?0.4:1,cursor:inHosp?"not-allowed":"pointer",flex:1}}
                onClick={()=>!inHosp&&onAttackFromLB(p)}
                disabled={inHosp}
              >⚔</button>}
              <button
                style={{...S.btn(C.blue,"#060e1a"),padding:"4px 6px",fontSize:9,cursor:"pointer",flex:1}}
                onClick={()=>onViewProfile(p)}
              >👤</button>
            </div>
          </div>
        );
      })}
      {players.length===0&&<div style={{color:C.dim}}>No players yet.</div>}
    </div>}
    {tab==="syndicates"&&<div style={S.card()}>
      <div style={S.ct}>🏴 TOP SYNDICATES</div>
      {syndicates.length===0&&<div style={{color:C.dim}}>No syndicates yet.</div>}
      {syndicates.map((s,i)=>(
        <div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"10px 4px",borderBottom:`1px solid ${C.border}`,background:s.name===player.syndicate?C.redBg:"transparent"}}>
          <div><span style={{color:i===0?C.gold:C.muted,marginRight:10,fontWeight:900}}>{i+1}</span><span style={{color:"#fff",fontWeight:700}}>{s.name}</span></div>
          <div style={{textAlign:"right",fontSize:11}}><div style={{color:C.purple}}>Lvl {s.level} · {s.members.length} members</div><div style={{color:C.gold}}>💰${s.treasury.toLocaleString()}</div></div>
        </div>
      ))}
    </div>}
  </div>);
}

// ============================================================
// ADMIN PAGE
// ============================================================
function AdminPage({player,notify}) {
  const [tab,setTab]=useState("players");
  const [players,setPlayers]=useState([]);
  const [sel,setSel]=useState(null);
  const [ann,setAnn]=useState("");
  const [anns,setAnns]=useState(getAnnouncements);
  const [give,setGive]=useState({cash:"",itemId:""});
  const [edit,setEdit]=useState({level:"",cash:"",strength:"",defense:"",dexterity:"",reputation:""});
  const [confirm,setConfirm]=useState(null);
  const [search,setSearch]=useState("");

  function refresh(){
    const accs=getAccounts();
    setPlayers(Object.values(accs).map(a=>a.player));
    setAnns(getAnnouncements());
  }
  useEffect(()=>{refresh();},[]);

  function selectP(p){setSel(p);setEdit({level:p.level,cash:p.cash,strength:p.strength,defense:p.defense,dexterity:p.dexterity,reputation:p.reputation});}

  function saveP(updated) {
    const accs=getAccounts();
    if(accs[updated.username]){accs[updated.username].player=updated;saveAccounts(accs);}
    setSel(updated);setPlayers(ps=>ps.map(p=>p.username===updated.username?updated:p));
    notify("✅ Player saved");
  }

  function banP(username) {
    setConfirm({msg:`Ban & delete "${username}"? Cannot be undone.`,action:()=>{
      const accs=getAccounts(); delete accs[username]; saveAccounts(accs);
      setSel(null);refresh();notify(`🚫 ${username} banned`);
    }});
  }

  function applyEdit() {
    if(!sel)return;
    saveP({...sel,
      level:Math.max(1,parseInt(edit.level)||sel.level),
      cash:Math.max(0,parseInt(edit.cash)||sel.cash),
      strength:Math.max(1,parseInt(edit.strength)||sel.strength),
      defense:Math.max(1,parseInt(edit.defense)||sel.defense),
      dexterity:Math.max(1,parseInt(edit.dexterity)||sel.dexterity),
      reputation:Math.max(0,parseInt(edit.reputation)||sel.reputation),
    });
  }

  function giveCash() {
    if(!sel)return;
    const a=parseInt(give.cash);
    if(!a||a<=0)return notify("❌ Enter valid amount");
    saveP({...sel,cash:sel.cash+a});
    notify(`✅ Gave $${a.toLocaleString()} to ${sel.name}`);
  }

  function giveItem() {
    if(!sel||!give.itemId)return;
    if(sel.inventory.includes(give.itemId))return notify("❌ Already owned");
    saveP({...sel,inventory:[...sel.inventory,give.itemId]});
    notify(`✅ Gave ${ITEMS.find(i=>i.id===give.itemId)?.name} to ${sel.name}`);
  }

  function postAnn() {
    if(!ann.trim())return;
    const msg={id:Date.now(),text:ann.trim(),time:new Date().toLocaleString(),active:true};
    const updated=[msg,...anns.slice(0,9)];
    saveAnnouncements(updated);setAnns(updated);setAnn("");
    notify("📢 Announcement posted");
  }

  function delAnn(id) {
    const updated=anns.filter(a=>a.id!==id);
    saveAnnouncements(updated);setAnns(updated);
  }

  const filtered=players.filter(p=>p.username?.includes(search.toLowerCase())||p.name?.toLowerCase().includes(search.toLowerCase()));
  const totalCash=players.reduce((s,p)=>s+(p.cash||0),0);
  const totalCrimes=players.reduce((s,p)=>s+(p.crimeStats?.total||0),0);

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}
    <Tabs tabs={["players","give","edit","announce"]} active={tab} onSelect={setTab}/>

    <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      {[["👥 PLAYERS",players.length,C.blue],["💰 CASH","$"+totalCash.toLocaleString(),C.green],["🔪 CRIMES",totalCrimes,C.orange]].map(([l,v,c])=>(
        <div key={l} style={{background:"#090f09",border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 16px"}}>
          <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
          <div style={{color:C.muted,fontSize:9}}>{l}</div>
        </div>
      ))}
      <button style={{...S.btn(C.muted,"#0d140d"),marginLeft:"auto"}} onClick={refresh}>↺ REFRESH</button>
    </div>

    {tab==="players"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>👥 ALL PLAYERS</div>
        <input style={{...S.inp,marginBottom:12}} placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {filtered.length===0&&<div style={{color:C.dim}}>No players found.</div>}
        {filtered.map(p=>(
          <div key={p.username} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 80px",gap:6,padding:"10px 4px",borderBottom:`1px solid ${C.border}`,background:sel?.username===p.username?"#1a1a00":"transparent",cursor:"pointer",borderRadius:2}} onClick={()=>selectP(p)}>
            <div><div style={{color:"#fff",fontSize:12,fontWeight:700}}>{p.name}</div><div style={{color:C.muted,fontSize:9}}>@{p.username}</div></div>
            <span style={{color:C.purple,fontWeight:700}}>{p.level}</span>
            <span style={{color:C.orange}}>{p.reputation}</span>
            <span style={{color:C.green,fontSize:10}}>${Math.floor((p.cash||0)/1000)}k</span>
            <button style={{...S.btn(C.red,C.redBg),padding:"3px 8px",fontSize:9}} onClick={e=>{e.stopPropagation();banP(p.username);}}>BAN</button>
          </div>
        ))}
      </div>
      {sel&&<div style={S.card()}>
        <div style={S.ct}>📊 {sel.name}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Username",sel.username],["Level",sel.level],["Cash","$"+(sel.cash||0).toLocaleString()],["Rep",sel.reputation],["STR",sel.strength],["DEF",sel.defense],["DEX",sel.dexterity],["Wins",sel.wins],["Losses",sel.losses],["Crimes",sel.crimeStats?.total||0],["Syndicate",sel.syndicate||"None"],["Items",(sel.inventory?.length||0)+" items"]].map(([l,v])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between",background:"#0a0808",padding:"6px 10px",borderRadius:4}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:"#fff",fontWeight:700}}>{v}</span></div>
          ))}
        </div>
      </div>}
    </div>}

    {tab==="give"&&<div>
      {!sel&&<div style={{...S.card(),color:C.muted}}>👈 Select a player from Players tab first.</div>}
      {sel&&<><div style={S.card()}>
        <div style={S.ct}>🎁 GIVE TO: {sel.name}</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>Cash: <span style={{color:C.green}}>${(sel.cash||0).toLocaleString()}</span></div>
        <div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.inp,marginBottom:0,flex:1}} type="number" placeholder="Cash amount..." value={give.cash} onChange={e=>setGive(g=>({...g,cash:e.target.value}))}/><button style={S.btn(C.green,C.greenBg)} onClick={giveCash}>GIVE</button></div>
        <div style={{display:"flex",gap:8}}><select style={{...S.inp,marginBottom:0,flex:1}} value={give.itemId} onChange={e=>setGive(g=>({...g,itemId:e.target.value}))}><option value="">Select item...</option>{ITEMS.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><button style={S.btn(C.orange,C.orangeBg)} onClick={giveItem}>GIVE ITEM</button></div>
      </div></>}
    </div>}

    {tab==="edit"&&<div>
      {!sel&&<div style={{...S.card(),color:C.muted}}>👈 Select a player from Players tab first.</div>}
      {sel&&<div style={S.card()}>
        <div style={S.ct}>✏ EDIT: {sel.name}</div>
        <div style={S.g2}>
          {[["Level","level"],["Cash","cash"],["Strength","strength"],["Defense","defense"],["Dexterity","dexterity"],["Reputation","reputation"]].map(([label,key])=>(
            <div key={key}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>{label.toUpperCase()}</div><input style={S.inp} type="number" value={edit[key]} onChange={e=>setEdit(f=>({...f,[key]:e.target.value}))}/></div>
          ))}
        </div>
        <button style={S.btnF(C.orange,C.orangeBg)} onClick={applyEdit}>💾 SAVE CHANGES</button>
        <div style={{marginTop:10}}><button style={S.btn(C.red,C.redBg)} onClick={()=>banP(sel.username)}>🚫 BAN PLAYER</button></div>
      </div>}
    </div>}

    {tab==="announce"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>📢 BROADCAST</div>
        <textarea style={{...S.inp,height:80,resize:"vertical",marginBottom:10}} placeholder="Announcement message..." value={ann} onChange={e=>setAnn(e.target.value)}/>
        <button style={S.btn(C.orange,C.orangeBg)} onClick={postAnn}>📢 POST</button>
      </div>
      <div style={S.card()}>
        <div style={S.ct}>📋 ACTIVE ANNOUNCEMENTS</div>
        {anns.length===0&&<div style={{color:C.dim}}>None.</div>}
        {anns.map(a=>(
          <div key={a.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{color:"#fff",fontSize:12}}>{a.text}</div><div style={{color:C.muted,fontSize:10}}>{a.time}</div></div>
              <button style={{...S.btn(C.red,C.redBg),padding:"3px 8px",fontSize:9}} onClick={()=>delAnn(a.id)}>DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>}
  </div>);
}

// ============================================================
// JAIL PAGE
// ============================================================
function JailPage({player,onBail,onBreakout}) {
  const [log,setLog]=useState([]);
  const [busy,setBusy]=useState(false);
  const [bustInput,setBustInput]=useState("");

  const inJail=player.jailUntil&&player.jailUntil>Date.now();
  const timeLeft=inJail?Math.ceil((player.jailUntil-Date.now())/60000):0;
  const bail=BAIL_COST(player.level);
  const canAffordBail=player.cash>=bail;
  const breakoutChance=Math.min(80,20+player.dexterity*0.5);
  const pct=inJail?Math.max(0,100-(timeLeft/player.jailSentence)*100):100;

  function attemptBreakout(){
    if(!inJail||busy)return;
    if(player.energy<10){setLog(l=>[`❌ Need 10 energy to attempt breakout`,...l]);return;}
    setBusy(true);
    setTimeout(()=>{
      const success=Math.random()*100<=breakoutChance;
      if(success){
        setLog(l=>[`✅ Breakout successful! You slipped past the guards.`,...l]);
        onBreakout({success:true,energyCost:10});
      } else {
        setLog(l=>[`❌ Caught trying to escape! +5 min added.`,...l]);
        onBreakout({success:false,energyCost:10,extraTime:5*60000});
      }
      setBusy(false);
    },1200);
  }

  function bustOut(){
    const uname=bustInput.trim().toLowerCase();
    if(!uname)return;
    if(player.energy<15){setLog(l=>[`❌ Need 15 energy to bust someone out`,...l]);return;}
    const accs=getAccounts();
    if(!accs[uname]){setLog(l=>[`❌ Player not found`,...l]);return;}
    const target=accs[uname].player;
    if(!target.jailUntil||target.jailUntil<=Date.now()){setLog(l=>[`❌ ${target.name} is not in jail`,...l]);return;}
    const success=Math.random()*100<=breakoutChance;
    if(success){
      accs[uname].player={...target,jailUntil:null};
      saveAccounts(accs);
      setLog(l=>[`✅ Busted ${target.name} out of jail!`,...l]);
      onBreakout({success:true,energyCost:15,bustedOut:target.name});
    } else {
      setLog(l=>[`❌ Failed to bust out ${target.name}. Guards spotted you!`,...l]);
      onBreakout({success:false,energyCost:15});
    }
    setBustInput("");
  }

  return(<div>
    {/* Status card */}
    <div style={S.card({borderColor:inJail?C.red+"55":C.green+"44"})}>
      <div style={S.ct}>🔒 JAIL STATUS</div>
      {inJail?(
        <>
          <div style={{color:C.red,fontSize:20,fontWeight:900,marginBottom:8}}>YOU ARE LOCKED UP</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:12}}>
            Time remaining: <span style={{color:"#fff",fontWeight:700}}>{timeLeft} min</span>
            <span style={{color:C.muted,marginLeft:12}}>· Sentence: {player.jailSentence} min</span>
          </div>
          <div style={{...S.barW,height:14,marginBottom:16}}>
            <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${C.red}88,${C.red})`,transition:"width 0.5s",boxShadow:`0 0 8px ${C.red}55`}}/>
            <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,textShadow:"0 0 4px #000"}}>{pct.toFixed(0)}% served</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button
              style={{...S.btn(canAffordBail?C.gold:C.muted,canAffordBail?C.goldBg:"#0d140d"),opacity:canAffordBail?1:0.4}}
              onClick={()=>canAffordBail&&onBail(bail)}
              disabled={!canAffordBail}>
              💰 PAY BAIL ${bail.toLocaleString()}
            </button>
            <button
              style={{...S.btn(C.orange,C.orangeBg),opacity:player.energy>=10&&!busy?1:0.4}}
              onClick={attemptBreakout}
              disabled={busy||player.energy<10}>
              {busy?"ATTEMPTING...":"🏃 BREAKOUT ("+breakoutChance.toFixed(0)+"%)"}
            </button>
          </div>
          <div style={{color:C.muted,fontSize:10,marginTop:10}}>
            Energy: <span style={{color:C.blue}}>{Math.floor(player.energy)}</span> · Breakout chance scales with DEX ({player.dexterity})
          </div>
        </>
      ):(
        <div style={{color:C.green,fontSize:14,fontWeight:700}}>✅ You are free. Stay out of trouble.</div>
      )}
    </div>

    {/* Bust someone out */}
    <div style={S.card()}>
      <div style={S.ct}>🤝 BUST SOMEONE OUT</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
        Costs 15 energy · {breakoutChance.toFixed(0)}% success chance based on your DEX
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          style={{...S.inp,marginBottom:0,flex:1}}
          placeholder="Their username..."
          value={bustInput}
          onChange={e=>setBustInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&bustOut()}
        />
        <button style={S.btn(C.blue,"#060e1a")} onClick={bustOut}>BUST OUT</button>
      </div>
    </div>

    {/* Stats */}
    <div style={S.card()}>
      <div style={S.ct}>📊 CRIMINAL RECORD</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[
          ["TIMES JAILED",player.timesJailed||0,C.red],
          ["BREAKOUTS",player.breakouts||0,C.green],
          ["BAIL PAID","$"+(player.bailPaid||0).toLocaleString(),C.gold],
        ].map(([l,v,c])=>(
          <div key={l}>
            <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
            <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Sentence guide */}
    <div style={S.card()}>
      <div style={S.ct}>📋 SENTENCE GUIDE</div>
      {Object.entries(JAIL_SENTENCES).map(([crime,s])=>(
        <div key={crime} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
          <span style={{color:C.muted,textTransform:"capitalize"}}>{crime}</span>
          <span style={{color:C.red,fontWeight:700}}>{s.time} min</span>
        </div>
      ))}
    </div>

    {/* Log */}
    {log.length>0&&<div style={S.card()}>
      <div style={S.ct}>📋 JAIL LOG</div>
      <div style={S.logB}>
        {log.map((l,i)=><div key={i} style={{color:l.startsWith("✅")?C.green:"#ff6e6e"}}>{l}</div>)}
      </div>
    </div>}
  </div>);
}
// ============================================================
// ADMIN LOGIN
// ============================================================
function AdminLogin({onLogin}) {
  const [u,setU]=useState(""), [p,setP]=useState(""), [e,setE]=useState("");
  function login(){if(u===ADMIN_USER&&p===ADMIN_PASS)onLogin();else setE("Invalid credentials.");}
  return(<div style={S.authWrap}><div style={S.authBox}>
    <div style={{color:C.orange,fontSize:20,fontWeight:900,letterSpacing:4,textAlign:"center",marginBottom:20}}>⚙ ADMIN PANEL</div>
    <input style={S.inp} placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/>
    <input style={S.inp} type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
    {e&&<div style={{color:C.red,fontSize:11,marginBottom:10}}>⚠ {e}</div>}
    <button style={S.btnF(C.orange,C.orangeBg)} onClick={login}>ENTER</button>
    <div style={{marginTop:12,color:C.muted,fontSize:10,textAlign:"center",cursor:"pointer"}} onClick={()=>{window.location.hash="";}}>← Back to game</div>
  </div></div>);
}

// ============================================================
// SUPABASE CHAT & PRESENCE
// ============================================================
// 🔧 SETUP: Replace these with your Supabase project values
// Dashboard → Settings → API


// Lazy-init Supabase client (loaded from CDN or npm)
let _sb = null;
function getSB() {
  if(_sb) return _sb;
  if(window.supabase) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime:{ params:{ eventsPerSecond:10 } }
    });
  }
  return _sb;
}

const CHAT_CHANNELS = [
  { id:"global",    name:"🌐 Global",   desc:"Everyone" },
  { id:"syndicate", name:"🏴 Syndicate", desc:"Your syndicate only" },
  { id:"trade",     name:"💰 Trade",     desc:"Buy & sell" },
];

const MAX_MSG_LEN = 200;
const ONLINE_TIMEOUT_MS = 2 * 60 * 1000; // 2 min

// ── Presence hook ─────────────────────────────────────────
function usePresence(player) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    const sb = getSB();
    if(!sb || !player?.username) return;

    const ch = sb.channel("presence:game", {
      config: { presence: { key: player.username } }
    });

    ch.on("presence", { event:"sync" }, () => {
      const state = ch.presenceState();
      const users = Object.values(state).flat().map(u => ({
        username: u.username,
        name: u.name,
        level: u.level,
        syndicate: u.syndicate,
        city: u.city,
        lastSeen: u.lastSeen,
      }));
      setOnlineUsers(users);
    });

    ch.subscribe(async (status) => {
      if(status === "SUBSCRIBED") {
        await ch.track({
          username: player.username,
          name: player.name,
          level: player.level,
          syndicate: player.syndicate || null,
          city: player.currentCity || "hometown",
          lastSeen: Date.now(),
        });
      }
    });

    channelRef.current = ch;

    // Refresh presence every 90s to stay "online"
    const iv = setInterval(()=>{
      ch.track({ username:player.username, name:player.name, level:player.level,
        syndicate:player.syndicate||null, city:player.currentCity||"hometown", lastSeen:Date.now() });
    }, 90000);

    return () => {
      clearInterval(iv);
      ch.unsubscribe();
    };
  }, [player?.username]);

  return onlineUsers;
}

// ── Chat hook ─────────────────────────────────────────────
function useChat(channelId, player) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const subRef = useRef(null);

  // Load history
  useEffect(() => {
    const sb = getSB();
    if(!sb) { setError("Supabase not configured"); setLoading(false); return; }

    setLoading(true);
    setMessages([]);

    // Fetch last 60 messages
    sb.from("chat_messages")
      .select("*")
      .eq("channel", channelId)
      .order("created_at", { ascending:false })
      .limit(60)
      .then(({ data, error:e }) => {
        if(e) setError(e.message);
        else setMessages((data||[]).reverse());
        setLoading(false);
      });

    // Subscribe to new messages
    const ch = sb.channel(`chat:${channelId}`)
      .on("postgres_changes", {
        event:"INSERT", schema:"public", table:"chat_messages",
        filter:`channel=eq.${channelId}`
      }, payload => {
        setMessages(prev => {
          if(prev.find(m=>m.id===payload.new.id)) return prev;
          return [...prev.slice(-99), payload.new];
        });
      })
      .subscribe();

    subRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [channelId]);

  async function sendMessage(text) {
    const sb = getSB();
    if(!sb) return { error:"Supabase not configured" };
    if(!text?.trim()) return;
    const msg = {
      channel: channelId,
      username: player.username,
      name: player.name,
      level: player.level,
      syndicate: player.syndicate || null,
      text: text.trim().slice(0, MAX_MSG_LEN),
      created_at: new Date().toISOString(),
    };
    const { error:e } = await sb.from("chat_messages").insert(msg);
    return e ? { error:e.message } : { ok:true };
  }

  return { messages, loading, error, sendMessage };
}

// ── ChatPage ──────────────────────────────────────────────
function ChatPage({ player, onlineUsers }) {
  const [channelId, setChannelId] = useState("global");
  const [tab, setTab]             = useState("chat");
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [err, setErr]             = useState("");
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  const { messages, loading, error, sendMessage } = useChat(channelId, player);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if(!text || sending) return;
    if(text.length > MAX_MSG_LEN) { setErr(`Max ${MAX_MSG_LEN} chars`); return; }

    // Syndicate channel guard
    if(channelId==="syndicate" && !player.syndicate) {
      setErr("❌ Join a syndicate to use this channel"); return;
    }

    setSending(true); setErr("");
    const res = await sendMessage(text);
    if(res?.error) setErr("❌ "+res.error);
    else setInput("");
    setSending(false);
    inputRef.current?.focus();
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  }

  function msgColor(msg) {
    if(msg.username === player.username) return C.green;
    if(msg.syndicate && msg.syndicate === player.syndicate) return C.blue;
    return C.text;
  }

  const CITIES_MAP = { hometown:"Maplewood", portclay:"Port Clay", neonridge:"Neon Ridge", irongate:"Iron Gate", ghosthaven:"Ghost Haven" };

  const sbConfigured = SUPABASE_URL !== "https://YOUR_PROJECT.supabase.co";

  return(<div>
    {/* Not configured banner */}
    {!sbConfigured && <div style={{background:C.orangeBg,border:`1px solid ${C.orange}44`,borderRadius:6,padding:14,marginBottom:12}}>
      <div style={{color:C.orange,fontWeight:700,fontSize:12,marginBottom:4}}>⚠ Supabase Not Configured</div>
      <div style={{color:C.muted,fontSize:11,lineHeight:1.7}}>
        Open <span style={{color:C.text}}>App.jsx</span> and replace <span style={{color:C.orange}}>SUPABASE_URL</span> and <span style={{color:C.orange}}>SUPABASE_ANON_KEY</span> with your project values from supabase.com → Settings → API.
        <br/><br/>
        Also run this SQL in your Supabase SQL editor to create the tables:
      </div>
      <pre style={{background:C.logBg,borderRadius:4,padding:10,fontSize:10,color:C.green,marginTop:8,overflowX:"auto",lineHeight:1.6}}>{`create table chat_messages (
  id bigint generated always as identity primary key,
  channel text not null,
  username text not null,
  name text not null,
  level int default 1,
  syndicate text,
  text text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;
create policy "Anyone can read" on chat_messages for select using (true);
create policy "Anyone can insert" on chat_messages for insert with check (true);

-- Optional: auto-delete messages older than 7 days
create index on chat_messages (created_at);`}</pre>
    </div>}

    {/* Tabs: Chat | Online */}
    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {["chat","online"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.blue:"#0d140d",border:`1px solid ${tab===t?C.blue:C.border}`,borderRadius:4,color:tab===t?"#fff":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400,position:"relative"}}>
          {t==="chat"?"💬 CHAT":"🟢 ONLINE"}
          {t==="online"&&<span style={{marginLeft:5,background:C.green,color:"#000",borderRadius:8,fontSize:8,padding:"1px 5px",fontWeight:900}}>{onlineUsers.length}</span>}
        </button>
      ))}
    </div>

    {/* ── CHAT TAB ── */}
    {tab==="chat"&&<div>
      {/* Channel selector */}
      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
        {CHAT_CHANNELS.map(ch=>{
          const locked = ch.id==="syndicate" && !player.syndicate;
          return(
            <button key={ch.id} onClick={()=>!locked&&setChannelId(ch.id)}
              style={{padding:"5px 12px",background:channelId===ch.id?C.blue+"22":"#0d140d",border:`1px solid ${channelId===ch.id?C.blue:C.border}`,borderRadius:4,color:channelId===ch.id?C.blue:locked?C.dim:C.muted,cursor:locked?"not-allowed":"pointer",fontSize:10,opacity:locked?0.4:1}}>
              {ch.name} <span style={{fontSize:9,color:C.dim}}>{ch.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Message area */}
      <div style={{background:C.logBg,border:`1px solid ${C.border}`,borderRadius:6,padding:10,height:340,overflowY:"auto",marginBottom:10,display:"flex",flexDirection:"column",gap:2}}>
        {loading&&<div style={{color:C.muted,fontSize:12,textAlign:"center",marginTop:20}}>Loading messages...</div>}
        {error&&!sbConfigured&&<div style={{color:C.muted,fontSize:11,textAlign:"center",marginTop:40,lineHeight:2}}>
          Configure Supabase above to enable real-time chat.
        </div>}
        {error&&sbConfigured&&<div style={{color:C.red,fontSize:11,textAlign:"center",marginTop:20}}>{error}</div>}
        {!loading&&!error&&messages.length===0&&<div style={{color:C.muted,fontSize:11,textAlign:"center",marginTop:40}}>
          No messages yet. Say something!
        </div>}
        {messages.map((msg,i)=>{
          const isMe = msg.username === player.username;
          const isSyn = msg.syndicate && msg.syndicate === player.syndicate;
          return(
            <div key={msg.id||i} style={{padding:"5px 0",borderBottom:`1px solid ${C.dim}22`}}>
              <div style={{display:"flex",gap:6,alignItems:"baseline",flexWrap:"wrap"}}>
                <span style={{color:isMe?C.green:isSyn?C.blue:C.orange,fontWeight:700,fontSize:11}}>{msg.name}</span>
                <span style={{color:C.dim,fontSize:9}}>Lv{msg.level}</span>
                {msg.syndicate&&<span style={{color:C.purple,fontSize:9}}>[{msg.syndicate}]</span>}
                <span style={{color:C.dim,fontSize:9,marginLeft:"auto"}}>{fmtTime(msg.created_at)}</span>
              </div>
              <div style={{color:msgColor(msg),fontSize:12,marginTop:2,wordBreak:"break-word",lineHeight:1.5}}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Error */}
      {err&&<div style={{color:C.red,fontSize:11,marginBottom:6}}>{err}</div>}

      {/* Input */}
      <div style={{display:"flex",gap:6}}>
        <input
          ref={inputRef}
          style={{...S.inp,marginBottom:0,flex:1,fontSize:12}}
          placeholder={sbConfigured?"Type a message...":"Configure Supabase to chat"}
          value={input}
          disabled={!sbConfigured||sending}
          maxLength={MAX_MSG_LEN}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleSend()}
        />
        <button
          style={{...S.btn(C.blue,C.blue+"22"),padding:"9px 14px",opacity:(!input.trim()||sending||!sbConfigured)?0.4:1}}
          onClick={handleSend}
          disabled={!input.trim()||sending||!sbConfigured}>
          {sending?"...":"SEND"}
        </button>
      </div>
      <div style={{color:C.dim,fontSize:9,marginTop:4,textAlign:"right"}}>{input.length}/{MAX_MSG_LEN}</div>
    </div>}

    {/* ── ONLINE TAB ── */}
    {tab==="online"&&<div>
      <div style={S.card({borderColor:C.green+"33"})}>
        <div style={S.ct}>🟢 ONLINE NOW — {onlineUsers.length} PLAYER{onlineUsers.length!==1?"S":""}</div>
        {!sbConfigured&&<div style={{color:C.muted,fontSize:11}}>Configure Supabase to see who's online.</div>}
        {sbConfigured&&onlineUsers.length===0&&<div style={{color:C.muted,fontSize:11}}>No one else online right now.</div>}
        {onlineUsers.map(u=>{
          const isMe = u.username===player.username;
          const isSyn = u.syndicate && u.syndicate===player.syndicate;
          const cityName = CITIES_MAP[u.city]||u.city||"Unknown";
          return(
            <div key={u.username} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 6px ${C.green}`}}/>
                  <span style={{color:isMe?C.green:isSyn?C.blue:"#fff",fontWeight:700,fontSize:12}}>{u.name}{isMe?" (you)":""}</span>
                  {isSyn&&!isMe&&<span style={S.badge(C.blue)}>SYNDICATE</span>}
                </div>
                <div style={{color:C.muted,fontSize:10}}>@{u.username} · Lv{u.level} · 📍{cityName}</div>
                {u.syndicate&&<div style={{color:C.purple,fontSize:9,marginTop:2}}>🏴 {u.syndicate}</div>}
              </div>
              <div style={{fontSize:9,color:C.dim,textAlign:"right"}}>
                {isMe?"YOU":"online"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      {sbConfigured&&onlineUsers.length>0&&<div style={S.card()}>
        <div style={S.ct}>📊 SESSION STATS</div>
        <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
          {[
            ["ONLINE",     onlineUsers.length,                                      C.green],
            ["SYNDICATES", new Set(onlineUsers.map(u=>u.syndicate).filter(Boolean)).size, C.purple],
            ["AVG LEVEL",  Math.round(onlineUsers.reduce((s,u)=>s+(u.level||1),0)/onlineUsers.length), C.orange],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 30%",marginBottom:8}}>
              <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
              <div style={{color:C.muted,fontSize:9}}>{l}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>}
  </div>);
}

// ============================================================
// MAIN GAME — NAV now includes properties, blackmarket, prestige
// ============================================================
const NAV=[
  {id:"profile",     icon:"👤", label:"PROFILE"},
  {id:"crimes",      icon:"🔪", label:"CRIMES"},
  {id:"combat",      icon:"⚔",  label:"COMBAT"},
  {id:"gym",         icon:"🏋", label:"GYM"},
  {id:"inventory",   icon:"🎒", label:"ITEMS"},
  {id:"syndicates",  icon:"🏴", label:"SYNDICATES"},
  {id:"properties",  icon:"🏠", label:"PROPERTY"},
  {id:"blackmarket", icon:"🕵", label:"MARKET"},
  {id:"prestige",    icon:"⚡", label:"PRESTIGE"},
  {id:"feed",        icon:"📋", label:"FEED"},
  {id:"leaderboard", icon:"🏆", label:"LEADERBOARD"},
  {id:"jail",        icon:"🔒", label:"JAIL"},
  {id:"travel",      icon:"🌍", label:"TRAVEL"},
  {id:"chat",        icon:"💬", label:"CHAT"},
];

function Game({initialPlayer,onLogout}) {
  const [player,setPlayer]=useState(initialPlayer);
  const isDark = useTheme();
  const onlineUsers = usePresence(player);
  const [page,setPage]=useState("profile");
  const [toast,setToast]=useState(null);
  const [showDaily,setShowDaily]=useState(!initialPlayer.loginRewardClaimed);
  const [pvpInitTarget,setPvpInitTarget]=useState(null);
  const [viewedProfile,setViewedProfile]=useState(null);
  const [showNotifs,setShowNotifs]=useState(false);
  const notify=useCallback(msg=>setToast(msg),[]);

  // helper — add a notification to player state
  const pushNotif=useCallback((type,text)=>{
    setPlayer(p=>addNotif(p,type,text));
  },[]);

  // Regen tick
  useEffect(()=>{
    const id=setInterval(()=>{
      setPlayer(p=>{
        const eR=calcEnergyRegen(p.lastEnergyRegen),nR=calcNerveRegen(p.lastNerveRegen),hR=calcHealthRegen(p.lastHealthRegen);
        if(!eR&&!nR&&!hR)return p;
        const u={...p,
          energy:eR?Math.min(MAX_ENERGY,p.energy+eR):p.energy,
          nerve: nR?Math.min(MAX_NERVE, p.nerve+nR):p.nerve,
          health:hR?Math.min(MAX_HEALTH,p.health+hR):p.health,
          lastEnergyRegen:eR?p.lastEnergyRegen+eR*300000:p.lastEnergyRegen,
          lastNerveRegen: nR?p.lastNerveRegen+nR*600000:p.lastNerveRegen,
          lastHealthRegen:hR?p.lastHealthRegen+hR*180000:p.lastHealthRegen,
        };
        return u;
      });
    },10000);
    return()=>clearInterval(id);
  },[]);

  // Save
  useEffect(()=>{
    const accs=getAccounts();
    if(accs[player.username]){accs[player.username].player=player;saveAccounts(accs);}
  },[player]);

  function lvlUp(p){
    let u={...p};
    while(u.xp>=XP_FOR_LEVEL(u.level+1)){
      u.xp-=XP_FOR_LEVEL(u.level+1);u.level+=1;u.statPoints=(u.statPoints||0)+3;
      u=addNotif(u,"level",`🆙 Level Up! Now Level ${u.level} — +3 stat points to spend`);
      setTimeout(()=>notify(`🆙 LEVEL UP! Now Level ${u.level}! +3 stat points`),100);
    }
    return u;
  }

  function handleDaily(reward){
    const itemName=reward.itemId?ITEMS.find(i=>i.id===reward.itemId)?.name:"";
    setPlayer(p=>{
      let u={...p,cash:p.cash+reward.cash,loginRewardClaimed:true};
      if(reward.itemId&&!p.inventory.includes(reward.itemId))u.inventory=[...p.inventory,reward.itemId];
      return addNotif(u,"reward",`Day ${p.loginStreak} login reward claimed: +$${reward.cash.toLocaleString()}${itemName?" + "+itemName:""}`);
    });
    notify(`🎁 Day ${player.loginStreak} reward: +$${reward.cash.toLocaleString()}${reward.itemId?" + "+ITEMS.find(i=>i.id===reward.itemId)?.name:""}`);
    setShowDaily(false);
  }

  function handleCrime({success,nerveCost,cash,xp,rep,crimeName}){
    setPlayer(p=>{
      const prestige=getPrestige(p.prestigeTier||0);
      const cashMult=prestige?.cashMult||1;
      const xpMult=prestige?.xpMult||1;
      const finalCash=Math.floor(cash*cashMult);
      const finalXp=Math.floor(xp*xpMult);
      let u=lvlUp({...p,nerve:Math.max(0,p.nerve-nerveCost),cash:p.cash+finalCash,xp:p.xp+finalXp,reputation:Math.max(0,p.reputation+rep),crimeStats:{total:(p.crimeStats?.total||0)+1,success:(p.crimeStats?.success||0)+(success?1:0)}});
      if(!success){
        const key=(crimeName||"").toLowerCase();
        const sentence=JAIL_SENTENCES[key]||{time:3};
        u.jailUntil=Date.now()+sentence.time*60000;
        u.jailSentence=sentence.time;
        u.timesJailed=(u.timesJailed||0)+1;
        u=addNotif(u,"jail",`🔒 BUSTED on ${crimeName||"crime"} — jailed for ${sentence.time} min`);
        setTimeout(()=>notify(`🔒 BUSTED! Sent to jail for ${sentence.time} min`),100);
      } else {
        u=addNotif(u,"crime",`✅ ${crimeName||"Crime"} succeeded — +$${finalCash.toLocaleString()} | +${finalXp}xp | +1 REP`);
      }
      return u;
    });
  }

  function handleCombat({won,cash,xp,rep,healthLost,energyCost,isPvp,targetName}){
    setPlayer(p=>{
      let u={...p,
        energy:Math.max(0,p.energy-energyCost),
        health:Math.max(1,p.health-Math.floor(healthLost)),
        cash:p.cash+cash,
        xp:p.xp+xp,
        reputation:Math.max(0,p.reputation+rep),
        wins:p.wins+(won?1:0),
        losses:p.losses+(won?0:1),
      };
      if(isPvp&&!won){
        u.inHospitalUntil=Date.now()+3*60000;
        u.health=Math.max(1,Math.floor(p.health*0.25));
      }
      u=lvlUp(u);
      let txt;
      if(isPvp&&won) txt=`🏆 PvP Victory vs ${targetName} — +3 REP`;
      else if(isPvp&&!won) txt=`💀 Defeated by ${targetName} in PvP — hospitalized 3 min`;
      else if(won) txt=`🏆 Street fight won — +$${cash.toLocaleString()} | +${xp}xp`;
      else txt=`💀 Street fight lost — no rewards`;
      return addNotif(u,"combat",txt);
    });
    if(won&&isPvp) notify(`🏆 DEFEATED ${targetName}! +3 REP`);
    else if(!won&&isPvp) notify(`💀 DEFEATED by ${targetName} — sent to hospital for 3 min!`);
    else if(won) notify(`🏆 WIN — +$${cash.toLocaleString()} | +${xp}XP`);
    else notify("💀 Defeated");
  }

  function handleTrain({statId,gain,energyCost}){
    setPlayer(p=>{const cur=parseFloat(p[statId])||10;return{...p,[statId]:parseFloat((cur+gain).toFixed(2)),energy:Math.max(0,p.energy-energyCost)};});
  }

  function handleBuy(item){
    if(player.cash<item.price)return notify("❌ Not enough cash");
    if(player.inventory.includes(item.id))return notify("❌ Already owned");
    setPlayer(p=>addNotif({...p,cash:p.cash-item.price,inventory:[...p.inventory,item.id]},"buy",`Purchased ${item.name} for $${item.price.toLocaleString()}`));
    notify(`✅ BOUGHT ${item.name}`);
  }

  function handleEquip(item){
    setPlayer(p=>({...p,equippedWeapon:item.type==="weapon"?item.id:p.equippedWeapon,equippedArmor:item.type==="armor"?item.id:p.equippedArmor}));
    notify(`✅ EQUIPPED ${item.name}`);
  }

  function handleStatUp(stat){if(!player.statPoints)return;setPlayer(p=>({...p,[stat]:p[stat]+1,statPoints:p.statPoints-1}));}
  function handleCreate(s){setPlayer(p=>({...p,cash:p.cash-SYNDICATE_COST,syndicate:s.name}));notify(`🏴 FOUNDED: ${s.name}`);}
  function handleJoin(s){setPlayer(p=>({...p,syndicate:s.name}));notify(`🏴 JOINED: ${s.name}`);}
  function handleLeave(){setPlayer(p=>({...p,syndicate:null}));notify("Left syndicate.");}
  function handleContribute(amt){setPlayer(p=>({...p,cash:p.cash-amt}));notify(`💰 Contributed $${amt.toLocaleString()}`);}

  function handleBuyProperty(prop){
    setPlayer(p=>addNotif({...p,cash:p.cash-prop.price,properties:{...p.properties,[prop.id]:(p.properties?.[prop.id]||0)+1}},"buy",`Purchased ${prop.name} for $${prop.price.toLocaleString()}`));
    notify(`✅ BOUGHT ${prop.name}`);
  }

  function handleCollect(amount){
    const prestige=getPrestige(player.prestigeTier||0);
    const cashMult=prestige?.cashMult||1;
    const final=Math.floor(amount*cashMult);
    setPlayer(p=>addNotif({...p,cash:p.cash+final,lastPropertyCollect:Date.now()},"income",`Collected $${final.toLocaleString()} from properties`));
    notify(`💰 COLLECTED $${final.toLocaleString()}`);
  }


  function handleUpgrade(propId, upgrade){
    setPlayer(p=>addNotif(
      {...p, cash:p.cash-upgrade.cost, propUpgrades:{...(p.propUpgrades||{}),[propId]:((p.propUpgrades||{})[propId]||0)+1}},
      "buy",`Upgraded ${PROPERTIES.find(x=>x.id===propId)?.name} — ${upgrade.name}`
    ));
    notify(`⬆ UPGRADED: ${upgrade.name}`);
  }

  function handlePrestige(nextPrestige){
    setPlayer(p=>{
      let u={...p,level:1,xp:0,prestigeTier:nextPrestige.tier,prestigeCount:(p.prestigeCount||0)+1};
      return addNotif(u,"prestige",`⚡ Prestiged to ${nextPrestige.label} (Tier ${nextPrestige.tier})`);
    });
    notify(`⚡ PRESTIGE UNLOCKED: ${nextPrestige.label}`);
  }

  function handleMarkAllRead(){
    setPlayer(p=>({...p,notifications:(p.notifications||[]).map(n=>({...n,read:true})),notifUnread:0}));
  }


  function handleTravel(dest){
    const arrival = dest.travelHours===0 ? Date.now() : calcTravelArrival(dest.travelHours);
    setPlayer(p=>addNotif({...p,
      cash: p.cash-dest.travelCost,
      travellingTo: dest.id,
      travelArrival: arrival,
      lastTravel: Date.now(),
    },"system",`Travelling to ${dest.name}...`));
    if(dest.travelHours===0){
      setPlayer(p=>({...p,
        currentCity: dest.id,
        travellingTo: null,
        travelArrival: null,
        citiesVisited: p.citiesVisited?.includes(dest.id)?p.citiesVisited:[...(p.citiesVisited||["hometown"]),dest.id],
      }));
      notify(`Arrived in ${dest.flag} ${dest.name}!`);
    } else {
      notify(`Travelling to ${dest.name} — ${dest.travelHours}h`);
    }
  }

  function handleArrive(dest){
    if(!dest)return;
    setPlayer(p=>addNotif({...p,
      currentCity: dest.id,
      travellingTo: null,
      travelArrival: null,
      citiesVisited: p.citiesVisited?.includes(dest.id)?p.citiesVisited:[...(p.citiesVisited||["hometown"]),dest.id],
    },"system",`Arrived in ${dest.name}`));
    notify(`Arrived in ${dest.flag} ${dest.name}!`);
  }

  function handleCityCrime({won,cashEarned,xpEarned,lootItem,nerve,jailId,cityId}){
    setPlayer(p=>{
      let u={...p, nerve:Math.max(0,p.nerve-nerve)};
      if(won){
        u={...u, cash:u.cash+cashEarned};
        if(lootItem&&!u.inventory.includes(lootItem.id)) u={...u,inventory:[...u.inventory,lootItem.id]};
      }
      // XP & level
      let xp=u.xp+xpEarned, level=u.level;
      while(xp>=XP_FOR_LEVEL(level+1)){xp-=XP_FOR_LEVEL(level+1);level++;}
      u={...u,xp,level};
      const notifText=won
        ?`${cityId}: +$${cashEarned.toLocaleString()} +${xpEarned}xp${lootItem?` + ${lootItem.name}`:""}`
        :`${cityId}: crime failed`;
      return addNotif(u,"crime",notifText);
    });
  }
  function handleBail(cost){
    setPlayer(p=>addNotif({...p,cash:p.cash-cost,jailUntil:null,bailPaid:(p.bailPaid||0)+cost},"jail",`💰 Paid $${cost.toLocaleString()} bail — free at last`));
    notify(`💰 Bail paid — you're free!`);
  }

  function handleBreakout({success,energyCost,extraTime,bustedOut}){
    setPlayer(p=>{
      let u={...p,energy:Math.max(0,p.energy-energyCost)};
      if(success&&!bustedOut){
        u.jailUntil=null;
        u.breakouts=(u.breakouts||0)+1;
        u=addNotif(u,"jail","🏃 Broke out of jail!");
      } else if(!success&&extraTime){
        u.jailUntil=(p.jailUntil||Date.now())+extraTime;
        u=addNotif(u,"jail","❌ Breakout failed — sentence extended by 5 min!");
      } else if(success&&bustedOut){
        u.breakouts=(u.breakouts||0)+1;
        u=addNotif(u,"jail",`🤝 Busted ${bustedOut} out of jail!`);
      } else {
        u=addNotif(u,"jail","❌ Bust-out attempt failed!");
      }
      return u;
    });
  }

  function handleAttackFromLB(target){
    setPvpInitTarget(target);
    setPage("combat");
  }

  return(
    <div style={{...S.app,display:"flex",flexDirection:"column",height:"100vh"}}>
      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
      {showDaily&&<DailyModal player={player} onClaim={handleDaily} onClose={()=>setShowDaily(false)}/>}
      {showNotifs&&<NotifDrawer player={player} onClose={()=>setShowNotifs(false)} onMarkAll={handleMarkAllRead}/>}
      {viewedProfile&&<PlayerProfileModal target={viewedProfile} viewer={player} onClose={()=>setViewedProfile(null)} onAttack={t=>{setPvpInitTarget(t);setPage("combat");}}/>}

      <div style={S.topBar}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:C.red,fontWeight:900,letterSpacing:3,fontSize:14}}>SHADOW</span>
          <span style={{color:C.muted,fontSize:9}}>|</span>
          <span style={{color:"#fff",fontSize:11}}>{player.name}</span>
          {onlineUsers.length>0&&<span style={{fontSize:9,color:C.green,display:"flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 5px ${C.green}`}}/>{onlineUsers.length} online</span>}
          {player.prestigeTier>0&&<span style={S.badge(getPrestige(player.prestigeTier)?.color||C.muted)}>{getPrestige(player.prestigeTier)?.label}</span>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:C.green,fontWeight:700,fontSize:12}}>${player.cash.toLocaleString()}</span>
          <button style={{...S.btn(C.muted,"#0d140d"),padding:"4px 10px",fontSize:9,position:"relative"}} onClick={()=>setShowNotifs(true)}>
            🔔{(player.notifUnread||0)>0&&<span style={{position:"absolute",top:-4,right:-4,background:C.red,color:"#fff",borderRadius:"50%",fontSize:8,width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{player.notifUnread>9?"9+":player.notifUnread}</span>}
          </button>
          <button style={{...S.btn(C.muted,C.card),padding:"4px 10px",fontSize:9,fontSize:14}} onClick={toggleTheme} title={isDark?"Switch to Light":"Switch to Dark"}>{isDark?"☀️":"🌙"}</button>
          <button style={{...S.btn(C.muted,C.card),padding:"4px 10px",fontSize:9}} onClick={onLogout}>OUT</button>
        </div>
      </div>

      <div style={S.statBar}>
        <AnnouncementBanner/>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <TopStatBar label="ENERGY" val={player.energy} max={MAX_ENERGY} color={C.blue}   regen="5m"/>
          <TopStatBar label="NERVE"  val={player.nerve}  max={MAX_NERVE}  color={C.orange} regen="10m"/>
          <TopStatBar label="HEALTH" val={player.health} max={MAX_HEALTH} color={C.green}  regen="3m"/>
        </div>
      </div>

      <div style={S.navBar}>
        {NAV.map(n=>(
          <div key={n.id} style={S.nav(page===n.id)} onClick={()=>{setPage(n.id);if(n.id!=="combat")setPvpInitTarget(null);}}>
            <span style={{fontSize:14}}>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 12px"}}>
        {page==="profile"    &&<ProfilePage    player={player} onStatUp={handleStatUp}/>}
        {page==="crimes"     &&<CrimesPage     player={player} onCrime={handleCrime}/>}
        {page==="combat"     &&<CombatPage     player={player} onCombat={handleCombat} initTarget={pvpInitTarget}/>}
        {page==="gym"        &&<GymPage        player={player} onTrain={handleTrain}/>}
        {page==="inventory"  &&<InventoryPage  player={player} onBuy={handleBuy} onEquip={handleEquip}/>}
        {page==="syndicates" &&<SyndicatesPage player={player} onCreate={handleCreate} onJoin={handleJoin} onLeave={handleLeave} onContribute={handleContribute}/>}
        {page==="properties" &&<PropertiesPage player={player} onBuyProperty={handleBuyProperty} onCollect={handleCollect} onUpgrade={handleUpgrade}/>}
        {page==="blackmarket"&&<BlackMarketPage player={player} onBuy={handleBuy}/>}
        {page==="prestige"   &&<PrestigePage   player={player} onPrestige={handlePrestige}/>}
        {page==="feed"       &&<FeedPage       player={player} onMarkAll={handleMarkAllRead}/>}
        {page==="leaderboard"&&<LeaderboardPage player={player} onAttackFromLB={handleAttackFromLB} onViewProfile={setViewedProfile}/>}
        {page==="admin"      &&<AdminPage      player={player} notify={notify}/>}
        {page==="jail"       &&<JailPage       player={player} onBail={handleBail} onBreakout={handleBreakout}/>}
        {page==="travel"     &&<TravelPage     player={player} onTravel={handleTravel} onArrive={handleArrive} onCityCrime={handleCityCrime}/>}
        {page==="chat"       &&<ChatPage       player={player} onlineUsers={onlineUsers}/>}
      </div>
    </div>
  );
}

export default function App() {
  const [player,setPlayer]=useState(null);
  useTheme();
  const [adminAuthed,setAdminAuthed]=useState(false);

  useEffect(()=>{
    if(window.location.hash==="#admin")return;
    const saved=localStorage.getItem("sd_session");
    if(saved){try{setPlayer(JSON.parse(saved));}catch{}}
  },[]);

  useEffect(()=>{
    if(player)localStorage.setItem("sd_session",JSON.stringify(player));
  },[player]);

  if(window.location.hash==="#admin"){
    if(!adminAuthed)return<AdminLogin onLogin={()=>setAdminAuthed(true)}/>;
    return<div style={S.app}><div style={{padding:14}}><AdminPage player={{username:"admin"}} notify={msg=>alert(msg)}/></div></div>;
  }

  if(!player)return<AuthPage onLogin={p=>{setPlayer(p);}}/>;
  return<Game initialPlayer={player} onLogout={()=>{localStorage.removeItem("sd_session");setPlayer(null);}}/>;
}
// 
