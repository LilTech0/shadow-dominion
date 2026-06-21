import { useState, useEffect, useCallback } from "react";

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
  { id: "knife",       name: "Switchblade",   type: "weapon", weaponDmg: 8,  armorRating: 0,  price: 500,   rarity: "common" },
  { id: "pipe",        name: "Lead Pipe",      type: "weapon", weaponDmg: 14, armorRating: 0,  price: 1200,  rarity: "common" },
  { id: "pistol",      name: "9mm Pistol",     type: "weapon", weaponDmg: 25, armorRating: 0,  price: 4000,  rarity: "rare" },
  { id: "shotgun",     name: "Sawn-Off",       type: "weapon", weaponDmg: 38, armorRating: 0,  price: 8000,  rarity: "rare" },
  { id: "vest",        name: "Stab Vest",      type: "armor",  weaponDmg: 0,  armorRating: 10, price: 800,   rarity: "common" },
  { id: "jacket",      name: "Kevlar Jacket",  type: "armor",  weaponDmg: 0,  armorRating: 22, price: 5000,  rarity: "rare" },
  { id: "lockpick",    name: "Lockpick Set",   type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 600,   crimeBonus: 10, rarity: "common" },
  { id: "scanner",     name: "Police Scanner", type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 1500,  crimeBonus: 18, rarity: "rare" },
];

const XP_FOR_LEVEL = (lvl) => Math.floor(100 * Math.pow(lvl, 1.5));
const MAX_ENERGY = 100;
const MAX_NERVE  = 50;
const MAX_HEALTH = 100;

function calcAttack(p) {
  const wpn = ITEMS.find(i => i.id === p.equippedWeapon);
  return p.strength + (wpn?.weaponDmg || 0) + (p.level * 2);
}
function calcDefense(p) {
  const arm = ITEMS.find(i => i.id === p.equippedArmor);
  return p.defense + (arm?.armorRating || 0) + (p.level * 2);
}
function calcHitChance(attDex, defDex) {
  return Math.min(95, Math.max(20, 75 + (attDex / 10) - (defDex / 10)));
}
function calcDamage(atk, def) {
  return Math.max(1, atk - def * 0.5);
}
function calcCritChance(dex) { return 5 + dex / 50; }

function calcEnergyRegen(lastAction) {
  const elapsed = (Date.now() - lastAction) / 1000;
  return Math.floor(elapsed / 300);
}
function calcNerveRegen(lastAction) {
  const elapsed = (Date.now() - lastAction) / 1000;
  return Math.floor(elapsed / 600);
}
function calcHealthRegen(lastAction) {
  const elapsed = (Date.now() - lastAction) / 1000;
  return Math.floor(elapsed / 180);
}

// ============================================================
// INITIAL STATE
// ============================================================
function createPlayer(name, username) {
  return {
    name, username,
    level: 1, xp: 0,
    cash: 1000,
    reputation: 0,
    strength: 10, defense: 10, dexterity: 10,
    energy: MAX_ENERGY, nerve: MAX_NERVE, health: MAX_HEALTH,
    lastEnergyRegen: Date.now(),
    lastNerveRegen:  Date.now(),
    lastHealthRegen: Date.now(),
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    syndicate: null,
    loginStreak: 0,
    lastLogin: null,
    statPoints: 0,
    wins: 0, losses: 0,
  };
}

function createEnemy(playerLevel) {
  const lvl = Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
  const names = ["Street Rat","Corner Boy","Blood Hawk","Iron Mask","The Warden","Ghost Nine","Viper","Cold Cut"];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    level: lvl,
    strength: 8 + lvl * 2,
    defense:  6 + lvl * 2,
    dexterity: 5 + lvl,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    equippedWeapon: lvl >= 5 ? "pistol" : lvl >= 3 ? "pipe" : "knife",
    equippedArmor: lvl >= 4 ? "vest" : null,
    cash: Math.floor(Math.random() * lvl * 300 + 100),
    xp: lvl * 15,
  };
}

