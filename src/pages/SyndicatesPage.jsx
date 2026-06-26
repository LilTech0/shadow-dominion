import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { getSyndicates, saveAccounts, getAccounts, saveSyndicates } from "../services/storage";

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

export default SyndicatesPage;
