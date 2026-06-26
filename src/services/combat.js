import { MAX_LEVEL, XP_FOR_LEVEL, MAX_ENERGY, MAX_NERVE } from "../data/constants";
import { ITEMS } from "../data/items";

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
