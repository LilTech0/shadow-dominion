import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { XP_FOR_LEVEL, MAX_LEVEL } from "../data/constants";
import { getPrestige } from "../services/combat";

function ProfilePage({player,onStatUp}) {
  const xpN=player.level>=MAX_LEVEL?1:XP_FOR_LEVEL(player.level+1);
  const wpn=ITEMS.find(i=>i.id===player.equippedWeapon);
  const arm=ITEMS.find(i=>i.id===player.equippedArmor);
  const wr=player.wins+player.losses>0?((player.wins/(player.wins+player.losses))*100).toFixed(0):"—";
  return(<div>
    <div style={S.card()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{color:"#fff",fontSize:20,fontWeight:900,letterSpacing:2}}>{player.name}</div>
          <div style={{color:C.muted,fontSize:10}}>@{player.username}</div>
          {player.syndicate&&<div style={{marginTop:4}}><span style={S.badge(C.purple)}>🏴 {player.syndicate}</span></div>}
          {player.prestigeTier>0&&<div style={{marginTop:4}}><span style={S.badge(getPrestige(player.prestigeTier)?.color||C.muted)}>{getPrestige(player.prestigeTier)?.label} T{player.prestigeTier}</span></div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:C.red,fontSize:24,fontWeight:900}}>LVL {player.level}</div>
          <span style={S.badge(C.orange)}>⭐ {player.reputation} REP</span>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:3}}><span>✨ XP</span><span>{player.xp.toLocaleString()}/{xpN.toLocaleString()}</span></div>
        <div style={S.barW}><div style={{...S.bar((player.xp/xpN)*100,C.purple),height:"100%"}}/></div>
      </div>
      <div style={{display:"flex",gap:20,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {[["CASH","$"+player.cash.toLocaleString(),C.green],["WINS",player.wins,C.blue],["LOSSES",player.losses,C.red],["WIN%",wr==="—"?wr:wr+"%",C.orange],["CRIMES",player.crimeStats?.total||0,C.muted]].map(([l,v,c])=>(
          <div key={l}><div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div><div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div></div>
        ))}
      </div>
    </div>
    <div style={S.g2}>
      <div style={S.card()}>
        <div style={S.ct}>⚔ COMBAT STATS</div>
        {[["STR","strength",C.red],["DEF","defense",C.blue],["DEX","dexterity",C.orange]].map(([l,k,c])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:C.muted,fontSize:11}}>{l}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:c,fontWeight:900,fontSize:15}}>{player[k]}</span>
              {player.statPoints>0&&<button onClick={()=>onStatUp(k)} style={{...S.btn(C.green,C.greenBg),padding:"2px 8px",fontSize:10}}>+</button>}
            </div>
          </div>
        ))}
        {player.statPoints>0&&<div style={{color:C.green,fontSize:10,marginTop:6}}>● {player.statPoints} points to spend</div>}
        <div style={{borderTop:`1px solid ${C.border}`,marginTop:10,paddingTop:10}}>
          {[["ATK PWR",calcAttack(player),C.red],["DEF PWR",calcDefense(player),C.blue],["HIT %",calcHitChance(player.dexterity,10).toFixed(0)+"%","#fff"],["CRIT %",calcCritChance(player.dexterity).toFixed(1)+"%",C.orange]].map(([l,v,c])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between"}}>
              <span style={{color:C.muted,fontSize:10}}>{l}</span>
              <span style={{color:c,fontWeight:900}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card()}>
        <div style={S.ct}>🎒 LOADOUT</div>
        <div style={{marginBottom:12}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>WEAPON</div><div style={{color:wpn?C.orange:"#333",fontWeight:wpn?700:400}}>{wpn?.name||"Bare Hands"}</div>{wpn&&<div style={{color:C.muted,fontSize:10}}>+{wpn.weaponDmg} ATK</div>}</div>
        <div style={{marginBottom:12}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>ARMOR</div><div style={{color:arm?C.blue:"#333",fontWeight:arm?700:400}}>{arm?.name||"None"}</div>{arm&&<div style={{color:C.muted,fontSize:10}}>+{arm.armorRating} DEF</div>}</div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>LOGIN STREAK</div><div style={{display:"flex",gap:4}}>{[1,2,3,4,5,6,7].map(d=>(<div key={d} style={{width:22,height:22,borderRadius:3,background:d<=(player.loginStreak||0)?C.gold:"#0d140d",border:`1px solid ${d<=(player.loginStreak||0)?C.gold:C.dim}`,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:d<=(player.loginStreak||0)?"#000":C.dim,fontWeight:700}}>{d}</div>))}</div></div>
      </div>
    </div>
  </div>);
}

// ============================================================
// CRIMES PAGE
// ============================================================
export default ProfilePage;
