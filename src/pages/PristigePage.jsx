import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function PrestigePage({player,onPrestige}) {
  const [confirm,setConfirm]=useState(false);
  const currentTier=player.prestigeTier||0;
  const nextTier=currentTier+1;
  const nextPrestige=PRESTIGE_BONUS.find(p=>p.tier===nextTier);
  const currentPrestige=getPrestige(currentTier);
  const canPrestige=player.level>=PRESTIGE_REQ_LEVEL&&nextTier<=5;

  return(<div>
    {confirm&&<Confirm
      msg={`PRESTIGE to ${nextPrestige?.label}? You will reset to Level 1 with +${Math.round((nextPrestige?.cashMult-1)*100)}% cash, +${Math.round((nextPrestige?.xpMult-1)*100)}% XP and +${nextPrestige?.crimeBonus}% crime bonus — permanently.`}
      onYes={()=>{onPrestige(nextPrestige);setConfirm(false);}}
      onNo={()=>setConfirm(false)}
    />}

    <div style={S.card({borderColor:currentPrestige?currentPrestige.color+"44":C.border})}>
      <div style={S.ct}>⚡ PRESTIGE</div>
      {currentPrestige
        ?<div style={{marginBottom:12}}>
          <div style={{color:currentPrestige.color,fontSize:22,fontWeight:900,letterSpacing:3,marginBottom:4}}>{currentPrestige.label} <span style={{fontSize:14}}>TIER {currentTier}</span></div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:11}}>
            <span style={{color:C.green}}>+{Math.round((currentPrestige.cashMult-1)*100)}% CASH</span>
            <span style={{color:C.purple}}>+{Math.round((currentPrestige.xpMult-1)*100)}% XP</span>
            <span style={{color:C.orange}}>+{currentPrestige.crimeBonus}% CRIME</span>
          </div>
        </div>
        :<div style={{color:C.dim,fontSize:12,marginBottom:12}}>No prestige yet. Reach Level {PRESTIGE_REQ_LEVEL} to begin.</div>
      }
      <div style={{color:C.muted,fontSize:11}}>
        Level: <span style={{color:player.level>=PRESTIGE_REQ_LEVEL?C.green:C.orange,fontWeight:700}}>{player.level}/{PRESTIGE_REQ_LEVEL}</span>
        {player.prestigeCount>0&&<span style={{color:C.muted,marginLeft:12}}>Times prestiged: {player.prestigeCount}</span>}
      </div>
    </div>

    <div style={S.card()}>
      <div style={S.ct}>🏅 PRESTIGE TIERS</div>
      {PRESTIGE_BONUS.map(p=>{
        const unlocked=currentTier>=p.tier;
        const isCurrent=currentTier===p.tier;
        const isNext=nextTier===p.tier;
        return(<div key={p.tier} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`,opacity:unlocked||isNext?1:0.4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{color:p.color,fontWeight:900,fontSize:14}}>TIER {p.tier} — {p.label}</span>
                {isCurrent&&<span style={S.badge(p.color)}>CURRENT</span>}
                {unlocked&&!isCurrent&&<span style={S.badge(C.green)}>✓</span>}
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,flexWrap:"wrap"}}>
                <span style={{color:C.green}}>+{Math.round((p.cashMult-1)*100)}% cash</span>
                <span style={{color:C.purple}}>+{Math.round((p.xpMult-1)*100)}% XP</span>
                <span style={{color:C.orange}}>+{p.crimeBonus}% crime</span>
              </div>
            </div>
            <span style={{color:C.muted,fontSize:10}}>LVL {PRESTIGE_REQ_LEVEL} req</span>
          </div>
        </div>);
      })}
    </div>

    {nextTier<=5&&<div style={S.card({borderColor:canPrestige?C.red+"44":C.border})}>
      <div style={S.ct}>🔥 PRESTIGE UP</div>
      {nextPrestige&&<>
        <div style={{color:C.muted,fontSize:11,marginBottom:12,lineHeight:1.6}}>
          Reset to <span style={{color:"#fff"}}>Level 1</span> and become <span style={{color:nextPrestige.color,fontWeight:700}}>{nextPrestige.label}</span>.
          Your stats, cash, and inventory carry over. You keep your properties and syndicate.
          Gain permanent: <span style={{color:C.green}}>+{Math.round((nextPrestige.cashMult-1)*100)}% cash</span> · <span style={{color:C.purple}}>+{Math.round((nextPrestige.xpMult-1)*100)}% XP</span> · <span style={{color:C.orange}}>+{nextPrestige.crimeBonus}% crime success</span>
        </div>
        <button
          style={{...S.btnF(canPrestige?C.red:C.muted,canPrestige?C.redBg:"#0d140d"),opacity:canPrestige?1:0.4,cursor:canPrestige?"pointer":"not-allowed"}}
          onClick={()=>canPrestige&&setConfirm(true)}
          disabled={!canPrestige}>
          {canPrestige?`⚡ PRESTIGE → ${nextPrestige.label}`:`REACH LVL ${PRESTIGE_REQ_LEVEL} TO PRESTIGE`}
        </button>
      </>}
      {nextTier>5&&<div style={{color:C.gold,fontSize:13,fontWeight:700}}>MAX PRESTIGE REACHED — You are a true Shadow.</div>}
    </div>}
  </div>);
}

// ============================================================
// NOTIFICATION DRAWER
// ============================================================
export default PrestigePage;
