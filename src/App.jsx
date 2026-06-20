import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xuvvnpnyylwgymnfakjt.supabase.co";
const SUPABASE_KEY = "sb_publishable_gpY40rmrXQYfDyVrvvMeIA_nS_qnb1o";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dbGetPlayer(u) { const {data}=await sb.from("players").select("*").eq("username",u).single(); return data; }
async function dbCreatePlayer(u,pw,pd) { return await sb.from("players").insert({username:u,password_hash:pw,player_data:pd}).select().single(); }
async function dbSavePlayer(u,pd) { await sb.from("players").update({player_data:pd,updated_at:new Date().toISOString()}).eq("username",u); }
async function dbAllPlayers() { const {data}=await sb.from("players").select("player_data"); return data?data.map(r=>r.player_data):[]; }
async function dbAllPlayersRaw() { const {data}=await sb.from("players").select("*"); return data||[]; }
async function dbDeletePlayer(u) { await sb.from("players").delete().eq("username",u); }
async function dbGetSyndicates() { const {data}=await sb.from("syndicates").select("data"); return data?data.map(r=>r.data):[]; }
async function dbSaveSyndicate(s) { const {data}=await sb.from("syndicates").select("id").eq("name",s.name).single(); if(data){await sb.from("syndicates").update({data:s,updated_at:new Date().toISOString()}).eq("name",s.name);}else{await sb.from("syndicates").insert({name:s.name,data:s});} }
async function dbGetAnnouncements() { const {data}=await sb.from("announcements").select("*").eq("active",true).order("created_at",{ascending:false}).limit(5); return data||[]; }
async function dbPostAnnouncement(text) { await sb.from("announcements").insert({text,active:true}); }
async function dbDeleteAnnouncement(id) { await sb.from("announcements").update({active:false}).eq("id",id); }

const CRIMES=[
  {id:"pickpocket", name:"Pickpocket",    baseChance:70,baseReward:200,  nerve:3, xp:10, difficulty:5,  desc:"Lift wallets from distracted marks"},
  {id:"shoplifting",name:"Shoplifting",   baseChance:65,baseReward:400,  nerve:5, xp:20, difficulty:10, desc:"Five-finger discount at the mall"},
  {id:"mugging",    name:"Mugging",       baseChance:55,baseReward:700,  nerve:8, xp:35, difficulty:18, desc:"Strong-arm a civilian for cash"},
  {id:"carjacking", name:"Car Theft",     baseChance:50,baseReward:1000, nerve:12,xp:60, difficulty:20, desc:"Boost a ride from the parking garage"},
  {id:"robbery",    name:"Armed Robbery", baseChance:40,baseReward:2500, nerve:18,xp:100,difficulty:30, desc:"Hit a convenience store at gunpoint"},
  {id:"heist",      name:"Bank Heist",    baseChance:25,baseReward:8000, nerve:30,xp:250,difficulty:50, desc:"Crack a downtown vault with the crew"},
];
const ITEMS=[
  {id:"knife",   name:"Switchblade",    type:"weapon",weaponDmg:8, armorRating:0, price:500,  rarity:"common"},
  {id:"pipe",    name:"Lead Pipe",      type:"weapon",weaponDmg:14,armorRating:0, price:1200, rarity:"common"},
  {id:"pistol",  name:"9mm Pistol",     type:"weapon",weaponDmg:25,armorRating:0, price:4000, rarity:"rare"},
  {id:"shotgun", name:"Sawn-Off",       type:"weapon",weaponDmg:38,armorRating:0, price:8000, rarity:"rare"},
  {id:"uzi",     name:"Micro Uzi",      type:"weapon",weaponDmg:52,armorRating:0, price:18000,rarity:"legendary"},
  {id:"vest",    name:"Stab Vest",      type:"armor", weaponDmg:0, armorRating:10,price:800,  rarity:"common"},
  {id:"jacket",  name:"Kevlar Jacket",  type:"armor", weaponDmg:0, armorRating:22,price:5000, rarity:"rare"},
  {id:"plate",   name:"Tactical Plate", type:"armor", weaponDmg:0, armorRating:38,price:15000,rarity:"legendary"},
  {id:"lockpick",name:"Lockpick Set",   type:"tool",  weaponDmg:0, armorRating:0, price:600,  crimeBonus:10,rarity:"common"},
  {id:"scanner", name:"Police Scanner", type:"tool",  weaponDmg:0, armorRating:0, price:1500, crimeBonus:18,rarity:"rare"},
];
const DAILY={1:{cash:500,label:"$500"},2:{cash:1000,label:"$1,000"},3:{cash:2000,label:"$2,000"},4:{cash:1500,label:"$1,500"},5:{cash:2500,label:"$2,500"},6:{cash:3000,label:"$3,000"},7:{cash:5000,label:"$5,000 + Rare Item",itemId:"scanner"}};
const MAX_E=100,MAX_N=50,MAX_H=100,ATK_CD=60000,MAX_APT=5;
const XPL=(l)=>Math.floor(100*Math.pow(l,1.5));
function calcAtk(p){const w=ITEMS.find(i=>i.id===p.equippedWeapon);return p.strength+(w?.weaponDmg||0)+p.level*2;}
function calcDef(p){const a=ITEMS.find(i=>i.id===p.equippedArmor);return p.defense+(a?.armorRating||0)+p.level*2;}
function calcHit(ad,dd){return Math.min(95,Math.max(20,75+ad/10-dd/10));}
function calcDmg(a,d){return Math.max(1,a-d*0.5);}
function calcCrit(d){return 5+d/50;}
function regenE(ts){return Math.floor(((Date.now()-ts)/1000)/300);}
function regenN(ts){return Math.floor(((Date.now()-ts)/1000)/600);}
function regenH(ts){return Math.floor(((Date.now()-ts)/1000)/180);}
function newPlayer(name,username){return{name,username,level:1,xp:0,cash:1000,reputation:0,strength:10,defense:10,dexterity:10,statPoints:0,energy:MAX_E,nerve:MAX_N,health:MAX_H,lastEnergyRegen:Date.now(),lastNerveRegen:Date.now(),lastHealthRegen:Date.now(),inventory:[],equippedWeapon:null,equippedArmor:null,syndicate:null,syndicateRole:null,loginStreak:0,lastLoginDate:null,loginRewardClaimed:false,wins:0,losses:0,attackCooldowns:{},attacksToday:{},lastAttackResetDate:null,crimeStats:{total:0,success:0}};}
function newEnemy(lvl){const l=Math.max(1,lvl+Math.floor(Math.random()*5)-2);const names=["Street Rat","Corner Boy","Blood Hawk","Iron Mask","The Warden","Ghost Nine","Viper","Cold Cut","Razor","The Judge"];return{id:`e_${Date.now()}`,name:names[Math.floor(Math.random()*names.length)],level:l,strength:8+l*2,defense:6+l*2,dexterity:5+l,health:MAX_H,maxHealth:MAX_H,equippedWeapon:l>=7?"shotgun":l>=5?"pistol":l>=3?"pipe":"knife",equippedArmor:l>=6?"jacket":l>=4?"vest":null,cash:Math.floor(Math.random()*l*300+100),xp:l*15};}

