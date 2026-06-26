import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function BlackMarketPage({player,onBuy}) {
  const [purchased,setPurchased]=useState({});
  const items=getDailyBMItems(player.bmSeed||Date.now());
  const RC={common:C.muted,rare:C.blue,legendary:C.gold};
  const prestige=getPrestige(player.prestigeTier||0);

  const today=new Date().toDateString();
  const [lastDay,setLastDay]=useState(today);
  useEffect(()=>{ if(today!==lastDay){setPurchased({});setLastDay(today);} },[today,lastDay]);

  function buyItem(item) {
    const bought=purchased[item.id]||0;
    if(bought>=item.stock)return;
    if(player.cash<item.price)return;
    onBuy({...item, isBM:true});
    setPurchased(p=>({...p,[item.id]:(p[item.id]||0)+1}));
  }

  return(<div>
    <div style={S.card({borderColor:C.purple+"44"})}>
      <div style={S.ct}>🕵 BLACK MARKET</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:6}}>
        Exclusive gear. Refreshes daily at midnight. Limited stock — first come first served.
      </div>
      {prestige&&<div style={{color:prestige.color,fontSize:11}}>✨ {prestige.label}: +{prestige.crimeBonus}% crime bonus active</div>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {items.map(item=>{
        const bought=purchased[item.id]||0;
        const remaining=item.stock-bought;
        const canAfford=player.cash>=item.price;
        const owned=player.inventory?.includes(item.id);
        const soldOut=remaining<=0;
        return(<div key={item.id} style={S.card({borderColor:soldOut?C.dim:item.rarity==="legendary"?C.gold+"44":C.border,opacity:soldOut?0.5:1})}>
          <div style={{marginBottom:6}}>
            <div style={{color:soldOut?C.dim:item.rarity==="legendary"?C.gold:item.rarity==="rare"?C.blue:"#fff",fontWeight:700,fontSize:12,marginBottom:2}}>{item.name}</div>
            <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span>
          </div>
          <div style={{fontSize:10,color:C.muted,marginBottom:6}}>
            {item.type==="weapon"?`+${item.weaponDmg} ATK`:item.type==="armor"?`+${item.armorRating} DEF`:item.type==="tool"?`+${item.crimeBonus} CRIME`:"CONSUMABLE"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:C.green,fontWeight:700}}>${item.price.toLocaleString()}</span>
            <span style={{color:soldOut?C.red:C.orange,fontSize:10}}>{soldOut?"SOLD OUT":`${remaining} left`}</span>
          </div>
          {soldOut||owned
            ?<div style={{...S.badge(soldOut?C.red:C.green),textAlign:"center",padding:"6px",display:"block"}}>{soldOut?"SOLD OUT":"OWNED"}</div>
            :<button
              style={{...S.btnF(canAfford?C.purple:C.muted,canAfford?"#0d0018":"#0d140d"),fontSize:10,padding:"7px",opacity:canAfford?1:0.4,cursor:canAfford?"pointer":"not-allowed"}}
              onClick={()=>canAfford&&buyItem(item)}
              disabled={!canAfford}>
              BUY
            </button>
          }
        </div>);
      })}
    </div>

    <div style={S.card({marginTop:8})}>
      <div style={S.ct}>🕐 NEXT REFRESH</div>
      <div style={{color:C.muted,fontSize:11}}>Market resets at midnight. Check back daily for new stock.</div>
      <div style={{color:C.purple,fontSize:12,marginTop:6,fontWeight:700}}>
        {(() => {
          const now=new Date();
          const midnight=new Date(now); midnight.setHours(24,0,0,0);
          const h=Math.floor((midnight-now)/3600000);
          const m=Math.floor(((midnight-now)%3600000)/60000);
          return `Refreshes in ${h}h ${m}m`;
        })()}
      </div>
    </div>
  </div>);
}

// ============================================================
// PRESTIGE PAGE
// ============================================================
export default BlackMarketPage;
