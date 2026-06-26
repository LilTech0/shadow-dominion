import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function JailPage({player,onBail,onBreakout}) {
  const [log,setLog]=useState([]);
  const [busy,setBusy]=useState(false);
  const [bustInput,setBustInput]=useState("");

  const inJail=player.jailUntil&&player.jailUntil>Date.now();
  const timeLeft=inJail?Math.ceil((player.jailUntil-Date.now())/60000):0;
  const bail=BAIL_COST(player.level);
  const canAffordBail=player.cash>=bail;
  const breakoutChance=Math.min(80,20+player.dexterity*0.5);
  const pct=inJail?Math.max(0,100-(timeLeft/player.jailSentence)*100):100;

  function attemptBreakout(){
    if(!inJail||busy)return;
    if(player.energy<10){setLog(l=>[`❌ Need 10 energy to attempt breakout`,...l]);return;}
    setBusy(true);
    setTimeout(()=>{
      const success=Math.random()*100<=breakoutChance;
      if(success){
        setLog(l=>[`✅ Breakout successful! You slipped past the guards.`,...l]);
        onBreakout({success:true,energyCost:10});
      } else {
        setLog(l=>[`❌ Caught trying to escape! +5 min added.`,...l]);
        onBreakout({success:false,energyCost:10,extraTime:5*60000});
      }
      setBusy(false);
    },1200);
  }

  function bustOut(){
    const uname=bustInput.trim().toLowerCase();
    if(!uname)return;
    if(player.energy<15){setLog(l=>[`❌ Need 15 energy to bust someone out`,...l]);return;}
    const accs=getAccounts();
    if(!accs[uname]){setLog(l=>[`❌ Player not found`,...l]);return;}
    const target=accs[uname].player;
    if(!target.jailUntil||target.jailUntil<=Date.now()){setLog(l=>[`❌ ${target.name} is not in jail`,...l]);return;}
    const success=Math.random()*100<=breakoutChance;
    if(success){
      accs[uname].player={...target,jailUntil:null};
      saveAccounts(accs);
      setLog(l=>[`✅ Busted ${target.name} out of jail!`,...l]);
      onBreakout({success:true,energyCost:15,bustedOut:target.name});
    } else {
      setLog(l=>[`❌ Failed to bust out ${target.name}. Guards spotted you!`,...l]);
      onBreakout({success:false,energyCost:15});
    }
    setBustInput("");
  }

  return(<div>
    {/* Status card */}
    <div style={S.card({borderColor:inJail?C.red+"55":C.green+"44"})}>
      <div style={S.ct}>🔒 JAIL STATUS</div>
      {inJail?(
        <>
          <div style={{color:C.red,fontSize:20,fontWeight:900,marginBottom:8}}>YOU ARE LOCKED UP</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:12}}>
            Time remaining: <span style={{color:"#fff",fontWeight:700}}>{timeLeft} min</span>
            <span style={{color:C.muted,marginLeft:12}}>· Sentence: {player.jailSentence} min</span>
          </div>
          <div style={{...S.barW,height:14,marginBottom:16}}>
            <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${C.red}88,${C.red})`,transition:"width 0.5s",boxShadow:`0 0 8px ${C.red}55`}}/>
            <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,textShadow:"0 0 4px #000"}}>{pct.toFixed(0)}% served</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button
              style={{...S.btn(canAffordBail?C.gold:C.muted,canAffordBail?C.goldBg:"#0d140d"),opacity:canAffordBail?1:0.4}}
              onClick={()=>canAffordBail&&onBail(bail)}
              disabled={!canAffordBail}>
              💰 PAY BAIL ${bail.toLocaleString()}
            </button>
            <button
              style={{...S.btn(C.orange,C.orangeBg),opacity:player.energy>=10&&!busy?1:0.4}}
              onClick={attemptBreakout}
              disabled={busy||player.energy<10}>
              {busy?"ATTEMPTING...":"🏃 BREAKOUT ("+breakoutChance.toFixed(0)+"%)"}
            </button>
          </div>
          <div style={{color:C.muted,fontSize:10,marginTop:10}}>
            Energy: <span style={{color:C.blue}}>{Math.floor(player.energy)}</span> · Breakout chance scales with DEX ({player.dexterity})
          </div>
        </>
      ):(
        <div style={{color:C.green,fontSize:14,fontWeight:700}}>✅ You are free. Stay out of trouble.</div>
      )}
    </div>

    {/* Bust someone out */}
    <div style={S.card()}>
      <div style={S.ct}>🤝 BUST SOMEONE OUT</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
        Costs 15 energy · {breakoutChance.toFixed(0)}% success chance based on your DEX
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          style={{...S.inp,marginBottom:0,flex:1}}
          placeholder="Their username..."
          value={bustInput}
          onChange={e=>setBustInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&bustOut()}
        />
        <button style={S.btn(C.blue,"#060e1a")} onClick={bustOut}>BUST OUT</button>
      </div>
    </div>

    {/* Stats */}
    <div style={S.card()}>
      <div style={S.ct}>📊 CRIMINAL RECORD</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[
          ["TIMES JAILED",player.timesJailed||0,C.red],
          ["BREAKOUTS",player.breakouts||0,C.green],
          ["BAIL PAID","$"+(player.bailPaid||0).toLocaleString(),C.gold],
        ].map(([l,v,c])=>(
          <div key={l}>
            <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
            <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Sentence guide */}
    <div style={S.card()}>
      <div style={S.ct}>📋 SENTENCE GUIDE</div>
      {Object.entries(JAIL_SENTENCES).map(([crime,s])=>(
        <div key={crime} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
          <span style={{color:C.muted,textTransform:"capitalize"}}>{crime}</span>
          <span style={{color:C.red,fontWeight:700}}>{s.time} min</span>
        </div>
      ))}
    </div>

    {/* Log */}
    {log.length>0&&<div style={S.card()}>
      <div style={S.ct}>📋 JAIL LOG</div>
      <div style={S.logB}>
        {log.map((l,i)=><div key={i} style={{color:l.startsWith("✅")?C.green:"#ff6e6e"}}>{l}</div>)}
      </div>
    </div>}
  </div>);
}
// ============================================================
// ADMIN LOGIN
// ============================================================
export default JailPage;
