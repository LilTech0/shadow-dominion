import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { getSyndicates, saveSyndicates } from "../services/storage";
import { getSB, sbInsert } from "../services/supabase";
import { calcAttack } from "../services/combat";

function SyndicateWarsPage({ player, onlineUsers, notify }) {
  const [wars, setWars]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [declaring, setDeclaring] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [tab, setTab]           = useState("active");

  const syndicates  = getSyndicates();
  const mySyn       = syndicates.find(s=>s.name===player.syndicate);
  const isLeader    = mySyn?.leader===player.username;
  const isOfficer   = (mySyn?.officers||[]).includes(player.username);
  const canDeclare  = isLeader||isOfficer;

  async function loadWars() {
    setLoading(true);
    const { data, error } = await getSB().from("syndicate_wars").select("*").order("created_at",{ascending:false}).limit(30);
    if(!error) setWars(data||[]);
    setLoading(false);
  }

  useEffect(()=>{ loadWars(); },[]);

  // Real-time score updates
  useEffect(()=>{
    const ch = getSB().channel("wars-live")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"syndicate_wars"},()=>loadWars())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"syndicate_wars"},()=>loadWars())
      .subscribe();
    return ()=>ch.unsubscribe();
  },[]);

  async function declareWar(enemySyn) {
    if((mySyn?.treasury||0)<500000){ notify("❌ Need $500,000 in treasury"); return; }
    setDeclaring(true);
    const err = await sbInsert("syndicate_wars",{
      attacker_syndicate: mySyn.name,
      defender_syndicate: enemySyn.name,
      attacker_score: 0, defender_score: 0,
      status: "active",
      ends_at: new Date(Date.now()+86400000).toISOString(),
      declared_by: player.username,
    });
    if(err){ notify("❌ "+err.message); setDeclaring(false); return; }
    const updated = syndicates.map(s=>s.name===mySyn.name?{...s,treasury:(s.treasury||0)-500000,wars:(s.wars||0)+1}:s);
    saveSyndicates(updated);
    notify("⚔ WAR DECLARED on "+enemySyn.name+"!");
    setDeclaring(false); setTab("active"); loadWars();
  }

  async function strike(war) {
    if(player.energy<10){ notify("❌ Need 10 energy to strike"); return; }
    const isAtk = war.attacker_syndicate===player.syndicate;
    const dmg   = Math.floor(5+Math.random()*15+(player.level||1)*0.5+calcAttack(player)*0.1);
    const field  = isAtk?"attacker_score":"defender_score";
    const cur    = isAtk?war.attacker_score:war.defender_score;
    await getSB().from("syndicate_wars").update({[field]:cur+dmg}).eq("id",war.id);
    await sbInsert("war_events",{
      war_id: war.id,
      attacker_syndicate: player.syndicate,
      defender_syndicate: isAtk?war.defender_syndicate:war.attacker_syndicate,
      attacker_name: player.name, damage: dmg,
      created_at: new Date().toISOString(),
    });
    notify("⚔ Strike! +"+dmg+" war points");
    loadWars();
  }

  function fmtLeft(endsAt) {
    const ms=new Date(endsAt)-Date.now();
    if(ms<=0) return "ENDED";
    const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
    return h+"h "+m+"m left";
  }

  const myWars    = wars.filter(w=>w.attacker_syndicate===player.syndicate||w.defender_syndicate===player.syndicate);
  const activeWars= myWars.filter(w=>w.status==="active"&&new Date(w.ends_at)>new Date());
  const pastWars  = myWars.filter(w=>w.status!=="active"||new Date(w.ends_at)<=new Date());
  const otherSyns = syndicates.filter(s=>s.name!==player.syndicate);

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}

    {!player.syndicate&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:28}}>
      <div style={{fontSize:28,marginBottom:10}}>⚔</div>
      Join a syndicate to participate in wars.
    </div>}

    {player.syndicate&&<div>
      {/* Header card */}
      <div style={S.card({borderColor:C.red+"44",background:"#0e0404"})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{color:C.red,fontWeight:900,fontSize:16,letterSpacing:2}}>⚔ WAR ROOM</div>
            <div style={{color:C.muted,fontSize:11,marginTop:2}}>🏴 {player.syndicate}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:activeWars.length>0?C.red:C.muted,fontWeight:900,fontSize:20}}>{activeWars.length}</div>
            <div style={{color:C.muted,fontSize:9}}>ACTIVE WARS</div>
          </div>
        </div>
        <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
          <span style={{color:C.gold}}>💰 Treasury: ${(mySyn?.treasury||0).toLocaleString()}</span>
          <span style={{color:C.muted}}>War cost: $500,000</span>
          {canDeclare&&<span style={S.badge(C.orange)}>{isLeader?"👑 LEADER":"⭐ OFFICER"}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
        {["active","declare","history"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.red:"#0d140d",border:`1px solid ${tab===t?C.red:C.border}`,borderRadius:4,color:tab===t?"#fff":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400,position:"relative"}}>
            {t==="active"?"⚔ ACTIVE":t==="declare"?"📣 DECLARE":"📋 HISTORY"}
            {t==="active"&&activeWars.length>0&&<span style={{marginLeft:5,background:C.red,color:"#fff",borderRadius:8,fontSize:8,padding:"1px 5px",fontWeight:900}}>{activeWars.length}</span>}
          </button>
        ))}
      </div>

      {/* ACTIVE WARS */}
      {tab==="active"&&<div>
        {loading&&<div style={{color:C.muted,padding:20,textAlign:"center",fontSize:12}}>Loading wars...</div>}
        {!loading&&activeWars.length===0&&<div style={{...S.card(),textAlign:"center",padding:28}}>
          <div style={{fontSize:28,marginBottom:8}}>🕊</div>
          <div style={{color:C.muted,fontSize:12}}>No active wars.</div>
          <button style={{...S.btn(C.red,C.redBg),marginTop:12}} onClick={()=>setTab("declare")}>DECLARE WAR →</button>
        </div>}
        {activeWars.map(war=>{
          const isAtk=war.attacker_syndicate===player.syndicate;
          const myScore=isAtk?war.attacker_score:war.defender_score;
          const theirScore=isAtk?war.defender_score:war.attacker_score;
          const enemy=isAtk?war.defender_syndicate:war.attacker_syndicate;
          const total=myScore+theirScore||1;
          const myPct=Math.min(100,Math.round((myScore/total)*100));
          const winning=myScore>=theirScore;
          return(<div key={war.id} style={S.card({borderColor:C.red+"55",background:"#0e0404"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{color:"#fff",fontWeight:900,fontSize:14}}>{mySyn?.name} <span style={{color:C.red}}>vs</span> {enemy}</div>
                <div style={{color:C.muted,fontSize:10,marginTop:2}}>⏱ {fmtLeft(war.ends_at)}</div>
                <div style={{color:C.dim,fontSize:9,marginTop:1}}>Declared by {war.declared_by}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:winning?C.green:C.red,fontWeight:900,fontSize:22}}>{winning?"WINNING":"LOSING"}</div>
                <div style={{color:C.muted,fontSize:9}}>{myScore} vs {theirScore} pts</div>
              </div>
            </div>
            {/* Score bar */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}>
                <span style={{color:C.green,fontWeight:700}}>{mySyn?.name}: {myScore}</span>
                <span style={{color:C.red,fontWeight:700}}>{enemy}: {theirScore}</span>
              </div>
              <div style={{display:"flex",borderRadius:4,overflow:"hidden",height:18,border:`1px solid ${C.border}`}}>
                <div style={{width:myPct+"%",background:`linear-gradient(90deg,${C.green}88,${C.green})`,transition:"width 0.5s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:900,minWidth:myPct>10?"auto":0}}>{myPct>15?myPct+"%":""}</div>
                <div style={{flex:1,background:`linear-gradient(90deg,${C.red}88,${C.red})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:900}}>{100-myPct>15?(100-myPct)+"%":""}</div>
              </div>
            </div>
            <button
              style={{...S.btnF(C.red,C.redBg),opacity:player.energy>=10?1:0.4}}
              onClick={()=>player.energy>=10
                ?setConfirm({msg:`Strike ${enemy}?

Costs 10 energy. Your attack power adds to damage dealt.`,action:()=>strike(war)})
                :notify("❌ Need 10 energy to strike")}
              disabled={player.energy<10}>
              ⚔ STRIKE {enemy.toUpperCase()} — 10 ENERGY
            </button>
            {player.energy<10&&<div style={{color:C.muted,fontSize:10,textAlign:"center",marginTop:6}}>Energy: {Math.floor(player.energy)}/50 — wait for regen</div>}
          </div>);
        })}
      </div>}

      {/* DECLARE WAR */}
      {tab==="declare"&&<div>
        {!canDeclare&&<div style={{...S.card(),color:C.muted,padding:20}}>Only syndicate leaders and officers can declare war.</div>}
        {canDeclare&&<div>
          <div style={S.card({borderColor:C.red+"33",background:"#0e0404"})}>
            <div style={S.ct}>📣 DECLARE WAR ON A SYNDICATE</div>
            <div style={{color:C.muted,fontSize:11,lineHeight:1.8}}>
              Cost: <span style={{color:(mySyn?.treasury||0)>=500000?C.green:C.red,fontWeight:700}}>$500,000</span> from treasury<br/>
              Your treasury: <span style={{color:C.gold,fontWeight:700}}>${(mySyn?.treasury||0).toLocaleString()}</span><br/>
              Duration: <span style={{color:"#fff"}}>24 hours</span><br/>
              Win condition: <span style={{color:"#fff"}}>most strike points when time expires</span>
            </div>
          </div>
          {otherSyns.length===0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:20}}>No other syndicates to war with.</div>}
          {otherSyns.map(s=>{
            const atWar=activeWars.some(w=>w.attacker_syndicate===s.name||w.defender_syndicate===s.name);
            const canAfford=(mySyn?.treasury||0)>=500000;
            return(<div key={s.name} style={S.card({borderColor:atWar?C.red+"44":C.border,opacity:atWar?0.6:1})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{color:"#fff",fontWeight:900,fontSize:14,marginBottom:3}}>{s.name}</div>
                  <div style={{color:C.muted,fontSize:10}}>Lv{s.level||1} · {s.members.length} members · 💰${(s.treasury||0).toLocaleString()}</div>
                  {atWar&&<div style={{color:C.red,fontSize:9,marginTop:3}}>⚔ ALREADY AT WAR</div>}
                </div>
                {!atWar&&<button
                  style={{...S.btn(canAfford&&canDeclare?C.red:C.muted,canAfford&&canDeclare?C.redBg:"#14141e"),opacity:canAfford&&canDeclare&&!declaring?1:0.4}}
                  disabled={!canAfford||!canDeclare||declaring}
                  onClick={()=>setConfirm({msg:`Declare war on "${s.name}"?

Cost: $500,000 from treasury
Duration: 24 hours
All members can strike to earn war points.`,action:()=>declareWar(s)})}>
                  {declaring?"...":"⚔ WAR"}
                </button>}
              </div>
            </div>);
          })}
        </div>}
      </div>}

      {/* HISTORY */}
      {tab==="history"&&<div>
        {pastWars.length===0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:20}}>No war history yet.</div>}
        {pastWars.map(war=>{
          const isAtk=war.attacker_syndicate===player.syndicate;
          const myScore=isAtk?war.attacker_score:war.defender_score;
          const theirScore=isAtk?war.defender_score:war.attacker_score;
          const won=myScore>theirScore;
          const tied=myScore===theirScore;
          const enemy=isAtk?war.defender_syndicate:war.attacker_syndicate;
          return(<div key={war.id} style={S.card({borderColor:won?C.green+"33":tied?C.orange+"33":C.red+"33"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:won?C.green:tied?C.orange:C.red,fontWeight:700,fontSize:13}}>{won?"🏆 VICTORY":tied?"🤝 DRAW":"💀 DEFEAT"} vs {enemy}</div>
                <div style={{color:C.muted,fontSize:10,marginTop:2}}>{myScore} — {theirScore} points</div>
                <div style={{color:C.dim,fontSize:9,marginTop:1}}>Declared by {war.declared_by}</div>
              </div>
              <div style={{color:C.muted,fontSize:9,textAlign:"right"}}>{new Date(war.created_at).toLocaleDateString()}</div>
            </div>
          </div>);
        })}
      </div>}
    </div>}
  </div>);
}

export default SyndicateWarsPage;
