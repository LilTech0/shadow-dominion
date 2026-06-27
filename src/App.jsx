import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Data ─────────────────────────────────────────────────────
import { CRIMES } from "./data/crimes";
import { ITEMS, BM_POOL } from "./data/items";
import { GYMS, TRAIN_STATS } from "./data/gyms";
import { CITIES } from "./data/cities";

// ── Services ─────────────────────────────────────────────────
import { getSB, sbInsert } from "./services/supabase";
import { getAccounts, saveAccounts, getSyndicates, saveSyndicates, getAnnouncements, saveAnnouncements } from "./services/storage";
import { calcAttack, calcDefense, calcHitChance, calcDamage, calcCritChance, calcEnergyRegen, calcNerveRegen, calcHealthRegen, gymGain, createPlayer, getPrestige, calcPropertyIncome, getDailyBMItems, makeNotif, addNotif, tsAgo, createEnemy } from "./services/combat";

// ── Hooks ────────────────────────────────────────────────────
import { C, S, useTheme, toggleTheme } from "./hooks/useTheme";
import { usePresence } from "./hooks/usePresence";

// ── Components ───────────────────────────────────────────────
import TopStatBar from "./components/TopStatBar";
import Toast from "./components/Toast";
import Confirm from "./components/Confirm";

// ── Pages ────────────────────────────────────────────────────
import ProfilePage from "./pages/ProfilePage";
import CrimesPage from "./pages/CrimesPage";
import CombatPage from "./pages/CombatPage";
import GymPage from "./pages/GymPage";
import InventoryPage from "./pages/InventoryPage";
import SyndicatesPage from "./pages/SyndicatesPage";
import PropertiesPage from "./pages/PropertiesPage";
import BlackMarketPage from "./pages/BlackMarketPage";
import PrestigePage from "./pages/PrestigePage";
import FeedPage from "./pages/FeedPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminPage from "./pages/AdminPage";
import JailPage from "./pages/JailPage";
import TravelPage from "./pages/TravelPage";
import ChatPage from "./pages/ChatPage";
import WorldMapPage from "./pages/WorldMapPage";
import SyndicateWarsPage from "./pages/SyndicateWarsPage";

// ── Inline: AdminLogin, DailyModal, AuthPage, NotifDrawer, NAV, Game, App ──
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
// SUPABASE PLAYER SYNC
// ============================================================
async function syncPlayerToSupabase(player) {
  const sb = getSB();
  if(!sb || !player?.username) return;
  const row = {
    username:    player.username,
    name:        player.name,
    level:       player.level||1,
    xp:          player.xp||0,
    cash:        player.cash||0,
    reputation:  player.reputation||0,
    wins:        player.wins||0,
    losses:      player.losses||0,
    syndicate:   player.syndicate||null,
    current_city:player.currentCity||"hometown",
    strength:    player.strength||10,
    defense:     player.defense||10,
    speed:       player.speed||10,
    prestige_tier:player.prestigeTier||0,
    last_seen:   new Date().toISOString(),
  };
  await sb.from("players").upsert(row, { onConflict:"username" });
}

async function searchPlayers(query) {
  const sb = getSB();
  if(!sb) return [];
  const { data } = await sb.from("players")
    .select("*")
    .ilike("username", `%${query}%`)
    .order("level", { ascending:false })
    .limit(20);
  return data||[];
}

async function getTopPlayers(limit=50) {
  const sb = getSB();
  if(!sb) return [];
  const { data } = await sb.from("players")
    .select("*")
    .order("level", { ascending:false })
    .limit(limit);
  return data||[];
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
      syncPlayerToSupabase(updated).catch(()=>{});
      setBusy(false);
      onLogin(updated);
    } else {
      if(!form.name||!form.username||!form.password){setBusy(false);return setErr("All fields required.");}
      if(form.username.length<3){setBusy(false);return setErr("Username: min 3 chars.");}
      if(form.password.length<4){setBusy(false);return setErr("Password: min 4 chars.");}
      const uname=form.username.toLowerCase().trim();
      const accs=getAccounts();
      const {data:existing}=await getSB().from("players").select("username").eq("username",uname).maybeSingle();
      if(accs[uname]||existing){setBusy(false);return setErr("Username taken.");}
      const player=createPlayer(form.name.trim(),uname);
      const today=new Date().toDateString();
      player.loginStreak=1; player.lastLoginDate=today; player.loginRewardClaimed=false;
      accs[uname]={password:form.password,player};
      saveAccounts(accs);
      syncPlayerToSupabase(player).catch(()=>{});
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
  {id:"worldmap",    icon:"🗺", label:"WORLD"},
  {id:"wars",        icon:"⚔",  label:"WARS"},
];

function Game({initialPlayer,onLogout}) {
  const [player,setPlayer]=useState(initialPlayer);
  const isDark = useTheme();
  const onlineUsers = usePresence(player);

  // Sync player to Supabase whenever key stats change
  useEffect(()=>{
    const t = setTimeout(()=>syncPlayerToSupabase(player).catch(()=>{}), 2000);
    return ()=>clearTimeout(t);
  },[player.level, player.cash, player.reputation, player.wins, player.losses, player.syndicate, player.currentCity]);
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
      while(xp>=XP_FOR_LEVEL(level+1)&&level<MAX_LEVEL){xp-=XP_FOR_LEVEL(level+1);level++;}
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

  function handleAttackFromMap(u){
    setPvpInitTarget(u);
    setPage("combat");
    notify("⚔ Targeting "+u.name+"...");
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
          <button style={{...S.btn(C.muted,C.card),padding:"4px 10px",fontSize:14}} onClick={toggleTheme} title={isDark?"Switch to Light":"Switch to Dark"}>{isDark?"☀️":"🌙"}</button>
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
        {page==="worldmap"   &&<WorldMapPage   player={player} onlineUsers={onlineUsers} onAttackPlayer={handleAttackFromMap}/>}
        {page==="wars"       &&<SyndicateWarsPage player={player} onlineUsers={onlineUsers} notify={notify}/>}
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