// ============================================================
// STORAGE HELPERS
// ============================================================
const SAVE_KEY = "shadow_dominion_v1";
function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ============================================================
// STYLES
// ============================================================
const S = {
  app: {
    minHeight: "100vh", background: "#0a0a0f", color: "#e2e2e2",
    fontFamily: "'Courier New', monospace", fontSize: 14,
  },
  // Auth
  authWrap: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20 },
  authBox: { background:"#111118", border:"1px solid #2a2a3a", borderRadius:8, padding:32, width:"100%", maxWidth:380 },
  authTitle: { color:"#ff3a3a", fontSize:28, fontWeight:900, letterSpacing:4, textAlign:"center", marginBottom:4 },
  authSub: { color:"#555", fontSize:11, textAlign:"center", marginBottom:24, letterSpacing:2 },
  input: { width:"100%", background:"#0d0d14", border:"1px solid #2a2a3a", borderRadius:4, padding:"10px 12px", color:"#e2e2e2", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:12 },
  btnRed: { width:"100%", background:"#c0002a", border:"none", borderRadius:4, padding:"11px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:2 },
  btnGray: { background:"#1e1e2a", border:"1px solid #2a2a3a", borderRadius:4, padding:"8px 16px", color:"#aaa", fontSize:12, cursor:"pointer" },
  btnGreen: { background:"#1a3a1a", border:"1px solid #2a5a2a", borderRadius:4, padding:"8px 16px", color:"#4dff6e", fontSize:12, cursor:"pointer", fontWeight:700 },
  btnOrange: { background:"#3a1a00", border:"1px solid #7a3a00", borderRadius:4, padding:"8px 16px", color:"#ff8c00", fontSize:12, cursor:"pointer", fontWeight:700 },
  // Layout
  layout: { display:"flex", minHeight:"100vh" },
  sidebar: { width:200, background:"#0d0d14", borderRight:"1px solid #1a1a2a", display:"flex", flexDirection:"column", padding:"16px 0" },
  main: { flex:1, padding:24, overflowY:"auto" },
  navItem: (active) => ({ padding:"10px 20px", cursor:"pointer", fontSize:12, letterSpacing:1, color: active?"#ff3a3a":"#666", background: active?"#1a0a0a":"transparent", borderLeft: active?"2px solid #ff3a3a":"2px solid transparent", display:"flex", alignItems:"center", gap:8 }),
  // Cards
  card: { background:"#111118", border:"1px solid #1e1e2e", borderRadius:6, padding:16, marginBottom:12 },
  cardTitle: { color:"#ff3a3a", fontSize:11, letterSpacing:3, textTransform:"uppercase", marginBottom:12 },
  // Bars
  barWrap: { background:"#0d0d14", borderRadius:3, height:8, overflow:"hidden", flex:1 },
  bar: (pct, color) => ({ height:"100%", width:`${Math.min(100,pct)}%`, background:color, transition:"width 0.3s" }),
  // Misc
  badge: (color) => ({ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:10, background:color+"22", color, border:`1px solid ${color}44`, letterSpacing:1 }),
  row: { display:"flex", gap:8, alignItems:"center", marginBottom:8 },
  label: { color:"#555", fontSize:11, minWidth:80 },
  val: { color:"#e2e2e2", fontSize:13, fontWeight:700 },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  logBox: { background:"#0a0a0f", border:"1px solid #1a1a2a", borderRadius:4, padding:10, maxHeight:160, overflowY:"auto", fontSize:11, lineHeight:1.8 },
};

