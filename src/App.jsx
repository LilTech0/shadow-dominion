import { useState, useEffect, useRef } from "react";

// ============================================================
// CONSTANTS & FORMULAS
// ============================================================
const CRIMES = [
  { id:"pickpocket",  name:"Pickpocket",    baseChance:70, baseReward:200,  nerve:3,  xp:10,  difficulty:5,  desc:"Lift wallets from distracted marks" },
  { id:"shoplifting", name:"Shoplifting",   baseChance:65, baseReward:400,  nerve:5,  xp:20,  difficulty:10, desc:"Five-finger discount at the mall" },
  { id:"mugging",     name:"Mugging",       baseChance:55, baseReward:700,  nerve:8,  xp:35,  difficulty:18, desc:"Strong-arm a civilian for cash" },
  { id:"carjacking",  name:"Car Theft",     baseChance:50, baseReward:1000, nerve:12, xp:60,  difficulty:20, desc:"Boost a ride from the parking garage" },
  { id:"robbery",     name:"Armed Robbery", baseChance:40, baseReward:2500, nerve:18, xp:100, difficulty:30, desc:"Hit a convenience store at gunpoint" },
  { id:"heist",       name:"Bank Heist",    baseChance:25, baseReward:8000, nerve:30, xp:250, difficulty:50, desc:"Crack a downtown vault with the crew" },
];

const ITEMS = [
  { id:"knife",    name:"Switchblade",    type:"weapon", weaponDmg:8,  armorRating:0,  price:500,   rarity:"common" },
  { id:"pipe",     name:"Lead Pipe",      type:"weapon", weaponDmg:14, armorRating:0,  price:1200,  rarity:"common" },
  { id:"pistol",   name:"9mm Pistol",     type:"weapon", weaponDmg:25, armorRating:0,  price:4000,  rarity:"rare" },
  { id:"shotgun",  name:"Sawn-Off",       type:"weapon", weaponDmg:38, armorRating:0,  price:8000,  rarity:"rare" },
  { id:"uzi",      name:"Micro Uzi",      type:"weapon", weaponDmg:52, armorRating:0,  price:18000, rarity:"legendary" },
  { id:"vest",     name:"Stab Vest",      type:"armor",  weaponDmg:0,  armorRating:10, price:800,   rarity:"common" },
  { id:"jacket",   name:"Kevlar Jacket",  type:"armor",  weaponDmg:0,  armorRating:22, price:5000,  rarity:"rare" },
  { id:"plate",    name:"Tactical Plate", type:"armor",  weaponDmg:0,  armorRating:38, price:15000, rarity:"legendary" },
  { id:"lockpick", name:"Lockpick Set",   type:"tool",   weaponDmg:0,  armorRating:0,  price:600,   crimeBonus:10, rarity:"common" },
  { id:"scanner",  name:"Police Scanner", type:"tool",   weaponDmg:0,  armorRating:0,  price:1500,  crimeBonus:18, rarity:"rare" },
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

const MAX_ENERGY = 100;
const MAX_NERVE  = 50;
const MAX_HEALTH = 100;
const ATTACK_COOLDOWN_MS = 60000;
const MAX_ATTACKS_PER_TARGET = 5;

const XP_FOR_LEVEL = (lvl) => Math.floor(100 * Math.pow(lvl, 1.5));

function calcAttack(p) {
  const w = ITEMS.find(i => i.id === p.equippedWeapon);
  return p.strength + (w?.weaponDmg||0) + p.level*2;
}
function calcDefense(p) {
  const a = ITEMS.find(i => i.id === p.equippedArmor);
  return p.defense + (a?.armorRating||0) + p.level*2;
}
function calcHitChance(atkDex, defDex) {
  return Math.min(95, Math.max(20, 75 + atkDex/10 - defDex/10));
}
function calcDamage(atk, def) { return Math.max(1, atk - def*0.5); }
function calcCritChance(dex) { return 5 + dex/50; }
function calcEnergyRegen(ts) { return Math.floor(((Date.now()-ts)/1000)/300); }
function calcNerveRegen(ts)  { return Math.floor(((Date.now()-ts)/1000)/600); }
function calcHealthRegen(ts) { return Math.floor(((Date.now()-ts)/1000)/180); }

function createPlayer(name, username) {
  return {
    name, username, level:1, xp:0, cash:1000, reputation:0,
    strength:10, defense:10, dexterity:10, statPoints:0,
    energy:MAX_ENERGY, nerve:MAX_NERVE, health:MAX_HEALTH,
    lastEnergyRegen:Date.now(), lastNerveRegen:Date.now(), lastHealthRegen:Date.now(),
    inventory:[], equippedWeapon:null, equippedArmor:null,
    syndicate:null, syndicateRole:null,
    loginStreak:0, lastLoginDate:null, loginRewardClaimed:false,
    wins:0, losses:0,
    attackCooldowns:{},   // target -> timestamp
    attacksToday:{},      // target -> count
    lastAttackResetDate:null,
    crimeStats:{ total:0, success:0 },
  };
}

function createEnemy(playerLevel) {
  const lvl = Math.max(1, playerLevel + Math.floor(Math.random()*5)-2);
  const names = ["Street Rat","Corner Boy","Blood Hawk","Iron Mask","The Warden","Ghost Nine","Viper","Cold Cut","Razor","The Judge"];
  return {
    id: `enemy_${Date.now()}`,
    name: names[Math.floor(Math.random()*names.length)],
    level:lvl, strength:8+lvl*2, defense:6+lvl*2, dexterity:5+lvl,
    health:MAX_HEALTH, maxHealth:MAX_HEALTH,
    equippedWeapon: lvl>=7?"shotgun":lvl>=5?"pistol":lvl>=3?"pipe":"knife",
    equippedArmor:  lvl>=6?"jacket":lvl>=4?"vest":null,
    cash: Math.floor(Math.random()*lvl*300+100),
    xp: lvl*15,
  };
}

// ============================================================
// STORAGE
// ============================================================
function getAccounts() { try { return JSON.parse(localStorage.getItem("sd_accounts")||"{}"); } catch{ return {}; } }
function saveAccounts(a) { try { localStorage.setItem("sd_accounts", JSON.stringify(a)); } catch{} }
function getSyndicates() { try { return JSON.parse(localStorage.getItem("sd_syndicates")||"[]"); } catch{ return []; } }
function saveSyndicates(s) { try { localStorage.setItem("sd_syndicates", JSON.stringify(s)); } catch{} }

// ============================================================
// STYLES
// ============================================================
const C = {
  bg:"#08080e", card:"#0f0f18", border:"#1c1c2c",
  red:"#e8001e", redDim:"#7a0010", redBg:"#1a0008",
  green:"#00e87a", greenBg:"#001a10",
  blue:"#4d9fff", blueBg:"#001228",
  orange:"#ff8c00", orangeBg:"#1a0e00",
  purple:"#9b6dff", purpleBg:"#110022",
  gold:"#ffd700", goldBg:"#1a1400",
  text:"#d4d4d4", muted:"#555566", dim:"#333344",
};

const S = {
  app:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Courier New',monospace", fontSize:13 },
  authWrap:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at center, #150010 0%, ${C.bg} 70%)` },
  authBox:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:32, width:"100%", maxWidth:400 },
  card:(extra={})=>({ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:16, marginBottom:12, ...extra }),
  cardTitle:{ color:C.red, fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:12, display:"flex", alignItems:"center", gap:8 },
  input:{ width:"100%", background:"#0a0a12", border:`1px solid ${C.border}`, borderRadius:4, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10 },
  btn:(color="#e8001e",bg="#1a0008")=>({ background:bg, border:`1px solid ${color}44`, borderRadius:4, padding:"9px 18px", color, fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:700, transition:"all 0.15s" }),
  btnFull:(color="#e8001e",bg="#1a0008")=>({ width:"100%", background:bg, border:`1px solid ${color}44`, borderRadius:4, padding:"11px", color, fontSize:11, letterSpacing:2, cursor:"pointer", fontWeight:700 }),
  badge:(color)=>({ display:"inline-block", padding:"2px 7px", borderRadius:10, fontSize:9, background:color+"18", color, border:`1px solid ${color}33`, letterSpacing:1 }),
  bar:(pct,color)=>({ height:"100%", width:`${Math.min(100,Math.max(0,pct))}%`, background:color, transition:"width 0.4s", borderRadius:2 }),
  barWrap:{ background:"#0a0a12", borderRadius:2, height:7, overflow:"hidden", flex:1 },
  row:{ display:"flex", gap:8, alignItems:"center", marginBottom:6 },
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  logBox:{ background:"#06060e", border:`1px solid ${C.dim}`, borderRadius:4, padding:10, maxHeight:180, overflowY:"auto", fontSize:11, lineHeight:1.9 },
  navItem:(active)=>({ padding:"10px 18px", cursor:"pointer", fontSize:11, letterSpacing:1, color:active?C.red:C.muted, background:active?C.redBg:"transparent", borderLeft:`2px solid ${active?C.red:"transparent"}`, display:"flex", alignItems:"center", gap:8, userSelect:"none" }),
  sidebar:{ width:190, background:"#0b0b14", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" },
  main:{ flex:1, padding:20, overflowY:"auto", maxWidth:820 },
};

// ============================================================
// MINI COMPONENTS
// ============================================================
function Bar({ label, val, max, color, icon }) {
  return (
    <div style={{ marginBottom:7 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:10 }}>
        <span style={{ color:C.muted }}>{icon} {label}</span>
        <span style={{ color }}>{Math.floor(val)}/{max}</span>
      </div>
      <div style={S.barWrap}><div style={S.bar((val/max)*100, color)} /></div>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return()=>clearTimeout(t); },[onClose]);
  const good = msg.startsWith("✅")||msg.startsWith("🆙")||msg.startsWith("🏆")||msg.startsWith("🏴")||msg.startsWith("🎁")||msg.startsWith("⚡");
  return (
    <div style={{ position:"fixed", top:16, right:16, background:good?C.greenBg:C.redBg, border:`1px solid ${good?C.green:C.red}44`, borderRadius:6, padding:"12px 18px", color:good?C.green:C.red, fontSize:12, zIndex:9999, letterSpacing:1, maxWidth:340, lineHeight:1.5 }}>
      {msg}
    </div>
  );
}

