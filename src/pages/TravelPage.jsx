import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { CITIES, calcTravelArrival } from "../data/cities";
import { ITEMS } from "../data/items";
import { TRAVEL_COOLDOWN_MS } from "../data/constants";

function TravelPage({player, onTravel, onArrive, onCityCrime}) {
  const [tab, setTab]     = useState("map");
  const [confirm, setConfirm] = useState(null);
  const [log, setLog]     = useState([]);
  const [busy, setBusy]   = useState(false);

  const now         = Date.now();
  const city        = CITIES.find(c=>c.id===(player.currentCity||"hometown")) || CITIES[0];
  const travelling  = !!player.travellingTo;
  const destCity    = CITIES.find(c=>c.id===player.travellingTo);
  const arrivalMs   = player.travelArrival||0;
  const timeLeft    = Math.max(0, arrivalMs - now);
  const canArrive   = travelling && timeLeft <= 0;
  const cooldownLeft= player.lastTravel ? Math.max(0, TRAVEL_COOLDOWN_MS-(now-player.lastTravel)) : 0;
  const visited     = player.citiesVisited||["hometown"];

  useEffect(()=>{
    if(!canArrive) return;
    onArrive(destCity);
  },[canArrive]);

  function fmtTime(ms) {
    if(ms<=0) return "0s";
    const s=Math.floor(ms/1000);
    if(s<60) return s+"s";
    const m=Math.floor(s/60), sec=s%60;
    if(m<60) return m+"m "+sec+"s";
    return Math.floor(m/60)+"h "+m%60+"m";
  }

  function travel(dest) {
    if(travelling||cooldownLeft>0||player.cash<dest.travelCost||dest.id===city.id) return;
    setConfirm({
      msg:`Travel to ${dest.flag} ${dest.name}?\n\nCost: $${dest.travelCost.toLocaleString()}\nTravel time: ${dest.travelHours===0?"Instant":dest.travelHours+"h"}`,
      action:()=>onTravel(dest),
    });
  }

  function commitCrime(crime) {
    if(busy) return;
    const ALLCRIMES=[
      {id:"pickpocket", name:"Pickpocket",   baseChance:70,baseReward:200,  nerve:3, xp:10,  difficulty:5 },
      {id:"shoplifting",name:"Shoplifting",  baseChance:65,baseReward:400,  nerve:5, xp:20,  difficulty:10},
      {id:"mugging",    name:"Mugging",      baseChance:55,baseReward:700,  nerve:8, xp:35,  difficulty:18},
      {id:"carjacking", name:"Car Theft",    baseChance:50,baseReward:1000, nerve:12,xp:60,  difficulty:20},
      {id:"robbery",    name:"Armed Robbery",baseChance:40,baseReward:2500, nerve:18,xp:100, difficulty:30},
      {id:"heist",      name:"Bank Heist",   baseChance:25,baseReward:8000, nerve:30,xp:250, difficulty:50},
    ];
    const cr=ALLCRIMES.find(c=>c.id===crime);
    if(!cr) return;
    if(player.nerve<cr.nerve){setLog(l=>[`Not enough nerve (need ${cr.nerve})`,...l].slice(0,20));return;}
    setBusy(true);
    setTimeout(()=>{
      const chance=Math.min(95,Math.max(5,cr.baseChance+Math.floor(player.level*1.5)+(city.crimeBonus||0)-cr.difficulty));
      const won=Math.random()*100<=chance;
      const cashEarned=won?Math.floor(cr.baseReward*city.cashMult*(1+Math.random()*0.4)):0;
      const xpEarned=won?Math.floor(cr.xp*city.xpMult):Math.floor(cr.xp*0.2);
      let lootItem=null;
      if(won&&Math.random()<0.10){
        const pool=city.lootTable.map(id=>ALL_LOOT.find(i=>i.id===id)).filter(Boolean);
        if(pool.length)lootItem=pool[Math.floor(Math.random()*pool.length)];
      }
      const lines=won
        ?[`SUCCESS: ${cr.name} +$${cashEarned.toLocaleString()} +${xpEarned}xp${lootItem?` LOOT: ${lootItem.name}`:""}`,`  chance was ${chance}%`]
        :[`FAILED: ${cr.name} caught! +${xpEarned}xp`,`  chance was ${chance}%`];
      setLog(l=>[...lines,...l].slice(0,30));
      onCityCrime({won,cashEarned,xpEarned,lootItem,nerve:cr.nerve,jailId:cr.id,cityId:city.id});
      setBusy(false);
    },600);
  }

  const RARITY_C={common:C.muted,rare:C.blue,legendary:C.gold};

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}

    {travelling&&<div style={{background:"#060e06",border:`1px solid ${C.blue}44`,borderRadius:6,padding:14,marginBottom:12,textAlign:"center"}}>
      <div style={{color:C.blue,fontWeight:900,fontSize:14,marginBottom:4}}>IN TRANSIT to {destCity&&destCity.flag} {destCity&&destCity.name}</div>
      {canArrive
        ?<button style={S.btnF(C.green,C.greenBg)} onClick={()=>onArrive(destCity)}>ARRIVE NOW</button>
        :<div style={{color:C.muted,fontSize:12}}>Arriving in <span style={{color:C.blue,fontWeight:700}}>{fmtTime(timeLeft)}</span></div>
      }
    </div>}

    <div style={S.card({borderColor:C.orange+"44",background:"#050f05"})}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:3}}>CURRENT LOCATION</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>{city.flag} {city.name}</div>
          <div style={{color:C.muted,fontSize:11,marginTop:4,maxWidth:240}}>{city.flavor}</div>
        </div>
        <div style={{textAlign:"right"}}>
          {city.crimeBonus>0&&<div style={S.badge(C.green)}>+{city.crimeBonus}% CRIME</div>}
          {city.cashMult>1&&<div style={{...S.badge(C.gold),marginTop:4}}>x{city.cashMult} CASH</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap",marginTop:6}}>
        <span style={{color:C.muted}}>Cities visited: <span style={{color:"#fff",fontWeight:700}}>{visited.length}/{CITIES.length}</span></span>
        {cooldownLeft>0&&!travelling&&<span style={{color:C.red}}>Cooldown: {fmtTime(cooldownLeft)}</span>}
      </div>
    </div>

    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {["map","crimes","loot"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.orange:"#0d140d",border:`1px solid ${tab===t?C.orange:C.border}`,borderRadius:4,color:tab===t?"#000":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400}}>
          {t==="map"?"MAP":t==="crimes"?"CRIMES":"LOOT"}
        </button>
      ))}
    </div>

    {tab==="map"&&<div>
      {CITIES.map(dest=>{
        const locked=player.level<dest.unlockLevel;
        const isCurrent=dest.id===city.id;
        const isVisited=visited.includes(dest.id);
        const canAfford=player.cash>=dest.travelCost;
        const onCooldown=cooldownLeft>0;
        const canTravel=!locked&&!isCurrent&&!travelling&&!onCooldown&&canAfford;
        return(<div key={dest.id} style={S.card({opacity:locked?0.35:1,borderColor:isCurrent?C.orange+"66":isVisited?C.green+"33":C.border,background:isCurrent?"#050f05":C.card})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:24}}>{dest.flag}</span>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:isCurrent?C.orange:"#fff",fontWeight:900,fontSize:15}}>{dest.name}</span>
                    {isCurrent&&<span style={S.badge(C.orange)}>HERE</span>}
                    {isVisited&&!isCurrent&&<span style={S.badge(C.green)}>VISITED</span>}
                    {locked&&<span style={S.badge(C.red)}>LVL {dest.unlockLevel}</span>}
                  </div>
                  <div style={{color:C.muted,fontSize:11,marginTop:2}}>{dest.desc}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap",marginTop:4}}>
                {dest.crimeBonus>0&&<span style={{color:C.green}}>+{dest.crimeBonus}% crime</span>}
                {dest.cashMult>1&&<span style={{color:C.gold}}>x{dest.cashMult} cash</span>}
                {dest.xpMult>1&&<span style={{color:C.purple}}>x{dest.xpMult} XP</span>}
                {dest.travelCost>0&&<span style={{color:canAfford?C.muted:C.red}}>$${dest.travelCost.toLocaleString()}</span>}
                {dest.travelHours>0&&<span style={{color:C.muted}}>{dest.travelHours}h travel</span>}
                {dest.travelHours===0&&<span style={{color:C.green}}>Instant</span>}
              </div>
            </div>
          </div>
          {!locked&&!isCurrent&&(
            <button style={{...S.btnF(canTravel?C.orange:C.muted,canTravel?C.orangeBg:"#0d140d"),opacity:canTravel?1:0.4}} onClick={()=>canTravel&&travel(dest)} disabled={!canTravel}>
              {travelling?"TRAVELLING":onCooldown?"COOLDOWN "+fmtTime(cooldownLeft):!canAfford?"NEED $"+dest.travelCost.toLocaleString():"TRAVEL TO "+dest.name.toUpperCase()}
            </button>
          )}
        </div>);
      })}
    </div>}

    {tab==="crimes"&&<div>
      {travelling&&<div style={{...S.card(),color:C.muted,textAlign:"center"}}>In transit — arrive first.</div>}
      {!travelling&&<div>
        <div style={S.card({borderColor:C.orange+"33",background:"#050f05"})}>
          <div style={S.ct}>CRIMES IN {city.name.toUpperCase()}</div>
          <div style={{color:C.muted,fontSize:11}}>+{city.crimeBonus}% success · x{city.cashMult} cash · x{city.xpMult} XP</div>
          <div style={{color:C.muted,fontSize:10,marginTop:4}}>Nerve: {Math.floor(player.nerve)}/{MAX_NERVE}</div>
        </div>
        {city.crimes.map(crimeId=>{
          const ALLC=[
            {id:"pickpocket", name:"Pickpocket",   baseChance:70,baseReward:200,  nerve:3, xp:10,  difficulty:5 },
            {id:"shoplifting",name:"Shoplifting",  baseChance:65,baseReward:400,  nerve:5, xp:20,  difficulty:10},
            {id:"mugging",    name:"Mugging",      baseChance:55,baseReward:700,  nerve:8, xp:35,  difficulty:18},
            {id:"carjacking", name:"Car Theft",    baseChance:50,baseReward:1000, nerve:12,xp:60,  difficulty:20},
            {id:"robbery",    name:"Armed Robbery",baseChance:40,baseReward:2500, nerve:18,xp:100, difficulty:30},
            {id:"heist",      name:"Bank Heist",   baseChance:25,baseReward:8000, nerve:30,xp:250, difficulty:50},
          ];
          const cr=ALLC.find(c=>c.id===crimeId);
          if(!cr)return null;
          const chance=Math.min(95,Math.max(5,cr.baseChance+Math.floor(player.level*1.5)+(city.crimeBonus||0)-cr.difficulty));
          const hasNerve=player.nerve>=cr.nerve;
          const estCash=Math.floor(cr.baseReward*city.cashMult);
          return(<div key={crimeId} style={S.card({opacity:hasNerve?1:0.45})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:13,marginBottom:3}}>{cr.name}</div>
                <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap"}}>
                  <span style={{color:chance>=60?C.green:chance>=35?C.orange:C.red}}>{chance}%</span>
                  <span style={{color:C.gold}}>~${estCash.toLocaleString()}</span>
                  <span style={{color:C.purple}}>+{Math.floor(cr.xp*city.xpMult)}xp</span>
                  <span style={{color:hasNerve?C.muted:C.red}}>{cr.nerve} nerve</span>
                  <span style={{color:C.dim}}>10% loot</span>
                </div>
              </div>
              <button style={{...S.btn(hasNerve&&!busy?C.orange:C.muted,hasNerve&&!busy?C.orangeBg:"#0d140d"),opacity:hasNerve&&!busy?1:0.4,marginLeft:8}} onClick={()=>hasNerve&&!busy&&commitCrime(crimeId)} disabled={!hasNerve||busy}>
                {busy?"...":"DO IT"}
              </button>
            </div>
          </div>);
        })}
        {log.length>0&&<div style={S.card()}>
          <div style={S.ct}>ACTIVITY LOG</div>
          <div style={S.logB}>
            {log.map((l,i)=><div key={i} style={{color:l.startsWith("SUCCESS")?C.green:l.startsWith("FAILED")?C.red:C.muted}}>{l}</div>)}
          </div>
        </div>}
      </div>}
    </div>}

    {tab==="loot"&&<div>
      <div style={S.card({background:"#040d04"})}>
        <div style={S.ct}>CITY LOOT TABLES</div>
        <div style={{color:C.muted,fontSize:11}}>10% drop chance on successful crimes. Rarer cities = better loot.</div>
      </div>
      {CITIES.filter(c=>visited.includes(c.id)||(player.level>=c.unlockLevel)).map(dest=>{
        const isHere=dest.id===city.id;
        return(<div key={dest.id} style={S.card({borderColor:isHere?C.orange+"44":C.border})}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>{dest.flag}</span>
            <span style={{color:isHere?C.orange:"#fff",fontWeight:700}}>{dest.name}</span>
            {isHere&&<span style={S.badge(C.orange)}>CURRENT</span>}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {dest.lootTable.map(id=>{
              const item=ALL_LOOT.find(i=>i.id===id);
              if(!item)return null;
              const rc=RARITY_C[item.rarity]||C.muted;
              return(<div key={id} style={{padding:"5px 9px",background:rc+"11",border:`1px solid ${rc}33`,borderRadius:4,fontSize:10}}>
                <span style={{color:rc,fontWeight:700}}>{item.name}</span>
                <span style={{color:C.dim,fontSize:9,marginLeft:4}}>{item.rarity}</span>
              </div>);
            })}
          </div>
        </div>);
      })}
    </div>}
  </div>);
}

// ============================================================
// BLACK MARKET PAGE
// ============================================================
export default TravelPage;