// ============================================================
// SUBCOMPONENTS
// ============================================================
function StatBar({ label, val, max, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:10, color:"#555", letterSpacing:1 }}>{label}</span>
        <span style={{ fontSize:10, color }}>{val}/{max}</span>
      </div>
      <div style={S.barWrap}><div style={S.bar((val/max)*100, color)} /></div>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const isGood = msg.startsWith("+") || msg.includes("SUCCESS") || msg.includes("WIN") || msg.includes("EQUIPPED") || msg.includes("BOUGHT");
  return (
    <div style={{ position:"fixed", top:20, right:20, background: isGood?"#0d2a0d":"#2a0d0d", border:`1px solid ${isGood?"#2a5a2a":"#5a2a2a"}`, borderRadius:6, padding:"12px 18px", color: isGood?"#4dff6e":"#ff6e6e", fontSize:12, zIndex:9999, letterSpacing:1, maxWidth:320 }}>
      {msg}
    </div>
  );
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username:"", password:"", name:"" });
  const [err, setErr] = useState("");

  function handleLogin() {
    const saves = JSON.parse(localStorage.getItem("sd_accounts") || "{}");
    if (!saves[form.username]) return setErr("Account not found.");
    if (saves[form.username].password !== form.password) return setErr("Wrong password.");
    onLogin(saves[form.username].player);
  }

  function handleRegister() {
    if (!form.username || !form.password || !form.name) return setErr("All fields required.");
    if (form.username.length < 3) return setErr("Username min 3 chars.");
    const saves = JSON.parse(localStorage.getItem("sd_accounts") || "{}");
    if (saves[form.username]) return setErr("Username taken.");
    const player = createPlayer(form.name, form.username);
    saves[form.username] = { password: form.password, player };
    localStorage.setItem("sd_accounts", JSON.stringify(saves));
    onLogin(player);
  }

  return (
    <div style={S.authWrap}>
      <div style={S.authBox}>
        <div style={S.authTitle}>SHADOW DOMINION</div>
        <div style={S.authSub}>ALPHA v0.1 — THE STREETS DON'T SLEEP</div>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }}
              style={{ flex:1, padding:"8px", background: tab===t?"#c0002a":"#1a1a24", border:"none", borderRadius:4, color: tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>
              {t}
            </button>
          ))}
        </div>
        {tab === "register" && (
          <input style={S.input} placeholder="Display Name" value={form.name}
            onChange={e => setForm(f => ({...f, name:e.target.value}))} />
        )}
        <input style={S.input} placeholder="Username" value={form.username}
          onChange={e => setForm(f => ({...f, username:e.target.value}))} />
        <input style={S.input} type="password" placeholder="Password" value={form.password}
          onChange={e => setForm(f => ({...f, password:e.target.value}))} />
        {err && <div style={{ color:"#ff4444", fontSize:11, marginBottom:8 }}>{err}</div>}
        <button style={S.btnRed} onClick={tab==="login"?handleLogin:handleRegister}>
          {tab==="login"?"ENTER THE DOMINION":"JOIN THE UNDERWORLD"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PAGE
// ============================================================
function ProfilePage({ player, onStatUp }) {
  const xpNeeded = XP_FOR_LEVEL(player.level + 1);
  const xpPct = (player.xp / xpNeeded) * 100;
  const wpn = ITEMS.find(i => i.id === player.equippedWeapon);
  const arm = ITEMS.find(i => i.id === player.equippedArmor);
  return (
    <div>
      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ color:"#fff", fontSize:20, fontWeight:900, letterSpacing:2 }}>{player.name}</div>
            <div style={{ color:"#555", fontSize:11, letterSpacing:1 }}>@{player.username}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#ff3a3a", fontSize:22, fontWeight:900 }}>LVL {player.level}</div>
            <div style={S.badge("#ff8c00")}>REP {player.reputation}</div>
          </div>
        </div>
        <StatBar label="XP" val={player.xp} max={xpNeeded} color="#6a4dff" />
        <StatBar label="ENERGY" val={player.energy} max={MAX_ENERGY} color="#4d9fff" />
        <StatBar label="NERVE" val={player.nerve} max={MAX_NERVE} color="#ff8c4d" />
        <StatBar label="HEALTH" val={player.health} max={MAX_HEALTH} color="#4dff6e" />
        <div style={{ marginTop:12, display:"flex", gap:20, borderTop:"1px solid #1e1e2e", paddingTop:12 }}>
          <div><div style={{ color:"#4dff6e", fontWeight:900, fontSize:18 }}>${player.cash.toLocaleString()}</div><div style={{ color:"#555", fontSize:10 }}>CASH</div></div>
          <div><div style={{ color:"#4d9fff", fontWeight:900, fontSize:18 }}>{player.wins}</div><div style={{ color:"#555", fontSize:10 }}>WINS</div></div>
          <div><div style={{ color:"#ff4d4d", fontWeight:900, fontSize:18 }}>{player.losses}</div><div style={{ color:"#555", fontSize:10 }}>LOSSES</div></div>
          <div><div style={{ color:"#ff8c00", fontWeight:900, fontSize:18 }}>{player.syndicate || "—"}</div><div style={{ color:"#555", fontSize:10 }}>SYNDICATE</div></div>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardTitle}>COMBAT STATS</div>
          {[["STR", player.strength],["DEF", player.defense],["DEX", player.dexterity]].map(([k,v]) => (
            <div key={k} style={{ ...S.row, justifyContent:"space-between" }}>
              <span style={S.label}>{k}</span>
              <span style={S.val}>{v}</span>
              {player.statPoints > 0 && (
                <button onClick={() => onStatUp(k.toLowerCase())} style={{ ...S.btnGreen, padding:"2px 8px", fontSize:10 }}>+</button>
              )}
            </div>
          ))}
          {player.statPoints > 0 && <div style={{ color:"#4dff6e", fontSize:11, marginTop:8 }}>● {player.statPoints} stat points available</div>}
          <div style={{ borderTop:"1px solid #1e1e2e", marginTop:10, paddingTop:10 }}>
            <div style={S.row}><span style={S.label}>ATK PWR</span><span style={{...S.val, color:"#ff4d4d"}}>{calcAttack(player)}</span></div>
            <div style={S.row}><span style={S.label}>DEF PWR</span><span style={{...S.val, color:"#4d9fff"}}>{calcDefense(player)}</span></div>
            <div style={S.row}><span style={S.label}>HIT %</span><span style={S.val}>{calcHitChance(player.dexterity,10).toFixed(0)}%</span></div>
            <div style={S.row}><span style={S.label}>CRIT %</span><span style={S.val}>{calcCritChance(player.dexterity).toFixed(1)}%</span></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>LOADOUT</div>
          <div style={S.row}><span style={S.label}>WEAPON</span><span style={{ color: wpn?"#ff8c4d":"#333", fontSize:12 }}>{wpn?.name || "Bare Hands"}</span></div>
          <div style={S.row}><span style={S.label}>ARMOR</span><span style={{ color: arm?"#4d9fff":"#333", fontSize:12 }}>{arm?.name || "None"}</span></div>
          <div style={{ marginTop:12, color:"#555", fontSize:10, lineHeight:1.8 }}>
            <div>Weapon DMG: <span style={{ color:"#ff4d4d" }}>{wpn?.weaponDmg || 0}</span></div>
            <div>Armor Rating: <span style={{ color:"#4d9fff" }}>{arm?.armorRating || 0}</span></div>
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
  const tool = ITEMS.find(i => i.type === "tool" && player.inventory.includes(i.id));

  function commitCrime(crime) {
    if (player.nerve < crime.nerve) return setLog(l => [`❌ Not enough nerve (need ${crime.nerve})`, ...l]);
    const skillBonus   = Math.floor(player.level * 1.5);
    const levelBonus   = player.level;
    const equipBonus   = tool?.crimeBonus || 0;
    const chance = Math.min(95, Math.max(5, crime.baseChance + skillBonus + levelBonus + equipBonus - crime.difficulty));
    const roll = Math.random() * 100;
    if (roll <= chance) {
      const mult = 0.8 + Math.random() * 0.4;
      const reward = Math.floor(crime.baseReward * mult);
      onCrime({ success: true, nerveCost: crime.nerve, cash: reward, xp: crime.xp, rep: 1 });
      setLog(l => [`✅ SUCCESS — ${crime.name} | +$${reward.toLocaleString()} | +${crime.xp}XP | +1 REP`, ...l.slice(0,19)]);
    } else {
      onCrime({ success: false, nerveCost: crime.nerve, cash: 0, xp: Math.floor(crime.xp * 0.1), rep: -1 });
      setLog(l => [`❌ BUSTED — ${crime.name} | -1 REP`, ...l.slice(0,19)]);
    }
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>CRIMINAL ACTIVITY</div>
        <div style={{ color:"#555", fontSize:11 }}>NERVE: {player.nerve}/{MAX_NERVE} · Each crime costs nerve · Regens 1 per 10min</div>
      </div>
      {CRIMES.map(crime => {
        const skillBonus = Math.floor(player.level * 1.5);
        const equipBonus = tool?.crimeBonus || 0;
        const chance = Math.min(95, Math.max(5, crime.baseChance + skillBonus + player.level + equipBonus - crime.difficulty));
        const canDo = player.nerve >= crime.nerve;
        return (
          <div key={crime.id} style={{ ...S.card, opacity: canDo ? 1 : 0.4, borderColor: canDo?"#2a1a1a":"#1e1e2e" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ color:"#e2e2e2", fontWeight:700, marginBottom:3 }}>{crime.name}</div>
                <div style={{ color:"#555", fontSize:11 }}>{crime.desc}</div>
              </div>
              <button onClick={() => commitCrime(crime)} disabled={!canDo}
                style={{ ...S.btnRed, width:"auto", padding:"8px 16px", opacity: canDo?1:0.4, cursor: canDo?"pointer":"not-allowed" }}>
                DO IT
              </button>
            </div>
            <div style={{ display:"flex", gap:16, fontSize:11 }}>
              <span style={{ color:"#ff8c4d" }}>⚡ {crime.nerve} nerve</span>
              <span style={{ color:"#4dff6e" }}>+${crime.baseReward.toLocaleString()}</span>
              <span style={{ color:"#6a4dff" }}>+{crime.xp} XP</span>
              <span style={{ color: chance>=60?"#4dff6e":chance>=40?"#ff8c00":"#ff4d4d" }}>{chance}% chance</span>
            </div>
          </div>
        );
      })}
      {log.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>CRIME LOG</div>
          <div style={S.logBox}>{log.map((l,i) => <div key={i} style={{ color: l.startsWith("✅")?"#4dff6e":"#ff6e6e" }}>{l}</div>)}</div>
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
  const [battleLog, setBattleLog] = useState([]);
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState(null);

  function findEnemy() {
    setEnemy(createEnemy(player.level));
    setBattleLog([]);
    setResult(null);
  }

  function fight() {
    if (!enemy || fighting) return;
    if (player.energy < 5) return setBattleLog(["❌ Need 5 energy to fight"]);
    setFighting(true);
    const log = [];
    let pHealth = player.health;
    let eHealth = enemy.health;
    let round = 0;

    function tick() {
      if (pHealth <= 0 || eHealth <= 0 || round >= 20) {
        const won = eHealth <= 0;
        setResult(won ? "WIN" : "LOSE");
        log.push(won ? `🏆 YOU WIN — +$${enemy.cash} | +${enemy.xp}XP | +2 REP` : `💀 DEFEATED — -2 REP`);
        setBattleLog([...log]);
        onCombat({ won, cash: won?enemy.cash:0, xp: won?enemy.xp:0, rep: won?2:-2, healthLost: player.health - pHealth, energyCost: 5 });
        setFighting(false);
        return;
      }
      round++;
      // Player attacks
      const pHit = Math.random() * 100 <= calcHitChance(player.dexterity, enemy.dexterity);
      if (pHit) {
        const isCrit = Math.random() * 100 <= calcCritChance(player.dexterity);
        let dmg = calcDamage(calcAttack(player), calcDefense(enemy));
        if (isCrit) { dmg *= 2; log.push(`⚡ CRIT! You deal ${Math.floor(dmg)} dmg`); }
        else log.push(`👊 R${round}: You hit for ${Math.floor(dmg)} dmg`);
        eHealth -= dmg;
      } else log.push(`💨 R${round}: You missed`);
      if (eHealth <= 0) { tick(); return; }
      // Enemy attacks
      const eHit = Math.random() * 100 <= calcHitChance(enemy.dexterity, player.dexterity);
      if (eHit) {
        const eAtk = enemy.strength + (ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0) + enemy.level*2;
        const eDef = enemy.defense + (ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0) + enemy.level*2;
        const dmg = calcDamage(eAtk, calcDefense(player));
        log.push(`🔴 ${enemy.name} hits you for ${Math.floor(dmg)} dmg`);
        pHealth -= dmg;
      } else log.push(`💨 ${enemy.name} missed`);
      setBattleLog([...log]);
      setTimeout(tick, 400);
    }
    tick();
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>STREET COMBAT</div>
        <div style={{ color:"#555", fontSize:11 }}>Costs 5 energy · Max 5 attacks/target/day · 60s cooldown between fights</div>
      </div>
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardTitle}>YOU</div>
          <div style={S.row}><span style={S.label}>ATK</span><span style={{...S.val,color:"#ff4d4d"}}>{calcAttack(player)}</span></div>
          <div style={S.row}><span style={S.label}>DEF</span><span style={{...S.val,color:"#4d9fff"}}>{calcDefense(player)}</span></div>
          <div style={S.row}><span style={S.label}>HP</span><span style={{...S.val,color:"#4dff6e"}}>{player.health}</span></div>
          <div style={S.row}><span style={S.label}>DEX</span><span style={S.val}>{player.dexterity}</span></div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>ENEMY</div>
          {enemy ? (
            <>
              <div style={{ color:"#ff3a3a", fontWeight:700, marginBottom:8 }}>{enemy.name} (LVL {enemy.level})</div>
              <div style={S.row}><span style={S.label}>ATK</span><span style={{...S.val,color:"#ff4d4d"}}>{enemy.strength+(ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0)+enemy.level*2}</span></div>
              <div style={S.row}><span style={S.label}>DEF</span><span style={{...S.val,color:"#4d9fff"}}>{enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2}</span></div>
              <div style={S.row}><span style={S.label}>HP</span><span style={{...S.val,color:"#4dff6e"}}>{enemy.health}</span></div>
              <div style={S.row}><span style={S.label}>BOUNTY</span><span style={{...S.val,color:"#ff8c00"}}>${enemy.cash}</span></div>
            </>
          ) : <div style={{ color:"#333", fontSize:12 }}>No target found</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button style={S.btnGray} onClick={findEnemy}>FIND TARGET</button>
        {enemy && !result && <button style={S.btnRed} onClick={fight} disabled={fighting}>
          {fighting ? "FIGHTING..." : "ATTACK"}
        </button>}
        {result && <button style={S.btnGray} onClick={() => { setEnemy(null); setResult(null); setBattleLog([]); }}>NEW TARGET</button>}
      </div>
      {battleLog.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>BATTLE LOG {result && <span style={S.badge(result==="WIN"?"#4dff6e":"#ff4d4d")}>{result}</span>}</div>
          <div style={S.logBox}>
            {battleLog.map((l,i) => (
              <div key={i} style={{ color: l.includes("You hit")||l.includes("CRIT")||l.includes("WIN")?"#4dff6e":l.includes("missed")?"#555":"#ff6e6e" }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INVENTORY / SHOP PAGE
// ============================================================
function InventoryPage({ player, onBuy, onEquip }) {
  const [tab, setTab] = useState("inventory");
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["inventory","shop"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"8px 20px", background: tab===t?"#c0002a":"#1a1a24", border:"none", borderRadius:4, color: tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>
            {t}
          </button>
        ))}
      </div>
      {tab === "inventory" && (
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>YOUR GEAR</div>
            {player.inventory.length === 0 && <div style={{ color:"#333" }}>No items. Visit the shop.</div>}
            {player.inventory.map(id => {
              const item = ITEMS.find(i => i.id === id);
              if (!item) return null;
              const isEqW = player.equippedWeapon === id;
              const isEqA = player.equippedArmor === id;
              const isEq = isEqW || isEqA;
              return (
                <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #1a1a2a" }}>
                  <div>
                    <div style={{ color: isEq?"#4dff6e":"#e2e2e2", fontWeight: isEq?700:400 }}>{item.name} {isEq&&"✓"}</div>
                    <div style={{ fontSize:10, color:"#555" }}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                  </div>
                  {!isEq && (item.type==="weapon"||item.type==="armor") && (
                    <button style={S.btnGreen} onClick={() => onEquip(item)}>EQUIP</button>
                  )}
                  {isEq && <span style={S.badge("#4dff6e")}>EQUIPPED</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === "shop" && (
        <div>
          <div style={{ color:"#4dff6e", fontSize:13, marginBottom:12 }}>CASH: ${player.cash.toLocaleString()}</div>
          {["weapon","armor","tool"].map(type => (
            <div key={type} style={S.card}>
              <div style={S.cardTitle}>{type.toUpperCase()}S</div>
              {ITEMS.filter(i => i.type === type).map(item => {
                const owned = player.inventory.includes(item.id);
                return (
                  <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #1a1a2a" }}>
                    <div>
                      <div style={{ color:"#e2e2e2" }}>{item.name} <span style={S.badge(item.rarity==="rare"?"#ff8c00":"#555")}>{item.rarity}</span></div>
                      <div style={{ fontSize:10, color:"#555" }}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:"#4dff6e", fontSize:13, marginBottom:4 }}>${item.price.toLocaleString()}</div>
                      {owned ? <span style={S.badge("#4dff6e")}>OWNED</span> :
                        <button style={{ ...S.btnOrange, padding:"6px 12px" }} onClick={() => onBuy(item)}
                          disabled={player.cash < item.price}>BUY</button>}
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
function SyndicatesPage({ player, onCreateSyndicate, onJoinSyndicate }) {
  const [syndicates, setSyndicates] = useState(() => {
    return JSON.parse(localStorage.getItem("sd_syndicates") || "[]");
  });
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState("list");

  function create() {
    if (player.level < 10) return alert("Need Level 10");
    if (player.cash < 500000) return alert("Need $500,000");
    if (!newName.trim()) return alert("Enter a name");
    if (syndicates.find(s => s.name === newName.trim())) return alert("Name taken");
    const s = { name: newName.trim(), leader: player.username, members: [player.username], level: 1, xp: 0, treasury: 0 };
    const updated = [...syndicates, s];
    setSyndicates(updated);
    localStorage.setItem("sd_syndicates", JSON.stringify(updated));
    onCreateSyndicate(s);
    setNewName("");
  }

  function join(s) {
    if (player.syndicate) return alert("Already in a syndicate");
    const updated = syndicates.map(x => x.name===s.name ? {...x, members:[...x.members, player.username]} : x);
    setSyndicates(updated);
    localStorage.setItem("sd_syndicates", JSON.stringify(updated));
    onJoinSyndicate(s);
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["list","create"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"8px 20px", background: tab===t?"#c0002a":"#1a1a24", border:"none", borderRadius:4, color: tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>
            {t}
          </button>
        ))}
      </div>
      {tab==="list" && (
        <div>
          {player.syndicate && <div style={{ ...S.card, borderColor:"#2a5a2a" }}>
            <div style={S.cardTitle}>YOUR SYNDICATE</div>
            <div style={{ color:"#4dff6e", fontSize:18, fontWeight:900 }}>{player.syndicate}</div>
          </div>}
          {syndicates.length === 0 && <div style={{ ...S.card, color:"#555" }}>No syndicates yet. Be the first to create one.</div>}
          {syndicates.map(s => (
            <div key={s.name} style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#e2e2e2", fontWeight:700, fontSize:16 }}>{s.name}</div>
                  <div style={{ color:"#555", fontSize:11 }}>Leader: {s.leader} · {s.members.length} members · Level {s.level}</div>
                </div>
                {!player.syndicate && s.leader !== player.username && (
                  <button style={S.btnGreen} onClick={() => join(s)}>JOIN</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==="create" && (
        <div style={S.card}>
          <div style={S.cardTitle}>CREATE SYNDICATE</div>
          <div style={{ color:"#555", fontSize:11, marginBottom:16 }}>
            Requirements: Level 10 · $500,000<br/>
            Your level: {player.level} · Cash: ${player.cash.toLocaleString()}
          </div>
          <input style={S.input} placeholder="Syndicate Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button style={S.btnRed} onClick={create}
            disabled={player.level < 10 || player.cash < 500000}>
            FOUND SYNDICATE ($500,000)
          </button>
          {player.level < 10 && <div style={{ color:"#ff4d4d", fontSize:11, marginTop:8 }}>Need Level 10 (you are Level {player.level})</div>}
          {player.cash < 500000 && <div style={{ color:"#ff4d4d", fontSize:11, marginTop:4 }}>Need $500,000 (you have ${player.cash.toLocaleString()})</div>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LEADERBOARD PAGE
// ============================================================
function LeaderboardPage({ player }) {
  const accounts = JSON.parse(localStorage.getItem("sd_accounts") || "{}");
  const players = Object.values(accounts).map(a => a.player).sort((a,b) => b.level - a.level || b.reputation - a.reputation);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>TOP PLAYERS</div>
      <div style={{ display:"grid", gridTemplateColumns:"32px 1fr 60px 60px 80px", gap:8, color:"#555", fontSize:10, letterSpacing:1, marginBottom:8, padding:"0 4px" }}>
        <span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span>
      </div>
      {players.slice(0,50).map((p, i) => (
        <div key={p.username} style={{ display:"grid", gridTemplateColumns:"32px 1fr 60px 60px 80px", gap:8, padding:"8px 4px", borderBottom:"1px solid #1a1a2a", background: p.username===player.username?"#1a0a0a":"transparent" }}>
          <span style={{ color: i<3?"#ff8c00":"#555", fontWeight: i<3?900:400 }}>{i+1}</span>
          <span style={{ color: p.username===player.username?"#ff3a3a":"#e2e2e2", fontWeight: p.username===player.username?700:400 }}>
            {p.name} {p.username===player.username&&"(you)"}
          </span>
          <span style={{ color:"#6a4dff" }}>{p.level}</span>
          <span style={{ color:"#ff8c00" }}>{p.reputation}</span>
          <span style={{ color:"#4dff6e", fontSize:10 }}>${(p.cash/1000).toFixed(0)}k</span>
        </div>
      ))}
      {players.length === 0 && <div style={{ color:"#333" }}>No players yet.</div>}
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================
const NAV = [
  { id:"profile",    icon:"👤", label:"PROFILE" },
  { id:"crimes",     icon:"🔪", label:"CRIMES" },
  { id:"combat",     icon:"⚔️",  label:"COMBAT" },
  { id:"inventory",  icon:"🎒", label:"INVENTORY" },
  { id:"syndicates", icon:"🏴", label:"SYNDICATES" },
  { id:"leaderboard",icon:"🏆", label:"LEADERBOARD" },
];

function Game({ initialPlayer, onLogout }) {
  const [player, setPlayer] = useState(initialPlayer);
  const [page, setPage] = useState("profile");
  const [toast, setToast] = useState(null);

  const notify = (msg) => setToast(msg);

  // Regen tick every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayer(p => {
        let updated = {...p};
        const eRegen = calcEnergyRegen(p.lastEnergyRegen);
        const nRegen = calcNerveRegen(p.lastNerveRegen);
        const hRegen = calcHealthRegen(p.lastHealthRegen);
        if (eRegen > 0) { updated.energy = Math.min(MAX_ENERGY, p.energy + eRegen); updated.lastEnergyRegen = Date.now(); }
        if (nRegen > 0) { updated.nerve  = Math.min(MAX_NERVE,  p.nerve  + nRegen); updated.lastNerveRegen  = Date.now(); }
        if (hRegen > 0) { updated.health = Math.min(MAX_HEALTH, p.health + hRegen); updated.lastHealthRegen = Date.now(); }
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Save on change
  useEffect(() => {
    const accounts = JSON.parse(localStorage.getItem("sd_accounts") || "{}");
    if (accounts[player.username]) {
      accounts[player.username].player = player;
      localStorage.setItem("sd_accounts", JSON.stringify(accounts));
    }
  }, [player]);

  function levelUp(p) {
    let updated = {...p};
    while (updated.xp >= XP_FOR_LEVEL(updated.level + 1)) {
      updated.xp -= XP_FOR_LEVEL(updated.level + 1);
      updated.level += 1;
      updated.statPoints = (updated.statPoints || 0) + 3;
      notify(`🆙 LEVEL UP! You are now Level ${updated.level}! +3 stat points`);
    }
    return updated;
  }

  function handleCrime({ success, nerveCost, cash, xp, rep }) {
    setPlayer(p => {
      let u = { ...p, nerve: Math.max(0, p.nerve - nerveCost), cash: p.cash + cash, xp: p.xp + xp, reputation: Math.max(0, p.reputation + rep) };
      return levelUp(u);
    });
  }

  function handleCombat({ won, cash, xp, rep, healthLost, energyCost }) {
    setPlayer(p => {
      let u = { ...p, energy: Math.max(0, p.energy - energyCost), health: Math.max(1, p.health - healthLost), cash: p.cash + cash, xp: p.xp + xp, reputation: Math.max(0, p.reputation + rep), wins: p.wins + (won?1:0), losses: p.losses + (won?0:1) };
      return levelUp(u);
    });
  }

  function handleBuy(item) {
    if (player.cash < item.price) return notify("❌ Not enough cash");
    if (player.inventory.includes(item.id)) return notify("❌ Already owned");
    setPlayer(p => ({ ...p, cash: p.cash - item.price, inventory: [...p.inventory, item.id] }));
    notify(`✅ BOUGHT ${item.name}`);
  }

  function handleEquip(item) {
    setPlayer(p => ({
      ...p,
      equippedWeapon: item.type==="weapon" ? item.id : p.equippedWeapon,
      equippedArmor:  item.type==="armor"  ? item.id : p.equippedArmor,
    }));
    notify(`✅ EQUIPPED ${item.name}`);
  }

  function handleStatUp(stat) {
    if (!player.statPoints) return;
    setPlayer(p => ({ ...p, [stat]: p[stat] + 1, statPoints: p.statPoints - 1 }));
  }

  function handleCreateSyndicate(s) {
    setPlayer(p => ({ ...p, cash: p.cash - 500000, syndicate: s.name }));
    notify(`🏴 SYNDICATE FOUNDED: ${s.name}`);
  }

  function handleJoinSyndicate(s) {
    setPlayer(p => ({ ...p, syndicate: s.name }));
    notify(`✅ JOINED ${s.name}`);
  }

  return (
    <div style={S.app}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div style={S.layout}>
        <div style={S.sidebar}>
          <div style={{ padding:"16px 20px 24px", borderBottom:"1px solid #1a1a2a" }}>
            <div style={{ color:"#ff3a3a", fontSize:14, fontWeight:900, letterSpacing:3 }}>SHADOW</div>
            <div style={{ color:"#ff3a3a", fontSize:14, fontWeight:900, letterSpacing:3 }}>DOMINION</div>
            <div style={{ color:"#333", fontSize:9, letterSpacing:2, marginTop:2 }}>ALPHA v0.1</div>
          </div>
          <div style={{ padding:"12px 20px", borderBottom:"1px solid #1a1a2a" }}>
            <div style={{ color:"#e2e2e2", fontSize:12, fontWeight:700 }}>{player.name}</div>
            <div style={{ color:"#555", fontSize:10 }}>LVL {player.level} · REP {player.reputation}</div>
            <div style={{ color:"#4dff6e", fontSize:11, marginTop:4 }}>${player.cash.toLocaleString()}</div>
          </div>
          <div style={{ flex:1, paddingTop:8 }}>
            {NAV.map(n => (
              <div key={n.id} style={S.navItem(page===n.id)} onClick={() => setPage(n.id)}>
                <span>{n.icon}</span><span>{n.label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:"16px 20px", borderTop:"1px solid #1a1a2a" }}>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                <span>⚡ ENERGY</span><span>{player.energy}/{MAX_ENERGY}</span>
              </div>
              <div style={S.barWrap}><div style={S.bar((player.energy/MAX_ENERGY)*100,"#4d9fff")} /></div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                <span>🧠 NERVE</span><span>{player.nerve}/{MAX_NERVE}</span>
              </div>
              <div style={S.barWrap}><div style={S.bar((player.nerve/MAX_NERVE)*100,"#ff8c4d")} /></div>
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                <span>❤️ HEALTH</span><span>{player.health}/{MAX_HEALTH}</span>
              </div>
              <div style={S.barWrap}><div style={S.bar((player.health/MAX_HEALTH)*100,"#4dff6e")} /></div>
            </div>
            <button onClick={onLogout} style={{ ...S.btnGray, width:"100%", marginTop:12, fontSize:10 }}>LOGOUT</button>
          </div>
        </div>

        <div style={S.main}>
          <div style={{ color:"#555", fontSize:10, letterSpacing:2, marginBottom:16, borderBottom:"1px solid #1a1a2a", paddingBottom:10 }}>
            {NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}
          </div>
          {page==="profile"    && <ProfilePage    player={player} onStatUp={handleStatUp} />}
          {page==="crimes"     && <CrimesPage     player={player} onCrime={handleCrime} />}
          {page==="combat"     && <CombatPage     player={player} onCombat={handleCombat} />}
          {page==="inventory"  && <InventoryPage  player={player} onBuy={handleBuy} onEquip={handleEquip} />}
          {page==="syndicates" && <SyndicatesPage player={player} onCreateSyndicate={handleCreateSyndicate} onJoinSyndicate={handleJoinSyndicate} />}
          {page==="leaderboard"&& <LeaderboardPage player={player} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [player, setPlayer] = useState(null);

  return player
    ? <Game initialPlayer={player} onLogout={() => setPlayer(null)} />
    : <AuthPage onLogin={setPlayer} />;
}