function Tabs({ tabs, active, onSelect }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
      {tabs.map(t => (
        <button key={t} onClick={()=>onSelect(t)} style={{ padding:"7px 18px", background:active===t?C.red:"#14141e", border:`1px solid ${active===t?C.red:C.border}`, borderRadius:4, color:active===t?"#fff":C.muted, cursor:"pointer", fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>
          {t}
        </button>
      ))}
    </div>
  );
}

function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:28, maxWidth:320, textAlign:"center" }}>
        <div style={{ marginBottom:20, lineHeight:1.6 }}>{msg}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button style={S.btn(C.red,C.redBg)} onClick={onYes}>CONFIRM</button>
          <button style={S.btn(C.muted,"#14141e")} onClick={onNo}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH
// ============================================================
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username:"", password:"", name:"" });
  const [err, setErr] = useState("");

  function set(k,v){ setForm(f=>({...f,[k]:v})); setErr(""); }

  function login() {
    const accs = getAccounts();
    if (!accs[form.username]) return setErr("Account not found.");
    if (accs[form.username].password !== form.password) return setErr("Wrong password.");
    const player = accs[form.username].player;
    // daily login streak
    const today = new Date().toDateString();
    let streak = player.loginStreak||0;
    let claimed = false;
    const lastDate = player.lastLoginDate;
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (lastDate === today) { claimed = player.loginRewardClaimed; }
    else if (lastDate === yesterday) { streak = Math.min(7, streak+1); claimed = false; }
    else { streak = 1; claimed = false; }
    const updated = { ...player, loginStreak:streak, lastLoginDate:today, loginRewardClaimed:claimed };
    accs[form.username].player = updated;
    saveAccounts(accs);
    onLogin(updated);
  }

  function register() {
    if (!form.name||!form.username||!form.password) return setErr("All fields required.");
    if (form.username.length<3) return setErr("Username: min 3 chars.");
    if (form.password.length<4) return setErr("Password: min 4 chars.");
    const accs = getAccounts();
    if (accs[form.username]) return setErr("Username taken.");
    const player = createPlayer(form.name.trim(), form.username.trim().toLowerCase());
    const today = new Date().toDateString();
    player.loginStreak = 1; player.lastLoginDate = today; player.loginRewardClaimed = false;
    accs[form.username] = { password:form.password, player };
    saveAccounts(accs);
    onLogin(player);
  }

  return (
    <div style={S.authWrap}>
      <div style={{ marginBottom:24, textAlign:"center" }}>
        <div style={{ color:C.red, fontSize:32, fontWeight:900, letterSpacing:6, textShadow:`0 0 30px ${C.red}88` }}>SHADOW</div>
        <div style={{ color:C.red, fontSize:32, fontWeight:900, letterSpacing:6, textShadow:`0 0 30px ${C.red}88` }}>DOMINION</div>
        <div style={{ color:C.muted, fontSize:10, letterSpacing:4, marginTop:6 }}>ALPHA v0.1 — THE STREETS DON'T SLEEP</div>
      </div>
      <div style={S.authBox}>
        <Tabs tabs={["login","register"]} active={tab} onSelect={setTab} />
        {tab==="register" && <input style={S.input} placeholder="Display Name" value={form.name} onChange={e=>set("name",e.target.value)} />}
        <input style={S.input} placeholder="Username" value={form.username} onChange={e=>set("username",e.target.value)} />
        <input style={S.input} type="password" placeholder="Password" value={form.password} onChange={e=>set("password",e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&(tab==="login"?login():register())} />
        {err && <div style={{ color:C.red, fontSize:11, marginBottom:10 }}>⚠ {err}</div>}
        <button style={S.btnFull()} onClick={tab==="login"?login:register}>
          {tab==="login"?"ENTER THE DOMINION":"JOIN THE UNDERWORLD"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DAILY LOGIN MODAL
// ============================================================
function DailyLoginModal({ player, onClaim, onClose }) {
  const streak = Math.min(7, player.loginStreak||1);
  const reward = DAILY_REWARDS[streak];
  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9998 }}>
      <div style={{ background:C.card, border:`1px solid ${C.gold}44`, borderRadius:10, padding:32, maxWidth:360, width:"100%", textAlign:"center" }}>
        <div style={{ color:C.gold, fontSize:22, fontWeight:900, letterSpacing:3, marginBottom:4 }}>DAILY REWARD</div>
        <div style={{ color:C.muted, fontSize:11, marginBottom:20 }}>Login Streak: Day {streak}</div>
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:24 }}>
          {[1,2,3,4,5,6,7].map(d => (
            <div key={d} style={{ width:36, height:36, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700,
              background: d<streak?C.goldBg:d===streak?C.gold:"#14141e",
              color: d<streak?C.gold:d===streak?"#000":C.dim,
              border: `1px solid ${d<=streak?C.gold:C.dim}` }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ color:C.gold, fontSize:20, fontWeight:900, marginBottom:6 }}>{reward.label}</div>
        {reward.itemId && <div style={{ color:C.orange, fontSize:12, marginBottom:16 }}>+ {ITEMS.find(i=>i.id===reward.itemId)?.name}</div>}
        <button style={S.btnFull(C.gold, C.goldBg)} onClick={()=>onClaim(reward)}>CLAIM REWARD</button>
        <div style={{ marginTop:10, color:C.muted, fontSize:10, cursor:"pointer" }} onClick={onClose}>skip for now</div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PAGE
// ============================================================
function ProfilePage({ player, onStatUp }) {
  const xpNeed = XP_FOR_LEVEL(player.level+1);
  const wpn = ITEMS.find(i=>i.id===player.equippedWeapon);
  const arm = ITEMS.find(i=>i.id===player.equippedArmor);
  const winRate = player.wins+player.losses>0 ? ((player.wins/(player.wins+player.losses))*100).toFixed(0) : 0;
  return (
    <div>
      <div style={S.card()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ color:"#fff", fontSize:22, fontWeight:900, letterSpacing:2 }}>{player.name}</div>
            <div style={{ color:C.muted, fontSize:10, letterSpacing:1 }}>@{player.username}</div>
            {player.syndicate && <div style={{ marginTop:4 }}><span style={S.badge(C.purple)}>🏴 {player.syndicate}</span></div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:C.red, fontSize:26, fontWeight:900 }}>LVL {player.level}</div>
            <div style={S.badge(C.orange)}>⭐ {player.reputation} REP</div>
          </div>
        </div>
        <Bar label="XP" val={player.xp} max={xpNeed} color={C.purple} icon="✨" />
        <Bar label="ENERGY" val={player.energy} max={MAX_ENERGY} color={C.blue} icon="⚡" />
        <Bar label="NERVE"  val={player.nerve}  max={MAX_NERVE}  color={C.orange} icon="🧠" />
        <Bar label="HEALTH" val={player.health} max={MAX_HEALTH} color={C.green} icon="❤️" />
        <div style={{ display:"flex", gap:24, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, flexWrap:"wrap" }}>
          {[["CASH","$"+player.cash.toLocaleString(),C.green],["WINS",player.wins,C.blue],["LOSSES",player.losses,C.red],["WIN%",winRate+"%",C.orange],["CRIMES",player.crimeStats?.total||0,C.muted]].map(([l,v,c])=>(
            <div key={l}><div style={{ color:c, fontWeight:900, fontSize:17 }}>{v}</div><div style={{ color:C.muted, fontSize:9, letterSpacing:1 }}>{l}</div></div>
          ))}
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card()}>
          <div style={S.cardTitle}>⚔️ COMBAT STATS</div>
          {[["STR","strength",C.red],["DEF","defense",C.blue],["DEX","dexterity",C.orange]].map(([label,key,color])=>(
            <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ color:C.muted, fontSize:11 }}>{label}</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ color, fontWeight:900, fontSize:15 }}>{player[key]}</span>
                {player.statPoints>0 && (
                  <button onClick={()=>onStatUp(key)} style={{ ...S.btn(C.green,C.greenBg), padding:"2px 8px", fontSize:10 }}>+</button>
                )}
              </div>
            </div>
          ))}
          {player.statPoints>0 && <div style={{ color:C.green, fontSize:10, marginTop:6 }}>● {player.statPoints} points to spend</div>}
          <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10 }}>
            {[["ATK PWR", calcAttack(player), C.red],["DEF PWR",calcDefense(player),C.blue],["HIT %",calcHitChance(player.dexterity,10).toFixed(0)+"%","#fff"],["CRIT %",calcCritChance(player.dexterity).toFixed(1)+"%",C.orange]].map(([l,v,c])=>(
              <div key={l} style={{ ...S.row, justifyContent:"space-between" }}>
                <span style={{ color:C.muted, fontSize:10 }}>{l}</span>
                <span style={{ color:c, fontWeight:900 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card()}>
          <div style={S.cardTitle}>🎒 LOADOUT</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ color:C.muted, fontSize:10, marginBottom:4 }}>WEAPON</div>
            <div style={{ color:wpn?C.orange:"#333", fontWeight:wpn?700:400 }}>{wpn?.name||"Bare Hands"}</div>
            {wpn && <div style={{ color:C.muted, fontSize:10 }}>+{wpn.weaponDmg} ATK</div>}
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ color:C.muted, fontSize:10, marginBottom:4 }}>ARMOR</div>
            <div style={{ color:arm?C.blue:"#333", fontWeight:arm?700:400 }}>{arm?.name||"None"}</div>
            {arm && <div style={{ color:C.muted, fontSize:10 }}>+{arm.armorRating} DEF</div>}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            <div style={{ color:C.muted, fontSize:10, marginBottom:4 }}>LOGIN STREAK</div>
            <div style={{ display:"flex", gap:4 }}>
              {[1,2,3,4,5,6,7].map(d=>(
                <div key={d} style={{ width:22, height:22, borderRadius:3, background:d<=(player.loginStreak||0)?C.gold:"#14141e", border:`1px solid ${d<=(player.loginStreak||0)?C.gold:C.dim}`, fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", color:d<=(player.loginStreak||0)?"#000":C.dim, fontWeight:700 }}>{d}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CRIMES PAGE
// ============================================================
function CrimesPage({ player, onCrime }) {
  const [log, setLog] = useState([]);
  const tool = ITEMS.find(i=>i.type==="tool"&&player.inventory.includes(i.id)&&i.crimeBonus);
  const equipBonus = tool?.crimeBonus||0;

  function commit(crime) {
    if (player.nerve < crime.nerve) { setLog(l=>[{ txt:`❌ Not enough nerve (need ${crime.nerve})`, good:false }, ...l]); return; }
    const skillBonus = Math.floor(player.level*1.5);
    const chance = Math.min(95, Math.max(5, crime.baseChance+skillBonus+player.level+equipBonus-crime.difficulty));
    const roll = Math.random()*100;
    if (roll<=chance) {
      const mult = 0.8+Math.random()*0.4;
      const reward = Math.floor(crime.baseReward*mult);
      onCrime({ success:true, nerveCost:crime.nerve, cash:reward, xp:crime.xp, rep:1 });
      setLog(l=>[{ txt:`✅ ${crime.name} — +$${reward.toLocaleString()} | +${crime.xp}xp | +1 REP`, good:true },...l.slice(0,29)]);
    } else {
      onCrime({ success:false, nerveCost:crime.nerve, cash:0, xp:Math.floor(crime.xp*0.1), rep:-1 });
      setLog(l=>[{ txt:`❌ BUSTED — ${crime.name} | -1 REP`, good:false },...l.slice(0,29)]);
    }
  }

  return (
    <div>
      <div style={S.card()}>
        <div style={S.cardTitle}>🔪 CRIMINAL ACTIVITY</div>
        <div style={{ color:C.muted, fontSize:11 }}>
          NERVE: <span style={{ color:C.orange }}>{player.nerve}/{MAX_NERVE}</span> · Regens 1/10min
          {tool && <span style={{ color:C.green, marginLeft:12 }}>🔧 {tool.name} active (+{equipBonus}% chance)</span>}
        </div>
      </div>
      {CRIMES.map(crime => {
        const chance = Math.min(95,Math.max(5, crime.baseChance+Math.floor(player.level*1.5)+player.level+equipBonus-crime.difficulty));
        const canDo = player.nerve>=crime.nerve;
        const chanceColor = chance>=65?C.green:chance>=40?C.orange:C.red;
        return (
          <div key={crime.id} style={{ ...S.card(), opacity:canDo?1:0.45, borderColor:canDo?C.border:C.dim }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ color:"#fff", fontWeight:700, marginBottom:3, fontSize:14 }}>{crime.name}</div>
                <div style={{ color:C.muted, fontSize:11, marginBottom:8 }}>{crime.desc}</div>
                <div style={{ display:"flex", gap:14, fontSize:11, flexWrap:"wrap" }}>
                  <span style={{ color:C.orange }}>⚡ {crime.nerve} nerve</span>
                  <span style={{ color:C.green }}>💰 ~${crime.baseReward.toLocaleString()}</span>
                  <span style={{ color:C.purple }}>✨ +{crime.xp} xp</span>
                  <span style={{ color:chanceColor }}>🎯 {chance}%</span>
                </div>
              </div>
              <button onClick={()=>commit(crime)} disabled={!canDo}
                style={{ ...S.btn(), cursor:canDo?"pointer":"not-allowed", marginLeft:12, whiteSpace:"nowrap" }}>
                DO IT
              </button>
            </div>
          </div>
        );
      })}
      {log.length>0 && (
        <div style={S.card()}>
          <div style={S.cardTitle}>📋 CRIME LOG</div>
          <div style={S.logBox}>{log.map((l,i)=><div key={i} style={{ color:l.good?C.green:C.red }}>{l.txt}</div>)}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMBAT PAGE
// ============================================================
function CombatPage({ player, onCombat }) {
  const [enemy, setEnemy] = useState(null);
  const [log, setLog] = useState([]);
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(()=>{
    if (!enemy) return;
    const last = player.attackCooldowns?.[enemy.id]||0;
    const left = Math.max(0, ATTACK_COOLDOWN_MS-(Date.now()-last));
    setCooldownLeft(left);
    if (left>0) {
      timerRef.current = setInterval(()=>{
        const l2 = Math.max(0,ATTACK_COOLDOWN_MS-(Date.now()-last));
        setCooldownLeft(l2);
        if(l2===0) clearInterval(timerRef.current);
      },500);
    }
    return ()=>clearInterval(timerRef.current);
  },[enemy, player.attackCooldowns]);

  function findEnemy() {
    setEnemy(createEnemy(player.level));
    setLog([]); setResult(null);
  }

  function getAttacksToday(targetId) {
    const today = new Date().toDateString();
    if (player.lastAttackResetDate!==today) return 0;
    return player.attacksToday?.[targetId]||0;
  }

  function attack() {
    if (!enemy||fighting) return;
    if (player.energy<5) return setLog(["❌ Need 5 energy to fight"]);
    const today = new Date().toDateString();
    const attacks = getAttacksToday(enemy.id);
    if (attacks>=MAX_ATTACKS_PER_TARGET) return setLog([`❌ Max ${MAX_ATTACKS_PER_TARGET} attacks per target per day reached`]);
    const lastAtk = player.attackCooldowns?.[enemy.id]||0;
    if (Date.now()-lastAtk < ATTACK_COOLDOWN_MS) return setLog([`❌ Attack cooldown: wait ${Math.ceil((ATTACK_COOLDOWN_MS-(Date.now()-lastAtk))/1000)}s`]);
    setFighting(true);
    const newLog = [];
    let pH = player.health, eH = enemy.health, round = 0;
    function tick() {
      if (pH<=0||eH<=0||round>=25) {
        const won = eH<=0;
        newLog.push(won?`🏆 VICTORY — +$${enemy.cash} | +${enemy.xp}xp | +2 REP`:`💀 DEFEATED — hospitalized | -2 REP`);
        setLog([...newLog]);
        setResult(won?"WIN":"LOSE");
        onCombat({ won, cash:won?enemy.cash:0, xp:won?enemy.xp:5, rep:won?2:-2, healthLost:player.health-pH, energyCost:5, targetId:enemy.id, today });
        setFighting(false);
        return;
      }
      round++;
      // Player attacks
      if (Math.random()*100<=calcHitChance(player.dexterity,enemy.dexterity)) {
        const isCrit = Math.random()*100<=calcCritChance(player.dexterity);
        let dmg = calcDamage(calcAttack(player), enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2);
        if (isCrit) { dmg*=2; newLog.push(`⚡ CRIT! You deal ${Math.floor(dmg)} dmg`); }
        else newLog.push(`👊 R${round}: You hit for ${Math.floor(dmg)} dmg`);
        eH -= dmg;
      } else newLog.push(`💨 R${round}: You missed`);
      if (eH<=0) { tick(); return; }
      // Enemy attacks
      if (Math.random()*100<=calcHitChance(enemy.dexterity,player.dexterity)) {
        const eAtk = enemy.strength+(ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0)+enemy.level*2;
        const eDef = enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2;
        const dmg = calcDamage(eAtk, calcDefense(player));
        newLog.push(`🔴 ${enemy.name} hits for ${Math.floor(dmg)} dmg`);
        pH -= dmg;
      } else newLog.push(`💨 ${enemy.name} missed`);
      setLog([...newLog]);
      setTimeout(tick, 300);
    }
    tick();
  }

  const attksToday = enemy ? getAttacksToday(enemy.id) : 0;
  const onCooldown = cooldownLeft>0;

  return (
    <div>
      <div style={S.card()}>
        <div style={S.cardTitle}>⚔️ STREET COMBAT</div>
        <div style={{ color:C.muted, fontSize:11, display:"flex", gap:16, flexWrap:"wrap" }}>
          <span>⚡ 5 energy/fight</span>
          <span>⏱ 60s cooldown</span>
          <span>🎯 Max 5 attacks/target/day</span>
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card()}>
          <div style={S.cardTitle}>🧍 YOU</div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:8 }}>{player.name} · LVL {player.level}</div>
          {[["ATK",calcAttack(player),C.red],["DEF",calcDefense(player),C.blue],["HP",player.health,C.green],["DEX",player.dexterity,C.orange]].map(([l,v,c])=>(
            <div key={l} style={{ ...S.row, justifyContent:"space-between" }}>
              <span style={{ color:C.muted, fontSize:10 }}>{l}</span>
              <span style={{ color:c, fontWeight:900 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={S.card()}>
          <div style={S.cardTitle}>🎯 TARGET</div>
          {enemy ? (
            <>
              <div style={{ color:C.red, fontWeight:700, marginBottom:8 }}>{enemy.name} · LVL {enemy.level}</div>
              {[["ATK",enemy.strength+(ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0)+enemy.level*2,C.red],["DEF",enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2,C.blue],["HP",enemy.health,C.green]].map(([l,v,c])=>(
                <div key={l} style={{ ...S.row, justifyContent:"space-between" }}>
                  <span style={{ color:C.muted, fontSize:10 }}>{l}</span>
                  <span style={{ color:c, fontWeight:900 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:8, fontSize:10, color:C.muted }}>
                Bounty: <span style={{ color:C.gold }}>+${enemy.cash}</span>
                <span style={{ marginLeft:12, color:attksToday>0?C.orange:C.muted }}>Attacks today: {attksToday}/{MAX_ATTACKS_PER_TARGET}</span>
              </div>
            </>
          ) : <div style={{ color:C.dim }}>No target found</div>}
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <button style={S.btn(C.muted,"#14141e")} onClick={findEnemy}>🔍 FIND TARGET</button>
        {enemy && !result && (
          <button style={{ ...S.btn(), opacity:fighting||onCooldown?0.5:1, cursor:fighting||onCooldown?"not-allowed":"pointer" }}
            onClick={attack} disabled={fighting||onCooldown}>
            {fighting?"FIGHTING...":`⚔️ ATTACK${onCooldown?` (${Math.ceil(cooldownLeft/1000)}s)`:""}`}
          </button>
        )}
        {result && <button style={S.btn(C.muted,"#14141e")} onClick={()=>{setEnemy(null);setResult(null);setLog([]);}}>NEW TARGET</button>}
      </div>

      {log.length>0 && (
        <div style={S.card()}>
          <div style={S.cardTitle}>
            ⚔️ BATTLE LOG
            {result && <span style={S.badge(result==="WIN"?C.green:C.red)}>{result}</span>}
          </div>
          <div style={S.logBox}>
            {log.map((l,i)=>(
              <div key={i} style={{ color:l.includes("You hit")||l.includes("CRIT")||l.includes("VICTORY")?C.green:l.includes("missed")?C.muted:l.includes("DEFEAT")?C.red:"#aaa" }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INVENTORY PAGE
// ============================================================
function InventoryPage({ player, onBuy, onEquip }) {
  const [tab, setTab] = useState("inventory");
  const rarityColor = { common:C.muted, rare:C.blue, legendary:C.gold };
  return (
    <div>
      <Tabs tabs={["inventory","shop"]} active={tab} onSelect={setTab} />
      {tab==="inventory" && (
        <div style={S.card()}>
          <div style={S.cardTitle}>🎒 YOUR GEAR ({player.inventory.length} items)</div>
          {player.inventory.length===0 && <div style={{ color:C.dim }}>No items. Visit the shop to gear up.</div>}
          {player.inventory.map(id=>{
            const item = ITEMS.find(i=>i.id===id);
            if(!item) return null;
            const isEqW = player.equippedWeapon===id;
            const isEqA = player.equippedArmor===id;
            const isEq = isEqW||isEqA;
            return (
              <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ color:isEq?C.green:"#fff", fontWeight:700 }}>{item.name} {isEq&&"✓"} <span style={S.badge(rarityColor[item.rarity]||C.muted)}>{item.rarity}</span></div>
                  <div style={{ fontSize:10, color:C.muted }}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                </div>
                {isEq ? <span style={S.badge(C.green)}>EQUIPPED</span>
                  : (item.type==="weapon"||item.type==="armor") && <button style={S.btn(C.green,C.greenBg)} onClick={()=>onEquip(item)}>EQUIP</button>}
              </div>
            );
          })}
        </div>
      )}
      {tab==="shop" && (
        <div>
          <div style={{ color:C.green, fontSize:13, marginBottom:12, fontWeight:700 }}>💰 CASH: ${player.cash.toLocaleString()}</div>
          {["weapon","armor","tool"].map(type=>(
            <div key={type} style={S.card()}>
              <div style={S.cardTitle}>{type==="weapon"?"⚔️":type==="armor"?"🛡️":"🔧"} {type.toUpperCase()}S</div>
              {ITEMS.filter(i=>i.type===type).map(item=>{
                const owned = player.inventory.includes(item.id);
                const canAfford = player.cash>=item.price;
                return (
                  <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <div style={{ color:"#fff" }}>{item.name} <span style={S.badge(rarityColor[item.rarity]||C.muted)}>{item.rarity}</span></div>
                      <div style={{ fontSize:10, color:C.muted }}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.green, fontSize:13, marginBottom:4 }}>${item.price.toLocaleString()}</div>
                      {owned ? <span style={S.badge(C.green)}>OWNED</span>
                        : <button style={{ ...S.btn(C.orange,C.orangeBg), opacity:canAfford?1:0.4, cursor:canAfford?"pointer":"not-allowed" }}
                            onClick={()=>onBuy(item)} disabled={!canAfford}>BUY</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SYNDICATES PAGE
// ============================================================
function SyndicatesPage({ player, onCreateSyndicate, onJoinSyndicate, onLeaveSyndicate, onContribute }) {
  const [syndicates, setSyndicates] = useState(getSyndicates);
  const [tab, setTab] = useState("list");
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [contributeAmt, setContributeAmt] = useState("");

  function refresh() { setSyndicates(getSyndicates()); }

  function create() {
    if (player.level<10) return alert("Need Level 10");
    if (player.cash<500000) return alert("Need $500,000");
    if (!newName.trim()) return alert("Enter a name");
    if (syndicates.find(s=>s.name===newName.trim())) return alert("Name taken");
    const s = { name:newName.trim(), tag:(newTag||newName.slice(0,4)).toUpperCase(), leader:player.username, members:[player.username], level:1, xp:0, treasury:0, founded:Date.now() };
    const updated = [...syndicates, s];
    saveSyndicates(updated);
    setSyndicates(updated);
    onCreateSyndicate(s);
    setNewName(""); setNewTag("");
  }

  function join(s) {
    if (player.syndicate) return alert("Leave your current syndicate first");
    setConfirm({ msg:`Join syndicate "${s.name}"?`, action:()=>{
      const updated = syndicates.map(x=>x.name===s.name?{...x,members:[...x.members,player.username]}:x);
      saveSyndicates(updated); setSyndicates(updated);
      onJoinSyndicate(s);
    }});
  }

  function leave() {
    setConfirm({ msg:`Leave syndicate "${player.syndicate}"? You'll lose all syndicate progress.`, action:()=>{
      const updated = syndicates.map(x=>x.name===player.syndicate?{...x,members:x.members.filter(m=>m!==player.username)}:x);
      saveSyndicates(updated); setSyndicates(updated);
      onLeaveSyndicate();
    }});
  }

  function contribute() {
    const amt = parseInt(contributeAmt);
    if (!amt||amt<100||amt>player.cash) return alert("Enter valid amount (min $100)");
    const updated = syndicates.map(x=>x.name===player.syndicate?{...x,treasury:x.treasury+amt}:x);
    saveSyndicates(updated); setSyndicates(updated);
    onContribute(amt);
    setContributeAmt("");
  }

  const mySyndicate = syndicates.find(s=>s.name===player.syndicate);

  return (
    <div>
      {confirm && <Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)} />}
      <Tabs tabs={["list","create"]} active={tab} onSelect={setTab} />

      {tab==="list" && (
        <div>
          {mySyndicate && (
            <div style={{ ...S.card(), borderColor:C.purple+"44" }}>
              <div style={S.cardTitle}>🏴 YOUR SYNDICATE</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ color:"#fff", fontSize:18, fontWeight:900 }}>{mySyndicate.name} <span style={S.badge(C.purple)}>[{mySyndicate.tag}]</span></div>
                  <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Leader: {mySyndicate.leader} · {mySyndicate.members.length} members · Level {mySyndicate.level}</div>
                  <div style={{ color:C.gold, fontSize:12, marginTop:4 }}>Treasury: ${mySyndicate.treasury.toLocaleString()}</div>
                </div>
                {mySyndicate.leader!==player.username && (
                  <button style={S.btn(C.red,C.redBg)} onClick={leave}>LEAVE</button>
                )}
              </div>
              <div style={{ marginTop:12, display:"flex", gap:8 }}>
                <input style={{ ...S.input, marginBottom:0, flex:1 }} type="number" placeholder="Contribute $..." value={contributeAmt} onChange={e=>setContributeAmt(e.target.value)} />
                <button style={S.btn(C.gold,C.goldBg)} onClick={contribute}>CONTRIBUTE</button>
              </div>
              <div style={{ color:C.muted, fontSize:10, marginTop:6 }}>5% of crime earnings auto-contributed to treasury</div>
            </div>
          )}
          {syndicates.length===0 && <div style={{ ...S.card(), color:C.dim }}>No syndicates yet. Create the first one.</div>}
          {syndicates.filter(s=>s.name!==player.syndicate).map(s=>(
            <div key={s.name} style={S.card()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{s.name} <span style={S.badge(C.purple)}>[{s.tag}]</span></div>
                  <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>Leader: {s.leader} · {s.members.length} members · Lvl {s.level} · 💰${s.treasury.toLocaleString()}</div>
                </div>
                {!player.syndicate && <button style={S.btn(C.green,C.greenBg)} onClick={()=>join(s)}>JOIN</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="create" && (
        <div style={S.card()}>
          <div style={S.cardTitle}>🏴 FOUND A SYNDICATE</div>
          <div style={{ display:"flex", gap:8, marginBottom:10, color:C.muted, fontSize:11 }}>
            <span>Level: <span style={{ color:player.level>=10?C.green:C.red }}>{player.level}/10</span></span>
            <span>Cash: <span style={{ color:player.cash>=500000?C.green:C.red }}>${player.cash.toLocaleString()}/$500,000</span></span>
          </div>
          <input style={S.input} placeholder="Syndicate Name" value={newName} onChange={e=>setNewName(e.target.value)} />
          <input style={S.input} placeholder="Tag (e.g. SD) — 4 chars max" maxLength={4} value={newTag} onChange={e=>setNewTag(e.target.value)} />
          <button style={{ ...S.btnFull(), opacity:(player.level>=10&&player.cash>=500000)?1:0.4 }}
            onClick={create} disabled={player.level<10||player.cash<500000}>
            FOUND SYNDICATE — COST $500,000
          </button>
          <div style={{ marginTop:12, color:C.muted, fontSize:11, lineHeight:1.8 }}>
            <div>• Members contribute 5% of crime earnings</div>
            <div>• Syndicate earns 5% of member XP gains</div>
            <div>• Level up syndicate to unlock perks</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LEADERBOARD PAGE
// ============================================================
function LeaderboardPage({ player }) {
  const [tab, setTab] = useState("players");
  const accounts = getAccounts();
  const players = Object.values(accounts).map(a=>a.player).sort((a,b)=>b.level-a.level||b.reputation-a.reputation);
  const syndicates = getSyndicates().sort((a,b)=>b.level-a.level||b.treasury-a.treasury);
  return (
    <div>
      <Tabs tabs={["players","syndicates"]} active={tab} onSelect={setTab} />
      {tab==="players" && (
        <div style={S.card()}>
          <div style={S.cardTitle}>🏆 TOP PLAYERS</div>
          <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 50px 55px 70px 55px", gap:6, color:C.dim, fontSize:9, letterSpacing:1, marginBottom:8, padding:"0 4px" }}>
            <span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span><span>W/L</span>
          </div>
          {players.slice(0,100).map((p,i)=>(
            <div key={p.username} style={{ display:"grid", gridTemplateColumns:"28px 1fr 50px 55px 70px 55px", gap:6, padding:"8px 4px", borderBottom:`1px solid ${C.border}`, background:p.username===player.username?C.redBg:"transparent", borderRadius:2 }}>
              <span style={{ color:i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.muted, fontWeight:i<3?900:400 }}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
              </span>
              <span style={{ color:p.username===player.username?C.red:"#fff", fontWeight:700, fontSize:12 }}>
                {p.name}{p.username===player.username&&" 👈"}
              </span>
              <span style={{ color:C.purple, fontWeight:700 }}>{p.level}</span>
              <span style={{ color:C.orange }}>{p.reputation}</span>
              <span style={{ color:C.green, fontSize:10 }}>${Math.floor(p.cash/1000)}k</span>
              <span style={{ color:C.muted, fontSize:10 }}>{p.wins}/{p.losses}</span>
            </div>
          ))}
          {players.length===0&&<div style={{ color:C.dim }}>No players yet.</div>}
        </div>
      )}
      {tab==="syndicates" && (
        <div style={S.card()}>
          <div style={S.cardTitle}>🏴 TOP SYNDICATES</div>
          {syndicates.length===0&&<div style={{ color:C.dim }}>No syndicates yet.</div>}
          {syndicates.map((s,i)=>(
            <div key={s.name} style={{ display:"flex", justifyContent:"space-between", padding:"10px 4px", borderBottom:`1px solid ${C.border}`, background:s.name===player.syndicate?C.redBg:"transparent" }}>
              <div>
                <span style={{ color:i===0?C.gold:C.muted, marginRight:10, fontWeight:900 }}>{i+1}</span>
                <span style={{ color:"#fff", fontWeight:700 }}>{s.name}</span>
                <span style={{ ...S.badge(C.purple), marginLeft:8 }}>[{s.tag}]</span>
              </div>
              <div style={{ textAlign:"right", fontSize:11 }}>
                <div style={{ color:C.purple }}>Lvl {s.level} · {s.members.length} members</div>
                <div style={{ color:C.gold }}>💰 ${s.treasury.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN GAME SHELL
// ============================================================
const NAV = [
  { id:"profile",     icon:"👤", label:"PROFILE" },
  { id:"crimes",      icon:"🔪", label:"CRIMES" },
  { id:"combat",      icon:"⚔️",  label:"COMBAT" },
  { id:"inventory",   icon:"🎒", label:"INVENTORY" },
  { id:"syndicates",  icon:"🏴", label:"SYNDICATES" },
  { id:"leaderboard", icon:"🏆", label:"LEADERBOARD" },
];

function Game({ initialPlayer, onLogout }) {
  const [player, setPlayer] = useState(initialPlayer);
  const [page, setPage] = useState("profile");
  const [toast, setToast] = useState(null);
  const [showDaily, setShowDaily] = useState(!initialPlayer.loginRewardClaimed);

  const notify = (msg) => setToast(msg);

  // Regen tick
  useEffect(()=>{
    const id = setInterval(()=>{
      setPlayer(p=>{
        let u={...p};
        const eR=calcEnergyRegen(p.lastEnergyRegen);
        const nR=calcNerveRegen(p.lastNerveRegen);
        const hR=calcHealthRegen(p.lastHealthRegen);
        if(eR>0){u.energy=Math.min(MAX_ENERGY,p.energy+eR);u.lastEnergyRegen=Date.now();}
        if(nR>0){u.nerve=Math.min(MAX_NERVE,p.nerve+nR);u.lastNerveRegen=Date.now();}
        if(hR>0){u.health=Math.min(MAX_HEALTH,p.health+hR);u.lastHealthRegen=Date.now();}
        return u;
      });
    },10000);
    return ()=>clearInterval(id);
  },[]);

  // Save player
  useEffect(()=>{
    const accs=getAccounts();
    if(accs[player.username]){accs[player.username].player=player;saveAccounts(accs);}
  },[player]);

  function levelUp(p) {
    let u={...p};
    while(u.xp>=XP_FOR_LEVEL(u.level+1)){
      u.xp-=XP_FOR_LEVEL(u.level+1);
      u.level+=1; u.statPoints=(u.statPoints||0)+3;
      notify(`🆙 LEVEL UP! Now Level ${u.level} — +3 stat points!`);
    }
    return u;
  }

  function handleDailyClaim(reward) {
    setPlayer(p=>{
      let u={...p, cash:p.cash+reward.cash, loginRewardClaimed:true};
      if(reward.itemId&&!p.inventory.includes(reward.itemId)) u.inventory=[...p.inventory,reward.itemId];
      return u;
    });
    notify(`🎁 Day ${player.loginStreak} reward claimed: +$${reward.cash.toLocaleString()}${reward.itemId?" + "+ITEMS.find(i=>i.id===reward.itemId)?.name:""}`);
    setShowDaily(false);
  }

  function handleCrime({success,nerveCost,cash,xp,rep}) {
    setPlayer(p=>{
      const synds=getSyndicates();
      let treasury=0;
      if(p.syndicate&&cash>0){
        treasury=Math.floor(cash*0.05);
        const updated=synds.map(s=>s.name===p.syndicate?{...s,treasury:s.treasury+treasury,xp:(s.xp||0)+Math.floor(xp*0.05)}:s);
        saveSyndicates(updated);
      }
      const u=levelUp({...p, nerve:Math.max(0,p.nerve-nerveCost), cash:p.cash+cash-treasury, xp:p.xp+xp, reputation:Math.max(0,p.reputation+rep), crimeStats:{total:(p.crimeStats?.total||0)+1,success:(p.crimeStats?.success||0)+(success?1:0)}});
      return u;
    });
  }

  function handleCombat({won,cash,xp,rep,healthLost,energyCost,targetId,today}) {
    setPlayer(p=>{
      const newCooldowns={...p.attackCooldowns,[targetId]:Date.now()};
      const lastReset=p.lastAttackResetDate;
      const atksToday = lastReset===today ? {...(p.attacksToday||{})} : {};
      atksToday[targetId]=(atksToday[targetId]||0)+1;
      const u=levelUp({...p, energy:Math.max(0,p.energy-energyCost), health:Math.max(1,p.health-Math.floor(healthLost)), cash:p.cash+cash, xp:p.xp+xp, reputation:Math.max(0,p.reputation+rep), wins:p.wins+(won?1:0), losses:p.losses+(won?0:1), attackCooldowns:newCooldowns, attacksToday:atksToday, lastAttackResetDate:today});
      return u;
    });
  }

  function handleBuy(item) {
    if(player.cash<item.price) return notify("❌ Not enough cash");
    if(player.inventory.includes(item.id)) return notify("❌ Already owned");
    setPlayer(p=>({...p,cash:p.cash-item.price,inventory:[...p.inventory,item.id]}));
    notify(`✅ BOUGHT ${item.name}`);
  }

  function handleEquip(item) {
    setPlayer(p=>({...p, equippedWeapon:item.type==="weapon"?item.id:p.equippedWeapon, equippedArmor:item.type==="armor"?item.id:p.equippedArmor}));
    notify(`✅ EQUIPPED ${item.name}`);
  }

  function handleStatUp(stat) {
    if(!player.statPoints) return;
    setPlayer(p=>({...p,[stat]:p[stat]+1,statPoints:p.statPoints-1}));
  }

  function handleCreateSyndicate(s) {
    setPlayer(p=>({...p,cash:p.cash-500000,syndicate:s.name,syndicateRole:"leader"}));
    notify(`🏴 SYNDICATE FOUNDED: ${s.name}`);
  }

  function handleJoinSyndicate(s) {
    setPlayer(p=>({...p,syndicate:s.name,syndicateRole:"member"}));
    notify(`✅ JOINED ${s.name}`);
  }

  function handleLeaveSyndicate() {
    setPlayer(p=>({...p,syndicate:null,syndicateRole:null}));
    notify("🚪 Left syndicate");
  }

  function handleContribute(amt) {
    setPlayer(p=>({...p,cash:p.cash-amt}));
    notify(`✅ Contributed $${amt.toLocaleString()} to treasury`);
  }

  return (
    <div style={S.app}>
      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
      {showDaily && !player.loginRewardClaimed && (
        <DailyLoginModal player={player} onClaim={handleDailyClaim} onClose={()=>setShowDaily(false)} />
      )}

      <div style={{ display:"flex", minHeight:"100vh" }}>
        <div style={S.sidebar}>
          <div style={{ padding:"18px 16px 14px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:C.red, fontSize:16, fontWeight:900, letterSpacing:4, textShadow:`0 0 12px ${C.red}66` }}>SHADOW</div>
            <div style={{ color:C.red, fontSize:16, fontWeight:900, letterSpacing:4, textShadow:`0 0 12px ${C.red}66` }}>DOMINION</div>
            <div style={{ color:C.dim, fontSize:9, letterSpacing:2, marginTop:2 }}>ALPHA v0.1</div>
          </div>
          <div style={{ padding:"10px 14px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{player.name}</div>
            <div style={{ color:C.muted, fontSize:10 }}>LVL {player.level} · ⭐{player.reputation}</div>
            <div style={{ color:C.green, fontSize:12, marginTop:2 }}>${player.cash.toLocaleString()}</div>
          </div>
          <div style={{ flex:1, paddingTop:6 }}>
            {NAV.map(n=>(
              <div key={n.id} style={S.navItem(page===n.id)} onClick={()=>setPage(n.id)}>
                <span>{n.icon}</span><span style={{ fontSize:10, letterSpacing:1 }}>{n.label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}` }}>
            <Bar label="ENERGY" val={player.energy} max={MAX_ENERGY} color={C.blue} icon="⚡" />
            <Bar label="NERVE"  val={player.nerve}  max={MAX_NERVE}  color={C.orange} icon="🧠" />
            <Bar label="HEALTH" val={player.health} max={MAX_HEALTH} color={C.green} icon="❤️" />
            {!player.loginRewardClaimed && (
              <button style={{ ...S.btnFull(C.gold,C.goldBg), marginTop:8, fontSize:9 }} onClick={()=>setShowDaily(true)}>🎁 CLAIM DAILY</button>
            )}
            <button onClick={onLogout} style={{ ...S.btnFull(C.muted,"#14141e"), marginTop:6, fontSize:9 }}>LOGOUT</button>
          </div>
        </div>

        <div style={S.main}>
          <div style={{ color:C.muted, fontSize:10, letterSpacing:2, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</span>
            <span style={{ color:C.dim }}>⚡{Math.floor(player.energy)} 🧠{Math.floor(player.nerve)} ❤️{Math.floor(player.health)}</span>
          </div>
          {page==="profile"     && <ProfilePage    player={player} onStatUp={handleStatUp} />}
          {page==="crimes"      && <CrimesPage     player={player} onCrime={handleCrime} />}
          {page==="combat"      && <CombatPage     player={player} onCombat={handleCombat} />}
          {page==="inventory"   && <InventoryPage  player={player} onBuy={handleBuy} onEquip={handleEquip} />}
          {page==="syndicates"  && <SyndicatesPage player={player} onCreateSyndicate={handleCreateSyndicate} onJoinSyndicate={handleJoinSyndicate} onLeaveSyndicate={handleLeaveSyndicate} onContribute={handleContribute} />}
          {page==="leaderboard" && <LeaderboardPage player={player} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN CONSTANTS
// ============================================================
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "ShadowAdmin@2024";

// ============================================================
// ADMIN LOGIN PAGE
// ============================================================
function AdminLoginPage({ onLogin }) {
  const [form, setForm] = useState({ username:"", password:"" });
  const [err, setErr] = useState("");
  function login() {
    if (form.username===ADMIN_USERNAME && form.password===ADMIN_PASSWORD) onLogin();
    else setErr("Invalid admin credentials.");
  }
  return (
    <div style={S.authWrap}>
      <div style={S.authBox}>
        <div style={{ color:"#ff8c00", fontSize:22, fontWeight:900, letterSpacing:4, textAlign:"center", marginBottom:4 }}>⚙️ ADMIN</div>
        <div style={{ color:C.muted, fontSize:10, letterSpacing:3, textAlign:"center", marginBottom:24 }}>SHADOW DOMINION CONTROL PANEL</div>
        <input style={S.input} placeholder="Admin Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} />
        <input style={S.input} type="password" placeholder="Admin Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
          onKeyDown={e=>e.key==="Enter"&&login()} />
        {err && <div style={{ color:C.red, fontSize:11, marginBottom:10 }}>⚠ {err}</div>}
        <button style={S.btnFull(C.orange, C.orangeBg)} onClick={login}>ENTER ADMIN PANEL</button>
        <div style={{ marginTop:12, color:C.muted, fontSize:10, textAlign:"center", cursor:"pointer" }} onClick={()=>window.location.hash=""}>← Back to game</div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PANEL
// ============================================================
function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("players");
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [announce, setAnnounce] = useState("");
  const [announcements, setAnnouncements] = useState(()=>{ try{return JSON.parse(localStorage.getItem("sd_announcements")||"[]");}catch{return[];} });
  const [giveForm, setGiveForm] = useState({ cash:"", itemId:"" });
  const [editForm, setEditForm] = useState({ level:"", cash:"", strength:"", defense:"", dexterity:"", reputation:"" });
  const [logs, setLogs] = useState(()=>{ try{return JSON.parse(localStorage.getItem("sd_gamelogs")||"[]");}catch{return[];} });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");

  function notify(msg){ setToast(msg); }

  function refresh() {
    const accs = getAccounts();
    setPlayers(Object.values(accs).map(a=>a.player));
  }

  useEffect(()=>{ refresh(); },[]);

  function selectPlayer(p) {
    setSelectedPlayer(p);
    setEditForm({ level:p.level, cash:p.cash, strength:p.strength, defense:p.defense, dexterity:p.dexterity, reputation:p.reputation });
    setGiveForm({ cash:"", itemId:"" });
  }

  function savePlayer(updated) {
    const accs = getAccounts();
    if (accs[updated.username]) { accs[updated.username].player = updated; saveAccounts(accs); }
    setSelectedPlayer(updated);
    setPlayers(ps => ps.map(p=>p.username===updated.username?updated:p));
    notify("✅ Player saved");
  }

  function banPlayer(username) {
    setConfirm({ msg:`Ban & delete player "${username}"? This cannot be undone.`, action:()=>{
      const accs = getAccounts();
      delete accs[username];
      saveAccounts(accs);
      setSelectedPlayer(null);
      refresh();
      notify(`🚫 ${username} banned and deleted`);
    }});
  }

  function applyEdit() {
    if (!selectedPlayer) return;
    const updated = { ...selectedPlayer,
      level: Math.max(1,parseInt(editForm.level)||selectedPlayer.level),
      cash: Math.max(0,parseInt(editForm.cash)||selectedPlayer.cash),
      strength: Math.max(1,parseInt(editForm.strength)||selectedPlayer.strength),
      defense: Math.max(1,parseInt(editForm.defense)||selectedPlayer.defense),
      dexterity: Math.max(1,parseInt(editForm.dexterity)||selectedPlayer.dexterity),
      reputation: Math.max(0,parseInt(editForm.reputation)||selectedPlayer.reputation),
    };
    savePlayer(updated);
  }

  function giveCash() {
    if (!selectedPlayer) return;
    const amt = parseInt(giveForm.cash);
    if (!amt||amt<=0) return notify("❌ Enter valid amount");
    savePlayer({ ...selectedPlayer, cash: selectedPlayer.cash+amt });
    notify(`✅ Gave $${amt.toLocaleString()} to ${selectedPlayer.name}`);
  }

  function giveItem() {
    if (!selectedPlayer||!giveForm.itemId) return;
    if (selectedPlayer.inventory.includes(giveForm.itemId)) return notify("❌ Player already has this item");
    savePlayer({ ...selectedPlayer, inventory:[...selectedPlayer.inventory, giveForm.itemId] });
    notify(`✅ Gave ${ITEMS.find(i=>i.id===giveForm.itemId)?.name} to ${selectedPlayer.name}`);
  }

  function postAnnouncement() {
    if (!announce.trim()) return;
    const msg = { id:Date.now(), text:announce.trim(), time:new Date().toLocaleString(), active:true };
    const updated = [msg, ...announcements.slice(0,9)];
    setAnnouncements(updated);
    localStorage.setItem("sd_announcements", JSON.stringify(updated));
    setAnnounce("");
    notify("📢 Announcement posted");
  }

  function deleteAnnouncement(id) {
    const updated = announcements.filter(a=>a.id!==id);
    setAnnouncements(updated);
    localStorage.setItem("sd_announcements", JSON.stringify(updated));
  }

  function clearLogs() {
    setConfirm({ msg:"Clear all game logs?", action:()=>{ setLogs([]); localStorage.removeItem("sd_gamelogs"); notify("🗑 Logs cleared"); }});
  }

  const filtered = players.filter(p=>p.username.includes(search.toLowerCase())||p.name.toLowerCase().includes(search.toLowerCase()));
  const totalCash = players.reduce((s,p)=>s+p.cash,0);
  const totalCrimes = players.reduce((s,p)=>s+(p.crimeStats?.total||0),0);

  const adminCard = (extra={}) => ({ ...S.card(extra), borderColor:"#2a1a00" });

  return (
    <div style={{ ...S.app, background:"#09080a" }}>
      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
      {confirm && <Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)} />}

      {/* Header */}
      <div style={{ background:"#0f0a00", borderBottom:`1px solid #2a1a00`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ color:C.orange, fontSize:16, fontWeight:900, letterSpacing:3 }}>⚙️ ADMIN PANEL</span>
          <span style={S.badge(C.orange)}>SHADOW DOMINION</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ color:C.muted, fontSize:10 }}>{players.length} players online</span>
          <button style={S.btn(C.muted,"#14141e")} onClick={onLogout}>LOGOUT</button>
        </div>
      </div>

      <div style={{ display:"flex", minHeight:"calc(100vh - 49px)" }}>
        {/* Sidebar */}
        <div style={{ ...S.sidebar, borderColor:"#2a1a00" }}>
          {[["players","👥","PLAYERS"],["give","🎁","GIVE ITEMS"],["edit","✏️","EDIT PLAYER"],["announce","📢","ANNOUNCE"],["logs","📋","GAME LOGS"]].map(([id,icon,label])=>(
            <div key={id} style={{ ...S.navItem(tab===id), borderLeftColor:tab===id?C.orange:"transparent", color:tab===id?C.orange:C.muted }} onClick={()=>setTab(id)}>
              <span>{icon}</span><span style={{ fontSize:10 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex:1, padding:20, overflowY:"auto" }}>

          {/* Stats bar */}
          <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
            {[["👥 TOTAL PLAYERS",players.length,C.blue],["💰 TOTAL CASH","$"+totalCash.toLocaleString(),C.green],["🔪 TOTAL CRIMES",totalCrimes,C.orange],["🏴 SYNDICATES",getSyndicates().length,C.purple]].map(([l,v,c])=>(
              <div key={l} style={{ background:"#0f0a00", border:`1px solid #2a1a00`, borderRadius:6, padding:"10px 16px", minWidth:120 }}>
                <div style={{ color:c, fontWeight:900, fontSize:16 }}>{v}</div>
                <div style={{ color:C.muted, fontSize:9, letterSpacing:1 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* PLAYERS TAB */}
          {tab==="players" && (
            <div>
              <div style={adminCard()}>
                <div style={{ ...S.cardTitle, color:C.orange }}>👥 ALL PLAYERS</div>
                <input style={{ ...S.input, marginBottom:12 }} placeholder="🔍 Search by name or username..." value={search} onChange={e=>setSearch(e.target.value)} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 50px 60px 70px 70px 60px 80px", gap:6, color:C.dim, fontSize:9, letterSpacing:1, marginBottom:8, padding:"0 4px" }}>
                  <span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span><span>CRIMES</span><span>W/L</span><span>ACTION</span>
                </div>
                {filtered.length===0 && <div style={{ color:C.dim }}>No players found.</div>}
                {filtered.map(p=>(
                  <div key={p.username} style={{ display:"grid", gridTemplateColumns:"1fr 50px 60px 70px 70px 60px 80px", gap:6, padding:"8px 4px", borderBottom:`1px solid ${C.border}`, background:selectedPlayer?.username===p.username?"#1a0e00":"transparent", cursor:"pointer", borderRadius:2 }}
                    onClick={()=>selectPlayer(p)}>
                    <div>
                      <div style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{p.name}</div>
                      <div style={{ color:C.muted, fontSize:9 }}>@{p.username}</div>
                    </div>
                    <span style={{ color:C.purple, fontWeight:700 }}>{p.level}</span>
                    <span style={{ color:C.orange }}>{p.reputation}</span>
                    <span style={{ color:C.green, fontSize:10 }}>${Math.floor(p.cash/1000)}k</span>
                    <span style={{ color:C.muted }}>{p.crimeStats?.total||0}</span>
                    <span style={{ color:C.muted, fontSize:10 }}>{p.wins}/{p.losses}</span>
                    <button style={{ ...S.btn(C.red,C.redBg), padding:"3px 8px", fontSize:9 }}
                      onClick={e=>{e.stopPropagation();banPlayer(p.username);}}>BAN</button>
                  </div>
                ))}
              </div>
              {selectedPlayer && (
                <div style={adminCard()}>
                  <div style={{ ...S.cardTitle, color:C.orange }}>📊 {selectedPlayer.name} — FULL STATS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                    {[["Username",selectedPlayer.username],["Level",selectedPlayer.level],["XP",selectedPlayer.xp],["Cash","$"+selectedPlayer.cash.toLocaleString()],["Reputation",selectedPlayer.reputation],["STR",selectedPlayer.strength],["DEF",selectedPlayer.defense],["DEX",selectedPlayer.dexterity],["Wins",selectedPlayer.wins],["Losses",selectedPlayer.losses],["Crimes",selectedPlayer.crimeStats?.total||0],["Syndicate",selectedPlayer.syndicate||"None"],["Login Streak",selectedPlayer.loginStreak||0],["Inventory",selectedPlayer.inventory.length+" items"]].map(([l,v])=>(
                      <div key={l} style={{ ...S.row, justifyContent:"space-between", background:"#0a0808", padding:"6px 10px", borderRadius:4 }}>
                        <span style={{ color:C.muted, fontSize:10 }}>{l}</span>
                        <span style={{ color:"#fff", fontWeight:700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GIVE TAB */}
          {tab==="give" && (
            <div>
              {!selectedPlayer && <div style={{ ...adminCard(), color:C.muted }}>👈 Select a player from the Players tab first.</div>}
              {selectedPlayer && (
                <>
                  <div style={adminCard()}>
                    <div style={{ ...S.cardTitle, color:C.orange }}>🎁 GIVE TO: {selectedPlayer.name}</div>
                    <div style={{ color:C.muted, fontSize:11, marginBottom:12 }}>Current cash: <span style={{ color:C.green }}>${selectedPlayer.cash.toLocaleString()}</span></div>
                    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      <input style={{ ...S.input, marginBottom:0, flex:1 }} type="number" placeholder="Cash amount..." value={giveForm.cash} onChange={e=>setGiveForm(f=>({...f,cash:e.target.value}))} />
                      <button style={S.btn(C.green,C.greenBg)} onClick={giveCash}>GIVE CASH</button>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <select style={{ ...S.input, marginBottom:0, flex:1 }} value={giveForm.itemId} onChange={e=>setGiveForm(f=>({...f,itemId:e.target.value}))}>
                        <option value="">Select item...</option>
                        {ITEMS.map(i=><option key={i.id} value={i.id}>{i.name} ({i.rarity})</option>)}
                      </select>
                      <button style={S.btn(C.orange,C.orangeBg)} onClick={giveItem}>GIVE ITEM</button>
                    </div>
                  </div>
                  <div style={adminCard()}>
                    <div style={{ ...S.cardTitle, color:C.orange }}>🎒 CURRENT INVENTORY</div>
                    {selectedPlayer.inventory.length===0 && <div style={{ color:C.dim }}>No items.</div>}
                    {selectedPlayer.inventory.map(id=>{
                      const item=ITEMS.find(i=>i.id===id);
                      return item ? <div key={id} style={{ color:C.text, fontSize:12, padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>{item.name} <span style={S.badge(C.muted)}>{item.type}</span></div> : null;
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* EDIT TAB */}
          {tab==="edit" && (
            <div>
              {!selectedPlayer && <div style={{ ...adminCard(), color:C.muted }}>👈 Select a player from the Players tab first.</div>}
              {selectedPlayer && (
                <div style={adminCard()}>
                  <div style={{ ...S.cardTitle, color:C.orange }}>✏️ EDIT: {selectedPlayer.name}</div>
                  <div style={S.grid2}>
                    {[["Level","level"],["Cash","cash"],["Strength","strength"],["Defense","defense"],["Dexterity","dexterity"],["Reputation","reputation"]].map(([label,key])=>(
                      <div key={key}>
                        <div style={{ color:C.muted, fontSize:10, marginBottom:4, letterSpacing:1 }}>{label.toUpperCase()}</div>
                        <input style={S.input} type="number" value={editForm[key]} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))} />
                      </div>
                    ))}
                  </div>
                  <button style={S.btnFull(C.orange,C.orangeBg)} onClick={applyEdit}>SAVE CHANGES</button>
                  <div style={{ marginTop:10 }}>
                    <button style={S.btn(C.red,C.redBg)} onClick={()=>banPlayer(selectedPlayer.username)}>🚫 BAN THIS PLAYER</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANNOUNCE TAB */}
          {tab==="announce" && (
            <div>
              <div style={adminCard()}>
                <div style={{ ...S.cardTitle, color:C.orange }}>📢 BROADCAST ANNOUNCEMENT</div>
                <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>Players see this as a banner when they log in.</div>
                <textarea style={{ ...S.input, height:80, resize:"vertical", marginBottom:10 }} placeholder="Type announcement message..." value={announce} onChange={e=>setAnnounce(e.target.value)} />
                <button style={S.btnFull(C.orange,C.orangeBg)} onClick={postAnnouncement}>📢 POST ANNOUNCEMENT</button>
              </div>
              <div style={adminCard()}>
                <div style={{ ...S.cardTitle, color:C.orange }}>📋 ACTIVE ANNOUNCEMENTS</div>
                {announcements.length===0 && <div style={{ color:C.dim }}>No announcements.</div>}
                {announcements.map(a=>(
                  <div key={a.id} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ color:"#fff", fontSize:12, marginBottom:3 }}>{a.text}</div>
                        <div style={{ color:C.muted, fontSize:10 }}>{a.time}</div>
                      </div>
                      <button style={{ ...S.btn(C.red,C.redBg), padding:"3px 8px", fontSize:9, marginLeft:8 }} onClick={()=>deleteAnnouncement(a.id)}>DELETE</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {tab==="logs" && (
            <div style={adminCard()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ ...S.cardTitle, color:C.orange, marginBottom:0 }}>📋 GAME LOGS ({logs.length})</div>
                <button style={S.btn(C.red,C.redBg)} onClick={clearLogs}>CLEAR ALL</button>
              </div>
              {logs.length===0 && <div style={{ color:C.dim }}>No logs yet. Logs appear as players commit crimes and fight.</div>}
              <div style={{ ...S.logBox, maxHeight:500 }}>
                {logs.map((l,i)=>(
                  <div key={i} style={{ padding:"4px 0", borderBottom:`1px solid ${C.border}22`, color:l.type==="crime"?C.orange:l.type==="combat"?C.red:C.muted }}>
                    <span style={{ color:C.dim, marginRight:8 }}>{l.time}</span>
                    <span style={S.badge(l.type==="crime"?C.orange:C.red)}>{l.type}</span>
                    <span style={{ marginLeft:8 }}>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANNOUNCEMENT BANNER (shown in game)
// ============================================================
function AnnouncementBanner() {
  const [ann, setAnn] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(()=>{
    const list = JSON.parse(localStorage.getItem("sd_announcements")||"[]");
    if (list.length>0) setAnn(list[0]);
  },[]);
  if (!ann||dismissed) return null;
  return (
    <div style={{ background:C.orangeBg, border:`1px solid ${C.orange}44`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12 }}>
      <span>📢 <span style={{ color:C.orange, fontWeight:700 }}>ANNOUNCEMENT:</span> <span style={{ color:C.text }}>{ann.text}</span></span>
      <button style={{ ...S.btn(C.muted,"transparent"), padding:"2px 8px", fontSize:10 }} onClick={()=>setDismissed(true)}>✕</button>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [player, setPlayer] = useState(null);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const isAdmin = window.location.hash==="#admin";

  if (isAdmin) {
    if (!adminAuthed) return <AdminLoginPage onLogin={()=>setAdminAuthed(true)} />;
    return <AdminPanel onLogout={()=>{ setAdminAuthed(false); window.location.hash=""; }} />;
  }

  if (!player) return <AuthPage onLogin={setPlayer} />;

  return (
    <div>
      <AnnouncementBanner />
      <Game initialPlayer={player} onLogout={()=>setPlayer(null)} />
    </div>
  );
}
