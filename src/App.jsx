import { useState, useEffect, useRef, useCallback, memo } from "react";

// ============================================================
// SUPABASE CONFIG — paste your project URL and anon key here
// Get them from: Supabase Dashboard → Settings → API
// ============================================================
const SUPABASE_URL  = "https://mpinckzjyzymwwrbstkk.supabase.co";
const SUPABASE_ANON = "sb_publishable_Zt0Y6cpESGLpVSMNcM5tdA_Iu9EaMbs";

// Minimal Supabase client (no npm needed in artifact)
function createClient(url, key) {
  const headers = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": "return=representation" };

  async function rpc(fn, params = {}) {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(params) });
    return r.json();
  }

  async function from(table) {
    return {
      async select(cols = "*", { filter, order, limit } = {}) {
        let q = `${url}/rest/v1/${table}?select=${cols}`;
        if (filter)  q += `&${filter}`;
        if (order)   q += `&order=${order}`;
        if (limit)   q += `&limit=${limit}`;
        const r = await fetch(q, { headers });
        return { data: await r.json(), error: r.ok ? null : "error" };
      },
      async insert(row) {
        const r = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers, body: JSON.stringify(row) });
        return { data: await r.json(), error: r.ok ? null : await r.json() };
      },
      async update(patch, filter) {
        const r = await fetch(`${url}/rest/v1/${table}?${filter}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
        return { data: await r.json(), error: r.ok ? null : "error" };
      },
      async delete(filter) {
        const r = await fetch(`${url}/rest/v1/${table}?${filter}`, { method: "DELETE", headers });
        return { error: r.ok ? null : "error" };
      },
    };
  }

  // Supabase Auth
  const auth = {
    async signUp(email, password) {
      const r = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      return { data: d, error: d.error_description || d.msg || null };
    },
    async signIn(email, password) {
      const r = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (d.access_token) {
        sessionStorage.setItem("sb_token", d.access_token);
        sessionStorage.setItem("sb_uid",   d.user.id);
      }
      return { data: d, error: d.error_description || null };
    },
    async signOut() {
      const token = sessionStorage.getItem("sb_token");
      if (token) await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { ...headers, Authorization: `Bearer ${token}` } });
      sessionStorage.removeItem("sb_token");
      sessionStorage.removeItem("sb_uid");
    },
    getToken() { return sessionStorage.getItem("sb_token"); },
    getUserId() { return sessionStorage.getItem("sb_uid"); },
  };

  // Authenticated request helper
  function authedHeaders() {
    const token = auth.getToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  async function authedRpc(fn, params = {}) {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: authedHeaders(), body: JSON.stringify(params) });
    return r.json();
  }

  async function authedFrom(table) {
    const h = authedHeaders();
    const hWithPref = { ...h, Prefer: "return=representation" };
    return {
      async select(cols = "*", { filter, order, limit } = {}) {
        let q = `${url}/rest/v1/${table}?select=${cols}`;
        if (filter) q += `&${filter}`;
        if (order)  q += `&order=${order}`;
        if (limit)  q += `&limit=${limit}`;
        const r = await fetch(q, { headers: h });
        return { data: await r.json(), error: r.ok ? null : "error" };
      },
      async insert(row) {
        const r = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: hWithPref, body: JSON.stringify(row) });
        const d = await r.json();
        return { data: d, error: r.ok ? null : d };
      },
      async update(patch, filter) {
        const r = await fetch(`${url}/rest/v1/${table}?${filter}`, { method: "PATCH", headers: hWithPref, body: JSON.stringify(patch) });
        return { data: await r.json(), error: r.ok ? null : "error" };
      },
      async delete(filter) {
        const r = await fetch(`${url}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: h });
        return { error: r.ok ? null : "error" };
      },
    };
  }

  // Realtime via Supabase Realtime WebSocket
  function realtime(channel, table, filter, cb) {
    const token = auth.getToken();
    const wsUrl = url.replace("https://", "wss://").replace("http://", "ws://") + "/realtime/v1/websocket?vsn=1.0.0&apikey=" + key;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ topic: `realtime:${channel}`, event: "phx_join", payload: { config: { broadcast: { self: false }, presence: {}, postgres_changes: [{ event: "*", schema: "public", table, filter }] } }, ref: "1" }));
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === "postgres_changes") cb(msg.payload);
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }

  return { auth, rpc, from, authedRpc, authedFrom, realtime };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// DEMO MODE — works without Supabase config
// All data stays in memory; a banner explains how to connect.
// ============================================================
const DEMO_MODE = SUPABASE_URL.includes("YOUR_PROJECT");

const memStore = {
  accounts: {},
  syndicates: [],
  notifications: {},
  mail: {},
  market: [],
};

// ============================================================
// GAME CONSTANTS
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
  { id:"knife",    name:"Switchblade",    type:"weapon", weaponDmg:8,  armorRating:0,  price:500,   rarity:"common",    crimeBonus:0 },
  { id:"pipe",     name:"Lead Pipe",      type:"weapon", weaponDmg:14, armorRating:0,  price:1200,  rarity:"common",    crimeBonus:0 },
  { id:"pistol",   name:"9mm Pistol",     type:"weapon", weaponDmg:25, armorRating:0,  price:4000,  rarity:"rare",      crimeBonus:0 },
  { id:"shotgun",  name:"Sawn-Off",       type:"weapon", weaponDmg:38, armorRating:0,  price:8000,  rarity:"rare",      crimeBonus:0 },
  { id:"vest",     name:"Stab Vest",      type:"armor",  weaponDmg:0,  armorRating:10, price:800,   rarity:"common",    crimeBonus:0 },
  { id:"jacket",   name:"Kevlar Jacket",  type:"armor",  weaponDmg:0,  armorRating:22, price:5000,  rarity:"rare",      crimeBonus:0 },
  { id:"lockpick", name:"Lockpick Set",   type:"tool",   weaponDmg:0,  armorRating:0,  price:600,   rarity:"common",    crimeBonus:10 },
  { id:"scanner",  name:"Police Scanner", type:"tool",   weaponDmg:0,  armorRating:0,  price:1500,  rarity:"rare",      crimeBonus:18 },
];

const ITEM_MAP = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const XP_FOR_LEVEL = (lvl) => Math.floor(100 * Math.pow(lvl, 1.5));
const MAX_ENERGY = 100, MAX_NERVE = 50, MAX_HEALTH = 100;

function calcAttack(p)  { const w = ITEM_MAP[p.equipped_weapon]; return p.strength + (w?.weaponDmg || 0) + p.level * 2; }
function calcDefense(p) { const a = ITEM_MAP[p.equipped_armor];  return p.defense  + (a?.armorRating || 0) + p.level * 2; }
function calcHitChance(attDex, defDex) { return Math.min(95, Math.max(20, 75 + attDex / 10 - defDex / 10)); }
function calcDamage(atk, def)   { return Math.max(1, Math.floor(atk * atk / (atk + def))); }
function calcCritChance(dex)    { return 5 + dex / 50; }
function calcEnergyRegen(ts)    { return Math.floor((Date.now() - new Date(ts).getTime()) / 300000); }
function calcNerveRegen(ts)     { return Math.floor((Date.now() - new Date(ts).getTime()) / 600000); }
function calcHealthRegen(ts)    { return Math.floor((Date.now() - new Date(ts).getTime()) / 180000); }

function createPlayer(name, username, userId) {
  const now = new Date().toISOString();
  return {
    id: userId || crypto.randomUUID(),
    user_id: userId,
    username, name,
    level:1, xp:0, cash:1000, reputation:0,
    strength:10, defense:10, dexterity:10,
    energy:MAX_ENERGY, nerve:MAX_NERVE, health:MAX_HEALTH,
    last_energy_regen: now, last_nerve_regen: now, last_health_regen: now,
    inventory:[], equipped_weapon:null, equipped_armor:null,
    syndicate_id:null, syndicate_name:null,
    stat_points:0, wins:0, losses:0,
    in_jail_until: null, in_hospital_until: null,
  };
}

function createNPC(playerLevel) {
  const lvl = Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
  const names = ["Street Rat","Corner Boy","Blood Hawk","Iron Mask","The Warden","Ghost Nine","Viper","Cold Cut","Knuckles","The Judge"];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    level: lvl, strength: 8 + lvl * 2, defense: 6 + lvl * 2, dexterity: 5 + lvl,
    health: MAX_HEALTH, maxHealth: MAX_HEALTH,
    equipped_weapon: lvl >= 5 ? "pistol" : lvl >= 3 ? "pipe" : "knife",
    equipped_armor:  lvl >= 4 ? "vest" : null,
    cash: Math.floor(Math.random() * lvl * 300 + 100), xp: lvl * 15,
  };
}

