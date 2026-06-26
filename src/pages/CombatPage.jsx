import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { ATK_COOLDOWN } from "../data/constants";
import { calcAttack, calcDefense, calcHitChance, calcDamage, calcCritChance, createEnemy } from "../services/combat";

function CombatPage({player,onCombat,initTarget}) {
  const [mode,setMode]=useState(initTarget?"pvp":"npc");
  const [enemy,setEnemy]=useState(null);
  const [npcLog,setNpcLog]=useState([]);
  const [npcFighting,setNpcFighting]=useState(false);
  const [npcResult,setNpcResult]=useState(null);
  const [pvpSearch,setPvpSearch]=useState(initTarget?.username||"");
  const [pvpTarget,setPvpTarget]=useState(initTarget||null);
  const [pvpLog,setPvpLog]=useState([]);
  const [pvpFighting,setPvpFighting]=useState(false);
  const [pvpResult,setPvpResult]=useState(null);
  const [pvpErr,setPvpErr]=useState("");
  const [cdLeft,setCdLeft]=useState(0);
  const cdRef=useRef(null);

  useEffect(()=>{
    if(!initTarget)return;
    setMode("pvp");
    setPvpSearch(initTarget.username||"");
    setPvpTarget(initTarget);
    setPvpLog([]);
    setPvpResult(null);
    setPvpErr("");
  },[initTarget]);

  useEffect(()=>{
    if(!pvpTarget)return;
    const cds=JSON.parse(localStorage.getItem("sd_pvp_cds")||"{}");
    const last=cds[pvpTarget.username]||0;
    const left=Math.max(0,ATK_COOLDOWN-(Date.now()-last));
    setCdLeft(left);
    if(left>0){
      cdRef.current=setInterval(()=>{
        const l2=Math.max(0,ATK_COOLDOWN-(Date.now()-last));
        setCdLeft(l2);
        if(l2===0)clearInterval(cdRef.current);
      },500);
    }
    return()=>clearInterval(cdRef.current);
  },[pvpTarget]);

  function getAttacksToday(username){
    const today=new Date().toDateString();
    const data=JSON.parse(localStorage.getItem("sd_pvp_atks")||"{}");
    if(data.date!==today)return 0;
    return data[username]||0;
  }

  function recordAttack(username){
    const today=new Date().toDateString();
    const data=JSON.parse(localStorage.getItem("sd_pvp_atks")||"{}");
    if(data.date!==today){localStorage.setItem("sd_pvp_atks",JSON.stringify({date:today,[username]:1}));return;}
    data[username]=(data[username]||0)+1;
    localStorage.setItem("sd_pvp_atks",JSON.stringify(data));
  }

  function searchPlayer(){
    setPvpErr(""); setPvpTarget(null); setPvpLog([]); setPvpResult(null);
    if(!pvpSearch.trim())return;
    const accs=getAccounts();
    const uname=pvpSearch.trim().toLowerCase();
    if(uname===player.username){setPvpErr("❌ Can't attack yourself");return;}
    if(!accs[uname]){setPvpErr("❌ Player not found");return;}
    setPvpTarget(accs[uname].player);
  }

  function attackPlayer(){
    if(!pvpTarget||pvpFighting)return;
    if(player.energy<5){setPvpErr("❌ Need 5 energy");return;}
    if(player.health<=20){setPvpErr("❌ Too injured to fight (need >20 HP)");return;}
    const atks=getAttacksToday(pvpTarget.username);
    if(atks>=MAX_APT){setPvpErr(`❌ Max ${MAX_APT} attacks per player per day`);return;}
    if(cdLeft>0){setPvpErr(`❌ Cooldown: wait ${Math.ceil(cdLeft/1000)}s`);return;}
    setPvpFighting(true);setPvpErr("");
    runFight(
      player, pvpTarget,
      logs=>setPvpLog(logs),
      ({won,healthLost,rounds})=>{
        setPvpResult(won?"WIN":"LOSE");
        setPvpFighting(false);
        const cds=JSON.parse(localStorage.getItem("sd_pvp_cds")||"{}");
        cds[pvpTarget.username]=Date.now();
        localStorage.setItem("sd_pvp_cds",JSON.stringify(cds));
        recordAttack(pvpTarget.username);
        const accs=getAccounts();
        if(accs[pvpTarget.username]){
          const def=accs[pvpTarget.username].player;
          if(won){
            accs[pvpTarget.username].player={
              ...def,
              health:Math.max(1,Math.floor(def.health*0.25)),
              inHospitalUntil:Date.now()+5*60000,
            };
          }
          saveAccounts(accs);
        }
        onCombat({won,cash:0,xp:won?pvpTarget.level*10:0,rep:won?3:-1,healthLost,energyCost:5,isPvp:true,targetName:pvpTarget.name});
      }
    );
  }

  function fightNPC(){
    if(!enemy||npcFighting)return;
    if(player.energy<5){setNpcLog(["❌ Need 5 energy"]);return;}
    setNpcFighting(true);
    runFight(
      player, enemy,
      logs=>setNpcLog(logs),
      ({won,healthLost})=>{
        setNpcResult(won?"WIN":"LOSE");
        setNpcFighting(false);
        onCombat({won,cash:won?enemy.cash:0,xp:won?enemy.xp:0,rep:won?2:-1,healthLost,energyCost:5,isPvp:false});
      }
    );
  }

  const inHosp=player.inHospitalUntil&&player.inHospitalUntil>Date.now();
  const hospLeft=inHosp?Math.ceil((player.inHospitalUntil-Date.now())/60000):0;
  const pvpAtksToday=pvpTarget?getAttacksToday(pvpTarget.username):0;

  return(<div>
    {inHosp&&<div style={S.card({borderColor:"#1a4a7a",background:"#060d18"})}>
      <div style={S.ct}>🏥 IN HOSPITAL</div>
      <div style={{color:C.blue,fontSize:12,marginBottom:6}}>Recovering from injuries — <span style={{color:"#fff",fontWeight:700}}>{hospLeft} min remaining</span>.</div>
      <div style={{color:C.muted,fontSize:11}}>You cannot fight while hospitalized. Health regens over time.</div>
    </div>}

    <div style={{display:"flex",gap:8,marginBottom:12}}>
      {["npc","pvp"].map(m=>(
        <button key={m} onClick={()=>setMode(m)} style={{padding:"8px 20px",background:mode===m?C.red:"#0d140d",border:`1px solid ${mode===m?C.red:C.border}`,borderRadius:4,color:mode===m?"#fff":C.muted,cursor:"pointer",fontSize:11,letterSpacing:2}}>
          {m==="npc"?"🤖 STREET FIGHT":"⚔ PvP ATTACK"}
        </button>
      ))}
    </div>

    {mode==="npc"&&<div>
      <div style={S.card()}><div style={S.ct}>🤖 STREET FIGHT</div><div style={{color:C.muted,fontSize:11}}>Fight NPCs for cash & XP · Costs 5 energy</div></div>
      <div style={S.g2}>
        <div style={S.card()}><div style={S.ct}>YOU</div>
          {[["ATK",calcAttack(player),C.red],["DEF",calcDefense(player),C.blue],["HP",player.health,C.green]].map(([l,v,c])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>
          ))}
        </div>
        <div style={S.card()}><div style={S.ct}>ENEMY</div>
          {enemy?(<>
            <div style={{color:C.red,fontWeight:700,marginBottom:6}}>{enemy.name} LVL{enemy.level}</div>
            <div style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>HP</span><span style={{color:C.green,fontWeight:900}}>{enemy.health}</span></div>
            <div style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>💰</span><span style={{color:C.gold,fontWeight:900}}>${enemy.cash}</span></div>
          </>):<div style={{color:C.dim}}>No target</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button style={S.btn(C.muted,"#0d140d")} onClick={()=>{setEnemy(createEnemy(player.level));setNpcLog([]);setNpcResult(null);}}>🔍 FIND</button>
        {enemy&&!npcResult&&<button style={{...S.btn(),opacity:npcFighting||inHosp?0.5:1}} onClick={fightNPC} disabled={npcFighting||inHosp}>{npcFighting?"FIGHTING...":"⚔ ATTACK"}</button>}
        {npcResult&&<button style={S.btn(C.muted,"#0d140d")} onClick={()=>{setEnemy(null);setNpcResult(null);setNpcLog([]);}}>NEW</button>}
      </div>
      {npcLog.length>0&&<div style={S.card()}>
        <div style={{...S.ct,marginBottom:8}}>BATTLE LOG {npcResult&&<span style={S.badge(npcResult==="WIN"?C.green:"#ff4d4d")}>{npcResult}</span>}</div>
        <div style={S.logB}>{npcLog.map((l,i)=><div key={i} style={{color:/You hit|CRIT|WIN/.test(l)?C.green:/missed/.test(l)?C.muted:"#ff6e6e"}}>{l}</div>)}</div>
      </div>}
    </div>}

    {mode==="pvp"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>⚔ PvP ATTACK</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
          Win = <span style={{color:C.green}}>+3 REP</span> · Lose = <span style={{color:C.red}}>-1 REP + hospital (3 min)</span><br/>
          Loser hospitalized 5 min · 60s cooldown · Max {MAX_APT} attacks/player/day · Need &gt;20 HP
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input style={{...S.inp,marginBottom:0,flex:1}} placeholder="Search by username..." value={pvpSearch} onChange={e=>setPvpSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchPlayer()}/>
          <button style={S.btn(C.orange,C.orangeBg)} onClick={searchPlayer}>SEARCH</button>
        </div>
        {pvpErr&&<div style={{color:C.red,fontSize:11,marginBottom:8}}>{pvpErr}</div>}
      </div>

      {pvpTarget&&<div>
        <div style={S.card({borderColor:C.red+"44"})}>
          <div style={S.ct}>🎯 TARGET</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{pvpTarget.name}</div>
              <div style={{color:C.muted,fontSize:11}}>@{pvpTarget.username}</div>
              {pvpTarget.syndicate&&<div style={{marginTop:3}}><span style={S.badge(C.purple)}>🏴 {pvpTarget.syndicate}</span></div>}
              {pvpTarget.inHospitalUntil&&pvpTarget.inHospitalUntil>Date.now()&&(
                <div style={{marginTop:4}}><span style={S.badge(C.blue)}>🏥 IN HOSPITAL</span></div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:C.red,fontSize:18,fontWeight:900}}>LVL {pvpTarget.level}</div>
              <div style={{color:C.orange,fontSize:11}}>⭐ {pvpTarget.reputation} REP</div>
            </div>
          </div>
          <div style={S.g2}>
            <div>
              {[["ATK",calcAttack(pvpTarget),C.red],["DEF",calcDefense(pvpTarget),C.blue],["HP",pvpTarget.health,C.green],["DEX",pvpTarget.dexterity,C.orange]].map(([l,v,c])=>(
                <div key={l} style={{...S.row,justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:c,fontWeight:900}}>{v}</span></div>
              ))}
            </div>
            <div>
              <div style={{color:C.muted,fontSize:10,marginBottom:6}}>ATTACK STATUS</div>
              <div style={{fontSize:11,marginBottom:4}}>Today: <span style={{color:pvpAtksToday>=MAX_APT?C.red:C.green}}>{pvpAtksToday}/{MAX_APT}</span></div>
              <div style={{fontSize:11,marginBottom:8}}>Cooldown: <span style={{color:cdLeft>0?C.orange:C.green}}>{cdLeft>0?Math.ceil(cdLeft/1000)+"s":"Ready"}</span></div>
              {!pvpResult&&<button
                style={{...S.btn(),opacity:(pvpFighting||inHosp||cdLeft>0||pvpAtksToday>=MAX_APT||player.health<=20)?0.4:1,cursor:"pointer",width:"100%"}}
                onClick={attackPlayer}
                disabled={pvpFighting||inHosp||cdLeft>0||pvpAtksToday>=MAX_APT||player.health<=20}>
                {pvpFighting?"FIGHTING...":inHosp?"🏥 HOSPITALIZED":cdLeft>0?`WAIT ${Math.ceil(cdLeft/1000)}s`:"⚔ ATTACK"}
              </button>}
              {pvpResult&&<div>
                <div style={{...S.badge(pvpResult==="WIN"?C.green:"#ff4d4d"),fontSize:12,padding:"6px 12px",marginBottom:8,display:"block",textAlign:"center"}}>{pvpResult==="WIN"?"🏆 VICTORY +3 REP":"💀 DEFEATED — YOU'RE IN HOSPITAL"}</div>
                <button style={{...S.btn(C.muted,"#0d140d"),width:"100%"}} onClick={()=>{setPvpTarget(null);setPvpResult(null);setPvpLog([]);setPvpSearch("");}}>NEW TARGET</button>
              </div>}
            </div>
          </div>
        </div>
        {pvpLog.length>0&&<div style={S.card()}>
          <div style={{...S.ct,marginBottom:8}}>⚔ BATTLE LOG {pvpResult&&<span style={S.badge(pvpResult==="WIN"?C.green:"#ff4d4d")}>{pvpResult}</span>}</div>
          <div style={S.logB}>{pvpLog.map((l,i)=><div key={i} style={{color:/You hit|CRIT|WIN/.test(l)?C.green:/missed/.test(l)?C.muted:"#ff6e6e"}}>{l}</div>)}</div>
        </div>}
      </div>}
    </div>}
  </div>);
}

// ============================================================
// INVENTORY PAGE
// ============================================================
export default CombatPage;
