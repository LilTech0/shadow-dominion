import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { CRIMES } from "../data/crimes";
import { CITIES } from "../data/cities";

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
      onCrime({success:false,nerveCost:crime.nerve,cash:0,xp:Math.floor(crime.xp*0.4),rep:-1,crimeName:crime.name});
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
export default CrimesPage;