// ============================================================
// DB LAYER — routes to Supabase or memStore depending on mode
// ============================================================
const DB = {
  async register(email, password, username, displayName) {
    if (DEMO_MODE) {
      if (memStore.accounts[username]) return { error: "Username taken" };
      const p = createPlayer(displayName, username, crypto.randomUUID());
      memStore.accounts[username] = { password, player: p };
      memStore.notifications[p.id] = [];
      memStore.mail[p.id] = [];
      return { data: p, error: null };
    }
    const { data: authData, error: authErr } = await supabase.auth.signUp(email, password);
    if (authErr) return { error: authErr };
    const player = createPlayer(displayName, username, authData.user?.id);
    const tbl = await supabase.authedFrom("players");
    const { data, error } = await tbl.insert(player);
    return { data: Array.isArray(data) ? data[0] : data, error };
  },

  async login(emailOrUser, password) {
    if (DEMO_MODE) {
      const acc = Object.values(memStore.accounts).find(a => a.player.username === emailOrUser || a.player.username === emailOrUser.split("@")[0]);
      if (!acc) return { error: "Account not found" };
      if (acc.password !== password) return { error: "Wrong password" };
      return { data: { ...acc.player }, error: null };
    }
    const { data, error } = await supabase.auth.signIn(emailOrUser, password);
    if (error) return { error };
    const uid = data.user?.id || supabase.auth.getUserId();
    const tbl = await supabase.authedFrom("players");
    const { data: rows } = await tbl.select("*,syndicates(name)", { filter: `user_id=eq.${uid}`, limit: 1 });
    const player = rows?.[0];
    if (player?.syndicates) { player.syndicate_name = player.syndicates.name; delete player.syndicates; }
    return { data: player, error: null };
  },

  async logout() {
    if (!DEMO_MODE) await supabase.auth.signOut();
  },

  async savePlayer(player) {
    if (DEMO_MODE) {
      if (memStore.accounts[player.username]) memStore.accounts[player.username].player = { ...player };
      return;
    }
    const tbl = await supabase.authedFrom("players");
    await tbl.update({
      level: player.level, xp: player.xp, cash: player.cash, reputation: player.reputation,
      strength: player.strength, defense: player.defense, dexterity: player.dexterity,
      energy: player.energy, nerve: player.nerve, health: player.health,
      last_energy_regen: player.last_energy_regen,
      last_nerve_regen:  player.last_nerve_regen,
      last_health_regen: player.last_health_regen,
      inventory: player.inventory, equipped_weapon: player.equipped_weapon,
      equipped_armor: player.equipped_armor, syndicate_id: player.syndicate_id,
      stat_points: player.stat_points, wins: player.wins, losses: player.losses,
      in_jail_until: player.in_jail_until, in_hospital_until: player.in_hospital_until,
      last_seen: new Date().toISOString(),
    }, `id=eq.${player.id}`);
  },

  async doCrime(playerId, crimeId, nerveCost, success, cash, xp, repDelta) {
    if (DEMO_MODE) return { ok: true };
    return supabase.authedRpc("do_crime", { p_player_id: playerId, p_crime_id: crimeId, p_nerve_cost: nerveCost, p_success: success, p_cash: cash, p_xp: xp, p_rep_delta: repDelta });
  },

  async attackPlayer(attackerId, defenderId, attackerWon, cashStolen, hlAtt, hlDef, xpGained, rounds) {
    if (DEMO_MODE) return { ok: true };
    return supabase.authedRpc("attack_player", { p_attacker_id: attackerId, p_defender_id: defenderId, p_attacker_won: attackerWon, p_cash_stolen: cashStolen, p_health_lost_attacker: hlAtt, p_health_lost_defender: hlDef, p_xp_gained: xpGained, p_rounds: rounds });
  },

  async getLeaderboard() {
    if (DEMO_MODE) {
      return Object.values(memStore.accounts).map(a => a.player).sort((a, b) => b.level - a.level || b.reputation - a.reputation).slice(0, 50);
    }
    const tbl = await supabase.authedFrom("players");
    const { data } = await tbl.select("name,username,level,reputation,cash,wins,losses,syndicate_id", { order: "level.desc,reputation.desc", limit: 50 });
    return data || [];
  },

  async getSyndicates() {
    if (DEMO_MODE) return memStore.syndicates;
    const tbl = await supabase.authedFrom("syndicates");
    const { data } = await tbl.select("*,syndicate_members(count)", {});
    return data || [];
  },

  async createSyndicate(name, leaderId, playerUsername) {
    if (DEMO_MODE) {
      const s = { id: crypto.randomUUID(), name, leader_id: leaderId, leader_username: playerUsername, members: [leaderId], level: 1, xp: 0, treasury: 0 };
      memStore.syndicates.push(s);
      return { data: s, error: null };
    }
    const tbl = await supabase.authedFrom("syndicates");
    const { data, error } = await tbl.insert({ name, leader_id: leaderId });
    if (!error && data?.[0]) {
      const mt = await supabase.authedFrom("syndicate_members");
      await mt.insert({ syndicate_id: data[0].id, player_id: leaderId, rank: "leader" });
    }
    return { data: data?.[0], error };
  },

  async joinSyndicate(syndicateId, playerId) {
    if (DEMO_MODE) {
      const s = memStore.syndicates.find(x => x.id === syndicateId);
      if (s && !s.members.includes(playerId)) s.members.push(playerId);
      return { error: null };
    }
    const tbl = await supabase.authedFrom("syndicate_members");
    return tbl.insert({ syndicate_id: syndicateId, player_id: playerId, rank: "member" });
  },

  async getNotifications(playerId) {
    if (DEMO_MODE) return memStore.notifications[playerId] || [];
    const tbl = await supabase.authedFrom("notifications");
    const { data } = await tbl.select("*", { filter: `player_id=eq.${playerId}&read=eq.false`, order: "created_at.desc", limit: 20 });
    return data || [];
  },

  async markNotificationsRead(playerId) {
    if (DEMO_MODE) { if (memStore.notifications[playerId]) memStore.notifications[playerId].forEach(n => n.read = true); return; }
    const tbl = await supabase.authedFrom("notifications");
    await tbl.update({ read: true }, `player_id=eq.${playerId}&read=eq.false`);
  },

  async getMail(playerId) {
    if (DEMO_MODE) return (memStore.mail[playerId] || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const tbl = await supabase.authedFrom("mail");
    const { data } = await tbl.select("*", { filter: `to_id=eq.${playerId}`, order: "created_at.desc", limit: 50 });
    return data || [];
  },

  async sendMail(fromId, toUsername, subject, body) {
    if (DEMO_MODE) {
      const target = Object.values(memStore.accounts).find(a => a.player.username === toUsername);
      if (!target) return { error: "Player not found" };
      const msg = { id: crypto.randomUUID(), from_id: fromId, to_id: target.player.id, subject, body, read: false, created_at: new Date().toISOString() };
      if (!memStore.mail[target.player.id]) memStore.mail[target.player.id] = [];
      memStore.mail[target.player.id].unshift(msg);
      return { error: null };
    }
    const ptbl = await supabase.authedFrom("players");
    const { data: rows } = await ptbl.select("id", { filter: `username=eq.${toUsername}`, limit: 1 });
    if (!rows?.[0]) return { error: "Player not found" };
    const tbl = await supabase.authedFrom("mail");
    return tbl.insert({ from_id: fromId, to_id: rows[0].id, subject, body });
  },

  async getMarket() {
    if (DEMO_MODE) return memStore.market.filter(m => !m.sold);
    const tbl = await supabase.authedFrom("market");
    const { data } = await tbl.select("*", { filter: "sold=eq.false", order: "listed_at.desc" });
    return data || [];
  },

  async listMarket(sellerId, itemId, price) {
    if (DEMO_MODE) {
      memStore.market.push({ id: crypto.randomUUID(), seller_id: sellerId, item_id: itemId, price, listed_at: new Date().toISOString(), sold: false });
      return { error: null };
    }
    const tbl = await supabase.authedFrom("market");
    return tbl.insert({ seller_id: sellerId, item_id: itemId, price });
  },

  async useHospital(playerId) {
    if (DEMO_MODE) return { ok: true, cost: 0 };
    return supabase.authedRpc("use_hospital", { p_player_id: playerId });
  },

  async bailOut(playerId) {
    if (DEMO_MODE) return { ok: true, cost: 0 };
    return supabase.authedRpc("bail_out", { p_player_id: playerId });
  },

  async getOnlinePlayers() {
    if (DEMO_MODE) return Object.values(memStore.accounts).map(a => ({ username: a.player.username, level: a.player.level }));
    const tbl = await supabase.authedFrom("players");
    const fiveMin = new Date(Date.now() - 5 * 60000).toISOString();
    const { data } = await tbl.select("username,level,reputation", { filter: `last_seen=gte.${fiveMin}`, limit: 20 });
    return data || [];
  },

  subscribeNotifications(playerId, cb) {
    if (DEMO_MODE) return () => {};
    return supabase.realtime(`notifs:${playerId}`, "notifications", `player_id=eq.${playerId}`, (payload) => {
      if (payload.new) cb(payload.new);
    });
  },
};

// ============================================================
// STYLES
// ============================================================
const C = { red:"#e63946", red2:"#c0002a", green:"#4dff6e", green2:"#1a3a1a", blue:"#4d9fff", orange:"#ff8c00", purple:"#7b5ea7", bg:"#08080f", bg2:"#0e0e18", bg3:"#14141f", border:"#1e1e2e", border2:"#2a2a3a", text:"#e2e2e2", muted:"#555" };

const S = {
  app:       { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Courier New',monospace", fontSize:14 },
  authWrap:  { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20, background:`radial-gradient(ellipse at 50% 0%, #1a0a1a 0%, ${C.bg} 70%)` },
  authBox:   { background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:10, padding:36, width:"100%", maxWidth:400, boxShadow:"0 0 60px #e6394620" },
  input:     { width:"100%", background:C.bg, border:`1px solid ${C.border2}`, borderRadius:4, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:12, transition:"border-color 0.2s" },
  btnRed:    { background:`linear-gradient(135deg, ${C.red2}, ${C.red})`, border:"none", borderRadius:4, padding:"10px 20px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", letterSpacing:2, transition:"opacity 0.2s" },
  btnGray:   { background:C.bg3, border:`1px solid ${C.border}`, borderRadius:4, padding:"8px 16px", color:"#aaa", fontSize:12, cursor:"pointer" },
  btnGreen:  { background:C.green2, border:`1px solid #2a5a2a`, borderRadius:4, padding:"8px 16px", color:C.green, fontSize:12, cursor:"pointer", fontWeight:700 },
  btnOrange: { background:"#3a1a00", border:`1px solid #7a3a00`, borderRadius:4, padding:"8px 16px", color:C.orange, fontSize:12, cursor:"pointer", fontWeight:700 },
  btnPurple: { background:"#1e1030", border:`1px solid ${C.purple}44`, borderRadius:4, padding:"8px 16px", color:C.purple, fontSize:12, cursor:"pointer", fontWeight:700 },
  layout:    { display:"flex", minHeight:"100vh" },
  sidebar:   { width:210, background:C.bg2, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" },
  main:      { flex:1, padding:24, overflowY:"auto", background:C.bg },
  navItem:   (a) => ({ padding:"11px 20px", cursor:"pointer", fontSize:11, letterSpacing:1.5, color:a?C.red:"#666", background:a?"#1a0808":"transparent", borderLeft:`2px solid ${a?C.red:"transparent"}`, display:"flex", alignItems:"center", gap:10, transition:"all 0.15s" }),
  card:      { background:C.bg2, border:`1px solid ${C.border}`, borderRadius:6, padding:16, marginBottom:12 },
  cardTitle: { color:C.red, fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:12, display:"flex", alignItems:"center", gap:8 },
  barWrap:   { background:C.bg, borderRadius:3, height:6, overflow:"hidden", flex:1 },
  bar:       (pct, color) => ({ height:"100%", width:`${Math.min(100,Math.max(0,pct))}%`, background:color, transition:"width 0.4s" }),
  badge:     (color) => ({ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:10, background:color+"22", color, border:`1px solid ${color}44`, letterSpacing:1 }),
  row:       { display:"flex", gap:8, alignItems:"center", marginBottom:8 },
  label:     { color:C.muted, fontSize:11, minWidth:80 },
  val:       { color:C.text, fontSize:13, fontWeight:700 },
  grid:      { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  logBox:    { background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, padding:10, maxHeight:180, overflowY:"auto", fontSize:11, lineHeight:2 },
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
function StatBar({ label, val, max, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:10, color:C.muted, letterSpacing:1 }}>{label}</span>
        <span style={{ fontSize:10, color }}>{val}/{max}</span>
      </div>
      <div style={S.barWrap}><div style={S.bar((val/max)*100, color)} /></div>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const good = msg.startsWith("+") || /SUCCESS|WIN|EQUIPPED|BOUGHT|LEVEL|FOUNDED|JOINED|SENT|HEALED|BAILED/.test(msg);
  return (
    <div style={{ position:"fixed", top:20, right:20, background:good?"#0d2a0d":"#2a0d0d", border:`1px solid ${good?"#2a5a2a":"#5a2a2a"}`, borderRadius:6, padding:"12px 18px", color:good?C.green:"#ff6e6e", fontSize:12, zIndex:9999, letterSpacing:1, maxWidth:340, boxShadow:"0 4px 20px #00000080", animation:"slidein 0.2s ease" }}>
      {msg}
    </div>
  );
}

function Badge({ color, children }) { return <span style={S.badge(color)}>{children}</span>; }

function StatusBars({ player, compact }) {
  const inJail = player.in_jail_until && new Date(player.in_jail_until) > new Date();
  const inHosp = player.in_hospital_until && new Date(player.in_hospital_until) > new Date();
  return (
    <div>
      {inJail && <div style={{ background:"#2a1a00", border:"1px solid #7a4a00", borderRadius:4, padding:"6px 10px", fontSize:11, color:C.orange, marginBottom:8 }}>⚖️ IN JAIL — {Math.ceil((new Date(player.in_jail_until) - Date.now()) / 60000)}min remaining</div>}
      {inHosp && <div style={{ background:"#0d1a2a", border:"1px solid #1a4a7a", borderRadius:4, padding:"6px 10px", fontSize:11, color:C.blue, marginBottom:8 }}>🏥 IN HOSPITAL — {Math.ceil((new Date(player.in_hospital_until) - Date.now()) / 60000)}min remaining</div>}
      {!compact && <>
        <StatBar label="ENERGY" val={player.energy}  max={MAX_ENERGY} color={C.blue} />
        <StatBar label="NERVE"  val={player.nerve}   max={MAX_NERVE}  color={C.orange} />
        <StatBar label="HEALTH" val={player.health}  max={MAX_HEALTH} color={C.green} />
      </>}
    </div>
  );
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ onLogin }) {
  const [tab,  setTab]  = useState("login");
  const [form, setForm] = useState({ email:"", username:"", password:"", name:"" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  async function handle() {
    setErr(""); setBusy(true);
    try {
      if (tab === "login") {
        const { data, error } = await DB.login(form.email || form.username, form.password);
        if (error) setErr(String(error));
        else onLogin(data);
      } else {
        if (!form.username || !form.password || !form.name) { setErr("All fields required."); return; }
        const email = form.email || `${form.username}@shadowdominion.local`;
        const { data, error } = await DB.register(email, form.password, form.username, form.name);
        if (error) setErr(String(error));
        else onLogin(data);
      }
    } catch (e) {
      setErr("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.authWrap}>
      <style>{`@keyframes slidein{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <div style={{ fontSize:36, fontWeight:900, letterSpacing:8, color:C.red, textShadow:`0 0 40px ${C.red}60` }}>SHADOW</div>
        <div style={{ fontSize:36, fontWeight:900, letterSpacing:8, color:C.red, textShadow:`0 0 40px ${C.red}60` }}>DOMINION</div>
        <div style={{ color:"#444", fontSize:10, letterSpacing:4, marginTop:4 }}>UNDERGROUND EMPIRE v2.0</div>
      </div>
      <div style={S.authBox}>
        {DEMO_MODE && (
          <div style={{ background:"#1a1a00", border:"1px solid #4a4a00", borderRadius:4, padding:"10px 12px", fontSize:10, color:"#aaaa44", marginBottom:16, lineHeight:1.8 }}>
            ⚠️ DEMO MODE — data lives in memory only.<br/>
            To connect Supabase: replace SUPABASE_URL and SUPABASE_ANON at the top of this file.
          </div>
        )}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex:1, padding:"9px", background:tab===t?C.red2:C.bg3, border:`1px solid ${tab===t?C.red:C.border}`, borderRadius:4, color:tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2, textTransform:"uppercase" }}>
              {t}
            </button>
          ))}
        </div>
        {tab === "register" && <>
          <input style={S.input} placeholder="Display Name" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} />
          <input style={S.input} placeholder="Username" value={form.username} onChange={e => setForm(f => ({...f, username:e.target.value}))} />
          {!DEMO_MODE && <input style={S.input} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} />}
        </>}
        {tab === "login" && <input style={S.input} placeholder={DEMO_MODE?"Username":"Email or Username"} value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} />}
        <input style={S.input} type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))}
          onKeyDown={e => e.key === "Enter" && handle()} />
        {err && <div style={{ color:"#ff4444", fontSize:11, marginBottom:10 }}>{err}</div>}
        <button style={{ ...S.btnRed, width:"100%", padding:"12px", fontSize:13 }} onClick={handle} disabled={busy}>
          {busy ? "..." : tab === "login" ? "ENTER THE DOMINION" : "JOIN THE UNDERWORLD"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PAGE
// ============================================================
const ProfilePage = memo(function ProfilePage({ player, onStatUp, onHospital, onBailOut }) {
  const xpNeeded = XP_FOR_LEVEL(player.level + 1);
  const wpn = ITEM_MAP[player.equipped_weapon];
  const arm = ITEM_MAP[player.equipped_armor];
  return (
    <div>
      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ color:"#fff", fontSize:22, fontWeight:900, letterSpacing:2 }}>{player.name}</div>
            <div style={{ color:C.muted, fontSize:11 }}>@{player.username}</div>
            {player.syndicate_name && <div style={{ color:C.purple, fontSize:11, marginTop:4 }}>🏴 {player.syndicate_name}</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:C.red, fontSize:26, fontWeight:900 }}>LVL {player.level}</div>
            <Badge color={C.orange}>REP {player.reputation}</Badge>
          </div>
        </div>
        <StatBar label="XP"     val={player.xp}    max={xpNeeded}   color={C.purple} />
        <StatBar label="ENERGY" val={player.energy} max={MAX_ENERGY} color={C.blue} />
        <StatBar label="NERVE"  val={player.nerve}  max={MAX_NERVE}  color={C.orange} />
        <StatBar label="HEALTH" val={player.health} max={MAX_HEALTH} color={C.green} />
        <div style={{ marginTop:12, display:"flex", gap:20, borderTop:`1px solid ${C.border}`, paddingTop:12, flexWrap:"wrap" }}>
          <div><div style={{ color:C.green,  fontWeight:900, fontSize:18 }}>${player.cash.toLocaleString()}</div><div style={{ color:C.muted, fontSize:10 }}>CASH</div></div>
          <div><div style={{ color:C.blue,   fontWeight:900, fontSize:18 }}>{player.wins}</div><div style={{ color:C.muted, fontSize:10 }}>WINS</div></div>
          <div><div style={{ color:"#ff4d4d",fontWeight:900, fontSize:18 }}>{player.losses}</div><div style={{ color:C.muted, fontSize:10 }}>LOSSES</div></div>
        </div>
      </div>
      <StatusBars player={player} />
      {player.in_hospital_until && new Date(player.in_hospital_until) > new Date() && (
        <div style={{ ...S.card, borderColor:"#1a4a7a" }}>
          <div style={S.cardTitle}>🏥 HOSPITAL</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:C.muted, fontSize:12 }}>Early discharge: ${(100 - player.health) * 50}/HP</div>
            <button style={S.btnGreen} onClick={onHospital}>HEAL NOW — ${(100-player.health)*50}</button>
          </div>
        </div>
      )}
      {player.in_jail_until && new Date(player.in_jail_until) > new Date() && (
        <div style={{ ...S.card, borderColor:"#7a4a00" }}>
          <div style={S.cardTitle}>⚖️ JAIL</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:C.muted, fontSize:12 }}>Post bail or wait it out</div>
            <button style={S.btnOrange} onClick={onBailOut}>BAIL OUT — $5,000</button>
          </div>
        </div>
      )}
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardTitle}>COMBAT STATS</div>
          {[["STRENGTH","strength",C.red],["DEFENSE","defense",C.blue],["DEXTERITY","dexterity",C.green]].map(([label, key, color]) => (
            <div key={key} style={{ ...S.row, justifyContent:"space-between" }}>
              <span style={S.label}>{label}</span>
              <span style={{ ...S.val, color }}>{player[key]}</span>
              {player.stat_points > 0 && <button onClick={() => onStatUp(key)} style={{ ...S.btnGreen, padding:"2px 8px", fontSize:10 }}>+</button>}
            </div>
          ))}
          {player.stat_points > 0 && <div style={{ color:C.green, fontSize:11, marginTop:6 }}>● {player.stat_points} points available</div>}
          <div style={{ borderTop:`1px solid ${C.border}`, marginTop:10, paddingTop:10 }}>
            <div style={S.row}><span style={S.label}>ATK</span><span style={{ ...S.val, color:"#ff4d4d" }}>{calcAttack(player)}</span></div>
            <div style={S.row}><span style={S.label}>DEF</span><span style={{ ...S.val, color:C.blue }}>{calcDefense(player)}</span></div>
            <div style={S.row}><span style={S.label}>HIT %</span><span style={S.val}>{calcHitChance(player.dexterity, 10).toFixed(0)}%</span></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>LOADOUT</div>
          <div style={S.row}><span style={S.label}>WEAPON</span><span style={{ color:wpn?"#ff8c4d":"#333", fontSize:12 }}>{wpn?.name || "Bare Hands"}</span></div>
          <div style={S.row}><span style={S.label}>ARMOR</span><span style={{ color:arm?C.blue:"#333", fontSize:12 }}>{arm?.name || "None"}</span></div>
          {wpn && <div style={{ color:C.muted, fontSize:10, marginTop:8 }}>+{wpn.weaponDmg} ATK</div>}
          {arm && <div style={{ color:C.muted, fontSize:10 }}>+{arm.armorRating} DEF</div>}
        </div>
      </div>
    </div>
  );
});

// ============================================================
// CRIMES PAGE
// ============================================================
const CrimesPage = memo(function CrimesPage({ player, onCrime }) {
  const [log, setLog] = useState([]);
  const tool = ITEMS.find(i => i.type === "tool" && player.inventory.includes(i.id));
  const inJail = player.in_jail_until && new Date(player.in_jail_until) > new Date();

  async function commitCrime(crime) {
    if (inJail) { setLog(l => ["⚖️ Can't commit crimes while in jail!", ...l]); return; }
    if (player.nerve < crime.nerve) { setLog(l => [`❌ Need ${crime.nerve} nerve`, ...l]); return; }
    const skillBonus = Math.floor(player.level * 1.5);
    const equipBonus = tool?.crimeBonus || 0;
    const chance = Math.min(95, Math.max(5, crime.baseChance + skillBonus + equipBonus - crime.difficulty));
    const success = Math.random() * 100 <= chance;
    const mult    = 0.8 + Math.random() * 0.4;
    const cash    = success ? Math.floor(crime.baseReward * mult) : 0;
    const xp      = success ? crime.xp : Math.floor(crime.xp * 0.1);
    const rep     = success ? 1 : -1;
    const res = await DB.doCrime(player.id, crime.id, crime.nerve, success, cash, xp, rep);
    if (res?.error) { setLog(l => [`❌ ${res.error}`, ...l]); return; }
    onCrime({ success, nerveCost: crime.nerve, cash, xp, rep, jailed: res?.jailed });
    if (res?.jailed) setLog(l => [`⚖️ BUSTED & JAILED — ${crime.name}`, ...l.slice(0, 19)]);
    else if (success) setLog(l => [`✅ SUCCESS — ${crime.name} | +$${cash.toLocaleString()} | +${crime.xp}XP`, ...l.slice(0, 19)]);
    else setLog(l => [`❌ BUSTED — ${crime.name} | -1 REP`, ...l.slice(0, 19)]);
  }

  return (
    <div>
      {inJail && <div style={{ ...S.card, borderColor:"#7a4a00" }}><div style={{ color:C.orange }}>⚖️ You're in jail. Wait for release or bail out from your profile.</div></div>}
      <div style={S.card}>
        <div style={S.cardTitle}>CRIMINAL ACTIVITY</div>
        <div style={{ color:C.muted, fontSize:11 }}>NERVE: {player.nerve}/{MAX_NERVE} · Regens 1 per 10min{tool ? ` · ${tool.name} equipped (+${tool.crimeBonus}%)` : ""}</div>
      </div>
      {CRIMES.map(crime => {
        const skillBonus = Math.floor(player.level * 1.5);
        const chance = Math.min(95, Math.max(5, crime.baseChance + skillBonus + (tool?.crimeBonus||0) - crime.difficulty));
        const canDo  = player.nerve >= crime.nerve && !inJail;
        return (
          <div key={crime.id} style={{ ...S.card, opacity:canDo?1:0.45, borderColor:canDo?"#2a1a1a":C.border }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ color:C.text, fontWeight:700, marginBottom:3 }}>{crime.name}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{crime.desc}</div>
              </div>
              <button onClick={() => commitCrime(crime)} disabled={!canDo}
                style={{ ...S.btnRed, padding:"8px 16px", opacity:canDo?1:0.4, cursor:canDo?"pointer":"not-allowed" }}>DO IT</button>
            </div>
            <div style={{ display:"flex", gap:16, fontSize:11 }}>
              <span style={{ color:C.orange }}>⚡ {crime.nerve} nerve</span>
              <span style={{ color:C.green }}>+${crime.baseReward.toLocaleString()}</span>
              <span style={{ color:C.purple }}>+{crime.xp} XP</span>
              <span style={{ color:chance>=60?C.green:chance>=40?C.orange:"#ff4d4d" }}>{chance}% chance</span>
            </div>
          </div>
        );
      })}
      {log.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>CRIME LOG</div>
          <div style={S.logBox}>{log.map((l, i) => <div key={i} style={{ color:l.startsWith("✅")?C.green:l.startsWith("⚖️")?C.orange:"#ff6e6e" }}>{l}</div>)}</div>
        </div>
      )}
    </div>
  );
});

// ============================================================
// COMBAT PAGE — NPC + PvP
// ============================================================
const CombatPage = memo(function CombatPage({ player, onCombat, notify }) {
  const [mode, setMode]       = useState("npc"); // "npc" | "pvp"
  const [enemy, setEnemy]     = useState(null);
  const [pvpTarget, setPvpTarget] = useState(null);
  const [pvpSearch, setPvpSearch] = useState("");
  const [liveEHP, setLiveEHP] = useState(null);
  const [livePHP, setLivePHP] = useState(player.health);
  const [log,  setLog]        = useState([]);
  const [fighting, setFighting] = useState(false);
  const [result, setResult]   = useState(null);
  const fightRef = useRef(null);

  useEffect(() => { if (!fighting) setLivePHP(player.health); }, [player.health, fighting]);
  useEffect(() => () => { if (fightRef.current) clearTimeout(fightRef.current); }, []);

  const tooHurt = player.health <= 0;
  const inJail  = player.in_jail_until && new Date(player.in_jail_until) > new Date();

  async function findPvpTarget() {
    if (!pvpSearch.trim()) return;
    const online = await DB.getOnlinePlayers();
    const found  = online.find(p => p.username.toLowerCase() === pvpSearch.toLowerCase());
    if (!found || found.username === player.username) { notify("❌ Player not found or offline"); return; }
    setPvpTarget(found);
  }

  function startFight(enemyData, isPvp) {
    if (tooHurt || inJail) return;
    if (player.energy < 5) { notify("❌ Need 5 energy"); return; }

    setFighting(true);
    setLog([]);
    setResult(null);

    let pHP = player.health, eHP = enemyData.health || MAX_HEALTH, round = 0;
    const logLines = [];
    const eWpn = ITEM_MAP[enemyData.equipped_weapon];
    const eArm = ITEM_MAP[enemyData.equipped_armor];
    const eAtk = (enemyData.strength || 10) + (eWpn?.weaponDmg || 0) + (enemyData.level || 1) * 2;
    const eDef = (enemyData.defense  || 10) + (eArm?.armorRating || 0) + (enemyData.level || 1) * 2;

    function tick() {
      if (pHP <= 0 || eHP <= 0 || round >= 20) {
        const won = eHP <= 0 && pHP > 0;
        const cash = won ? (enemyData.cash || 0) : 0;
        const xp   = won ? (enemyData.xp   || 0) : 0;
        logLines.push(won ? `🏆 YOU WIN — +$${cash} | +${xp}XP | +2 REP` : `💀 DEFEATED — -2 REP`);
        setLog([...logLines]);
        setResult(won ? "WIN" : "LOSE");
        setFighting(false);
        const healthLost = Math.max(0, player.health - Math.max(0, pHP));

        if (isPvp && pvpTarget?.id) {
          const cashStolen = won ? Math.min(Math.floor(pvpTarget.cash * 0.1), 5000) : 0;
          DB.attackPlayer(player.id, pvpTarget.id, won, cashStolen, healthLost, MAX_HEALTH - eHP, xp, round);
        }
        onCombat({ won, cash, xp, rep: won ? 2 : -2, healthLost, energyCost: 5 });
        return;
      }
      round++;

      // Player attacks
      if (Math.random() * 100 <= calcHitChance(player.dexterity, enemyData.dexterity || 10)) {
        const crit = Math.random() * 100 <= calcCritChance(player.dexterity);
        let dmg = calcDamage(calcAttack(player), eDef);
        if (crit) dmg *= 2;
        logLines.push(crit ? `⚡ CRIT! You deal ${dmg} dmg` : `👊 R${round}: You hit for ${dmg}`);
        eHP = Math.max(0, eHP - dmg);
        setLiveEHP(eHP);
      } else { logLines.push(`💨 R${round}: You missed`); }

      if (eHP > 0 && Math.random() * 100 <= calcHitChance(enemyData.dexterity || 10, player.dexterity)) {
        const dmg = calcDamage(eAtk, calcDefense(player));
        logLines.push(`🔴 ${enemyData.name} hits you for ${dmg}`);
        pHP = Math.max(0, pHP - dmg);
        setLivePHP(pHP);
      } else if (eHP > 0) { logLines.push(`💨 ${enemyData.name} missed`); }

      setLog([...logLines]);
      fightRef.current = setTimeout(tick, 350);
    }
    fightRef.current = setTimeout(tick, 100);
  }

  return (
    <div>
      {(tooHurt || inJail) && (
        <div style={{ ...S.card, borderColor:tooHurt?"#5a1a1a":"#7a4a00" }}>
          <div style={{ color:tooHurt?"#ff4d4d":C.orange }}>
            {tooHurt ? "⚠️ Too injured to fight — wait for health regen or visit Hospital on Profile page." : "⚖️ You're in jail."}
          </div>
        </div>
      )}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["npc","pvp"].map(m => (
          <button key={m} onClick={() => { setMode(m); setEnemy(null); setPvpTarget(null); setResult(null); setLog([]); }}
            style={{ padding:"8px 20px", background:mode===m?C.red2:C.bg3, border:`1px solid ${mode===m?C.red:C.border}`, borderRadius:4, color:mode===m?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2 }}>
            {m === "npc" ? "🤖 STREET FIGHT" : "⚔️ PvP ATTACK"}
          </button>
        ))}
      </div>

      {mode === "npc" && (
        <>
          <div style={S.grid}>
            <div style={S.card}>
              <div style={S.cardTitle}>YOU</div>
              <div style={S.row}><span style={S.label}>ATK</span><span style={{ ...S.val, color:"#ff4d4d" }}>{calcAttack(player)}</span></div>
              <div style={S.row}><span style={S.label}>DEF</span><span style={{ ...S.val, color:C.blue }}>{calcDefense(player)}</span></div>
              <div style={S.row}><span style={S.label}>HP</span><span style={{ ...S.val, color:C.green }}>{livePHP}</span></div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>ENEMY</div>
              {enemy ? (<>
                <div style={{ color:C.red, fontWeight:700, marginBottom:8 }}>{enemy.name} (LVL {enemy.level})</div>
                <div style={S.row}><span style={S.label}>HP</span><span style={{ ...S.val, color:C.green }}>{liveEHP ?? enemy.health}</span></div>
                <div style={S.row}><span style={S.label}>BOUNTY</span><span style={{ ...S.val, color:C.orange }}>${enemy.cash}</span></div>
              </>) : <div style={{ color:"#333" }}>No target</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button style={S.btnGray} onClick={() => { const e = createNPC(player.level); setEnemy(e); setLiveEHP(e.health); setLivePHP(player.health); setResult(null); setLog([]); }} disabled={fighting||tooHurt||inJail}>FIND TARGET</button>
            {enemy && !result && <button style={{ ...S.btnRed, padding:"8px 20px" }} onClick={() => startFight(enemy, false)} disabled={fighting||tooHurt||inJail}>{fighting?"FIGHTING...":"ATTACK"}</button>}
            {result && <button style={S.btnGray} onClick={() => { setEnemy(null); setResult(null); setLog([]); }}>NEW TARGET</button>}
          </div>
        </>
      )}

      {mode === "pvp" && (
        <div style={S.card}>
          <div style={S.cardTitle}>⚔️ ATTACK A PLAYER</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder="Enter username..." value={pvpSearch} onChange={e => setPvpSearch(e.target.value)} />
            <button style={S.btnOrange} onClick={findPvpTarget}>SEARCH</button>
          </div>
          {pvpTarget && (
            <div style={{ ...S.card, borderColor:"#5a1a1a", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:C.text, fontWeight:700 }}>{pvpTarget.username}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>Level {pvpTarget.level}</div>
                </div>
                {!result && <button style={{ ...S.btnRed, padding:"8px 20px" }} onClick={() => { const e = { ...pvpTarget, name: pvpTarget.username, health: MAX_HEALTH, cash: 500, xp: pvpTarget.level * 20, equipped_weapon: "pipe", equipped_armor: null, dexterity: 10 }; setLiveEHP(MAX_HEALTH); startFight(e, true); }} disabled={fighting||tooHurt||inJail}>ATTACK</button>}
              </div>
            </div>
          )}
          {livePHP !== null && <div style={{ ...S.row, marginTop:8 }}><span style={S.label}>YOUR HP</span><span style={{ ...S.val, color:C.green }}>{livePHP}</span></div>}
          {liveEHP !== null && pvpTarget && <div style={S.row}><span style={S.label}>ENEMY HP</span><span style={{ ...S.val, color:"#ff4d4d" }}>{liveEHP}</span></div>}
          {result && <button style={{ ...S.btnGray, marginTop:8 }} onClick={() => { setPvpTarget(null); setPvpSearch(""); setResult(null); setLog([]); }}>NEW TARGET</button>}
        </div>
      )}

      {log.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>BATTLE LOG {result && <Badge color={result==="WIN"?C.green:"#ff4d4d"}>{result}</Badge>}</div>
          <div style={S.logBox}>{log.map((l, i) => <div key={i} style={{ color:/You hit|CRIT|WIN/.test(l)?C.green:/missed/.test(l)?C.muted:"#ff6e6e" }}>{l}</div>)}</div>
        </div>
      )}
    </div>
  );
});

// ============================================================
// INVENTORY / SHOP PAGE
// ============================================================
const InventoryPage = memo(function InventoryPage({ player, onBuy, onEquip, onListMarket }) {
  const [tab, setTab] = useState("inventory");
  const [market, setMarket] = useState([]);
  const [listItem, setListItem] = useState(null);
  const [listPrice, setListPrice] = useState("");

  useEffect(() => { if (tab === "market") DB.getMarket().then(setMarket); }, [tab]);

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {["inventory","shop","market"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 18px", background:tab===t?C.red2:C.bg3, border:`1px solid ${tab===t?C.red:C.border}`, borderRadius:4, color:tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2 }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === "inventory" && (
        <div style={S.card}>
          <div style={S.cardTitle}>YOUR GEAR</div>
          {player.inventory.length === 0 && <div style={{ color:"#333" }}>No items. Visit the Shop.</div>}
          {player.inventory.map(id => {
            const item = ITEM_MAP[id]; if (!item) return null;
            const isEq = player.equipped_weapon === id || player.equipped_armor === id;
            return (
              <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ color:isEq?C.green:C.text, fontWeight:isEq?700:400 }}>{item.name} {isEq&&"✓"}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {!isEq && (item.type==="weapon"||item.type==="armor") && <button style={S.btnGreen} onClick={() => onEquip(item)}>EQUIP</button>}
                  {isEq && <Badge color={C.green}>EQUIPPED</Badge>}
                  {!isEq && <button style={S.btnPurple} onClick={() => setListItem(id)}>SELL</button>}
                </div>
              </div>
            );
          })}
          {listItem && (
            <div style={{ marginTop:12, padding:12, background:C.bg, borderRadius:4 }}>
              <div style={{ color:C.text, marginBottom:8 }}>List {ITEM_MAP[listItem]?.name} on market</div>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...S.input, marginBottom:0, flex:1 }} type="number" placeholder="Price" value={listPrice} onChange={e => setListPrice(e.target.value)} />
                <button style={S.btnOrange} onClick={() => { if (listPrice > 0) { onListMarket(listItem, Number(listPrice)); setListItem(null); setListPrice(""); } }}>LIST</button>
                <button style={S.btnGray} onClick={() => setListItem(null)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "shop" && (
        <div>
          <div style={{ color:C.green, fontSize:13, marginBottom:12 }}>CASH: ${player.cash.toLocaleString()}</div>
          {["weapon","armor","tool"].map(type => (
            <div key={type} style={S.card}>
              <div style={S.cardTitle}>{type.toUpperCase()}S</div>
              {ITEMS.filter(i => i.type===type).map(item => {
                const owned = player.inventory.includes(item.id);
                return (
                  <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <span style={{ color:C.text }}>{item.name} </span><Badge color={item.rarity==="rare"?C.orange:C.muted}>{item.rarity}</Badge>
                      <div style={{ fontSize:10, color:C.muted }}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.green, fontSize:13, marginBottom:4 }}>${item.price.toLocaleString()}</div>
                      {owned ? <Badge color={C.green}>OWNED</Badge> : <button style={{ ...S.btnOrange, padding:"6px 12px" }} onClick={() => onBuy(item)} disabled={player.cash < item.price}>BUY</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === "market" && (
        <div style={S.card}>
          <div style={S.cardTitle}>🏪 PLAYER MARKET</div>
          {market.length === 0 && <div style={{ color:"#333" }}>No listings right now.</div>}
          {market.map(listing => {
            const item = ITEM_MAP[listing.item_id];
            if (!item) return null;
            const isOwn = listing.seller_id === player.id;
            return (
              <div key={listing.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ color:C.text }}>{item.name}</div>
                  <div style={{ fontSize:10, color:C.muted }}>Seller: {listing.seller_username || "anonymous"}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:C.green }}>${listing.price.toLocaleString()}</div>
                  {isOwn ? <Badge color={C.muted}>YOUR LISTING</Badge> :
                    <button style={{ ...S.btnOrange, padding:"6px 12px" }} onClick={() => { /* buy market item */ }} disabled={player.cash < listing.price}>BUY</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ============================================================
// SYNDICATES PAGE
// ============================================================
const SyndicatesPage = memo(function SyndicatesPage({ player, onCreateSyndicate, onJoinSyndicate }) {
  const [syndicates, setSyndicates] = useState([]);
  const [newName, setNewName]       = useState("");
  const [tab, setTab]               = useState("list");
  const [err, setErr]               = useState("");
  const [busy, setBusy]             = useState(false);

  useEffect(() => { DB.getSyndicates().then(setSyndicates); }, []);

  async function create() {
    setErr(""); setBusy(true);
    if (player.cash < 1000000) { setErr("Need $1,000,000"); setBusy(false); return; }
    if (!newName.trim()) { setErr("Enter a name"); setBusy(false); return; }
    const { data, error } = await DB.createSyndicate(newName.trim(), player.id, player.username);
    if (error) { setErr("Name already taken or error"); } else { onCreateSyndicate(data); }
    setBusy(false);
  }

  async function join(s) {
    if (player.syndicate_id) { setErr("Already in a syndicate"); return; }
    const { error } = await DB.joinSyndicate(s.id, player.id);
    if (!error) onJoinSyndicate(s);
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["list","create"].map(t => (
          <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ padding:"8px 20px", background:tab===t?C.red2:C.bg3, border:`1px solid ${tab===t?C.red:C.border}`, borderRadius:4, color:tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2 }}>{t.toUpperCase()}</button>
        ))}
      </div>
      {err && <div style={{ color:"#ff4d4d", fontSize:11, marginBottom:10 }}>{err}</div>}
      {tab === "list" && (
        <div>
          {player.syndicate_name && <div style={{ ...S.card, borderColor:"#2a1a4a" }}><div style={S.cardTitle}>YOUR SYNDICATE</div><div style={{ color:C.purple, fontSize:18, fontWeight:900 }}>🏴 {player.syndicate_name}</div></div>}
          {syndicates.length === 0 && <div style={{ ...S.card, color:C.muted }}>No syndicates yet. Create the first one.</div>}
          {syndicates.map(s => (
            <div key={s.id} style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>🏴 {s.name}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>Level {s.level} · Treasury ${(s.treasury||0).toLocaleString()}</div>
                </div>
                {!player.syndicate_id && s.leader_id !== player.id && <button style={S.btnGreen} onClick={() => join(s)}>JOIN</button>}
                {player.syndicate_id === s.id && <Badge color={C.purple}>MEMBER</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "create" && (
        <div style={S.card}>
          <div style={S.cardTitle}>FOUND A SYNDICATE</div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:16 }}>Cost: $1,000,000 · Your cash: ${player.cash.toLocaleString()}</div>
          <input style={S.input} placeholder="Syndicate Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button style={{ ...S.btnRed, width:"100%" }} onClick={create} disabled={busy || player.cash < 1000000}>
            {busy ? "FOUNDING..." : "FOUND SYNDICATE — $1,000,000"}
          </button>
        </div>
      )}
    </div>
  );
});

// ============================================================
// MAIL PAGE
// ============================================================
const MailPage = memo(function MailPage({ player }) {
  const [mail, setMail]     = useState([]);
  const [tab, setTab]       = useState("inbox");
  const [compose, setCompose] = useState({ to:"", subject:"", body:"" });
  const [status, setStatus] = useState("");

  useEffect(() => { DB.getMail(player.id).then(setMail); }, [player.id]);

  async function send() {
    if (!compose.to || !compose.body) { setStatus("Fill in all fields"); return; }
    const { error } = await DB.sendMail(player.id, compose.to, compose.subject, compose.body);
    if (error) setStatus(`Error: ${error}`);
    else { setStatus("✅ SENT"); setCompose({ to:"", subject:"", body:"" }); setTimeout(() => setStatus(""), 3000); }
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["inbox","compose"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 20px", background:tab===t?C.red2:C.bg3, border:`1px solid ${tab===t?C.red:C.border}`, borderRadius:4, color:tab===t?"#fff":"#666", cursor:"pointer", fontSize:11, letterSpacing:2 }}>{t.toUpperCase()}</button>
        ))}
      </div>
      {tab === "inbox" && (
        <div style={S.card}>
          <div style={S.cardTitle}>📬 INBOX</div>
          {mail.length === 0 && <div style={{ color:"#333" }}>No messages.</div>}
          {mail.map(m => (
            <div key={m.id} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}`, opacity:m.read?0.6:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:m.read?C.muted:C.text, fontWeight:m.read?400:700 }}>{m.subject || "(no subject)"}</span>
                <span style={{ color:C.muted, fontSize:10 }}>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{m.body.substring(0, 80)}{m.body.length > 80 ? "..." : ""}</div>
            </div>
          ))}
        </div>
      )}
      {tab === "compose" && (
        <div style={S.card}>
          <div style={S.cardTitle}>✉️ COMPOSE</div>
          <input style={S.input} placeholder="To (username)" value={compose.to} onChange={e => setCompose(c => ({...c, to:e.target.value}))} />
          <input style={S.input} placeholder="Subject" value={compose.subject} onChange={e => setCompose(c => ({...c, subject:e.target.value}))} />
          <textarea style={{ ...S.input, height:100, resize:"vertical" }} placeholder="Message..." value={compose.body} onChange={e => setCompose(c => ({...c, body:e.target.value}))} />
          {status && <div style={{ color:status.startsWith("✅")?C.green:"#ff4d4d", fontSize:11, marginBottom:8 }}>{status}</div>}
          <button style={{ ...S.btnRed, padding:"10px 24px" }} onClick={send}>SEND MESSAGE</button>
        </div>
      )}
    </div>
  );
});