const C={bg:"#08080e",card:"#0f0f18",border:"#1c1c2c",red:"#e8001e",redBg:"#1a0008",green:"#00e87a",greenBg:"#001a10",blue:"#4d9fff",blueBg:"#001228",orange:"#ff8c00",orangeBg:"#1a0e00",purple:"#9b6dff",gold:"#ffd700",goldBg:"#1a1400",text:"#d4d4d4",muted:"#555566",dim:"#333344"};
const S={
  app:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Courier New',monospace",fontSize:13},
  authWrap:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20,background:`radial-gradient(ellipse at center,#150010 0%,${C.bg} 70%)`},
  authBox:{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:32,width:"100%",maxWidth:400},
  card:(x={})=>({background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:16,marginBottom:12,...x}),
  ct:{color:C.red,fontSize:10,letterSpacing:3,textTransform:"uppercase",marginBottom:12},
  inp:{width:"100%",background:"#0a0a12",border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10},
  btn:(c=C.red,b=C.redBg)=>({background:b,border:`1px solid ${c}44`,borderRadius:4,padding:"9px 18px",color:c,fontSize:11,letterSpacing:2,cursor:"pointer",fontWeight:700}),
  btnF:(c=C.red,b=C.redBg)=>({width:"100%",background:b,border:`1px solid ${c}44`,borderRadius:4,padding:"11px",color:c,fontSize:11,letterSpacing:2,cursor:"pointer",fontWeight:700}),
  badge:(c)=>({display:"inline-block",padding:"2px 7px",borderRadius:10,fontSize:9,background:c+"18",color:c,border:`1px solid ${c}33`,letterSpacing:1}),
  bar:(p,c)=>({height:"100%",width:`${Math.min(100,Math.max(0,p))}%`,background:c,transition:"width 0.4s",borderRadius:2}),
  barW:{background:"#0a0a12",borderRadius:2,height:7,overflow:"hidden",flex:1},
  row:{display:"flex",gap:8,alignItems:"center",marginBottom:6},
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  logB:{background:"#06060e",border:`1px solid ${C.dim}`,borderRadius:4,padding:10,maxHeight:180,overflowY:"auto",fontSize:11,lineHeight:1.9},
  nav:(a)=>({padding:"10px 18px",cursor:"pointer",fontSize:11,letterSpacing:1,color:a?C.red:C.muted,background:a?C.redBg:"transparent",borderLeft:`2px solid ${a?C.red:"transparent"}`,display:"flex",alignItems:"center",gap:8,userSelect:"none"}),
  sb:{width:"30%",minWidth:160,maxWidth:260,background:"#0b0b14",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column"},
};
const RC={muted:C.muted,rare:C.blue,legendary:C.gold,common:C.muted};

