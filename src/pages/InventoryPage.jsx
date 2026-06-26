import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function InventoryPage({player,onBuy,onEquip}) {
  const [tab,setTab]=useState("inventory");
  const RC={common:C.muted,rare:C.blue,legendary:C.gold};
  return(<div>
    <Tabs tabs={["inventory","shop"]} active={tab} onSelect={setTab}/>
    {tab==="inventory"&&<div style={S.card()}>
      <div style={S.ct}>🎒 YOUR GEAR ({player.inventory.length})</div>
      {player.inventory.length===0&&<div style={{color:C.dim}}>No items. Visit the shop.</div>}
      {player.inventory.map(id=>{
        const item=ITEMS.find(i=>i.id===id);if(!item)return null;
        const isEq=player.equippedWeapon===id||player.equippedArmor===id;
        return(<div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <div><div style={{color:isEq?C.green:"#fff",fontWeight:isEq?700:400}}>{item.name} {isEq&&"✓"} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.type.toUpperCase()} · {item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div>
          {isEq?<span style={S.badge(C.green)}>EQUIPPED</span>:(item.type==="weapon"||item.type==="armor")&&<button style={S.btn(C.green,C.greenBg)} onClick={()=>onEquip(item)}>EQUIP</button>}
        </div>);
      })}
    </div>}
    {tab==="shop"&&<div>
      <div style={{color:C.green,fontSize:13,marginBottom:12,fontWeight:700}}>💰 ${player.cash.toLocaleString()}</div>
      {["weapon","armor","tool"].map(type=>(
        <div key={type} style={S.card()}>
          <div style={S.ct}>{type==="weapon"?"⚔":type==="armor"?"🛡":"🔧"} {type.toUpperCase()}S</div>
          {ITEMS.filter(i=>i.type===type).map(item=>{
            const owned=player.inventory.includes(item.id),can=player.cash>=item.price;
            return(<div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div><div style={{color:"#fff"}}>{item.name} <span style={S.badge(RC[item.rarity]||C.muted)}>{item.rarity}</span></div><div style={{fontSize:10,color:C.muted}}>{item.weaponDmg?`+${item.weaponDmg} ATK`:item.armorRating?`+${item.armorRating} DEF`:`+${item.crimeBonus} CRIME`}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:C.green,fontSize:13,marginBottom:4}}>${item.price.toLocaleString()}</div>{owned?<span style={S.badge(C.green)}>OWNED</span>:<button style={{...S.btn(C.orange,C.orangeBg),opacity:can?1:0.4,cursor:can?"pointer":"not-allowed"}} onClick={()=>onBuy(item)} disabled={!can}>BUY</button>}</div>
            </div>);
          })}
        </div>
      ))}
    </div>}
  </div>);
}

// ============================================================
// SYNDICATES PAGE
// ============================================================
const SYN_XP_FOR_LEVEL = (lvl) => Math.floor(500 * Math.pow(lvl, 1.6));
const SYN_PERKS = [
  { level:1,  desc:"🏋 +15% gym gains for all members" },
  { level:3,  desc:"🔪 +10% crime success for all members" },
  { level:5,  desc:"💰 +20% property income for all members" },
  { level:8,  desc:"⚔ +10% combat XP for all members" },
  { level:10, desc:"⚡ +25% all stats training bonus" },
];

export default InventoryPage;