// ============================================================
// LEADERBOARD PAGE
// ============================================================
const LeaderboardPage = memo(function LeaderboardPage({ player }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => { DB.getLeaderboard().then(setPlayers); }, []);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>🏆 TOP PLAYERS</div>
      <div style={{ display:"grid", gridTemplateColumns:"32px 1fr 60px 60px 80px", gap:8, color:C.muted, fontSize:10, letterSpacing:1, marginBottom:8, padding:"0 4px" }}>
        <span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span>
      </div>
      {players.map((p, i) => (
        <div key={p.username || i} style={{ display:"grid", gridTemplateColumns:"32px 1fr 60px 60px 80px", gap:8, padding:"8px 4px", borderBottom:`1px solid ${C.border}`, background:p.username===player.username?"#1a0a0a":"transparent" }}>
          <span style={{ color:i<3?C.orange:C.muted, fontWeight:i<3?900:400 }}>{i+1}</span>
          <span style={{ color:p.username===player.username?C.red:C.text, fontWeight:p.username===player.username?700:400 }}>{p.name} {p.username===player.username&&"(you)"}</span>
          <span style={{ color:C.purple }}>{p.level}</span>
          <span style={{ color:C.orange }}>{p.reputation}</span>
          <span style={{ color:C.green, fontSize:10 }}>${((p.cash||0)/1000).toFixed(0)}k</span>
        </div>
      ))}
      {players.length === 0 && <div style={{ color:"#333" }}>No players yet.</div>}
    </div>
  );
});