function Bar({label,val,max,color,icon}){return(<div style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:10}}><span style={{color:C.muted}}>{icon} {label}</span><span style={{color}}>{Math.floor(val)}/{max}</span></div><div style={S.barW}><div style={S.bar((val/max)*100,color)}/></div></div>);}
function Toast({msg,onClose}){useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);const g=msg.startsWith("✅")||msg.startsWith("🆙")||msg.startsWith("🏆")||msg.startsWith("🏴")||msg.startsWith("🎁");return(<div style={{position:"fixed",top:16,right:16,background:g?C.greenBg:C.redBg,border:`1px solid ${g?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:g?C.green:C.red,fontSize:12,zIndex:9999,letterSpacing:1,maxWidth:340,lineHeight:1.5}}>{msg}</div>);}
function Tabs({tabs,active,onSelect}){return(<div style={{display:"flex",gap:6,marginBottom:16}}>{tabs.map(t=>(<button key={t} onClick={()=>onSelect(t)} style={{padding:"7px 18px",background:active===t?C.red:"#14141e",border:`1px solid ${active===t?C.red:C.border}`,borderRadius:4,color:active===t?"#fff":C.muted,cursor:"pointer",fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>{t}</button>))}</div>);}
function Confirm({msg,onYes,onNo}){return(<div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000}}><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:28,maxWidth:320,textAlign:"center"}}><div style={{marginBottom:20,lineHeight:1.6}}>{msg}</div><div style={{display:"flex",gap:10,justifyContent:"center"}}><button style={S.btn()} onClick={onYes}>CONFIRM</button><button style={S.btn(C.muted,"#14141e")} onClick={onNo}>CANCEL</button></div></div></div>);}

// AUTH
function AuthPage({onLogin}){
  const [tab,setTab]=useState("login");
  const [form,setForm]=useState({username:"",password:"",name:""});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  function set(k,v){setForm(f=>({...f,[k]:v}));setErr("");}
  async function login(){
    if(!form.username||!form.password)return setErr("Fill all fields.");
    setLoading(true);
    const row=await dbGetPlayer(form.username.trim().toLowerCase());
    if(!row){setLoading(false);return setErr("Account not found.");}
    if(row.password_hash!==form.password){setLoading(false);return setErr("Wrong password.");}
    const player=row.player_data;
    const today=new Date().toDateString();
    let streak=player.loginStreak||0,claimed=false;
    const yesterday=new Date(Date.now()-86400000).toDateString();
    if(player.lastLoginDate===today){claimed=player.loginRewardClaimed;}
    else if(player.lastLoginDate===yesterday){streak=Math.min(7,streak+1);claimed=false;}
    else{streak=1;claimed=false;}
    const updated={...player,loginStreak:streak,lastLoginDate:today,loginRewardClaimed:claimed};
    await dbSavePlayer(form.username.trim().toLowerCase(),updated);
    setLoading(false);onLogin(updated);
  }
  async function register(){
    if(!form.name||!form.username||!form.password)return setErr("All fields required.");
    if(form.username.length<3)return setErr("Username: min 3 chars.");
    if(form.password.length<4)return setErr("Password: min 4 chars.");
    setLoading(true);
    const uname=form.username.trim().toLowerCase();
    const existing=await dbGetPlayer(uname);
    if(existing){setLoading(false);return setErr("Username taken.");}
    const player=newPlayer(form.name.trim(),uname);
    const today=new Date().toDateString();
    player.loginStreak=1;player.lastLoginDate=today;player.loginRewardClaimed=false;
    const {error}=await dbCreatePlayer(uname,form.password,player);
    if(error){setLoading(false);return setErr("Registration failed. Try again.");}
    setLoading(false);onLogin(player);
  }
  return(
    <div style={S.authWrap}>
      <div style={{marginBottom:24,textAlign:"center"}}>
        <div style={{color:C.red,fontSize:32,fontWeight:900,letterSpacing:6,textShadow:`0 0 30px ${C.red}88`}}>SHADOW</div>
        <div style={{color:C.red,fontSize:32,fontWeight:900,letterSpacing:6,textShadow:`0 0 30px ${C.red}88`}}>DOMINION</div>
        <div style={{color:C.muted,fontSize:10,letterSpacing:4,marginTop:6}}>ALPHA v0.1 — THE STREETS DON'T SLEEP</div>
      </div>
      <div style={S.authBox}>
        <Tabs tabs={["login","register"]} active={tab} onSelect={setTab}/>
        {tab==="register"&&<input style={S.inp} placeholder="Display Name" value={form.name} onChange={e=>set("name",e.target.value)}/>}
        <input style={S.inp} placeholder="Username" value={form.username} onChange={e=>set("username",e.target.value)}/>
        <input style={S.inp} type="password" placeholder="Password" value={form.password} onChange={e=>set("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?login():register())}/>
        {err&&<div style={{color:C.red,fontSize:11,marginBottom:10}}>⚠ {err}</div>}
        <button style={{...S.btnF(),opacity:loading?0.5:1}} onClick={tab==="login"?login:register} disabled={loading}>
          {loading?"LOADING...":(tab==="login"?"ENTER THE DOMINION":"JOIN THE UNDERWORLD")}
        </button>
      </div>
    </div>
  );
}

// DAILY LOGIN
function DailyModal({player,onClaim,onClose}){
  const streak=Math.min(7,player.loginStreak||1);
  const reward=DAILY[streak];
  return(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998}}>
      <div style={{background:C.card,border:`1px solid ${C.gold}44`,borderRadius:10,padding:32,maxWidth:360,width:"100%",textAlign:"center"}}>
        <div style={{color:C.gold,fontSize:22,fontWeight:900,letterSpacing:3,marginBottom:4}}>DAILY REWARD</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:20}}>Login Streak: Day {streak}</div>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:24}}>
          {[1,2,3,4,5,6,7].map(d=>(<div key={d} style={{width:36,height:36,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:d<streak?`${C.gold}33`:d===streak?C.gold:"#14141e",color:d<streak?C.gold:d===streak?"#000":C.dim,border:`1px solid ${d<=streak?C.gold:C.dim}`}}>{d}</div>))}
        </div>
        <div style={{color:C.gold,fontSize:20,fontWeight:900,marginBottom:6}}>{reward.label}</div>
        {reward.itemId&&<div style={{color:C.orange,fontSize:12,marginBottom:16}}>+ {ITEMS.find(i=>i.id===reward.itemId)?.name}</div>}
        <button style={S.btnF(C.gold,"#2a1f00")} onClick={()=>onClaim(reward)}>CLAIM REWARD</button>
        <div style={{marginTop:10,color:C.muted,fontSize:10,cursor:"pointer"}} onClick={onClose}>skip for now</div>
      </div>
    </div>
  );
}

// ANNOUNCEMENT BANNER
function AnnouncementBanner(){
  const [ann,setAnn]=useState(null);
  const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{dbGetAnnouncements().then(list=>{if(list.length>0)setAnn(list[0]);});},[]);
  if(!ann||dismissed)return null;
  return(<div style={{background:"#1a0e00",border:`1px solid ${C.orange}44`,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
    <span>📢 <span style={{color:C.orange,fontWeight:700}}>ANNOUNCEMENT:</span> <span style={{color:C.text}}>{ann.text}</span></span>
    <button style={{...S.btn(C.muted,"transparent"),padding:"2px 8px",fontSize:10}} onClick={()=>setDismissed(true)}>✕</button>
  </div>);
}

// PROFILE
function ProfilePage({player,onStatUp}){
  const xpN=XPL(player.level+1);
  const wpn=ITEMS.find(i=>i.id===player.equippedWeapon);
  const arm=ITEMS.find(i=>i.id===player.equippedArmor);
  const wr=player.wins+player.losses>0?((player.wins/(player.wins+player.losses))*100).toFixed(0):0;
  return(<div>
    <div style={S.card()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><div style={{color:"#fff",fontSize:22,fontWeight:900,letterSpacing:2}}>{player.name}</div><div style={{color:C.muted,fontSize:10}}>@{player.username}</div>{player.syndicate&&<div style={{marginTop:4}}><span style={S.badge(C.purple)}>🏴 {player.syndicate}</span></div>}</div>
        <div style={{textAlign:"right"}}><div style={{color:C.red,fontSize:26,fontWeight:900}}>LVL {player.level}</div><span style={S.badge(C.orange)}>⭐ {player.reputation} REP</span></div>
      </div>
      <Bar label="XP" val={player.xp} max={xpN} color={C.purple} icon="✨"/>
      <Bar label="ENERGY" val={player.energy} max={MAX_E} color={C.blue} icon="⚡"/>
      <Bar label="NERVE" val={player.nerve} max={MAX_N} color={C.orange} icon="🧠"/>
      <Bar label="HEALTH" val={player.health} max={MAX_H} color={C.green} icon="❤️"/>
      <div style={{display:"flex",gap:24,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[["CASH","$"+player.cash.toLocaleString(),C.green],["WINS",player.wins,C.blue],["LOSSES",player.losses,C.red],["WIN%",wr+"%",C.orange],["CRIMES",player.crimeStats?.total||0,C.muted]].map(([l,v,c])=>(<div key={l}><div style={{color:c,fontWeight:900,fontSize:17}}>{v}</div><div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div></div>))}
      </div>
    </div>
    <div style={S.g2}>
      <div style={S.card()}>
        <div style={S.ct}>⚔️ COMBAT STATS</div>
        {[["STR","strength",C.red],["DEF","defense",C.blue],["DEX","dexterity",C.orange]].map(([label,key,color])=>(<div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:C.muted,fontSize:11}}>{label}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color,fontWeight:900,fontSize:15}}>{player[key]}</span>{player.statPoints>0&&<button onClick={()=>onStatUp(key)} style={{...S.btn(C.green,C.greenBg),padding:"2px 8px",fontSize:10}}>+</button>}</div></div>))}
        {player.statPoints>0&&<div style={{color:C.green,fontSize:10,marginTop:6}}>● {player.statPoints} points to spend</div>}
        <div style={{borderTop:`1px solid ${C.border}`,marginTop:10,paddingTop:10}}>
          {[["ATK PWR",calcAtk(player),C.red],["DEF PWR",calcDef(player),C.blue],["HIT %",calcHit(player.dexterity,10).toFixed(0)+"%","#fff"],["CRIT %",calcCrit(player.dexterity).toFixed(1)+"%",C.orange]].map(([l,v,c])=>(<div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>))}
        </div>
      </div>
      <div style={S.card()}>
        <div style={S.ct}>🎒 LOADOUT</div>
        <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>WEAPON</div><div style={{color:wpn?C.orange:"#333",fontWeight:wpn?700:400}}>{wpn?.name||"Bare Hands"}</div>{wpn&&<div style={{color:C.muted,fontSize:10}}>+{wpn.weaponDmg} ATK</div>}</div>
        <div style={{marginBottom:14}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>ARMOR</div><div style={{color:arm?C.blue:"#333",fontWeight:arm?700:400}}>{arm?.name||"None"}</div>{arm&&<div style={{color:C.muted,fontSize:10}}>+{arm.armorRating} DEF</div>}</div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>LOGIN STREAK</div><div style={{display:"flex",gap:4}}>{[1,2,3,4,5,6,7].map(d=>(<div key={d} style={{width:22,height:22,borderRadius:3,background:d<=(player.loginStreak||0)?C.gold:"#14141e",border:`1px solid ${d<=(player.loginStreak||0)?C.gold:C.dim}`,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:d<=(player.loginStreak||0)?"#000":C.dim,fontWeight:700}}>{d}</div>))}</div></div>
      </div>
    </div>
  </div>);
}

// CRIMES
function CrimesPage({player,onCrime}){
  const [log,setLog]=useState([]);
  const tool=ITEMS.find(i=>i.type==="tool"&&player.inventory.includes(i.id)&&i.crimeBonus);
  const eb=tool?.crimeBonus||0;
  function commit(crime){
    if(player.nerve<crime.nerve){setLog(l=>[{txt:`❌ Not enough nerve (need ${crime.nerve})`,good:false},...l]);return;}
    const chance=Math.min(95,Math.max(5,crime.baseChance+Math.floor(player.level*1.5)+player.level+eb-crime.difficulty));
    if(Math.random()*100<=chance){
      const reward=Math.floor(crime.baseReward*(0.8+Math.random()*0.4));
      onCrime({success:true,nerveCost:crime.nerve,cash:reward,xp:crime.xp,rep:1});
      setLog(l=>[{txt:`✅ ${crime.name} — +$${reward.toLocaleString()} | +${crime.xp}xp | +1 REP`,good:true},...l.slice(0,29)]);
    }else{
      onCrime({success:false,nerveCost:crime.nerve,cash:0,xp:Math.floor(crime.xp*0.1),rep:-1});
      setLog(l=>[{txt:`❌ BUSTED — ${crime.name} | -1 REP`,good:false},...l.slice(0,29)]);
    }
  }
  return(<div>
    <div style={S.card()}><div style={S.ct}>🔪 CRIMINAL ACTIVITY</div><div style={{color:C.muted,fontSize:11}}>NERVE: <span style={{color:C.orange}}>{player.nerve}/{MAX_N}</span> · Regens 1/10min{tool&&<span style={{color:C.green,marginLeft:12}}>🔧 {tool.name} (+{eb}%)</span>}</div></div>
    {CRIMES.map(crime=>{
      const chance=Math.min(95,Math.max(5,crime.baseChance+Math.floor(player.level*1.5)+player.level+eb-crime.difficulty));
      const can=player.nerve>=crime.nerve;
      const cc=chance>=65?C.green:chance>=40?C.orange:C.red;
      return(<div key={crime.id} style={{...S.card(),opacity:can?1:0.45}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}><div style={{color:"#fff",fontWeight:700,marginBottom:3,fontSize:14}}>{crime.name}</div><div style={{color:C.muted,fontSize:11,marginBottom:8}}>{crime.desc}</div><div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}><span style={{color:C.orange}}>⚡ {crime.nerve}</span><span style={{color:C.green}}>💰 ~${crime.baseReward.toLocaleString()}</span><span style={{color:C.purple}}>✨ +{crime.xp}xp</span><span style={{color:cc}}>🎯 {chance}%</span></div></div>
          <button onClick={()=>commit(crime)} disabled={!can} style={{...S.btn(),cursor:can?"pointer":"not-allowed",marginLeft:12,opacity:can?1:0.5}}>DO IT</button>
        </div>
      </div>);
    })}
    {log.length>0&&<div style={S.card()}><div style={S.ct}>📋 CRIME LOG</div><div style={S.logB}>{log.map((l,i)=><div key={i} style={{color:l.good?C.green:C.red}}>{l.txt}</div>)}</div></div>}
  </div>);
}

// COMBAT
function CombatPage({player,onCombat}){
  const [enemy,setEnemy]=useState(null);
  const [log,setLog]=useState([]);
  const [fighting,setFighting]=useState(false);
  const [result,setResult]=useState(null);
  const [cd,setCd]=useState(0);
  const tRef=useRef(null);
  useEffect(()=>{
    if(!enemy)return;
    const last=player.attackCooldowns?.[enemy.id]||0;
    const left=Math.max(0,ATK_CD-(Date.now()-last));
    setCd(left);
    if(left>0){tRef.current=setInterval(()=>{const l2=Math.max(0,ATK_CD-(Date.now()-last));setCd(l2);if(l2===0)clearInterval(tRef.current);},500);}
    return()=>clearInterval(tRef.current);
  },[enemy,player.attackCooldowns]);
  function findEnemy(){setEnemy(newEnemy(player.level));setLog([]);setResult(null);}
  function getAT(id){const today=new Date().toDateString();if(player.lastAttackResetDate!==today)return 0;return player.attacksToday?.[id]||0;}
  function attack(){
    if(!enemy||fighting)return;
    if(player.energy<5)return setLog(["❌ Need 5 energy"]);
    const today=new Date().toDateString();
    if(getAT(enemy.id)>=MAX_APT)return setLog([`❌ Max ${MAX_APT} attacks/target/day reached`]);
    if(Date.now()-(player.attackCooldowns?.[enemy.id]||0)<ATK_CD)return setLog([`❌ Cooldown: wait ${Math.ceil((ATK_CD-(Date.now()-(player.attackCooldowns?.[enemy.id]||0)))/1000)}s`]);
    setFighting(true);
    const nl=[];let pH=player.health,eH=enemy.health,round=0;
    function tick(){
      if(pH<=0||eH<=0||round>=25){
        const won=eH<=0;
        nl.push(won?`🏆 VICTORY — +$${enemy.cash} | +${enemy.xp}xp | +2 REP`:`💀 DEFEATED — -2 REP`);
        setLog([...nl]);setResult(won?"WIN":"LOSE");
        onCombat({won,cash:won?enemy.cash:0,xp:won?enemy.xp:5,rep:won?2:-2,healthLost:player.health-pH,energyCost:5,targetId:enemy.id,today});
        setFighting(false);return;
      }
      round++;
      if(Math.random()*100<=calcHit(player.dexterity,enemy.dexterity)){
        const isCrit=Math.random()*100<=calcCrit(player.dexterity);
        let dmg=calcDmg(calcAtk(player),enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2);
        if(isCrit){dmg*=2;nl.push(`⚡ CRIT! You deal ${Math.floor(dmg)} dmg`);}
        else nl.push(`👊 R${round}: You hit for ${Math.floor(dmg)} dmg`);
        eH-=dmg;
      }else nl.push(`💨 R${round}: You missed`);
      if(eH<=0){tick();return;}
      if(Math.random()*100<=calcHit(enemy.dexterity,player.dexterity)){
        const eA=enemy.strength+(ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0)+enemy.level*2;
        const eD=enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2;
        const dmg=calcDmg(eA,calcDef(player));
        nl.push(`🔴 ${enemy.name} hits for ${Math.floor(dmg)} dmg`);pH-=dmg;
      }else nl.push(`💨 ${enemy.name} missed`);
      setLog([...nl]);setTimeout(tick,300);
    }
    tick();
  }
  const ata=enemy?getAT(enemy.id):0;
  return(<div>
    <div style={S.card()}><div style={S.ct}>⚔️ STREET COMBAT</div><div style={{color:C.muted,fontSize:11,display:"flex",gap:16,flexWrap:"wrap"}}><span>⚡ 5 energy/fight</span><span>⏱ 60s cooldown</span><span>🎯 Max 5/target/day</span></div></div>
    <div style={S.g2}>
      <div style={S.card()}><div style={S.ct}>🧍 YOU</div><div style={{color:C.muted,fontSize:11,marginBottom:8}}>{player.name} · LVL {player.level}</div>{[["ATK",calcAtk(player),C.red],["DEF",calcDef(player),C.blue],["HP",player.health,C.green],["DEX",player.dexterity,C.orange]].map(([l,v,c])=>(<div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>))}</div>
      <div style={S.card()}><div style={S.ct}>🎯 TARGET</div>{enemy?(<><div style={{color:C.red,fontWeight:700,marginBottom:8}}>{enemy.name} · LVL {enemy.level}</div>{[["ATK",enemy.strength+(ITEMS.find(i=>i.id===enemy.equippedWeapon)?.weaponDmg||0)+enemy.level*2,C.red],["DEF",enemy.defense+(ITEMS.find(i=>i.id===enemy.equippedArmor)?.armorRating||0)+enemy.level*2,C.blue],["HP",enemy.health,C.green]].map(([l,v,c])=>(<div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>))}<div style={{marginTop:8,fontSize:10,color:C.muted}}>Bounty: <span style={{color:C.gold}}>+${enemy.cash}</span><span style={{marginLeft:12,color:ata>0?C.orange:C.muted}}>Attacks: {ata}/{MAX_APT}</span></div></>):(<div style={{color:C.dim}}>No target</div>)}</div>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <button style={S.btn(C.muted,"#14141e")} onClick={findEnemy}>🔍 FIND TARGET</button>
      {enemy&&!result&&<button style={{...S.btn(),opacity:fighting||cd>0?0.5:1,cursor:fighting||cd>0?"not-allowed":"pointer"}} onClick={attack} disabled={fighting||cd>0}>{fighting?"FIGHTING...":`⚔️ ATTACK${cd>0?` (${Math.ceil(cd/1000)}s)`:""}`}</button>}
      {result&&<button style={S.btn(C.muted,"#14141e")} onClick={()=>{setEnemy(null);setResult(null);setLog([]);}}>NEW TARGET</button>}
    </div>
    {log.length>0&&<div style={S.card()}><div style={{...S.ct,marginBottom:8}}>⚔️ BATTLE LOG {result&&<span style={S.badge(result==="WIN"?C.green:C.red)}>{result}</span>}</div><div style={S.logB}>{log.map((l,i)=>(<div key={i} style={{color:l.includes("You hit")||l.includes("CRIT")||l.includes("VICTORY")?C.green:l.includes("missed")?C.muted:C.red}}>{l}</div>))}</div></div>}
  </div>);
}

// INVENTORY
function InventoryPage({player,onBuy,onEquip}){
  const [tab,setTab]=useState("inventory");
  return(<div>
    <Tabs tabs={["inventory","shop"]} active={tab} onSelect={setTab}/>
    {tab==="inventory"&&<div style={S.card()}><div style={S.ct}>🎒 YOUR GEAR ({player.inventory.length})</div>{player.inventory.length===0&&<div style={{color:C.dim}}>No items. Visit the shop.</div>}{player.inventory.map(id=>{const item=ITEMS.find(i=>i.id===id);if(!item)return null;const isEqW=player.equippedWeapon===id,isEqA=player.equippedArmor===id,isEq=isEqW||isEqA;return(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{color:isEq?C.green:"#fff",fontWeight:700}}>{item.name} {isEq&&"✓"} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div>{isEq?<span style={S.badge(C.green)}>EQUIPPED</span>:(item.type==="weapon"||item.type==="armor")&&<button style={S.btn(C.green,C.greenBg)} onClick={()=>onEquip(item)}>EQUIP</button>}</div>);})}</div>}
    {tab==="shop"&&<div><div style={{color:C.green,fontSize:13,marginBottom:12,fontWeight:700}}>💰 ${player.cash.toLocaleString()}</div>{["weapon","armor","tool"].map(type=>(<div key={type} style={S.card()}><div style={S.ct}>{type==="weapon"?"⚔️":type==="armor"?"🛡️":"🔧"} {type.toUpperCase()}S</div>{ITEMS.filter(i=>i.type===type).map(item=>{const owned=player.inventory.includes(item.id),can=player.cash>=item.price;return(<div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{color:"#fff"}}>{item.name} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div><div style={{textAlign:"right"}}><div style={{color:C.green,fontSize:13,marginBottom:4}}>${item.price.toLocaleString()}</div>{owned?<span style={S.badge(C.green)}>OWNED</span>:<button style={{...S.btn(C.orange,"#3a1a00"),opacity:can?1:0.4,cursor:can?"pointer":"not-allowed"}} onClick={()=>onBuy(item)} disabled={!can}>BUY</button>}</div></div>);})}</div>))}</div>}
  </div>);
}

// SYNDICATES
function SyndicatesPage({player,onCreate,onJoin,onLeave,onContribute}){
  const [syndicates,setSyndicates]=useState([]);
  const [tab,setTab]=useState("list");
  const [newName,setNewName]=useState("");
  const [newTag,setNewTag]=useState("");
  const [confirm,setConfirm]=useState(null);
  const [amt,setAmt]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{dbGetSyndicates().then(setSyndicates);},[]);
  function refresh(){dbGetSyndicates().then(setSyndicates);}
  async function create(){
    if(player.level<10)return alert("Need Level 10");
    if(player.cash<500000)return alert("Need $500,000");
    if(!newName.trim())return alert("Enter a name");
    if(syndicates.find(s=>s.name===newName.trim()))return alert("Name taken");
    setLoading(true);
    const s={name:newName.trim(),tag:(newTag||newName.slice(0,4)).toUpperCase(),leader:player.username,members:[player.username],level:1,xp:0,treasury:0,founded:Date.now()};
    await dbSaveSyndicate(s);
    refresh();onCreate(s);setNewName("");setNewTag("");setLoading(false);
  }
  function join(s){
    if(player.syndicate)return alert("Leave your current syndicate first");
    setConfirm({msg:`Join "${s.name}"?`,action:async()=>{
      const updated={...s,members:[...s.members,player.username]};
      await dbSaveSyndicate(updated);refresh();onJoin(s);
    }});
  }
  function leave(){
    setConfirm({msg:`Leave "${player.syndicate}"?`,action:async()=>{
      const syn=syndicates.find(x=>x.name===player.syndicate);
      if(syn){await dbSaveSyndicate({...syn,members:syn.members.filter(m=>m!==player.username)});refresh();}
      onLeave();
    }});
  }
  async function contribute(){
    const a=parseInt(amt);
    if(!a||a<100||a>player.cash)return alert("Min $100");
    const syn=syndicates.find(x=>x.name===player.syndicate);
    if(syn){await dbSaveSyndicate({...syn,treasury:syn.treasury+a});refresh();}
    onContribute(a);setAmt("");
  }
  const mySyn=syndicates.find(s=>s.name===player.syndicate);
  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}
    <Tabs tabs={["list","create"]} active={tab} onSelect={setTab}/>
    {tab==="list"&&<div>
      {mySyn&&<div style={{...S.card(),borderColor:C.purple+"44"}}>
        <div style={S.ct}>🏴 YOUR SYNDICATE</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{color:"#fff",fontSize:18,fontWeight:900}}>{mySyn.name} <span style={S.badge(C.purple)}>[{mySyn.tag}]</span></div><div style={{color:C.muted,fontSize:11,marginTop:4}}>Leader: {mySyn.leader} · {mySyn.members.length} members · Lvl {mySyn.level}</div><div style={{color:C.gold,fontSize:12,marginTop:4}}>Treasury: ${mySyn.treasury.toLocaleString()}</div></div>
          {mySyn.leader!==player.username&&<button style={S.btn(C.red,C.redBg)} onClick={leave}>LEAVE</button>}
        </div>
        <div style={{marginTop:12,display:"flex",gap:8}}><input style={{...S.inp,marginBottom:0,flex:1}} type="number" placeholder="Contribute $..." value={amt} onChange={e=>setAmt(e.target.value)}/><button style={S.btn(C.gold,"#2a1f00")} onClick={contribute}>CONTRIBUTE</button></div>
        <div style={{color:C.muted,fontSize:10,marginTop:6}}>5% of crime earnings auto-contributed</div>
      </div>}
      {syndicates.filter(s=>s.name!==player.syndicate).map(s=>(<div key={s.name} style={S.card()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"#fff",fontWeight:700,fontSize:15}}>{s.name} <span style={S.badge(C.purple)}>[{s.tag}]</span></div><div style={{color:C.muted,fontSize:11,marginTop:3}}>Leader: {s.leader} · {s.members.length} members · 💰${s.treasury.toLocaleString()}</div></div>{!player.syndicate&&<button style={S.btn(C.green,C.greenBg)} onClick={()=>join(s)}>JOIN</button>}</div></div>))}
      {syndicates.length===0&&<div style={{...S.card(),color:C.dim}}>No syndicates yet.</div>}
    </div>}
    {tab==="create"&&<div style={S.card()}>
      <div style={S.ct}>🏴 FOUND A SYNDICATE</div>
      <div style={{display:"flex",gap:8,marginBottom:10,color:C.muted,fontSize:11}}><span>Level: <span style={{color:player.level>=10?C.green:C.red}}>{player.level}/10</span></span><span>Cash: <span style={{color:player.cash>=500000?C.green:C.red}}>${player.cash.toLocaleString()}/$500k</span></span></div>
      <input style={S.inp} placeholder="Syndicate Name" value={newName} onChange={e=>setNewName(e.target.value)}/>
      <input style={S.inp} placeholder="Tag (4 chars)" maxLength={4} value={newTag} onChange={e=>setNewTag(e.target.value)}/>
      <button style={{...S.btnF(),opacity:(player.level>=10&&player.cash>=500000&&!loading)?1:0.4}} onClick={create} disabled={player.level<10||player.cash<500000||loading}>{loading?"CREATING...":"FOUND SYNDICATE — $500,000"}</button>
    </div>}
  </div>);
}

// LEADERBOARD
function LeaderboardPage({player}){
  const [tab,setTab]=useState("players");
  const [players,setPlayers]=useState([]);
  const [syndicates,setSyndicates]=useState([]);
  useEffect(()=>{
    dbAllPlayers().then(ps=>setPlayers(ps.sort((a,b)=>b.level-a.level||b.reputation-a.reputation)));
    dbGetSyndicates().then(ss=>setSyndicates(ss.sort((a,b)=>b.level-a.level||b.treasury-a.treasury)));
  },[]);
  return(<div>
    <Tabs tabs={["players","syndicates"]} active={tab} onSelect={setTab}/>
    {tab==="players"&&<div style={S.card()}>
      <div style={S.ct}>🏆 TOP PLAYERS</div>
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 50px 55px 70px 55px",gap:6,color:C.dim,fontSize:9,letterSpacing:1,marginBottom:8,padding:"0 4px"}}><span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span><span>W/L</span></div>
      {players.length===0&&<div style={{color:C.dim}}>Loading...</div>}
      {players.slice(0,100).map((p,i)=>(<div key={p.username} style={{display:"grid",gridTemplateColumns:"28px 1fr 50px 55px 70px 55px",gap:6,padding:"8px 4px",borderBottom:`1px solid ${C.border}`,background:p.username===player.username?C.redBg:"transparent",borderRadius:2}}>
        <span style={{color:i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.muted,fontWeight:i<3?900:400}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
        <span style={{color:p.username===player.username?C.red:"#fff",fontWeight:700,fontSize:12}}>{p.name}{p.username===player.username&&" 👈"}</span>
        <span style={{color:C.purple,fontWeight:700}}>{p.level}</span>
        <span style={{color:C.orange}}>{p.reputation}</span>
        <span style={{color:C.green,fontSize:10}}>${Math.floor(p.cash/1000)}k</span>
        <span style={{color:C.muted,fontSize:10}}>{p.wins}/{p.losses}</span>
      </div>))}
    </div>}
    {tab==="syndicates"&&<div style={S.card()}>
      <div style={S.ct}>🏴 TOP SYNDICATES</div>
      {syndicates.length===0&&<div style={{color:C.dim}}>No syndicates yet.</div>}
      {syndicates.map((s,i)=>(<div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"10px 4px",borderBottom:`1px solid ${C.border}`,background:s.name===player.syndicate?C.redBg:"transparent"}}>
        <div><span style={{color:i===0?C.gold:C.muted,marginRight:10,fontWeight:900}}>{i+1}</span><span style={{color:"#fff",fontWeight:700}}>{s.name}</span><span style={{...S.badge(C.purple),marginLeft:8}}>[{s.tag}]</span></div>
        <div style={{textAlign:"right",fontSize:11}}><div style={{color:C.purple}}>Lvl {s.level} · {s.members.length} members</div><div style={{color:C.gold}}>💰 ${s.treasury.toLocaleString()}</div></div>
      </div>))}
    </div>}
  </div>);
}


// GYM
const GYMS=[
  {id:"street",name:"Street Gym",      base:5,  mult:1.0,cost:10, unlockLevel:1, desc:"Rusted weights in an alley."},
  {id:"local", name:"Local Gym",       base:10, mult:1.5,cost:20, unlockLevel:5, desc:"A proper gym with real equipment."},
  {id:"pro",   name:"Professional Gym",base:20, mult:2.0,cost:50, unlockLevel:15,desc:"Coaches and serious athletes."},
  {id:"elite", name:"Elite Gym",       base:35, mult:3.0,cost:100,unlockLevel:30,desc:"Private trainers, top machines."},
  {id:"lab",   name:"Underground Lab", base:50, mult:4.0,cost:200,unlockLevel:50,desc:"No rules. Maximum gains. Legends only."},
];
const TSTATS=[
  {id:"strength", name:"Strength", icon:"💪",desc:"Increases attack power"},
  {id:"defense",  name:"Defense",  icon:"🛡️",desc:"Reduces damage taken"},
  {id:"dexterity",name:"Dexterity",icon:"⚡",desc:"Hit chance & crit rate"},
  {id:"speed",    name:"Speed",    icon:"💨",desc:"Dodge chance in combat"},
  {id:"stamina",  name:"Stamina",  icon:"❤️",desc:"Increases max health"},
];
// Shadow Dominion Gym Formula:
// Gain = (BaseGymValue × √Reputation × GymMultiplier × BonusMultiplier) ÷ (1 + CurrentStat/500000)
function gymGain(cur, base, mult, reputation, bonuses){
  const repBonus = Math.sqrt(Math.max(1, reputation));
  const bonusMult = (bonuses.education||1) * (bonuses.syndicate||1) * (bonuses.property||1) * (bonuses.company||1) * (bonuses.event||1);
  const raw = (base * repBonus * mult * bonusMult) / (1 + (cur / 500000));
  return Math.max(1, parseFloat(raw.toFixed(2)));
}

function GymPage({player,onTrain}){
  const [selGym,setSelGym]=useState("street");
  const [log,setLog]=useState([]);
  const gym=GYMS.find(g=>g.id===selGym);
  // Bonus multipliers — will expand when education/property/events added
  const bonuses={education:1,syndicate:player.syndicate?1.15:1,property:1,company:1,event:1};
  const bonusMult=parseFloat((bonuses.education*bonuses.syndicate*bonuses.property*bonuses.company*bonuses.event).toFixed(3));
  const repSqrt=parseFloat(Math.sqrt(Math.max(1,player.reputation)).toFixed(2));

  function train(statId){
    if(player.energy<gym.cost){setLog(l=>[{txt:"❌ Not enough energy (need "+gym.cost+"⚡)",good:false},...l]);return;}
    const cur=parseFloat(player[statId])||10;
    const gain=gymGain(cur,gym.base,gym.mult,player.reputation,bonuses);
    const stat=TSTATS.find(s=>s.id===statId);
    onTrain({statId,gain,energyCost:gym.cost});
    setLog(l=>[{txt:stat.icon+" "+stat.name+" +"+gain.toLocaleString()+" → "+(cur+gain).toLocaleString()+" ["+gym.name+"]",good:true},...l.slice(0,49)]);
  }

  return(<div>
    <div style={S.card()}>
      <div style={S.ct}>🏋️ GYM</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:8}}>Energy: <span style={{color:C.blue}}>{Math.floor(player.energy)}/{MAX_E}</span> · Gains INCREASE with reputation · Higher stats = even bigger gains</div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:11}}>
        <span>⭐ REP Bonus: <span style={{color:C.gold,fontWeight:700}}>√{player.reputation} = ×{repSqrt}</span></span>
        <span>🎯 Bonus Mult: <span style={{color:C.green,fontWeight:700}}>×{bonusMult}</span></span>
        {player.syndicate&&<span style={{color:C.purple}}>🏴 Syndicate: ×1.15</span>}
      </div>
    </div>
    <div style={S.card()}>
      <div style={S.ct}>SELECT GYM</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {GYMS.map(g=>{
          const unlocked=player.level>=g.unlockLevel;
          const active=selGym===g.id;
          return(<div key={g.id} onClick={()=>unlocked&&setSelGym(g.id)} style={{padding:"12px",borderRadius:6,border:"1px solid "+(active?C.orange:unlocked?C.border:C.dim),background:active?"#1a0e00":"#0d0d18",cursor:unlocked?"pointer":"not-allowed",opacity:unlocked?1:0.4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{color:active?C.orange:"#fff",fontWeight:700}}>{g.name}{active?" ✓":""}</div><div style={{color:C.muted,fontSize:10,marginTop:2}}>{g.desc}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:C.gold,fontWeight:900}}>×{g.mult} · Base {g.base}</div><div style={{color:C.blue,fontSize:10}}>{g.cost}⚡/session</div>{!unlocked&&<span style={S.badge(C.red)}>LVL {g.unlockLevel}</span>}</div>
            </div>
          </div>);
        })}
      </div>
    </div>
    <div style={S.card()}>
      <div style={S.ct}>TRAIN AT {gym.name.toUpperCase()} <span style={S.badge(C.gold)}>×{gym.mult}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {TSTATS.map(stat=>{
          const cur=parseFloat(player[stat.id])||10;
          const preview=gymGain(cur,gym.base,gym.mult,player.reputation,bonuses);
          const canT=player.energy>=gym.cost;
          return(<div key={stat.id} style={{background:"#0a0a14",border:"1px solid "+C.border,borderRadius:6,padding:12}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:13,marginBottom:2}}>{stat.icon} {stat.name}</div>
            <div style={{color:C.muted,fontSize:10,marginBottom:6}}>{stat.desc}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{color:C.purple,fontWeight:900,fontSize:15}}>{(cur||0).toLocaleString()}</span>
              <span style={{color:C.green,fontSize:11}}>+{preview.toLocaleString()}</span>
            </div>
            <button onClick={()=>train(stat.id)} disabled={!canT} style={{...S.btnF(canT?C.green:C.muted,canT?C.greenBg:"#14141e"),fontSize:10,padding:"7px",opacity:canT?1:0.5,cursor:canT?"pointer":"not-allowed"}}>TRAIN ({gym.cost}⚡)</button>
          </div>);
        })}
      </div>
    </div>
    {log.length>0&&<div style={S.card()}><div style={S.ct}>📋 TRAINING LOG</div><div style={S.logB}>{log.map((l,i)=><div key={i} style={{color:l.good?C.green:C.red}}>{l.txt}</div>)}</div></div>}
  </div>);
}


// MAIN GAME
const NAV=[{id:"profile",icon:"👤",label:"PROFILE"},{id:"crimes",icon:"🔪",label:"CRIMES"},{id:"combat",icon:"⚔️",label:"COMBAT"},{id:"gym",icon:"🏋️",label:"GYM"},{id:"inventory",icon:"🎒",label:"INVENTORY"},{id:"syndicates",icon:"🏴",label:"SYNDICATES"},{id:"leaderboard",icon:"🏆",label:"LEADERBOARD"}];

function Game({initialPlayer,onLogout}){
  const [player,setPlayer]=useState(initialPlayer);
  const [page,setPage]=useState("profile");
  const [toast,setToast]=useState(null);
  const [showDaily,setShowDaily]=useState(!initialPlayer.loginRewardClaimed);
  const notify=msg=>setToast(msg);

  useEffect(()=>{
    const id=setInterval(()=>{
      setPlayer(p=>{
        let u={...p};
        const eR=regenE(p.lastEnergyRegen),nR=regenN(p.lastNerveRegen),hR=regenH(p.lastHealthRegen);
        if(eR>0){u.energy=Math.min(MAX_E,p.energy+eR);u.lastEnergyRegen=Date.now();}
        if(nR>0){u.nerve=Math.min(MAX_N,p.nerve+nR);u.lastNerveRegen=Date.now();}
        if(hR>0){u.health=Math.min(MAX_H,p.health+hR);u.lastHealthRegen=Date.now();}
        return u;
      });
    },10000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{dbSavePlayer(player.username,player);},[player]);

  function lvlUp(p){
    let u={...p};
    while(u.xp>=XPL(u.level+1)){u.xp-=XPL(u.level+1);u.level+=1;u.statPoints=(u.statPoints||0)+3;notify(`🆙 LEVEL UP! Now Level ${u.level} — +3 stat points!`);}
    return u;
  }

  function handleDaily(reward){
    setPlayer(p=>{let u={...p,cash:p.cash+reward.cash,loginRewardClaimed:true};if(reward.itemId&&!p.inventory.includes(reward.itemId))u.inventory=[...p.inventory,reward.itemId];return u;});
    notify(`🎁 Day ${player.loginStreak} reward: +$${reward.cash.toLocaleString()}${reward.itemId?" + "+ITEMS.find(i=>i.id===reward.itemId)?.name:""}`);
    setShowDaily(false);
  }

  function handleCrime({success,nerveCost,cash,xp,rep}){
    setPlayer(p=>{
      let treasury=0;
      if(p.syndicate&&cash>0){
        treasury=Math.floor(cash*0.05);
        dbGetSyndicates().then(ss=>{const syn=ss.find(s=>s.name===p.syndicate);if(syn)dbSaveSyndicate({...syn,treasury:syn.treasury+treasury,xp:(syn.xp||0)+Math.floor(xp*0.05)});});
      }
      return lvlUp({...p,nerve:Math.max(0,p.nerve-nerveCost),cash:p.cash+cash-treasury,xp:p.xp+xp,reputation:Math.max(0,p.reputation+rep),crimeStats:{total:(p.crimeStats?.total||0)+1,success:(p.crimeStats?.success||0)+(success?1:0)}});
    });
  }

  function handleCombat({won,cash,xp,rep,healthLost,energyCost,targetId,today}){
    setPlayer(p=>{
      const cds={...p.attackCooldowns,[targetId]:Date.now()};
      const atks=p.lastAttackResetDate===today?{...(p.attacksToday||{})}:{};
      atks[targetId]=(atks[targetId]||0)+1;
      return lvlUp({...p,energy:Math.max(0,p.energy-energyCost),health:Math.max(1,p.health-Math.floor(healthLost)),cash:p.cash+cash,xp:p.xp+xp,reputation:Math.max(0,p.reputation+rep),wins:p.wins+(won?1:0),losses:p.losses+(won?0:1),attackCooldowns:cds,attacksToday:atks,lastAttackResetDate:today});
    });
  }

  function handleBuy(item){
    if(player.cash<item.price)return notify("❌ Not enough cash");
    if(player.inventory.includes(item.id))return notify("❌ Already owned");
    setPlayer(p=>({...p,cash:p.cash-item.price,inventory:[...p.inventory,item.id]}));
    notify(`✅ BOUGHT ${item.name}`);
  }

  function handleEquip(item){
    setPlayer(p=>({...p,equippedWeapon:item.type==="weapon"?item.id:p.equippedWeapon,equippedArmor:item.type==="armor"?item.id:p.equippedArmor}));
    notify(`✅ EQUIPPED ${item.name}`);
  }

  function handleStatUp(stat){
    if(!player.statPoints)return;
    setPlayer(p=>({...p,[stat]:p[stat]+1,statPoints:p.statPoints-1}));
  }

  function handleTrain({statId,gain,energyCost}){
    setPlayer(p=>{
      const cur=parseFloat(p[statId])||10;
      const nv=parseFloat((cur+gain).toFixed(2));
      return {...p,[statId]:nv,energy:Math.max(0,p.energy-energyCost)};
    });
  }
  function handleCreate(s){setPlayer(p=>({...p,cash:p.cash-500000,syndicate:s.name,syndicateRole:"leader"}));notify(`🏴 FOUNDED: ${s.name}`);}
  function handleJoin(s){setPlayer(p=>({...p,syndicate:s.name,syndicateRole:"member"}));notify(`✅ JOINED ${s.name}`);}
  function handleLeave(){setPlayer(p=>({...p,syndicate:null,syndicateRole:null}));notify("🚪 Left syndicate");}
  function handleContribute(a){setPlayer(p=>({...p,cash:p.cash-a}));notify(`✅ Contributed $${a.toLocaleString()}`);}

  return(<div style={S.app}>
    {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
    {showDaily&&!player.loginRewardClaimed&&<DailyModal player={player} onClaim={handleDaily} onClose={()=>setShowDaily(false)}/>}
    <div style={{display:"flex",minHeight:"100vh"}}>
      <div style={S.sb}>
        <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:C.red,fontSize:16,fontWeight:900,letterSpacing:4,textShadow:`0 0 12px ${C.red}66`}}>SHADOW</div>
          <div style={{color:C.red,fontSize:16,fontWeight:900,letterSpacing:4,textShadow:`0 0 12px ${C.red}66`}}>DOMINION</div>
          <div style={{color:C.dim,fontSize:9,letterSpacing:2,marginTop:2}}>ALPHA v0.1</div>
        </div>
        <div style={{padding:"10px 14px 12px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:"#fff",fontSize:13,fontWeight:700}}>{player.name}</div>
          <div style={{color:C.muted,fontSize:10}}>LVL {player.level} · ⭐{player.reputation}</div>
          <div style={{color:C.green,fontSize:12,marginTop:2}}>${player.cash.toLocaleString()}</div>
        </div>
        <div style={{flex:1,paddingTop:6}}>
          {NAV.map(n=>(<div key={n.id} style={S.nav(page===n.id)} onClick={()=>setPage(n.id)}><span>{n.icon}</span><span style={{fontSize:10,letterSpacing:1}}>{n.label}</span></div>))}
        </div>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
          <Bar label="ENERGY" val={player.energy} max={MAX_E} color={C.blue} icon="⚡"/>
          <Bar label="NERVE" val={player.nerve} max={MAX_N} color={C.orange} icon="🧠"/>
          <Bar label="HEALTH" val={player.health} max={MAX_H} color={C.green} icon="❤️"/>
          {!player.loginRewardClaimed&&<button style={{...S.btnF(C.gold,"#2a1f00"),marginTop:8,fontSize:9}} onClick={()=>setShowDaily(true)}>🎁 CLAIM DAILY</button>}
          <button onClick={onLogout} style={{...S.btnF(C.muted,"#14141e"),marginTop:6,fontSize:9}}>LOGOUT</button>
        </div>
      </div>
      <div style={{flex:1,width:"70%",padding:20,overflowY:"auto"}}>
        <div style={{color:C.muted,fontSize:10,letterSpacing:2,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</span>
          <span style={{color:C.dim}}>⚡{Math.floor(player.energy)} 🧠{Math.floor(player.nerve)} ❤️{Math.floor(player.health)}</span>
        </div>
        {page==="profile"    &&<ProfilePage   player={player} onStatUp={handleStatUp}/>}
        {page==="crimes"     &&<CrimesPage    player={player} onCrime={handleCrime}/>}
        {page==="combat"     &&<CombatPage    player={player} onCombat={handleCombat}/>}
        {page==="gym"        &&<GymPage player={player} onTrain={handleTrain}/>}
        {page==="inventory"  &&<InventoryPage player={player} onBuy={handleBuy} onEquip={handleEquip}/>}
        {page==="syndicates" &&<SyndicatesPage player={player} onCreate={handleCreate} onJoin={handleJoin} onLeave={handleLeave} onContribute={handleContribute}/>}
        {page==="leaderboard"&&<LeaderboardPage player={player}/>}
      </div>
    </div>
  </div>);
}

// ROOT
export default function App(){
  const [player,setPlayer]=useState(null);
  const [adminAuthed,setAdminAuthed]=useState(false);
  const isAdmin=window.location.hash==="#admin";
  if(isAdmin){
    if(!adminAuthed)return<AdminLogin onLogin={()=>setAdminAuthed(true)}/>;
    return<AdminPanel onLogout={()=>{setAdminAuthed(false);window.location.hash="";}}/>;
  }
  if(!player)return<AuthPage onLogin={setPlayer}/>;
  return(<div><AnnouncementBanner/><Game initialPlayer={player} onLogout={()=>setPlayer(null)}/></div>);
}
