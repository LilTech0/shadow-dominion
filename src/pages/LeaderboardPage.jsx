import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { getAccounts } from "../services/storage";

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
export default LeaderboardPage;