// ============================================================
// NOTIFICATIONS BELL
// ============================================================
function NotifBell({ playerId, onClick, count }) {
  return (
    <div onClick={onClick} style={{ position:"relative", cursor:"pointer", padding:"4px 8px" }}>
      <span style={{ fontSize:16 }}>🔔</span>
      {count > 0 && <span style={{ position:"absolute", top:-2, right:-2, background:C.red, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>{count}</span>}
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================
const NAV = [
  { id:"profile",     icon:"👤", label:"PROFILE" },
  { id:"crimes",      icon:"🔪", label:"CRIMES" },
  { id:"combat",      icon:"⚔️",  label:"COMBAT" },
  { id:"inventory",   icon:"🎒", label:"INVENTORY" },
  { id:"syndicates",  icon:"🏴", label:"SYNDICATES" },
  { id:"mail",        icon:"📬", label:"MAIL" },
  { id:"leaderboard", icon:"🏆", label:"LEADERBOARD" },
];

function Game({ initialPlayer, onLogout }) {
  const [player, setPlayer]   = useState(initialPlayer);
  const [page,   setPage]     = useState("profile");
  const [toast,  setToast]    = useState(null);
  const [notifs, setNotifs]   = useState([]);
  const saveTimerRef = useRef(null);

  const notify = useCallback((msg) => setToast(msg), []);

  // Debounced save — only write to DB 2s after last change
  const schedSave = useCallback((p) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => DB.savePlayer(p), 2000);
  }, []);

  // Realtime notifications subscription
  useEffect(() => {
    const unsub = DB.subscribeNotifications(player.id, (n) => {
      setNotifs(prev => [n, ...prev.slice(0, 9)]);
      notify(`🔔 ${n.message}`);
    });
    DB.getNotifications(player.id).then(setNotifs);
    return unsub;
  }, [player.id, notify]);

  // Client-side regen tick (every 10s)
  useEffect(() => {
    const id = setInterval(() => {
      setPlayer(p => {
        const eR = calcEnergyRegen(p.last_energy_regen);
        const nR = calcNerveRegen(p.last_nerve_regen);
        const hR = calcHealthRegen(p.last_health_regen);
        if (!eR && !nR && !hR) return p;
        const now = Date.now();
        const np = {
          ...p,
          energy: eR ? Math.min(MAX_ENERGY, p.energy + eR) : p.energy,
          nerve:  nR ? Math.min(MAX_NERVE,  p.nerve  + nR) : p.nerve,
          health: hR ? Math.min(MAX_HEALTH, p.health + hR) : p.health,
          last_energy_regen: eR ? new Date(new Date(p.last_energy_regen).getTime() + eR * 300000).toISOString() : p.last_energy_regen,
          last_nerve_regen:  nR ? new Date(new Date(p.last_nerve_regen).getTime()  + nR * 600000).toISOString() : p.last_nerve_regen,
          last_health_regen: hR ? new Date(new Date(p.last_health_regen).getTime() + hR * 180000).toISOString() : p.last_health_regen,
        };
        schedSave(np);
        return np;
      });
    }, 10000);
    return () => clearInterval(id);
  }, [schedSave]);

  // Level-up handler
  const levelUp = useCallback((p) => {
    let u = { ...p };
    const msgs = [];
    while (u.xp >= XP_FOR_LEVEL(u.level + 1)) {
      u.xp -= XP_FOR_LEVEL(u.level + 1);
      u.level += 1;
      u.stat_points = (u.stat_points || 0) + 3;
      msgs.push(`🆙 LEVEL UP! Now Level ${u.level}! +3 stat points`);
    }
    msgs.forEach((m, i) => setTimeout(() => notify(m), i * 3500));
    return u;
  }, [notify]);

  const handleCrime = useCallback(({ success, nerveCost, cash, xp, rep, jailed }) => {
    setPlayer(p => {
      const u = levelUp({ ...p, nerve: Math.max(0, p.nerve - nerveCost), cash: p.cash + cash, xp: p.xp + xp, reputation: Math.max(0, p.reputation + rep), ...(jailed ? { in_jail_until: new Date(Date.now() + 5 * 60000).toISOString() } : {}) });
      schedSave(u); return u;
    });
    if (success) notify(`+ $${cash.toLocaleString()} | +${xp}XP`);
    else if (jailed) notify("⚖️ BUSTED — sent to jail!");
    else notify("❌ Busted — no reward");
  }, [levelUp, notify, schedSave]);

  const handleCombat = useCallback(({ won, cash, xp, rep, healthLost, energyCost }) => {
    setPlayer(p => {
      const u = levelUp({ ...p, energy: Math.max(0, p.energy - energyCost), health: Math.max(0, p.health - healthLost), cash: p.cash + cash, xp: p.xp + xp, reputation: Math.max(0, p.reputation + rep), wins: p.wins + (won?1:0), losses: p.losses + (won?0:1) });
      schedSave(u); return u;
    });
    if (won) notify(`🏆 WIN — +$${cash} | +${xp}XP`);
    else notify("💀 Defeated");
  }, [levelUp, notify, schedSave]);

  const handleBuy = useCallback((item) => {
    setPlayer(p => {
      if (p.cash < item.price) { notify("❌ Not enough cash"); return p; }
      if (p.inventory.includes(item.id)) { notify("❌ Already owned"); return p; }
      const u = { ...p, cash: p.cash - item.price, inventory: [...p.inventory, item.id] };
      notify(`✅ BOUGHT ${item.name}`);
      schedSave(u); return u;
    });
  }, [notify, schedSave]);

  const handleEquip = useCallback((item) => {
    setPlayer(p => {
      const u = { ...p, equipped_weapon: item.type==="weapon"?item.id:p.equipped_weapon, equipped_armor: item.type==="armor"?item.id:p.equipped_armor };
      schedSave(u); return u;
    });
    notify(`✅ EQUIPPED ${item.name}`);
  }, [notify, schedSave]);

  const handleStatUp = useCallback((stat) => {
    setPlayer(p => {
      if (!p.stat_points) return p;
      const u = { ...p, [stat]: p[stat] + 1, stat_points: p.stat_points - 1 };
      schedSave(u); return u;
    });
  }, [schedSave]);

  const handleCreateSyndicate = useCallback((s) => {
    setPlayer(p => { const u = { ...p, cash: p.cash - 1000000, syndicate_id: s.id, syndicate_name: s.name }; schedSave(u); return u; });
    notify(`🏴 SYNDICATE FOUNDED: ${s.name}`);
  }, [notify, schedSave]);

  const handleJoinSyndicate = useCallback((s) => {
    setPlayer(p => { const u = { ...p, syndicate_id: s.id, syndicate_name: s.name }; schedSave(u); return u; });
    notify(`✅ JOINED ${s.name}`);
  }, [notify, schedSave]);

  const handleHospital = useCallback(async () => {
    const res = await DB.useHospital(player.id);
    if (res?.error) { notify(`❌ ${res.error}`); return; }
    setPlayer(p => { const u = { ...p, health: MAX_HEALTH, cash: p.cash - (res.cost||0), in_hospital_until: null }; schedSave(u); return u; });
    notify(`✅ HEALED to full health — $${res.cost || 0}`);
  }, [player.id, notify, schedSave]);

  const handleBailOut = useCallback(async () => {
    const res = await DB.bailOut(player.id);
    if (res?.error) { notify(`❌ ${res.error}`); return; }
    setPlayer(p => { const u = { ...p, in_jail_until: null, cash: p.cash - (res.cost||0) }; schedSave(u); return u; });
    notify(`✅ BAILED OUT — $${res.cost || 0}`);
  }, [player.id, notify, schedSave]);

  const handleListMarket = useCallback(async (itemId, price) => {
    const { error } = await DB.listMarket(player.id, itemId, price);
    if (error) notify("❌ Could not list item");
    else { notify(`✅ Listed on market for $${price.toLocaleString()}`); setPlayer(p => { const u = { ...p, inventory: p.inventory.filter(id => id !== itemId) }; schedSave(u); return u; }); }
  }, [player.id, notify, schedSave]);

  const handleLogout = useCallback(async () => { await DB.logout(); onLogout(); }, [onLogout]);

  const unreadNotifs = notifs.filter(n => !n.read).length;

  return (
    <div style={S.app}>
      <style>{`@keyframes slidein{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}} * { box-sizing: border-box; }`}</style>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div style={S.layout}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:C.red, fontSize:15, fontWeight:900, letterSpacing:4, textShadow:`0 0 20px ${C.red}60` }}>SHADOW</div>
            <div style={{ color:C.red, fontSize:15, fontWeight:900, letterSpacing:4, textShadow:`0 0 20px ${C.red}60` }}>DOMINION</div>
            <div style={{ color:"#333", fontSize:9, letterSpacing:2, marginTop:2 }}>{DEMO_MODE ? "DEMO" : "LIVE"} v2.0</div>
          </div>
          <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>{player.name}</div>
            <div style={{ color:C.muted, fontSize:10 }}>LVL {player.level} · {player.reputation} REP</div>
            <div style={{ color:C.green, fontSize:12, marginTop:3 }}>${player.cash.toLocaleString()}</div>
          </div>
          <div style={{ flex:1, paddingTop:6, overflowY:"auto" }}>
            {NAV.map(n => (
              <div key={n.id} style={S.navItem(page===n.id)} onClick={() => setPage(n.id)}>
                <span>{n.icon}</span><span>{n.label}</span>
                {n.id==="mail" && unreadNotifs > 0 && <span style={{ marginLeft:"auto", background:C.red, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>{unreadNotifs}</span>}
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
            {[[`⚡`, player.energy, MAX_ENERGY, C.blue],[`🧠`, player.nerve, MAX_NERVE, C.orange],[`❤️`, player.health, MAX_HEALTH, C.green]].map(([icon, val, max, color]) => (
              <div key={icon} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.muted, marginBottom:2 }}>
                  <span>{icon}</span><span style={{ color }}>{val}/{max}</span>
                </div>
                <div style={S.barWrap}><div style={S.bar((val/max)*100, color)} /></div>
              </div>
            ))}
            {player.in_jail_until && new Date(player.in_jail_until) > new Date() && <div style={{ color:C.orange, fontSize:10, marginTop:6 }}>⚖️ IN JAIL</div>}
            {player.in_hospital_until && new Date(player.in_hospital_until) > new Date() && <div style={{ color:C.blue, fontSize:10 }}>🏥 IN HOSPITAL</div>}
            <button onClick={handleLogout} style={{ ...S.btnGray, width:"100%", marginTop:10, fontSize:10 }}>LOGOUT</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={S.main}>
          <div style={{ color:C.muted, fontSize:10, letterSpacing:2, marginBottom:16, borderBottom:`1px solid ${C.border}`, paddingBottom:10, display:"flex", justifyContent:"space-between" }}>
            <span>{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</span>
            <NotifBell playerId={player.id} count={unreadNotifs} onClick={() => { setPage("mail"); DB.markNotificationsRead(player.id); }} />
          </div>
          {page==="profile"     && <ProfilePage    player={player} onStatUp={handleStatUp} onHospital={handleHospital} onBailOut={handleBailOut} />}
          {page==="crimes"      && <CrimesPage     player={player} onCrime={handleCrime} />}
          {page==="combat"      && <CombatPage     player={player} onCombat={handleCombat} notify={notify} />}
          {page==="inventory"   && <InventoryPage  player={player} onBuy={handleBuy} onEquip={handleEquip} onListMarket={handleListMarket} />}
          {page==="syndicates"  && <SyndicatesPage player={player} onCreateSyndicate={handleCreateSyndicate} onJoinSyndicate={handleJoinSyndicate} />}
          {page==="mail"        && <MailPage       player={player} />}
          {page==="leaderboard" && <LeaderboardPage player={player} />}
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
