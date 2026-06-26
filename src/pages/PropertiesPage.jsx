import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function PropertiesPage({player,onBuyProperty,onCollect,onUpgrade}) {
  const [tab,setTab]=useState("empire");
  const [detail,setDetail]=useState(null); // prop.id being viewed
  const [toast,setToast]=useState("");

  function showMsg(m){setToast(m);setTimeout(()=>setToast(""),3000);}

  const prestige    = getPrestige(player.prestigeTier||0);
  const cashMult    = prestige?.cashMult||1;
  const synBonus    = player.syndicate ? 1.20 : 1.0; // syndicate perk lvl5
  const ownedProps  = PROPERTIES.filter(p=>(player.properties?.[p.id]||0)>0);
  const totalPerHour= PROPERTIES.reduce((s,p)=>s+propIncomeRate(player,p),0);
  const pendingIncome=Math.floor(calcPropertyIncome(player.properties||{},player.lastPropertyCollect||Date.now())*cashMult);
  const hoursAccrued= Math.min(24,(Date.now()-(player.lastPropertyCollect||Date.now()))/3600000);
  const ROI_HOURS   = (prop) => {
    const rate = propIncomeRate(player, prop)||prop.incomePerHour;
    return rate>0 ? (prop.price/rate).toFixed(1) : "∞";
  };

  const tabs = ["empire","market","upgrades"];

  return(<div>
    {toast&&<div style={{position:"fixed",top:16,right:16,background:toast.startsWith("✅")?C.greenBg:C.redBg,border:`1px solid ${toast.startsWith("✅")?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:toast.startsWith("✅")?C.green:"#ff6e6e",fontSize:12,zIndex:9999,maxWidth:300}}>{toast}</div>}

    {/* Tab bar */}
    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>{setTab(t);setDetail(null);}} style={{padding:"7px 14px",background:tab===t?C.gold:"#0d140d",border:`1px solid ${tab===t?C.gold:C.border}`,borderRadius:4,color:tab===t?"#000":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400}}>
          {t==="empire"?"🏠 EMPIRE":t==="market"?"🛒 BUY":"⬆ UPGRADES"}
        </button>
      ))}
    </div>

    {/* ── EMPIRE TAB ── */}
    {tab==="empire"&&<div>
      {/* Income banner */}
      <div style={S.card({borderColor:C.gold+"55",background:"#061006"})}>
        <div style={S.ct}>💰 PROPERTY EMPIRE</div>
        <div style={{display:"flex",gap:0,flexWrap:"wrap",marginBottom:14}}>
          {[
            ["PENDING",    "$"+pendingIncome.toLocaleString(),   C.gold],
            ["PER HOUR",   "$"+Math.floor(totalPerHour*cashMult).toLocaleString()+"/hr", C.green],
            ["PROPERTIES", ownedProps.length,                    C.orange],
            ["ACCRUED",    hoursAccrued.toFixed(1)+"h",          C.muted],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 45%",marginBottom:10}}>
              <div style={{color:c,fontWeight:900,fontSize:15}}>{v}</div>
              <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
            </div>
          ))}
        </div>
        {cashMult>1&&<div style={{color:C.purple,fontSize:10,marginBottom:8}}>⚡ ×{cashMult} Prestige multiplier active</div>}
        {player.syndicate&&<div style={{color:C.green,fontSize:10,marginBottom:8}}>🏴 +20% Syndicate income bonus active</div>}
        {pendingIncome>0
          ?<button style={S.btnF(C.gold,C.goldBg)} onClick={()=>onCollect(pendingIncome)}>
              💰 COLLECT ${pendingIncome.toLocaleString()}
            </button>
          :<div style={{color:C.dim,fontSize:11,padding:"10px 0"}}>{ownedProps.length===0?"No properties owned — go buy some below.":"Income accruing... check back soon."}</div>
        }
      </div>

      {/* Owned property breakdown */}
      {ownedProps.length>0&&<div style={S.card()}>
        <div style={S.ct}>📊 BREAKDOWN</div>
        {ownedProps.map(prop=>{
          const qty    = player.properties[prop.id];
          const tier   = propUpgradeTier(player, prop.id);
          const rate   = propIncomeRate(player, prop);
          const upgrades = PROP_UPGRADES[prop.id]||[];
          const nextUp = upgrades[tier];
          return(
            <div key={prop.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:16}}>{prop.icon}</span>
                  <span style={{color:C.gold,fontWeight:700,fontSize:12}}>{prop.name}</span>
                  <span style={S.badge(C.gold)}>×{qty}</span>
                  {tier>0&&<span style={S.badge(C.purple)}>T{tier}</span>}
                </div>
                <div style={{color:C.green,fontSize:11}}>${rate.toLocaleString()}/hr</div>
                {nextUp&&<div style={{color:C.muted,fontSize:9,marginTop:2}}>Next upgrade: {nextUp.name} — ${nextUp.cost.toLocaleString()}</div>}
              </div>
              <button style={{...S.btn(C.purple,"#080e08"),padding:"5px 10px",fontSize:9}} onClick={()=>{setTab("upgrades");setDetail(prop.id);}}>UPGRADE</button>
            </div>
          );
        })}
      </div>}

      {ownedProps.length===0&&<div style={{...S.card(),textAlign:"center",padding:32}}>
        <div style={{fontSize:36,marginBottom:12}}>🏚</div>
        <div style={{color:C.muted,fontSize:12}}>You own nothing yet.</div>
        <div style={{color:C.dim,fontSize:11,marginTop:4}}>Buy your first property to start earning passive income.</div>
        <button style={{...S.btn(C.gold,C.goldBg),marginTop:14}} onClick={()=>setTab("market")}>BROWSE MARKET →</button>
      </div>}
    </div>}

    {/* ── MARKET TAB ── */}
    {tab==="market"&&<div>
      <div style={{...S.card(),background:"#040d04",borderColor:C.border}}>
        <div style={S.ct}>🛒 PROPERTY MARKET</div>
        <div style={{color:C.muted,fontSize:11,lineHeight:1.7}}>
          Each purchase adds one unit of that property to your empire. Multiple units stack income. Income accrues for up to 24 hours before it must be collected.
        </div>
      </div>
      {PROPERTIES.map(prop=>{
        const owned    = player.properties?.[prop.id]||0;
        const unlocked = player.level>=prop.unlockLevel;
        const canAfford= player.cash>=prop.price;
        const rate     = propIncomeRate(player,prop);
        const payback  = ROI_HOURS(prop);
        const tier     = propUpgradeTier(player, prop.id);
        return(
          <div key={prop.id} style={S.card({opacity:unlocked?1:0.4,borderColor:owned>0?C.gold+"44":C.border,background:owned>0?"#050e05":C.card})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:22}}>{prop.icon}</span>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:owned>0?C.gold:"#fff",fontWeight:700,fontSize:14}}>{prop.name}</span>
                      {owned>0&&<span style={S.badge(C.gold)}>×{owned}</span>}
                      {tier>0&&<span style={S.badge(C.purple)}>T{tier} UPGRADED</span>}
                    </div>
                    <div style={{color:C.muted,fontSize:11,marginTop:2}}>{prop.desc}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap",marginTop:6}}>
                  <span style={{color:C.green}}>💵 ${prop.price.toLocaleString()}</span>
                  <span style={{color:C.gold}}>+${prop.incomePerHour.toLocaleString()}/hr base</span>
                  {owned>0&&<span style={{color:C.orange}}>earning ${rate.toLocaleString()}/hr</span>}
                  <span style={{color:C.muted}}>📈 ROI: {payback}h</span>
                  <span style={{color:C.dim}}>🔓 LVL {prop.unlockLevel}</span>
                </div>
              </div>
            </div>
            {!unlocked
              ?<div style={{...S.badge(C.red),fontSize:10}}>Requires Level {prop.unlockLevel}</div>
              :<div style={{display:"flex",gap:8}}>
                <button
                  style={{...S.btn(canAfford?C.orange:C.muted,canAfford?C.orangeBg:"#0d140d"),flex:1,opacity:canAfford?1:0.4}}
                  onClick={()=>canAfford?onBuyProperty(prop):showMsg("❌ Not enough cash")}
                  disabled={!canAfford}>
                  {canAfford?"BUY — $"+prop.price.toLocaleString():"❌ NEED $"+prop.price.toLocaleString()}
                </button>
                {owned>0&&<button style={{...S.btn(C.purple,"#080e08"),padding:"9px 14px"}} onClick={()=>{setTab("upgrades");setDetail(prop.id);}}>⬆</button>}
              </div>
            }
          </div>
        );
      })}
    </div>}

    {/* ── UPGRADES TAB ── */}
    {tab==="upgrades"&&<div>
      {/* Property selector */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {ownedProps.map(prop=>(
          <button key={prop.id} onClick={()=>setDetail(prop.id)} style={{padding:"7px 12px",background:detail===prop.id?C.goldBg:"#0d140d",border:`1px solid ${detail===prop.id?C.gold:C.border}`,borderRadius:4,color:detail===prop.id?C.gold:C.muted,cursor:"pointer",fontSize:10}}>
            {prop.icon} {prop.name}
          </button>
        ))}
      </div>

      {ownedProps.length===0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:28}}>Buy properties first before upgrading them.</div>}

      {detail&&(()=>{
        const prop    = PROPERTIES.find(p=>p.id===detail);
        const upgrades= PROP_UPGRADES[detail]||[];
        const curTier = propUpgradeTier(player, detail);
        const baseRate= propIncomeRate(player, prop);
        if(!prop) return null;
        return(
          <div>
            {/* Current status card */}
            <div style={S.card({borderColor:C.gold+"44",background:"#050e05"})}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{fontSize:26}}>{prop.icon}</span>
                <div>
                  <div style={{color:C.gold,fontWeight:900,fontSize:16}}>{prop.name}</div>
                  <div style={{color:C.muted,fontSize:11}}>×{player.properties[detail]} owned · Tier {curTier}/{upgrades.length}</div>
                </div>
              </div>
              {/* Tier progress bar */}
              <div style={{display:"flex",gap:4,marginBottom:12}}>
                {upgrades.map((_,i)=>(
                  <div key={i} style={{flex:1,height:6,borderRadius:2,background:i<curTier?C.gold:C.dim}}/>
                ))}
              </div>
              <div style={{display:"flex",gap:16,fontSize:12}}>
                <span style={{color:C.green}}>Current income: ${baseRate.toLocaleString()}/hr</span>
              </div>
            </div>

            {/* Upgrade list */}
            {upgrades.map((up,i)=>{
              const done    = i<curTier;
              const isNext  = i===curTier;
              const locked  = i>curTier;
              const canAfford= player.cash>=up.cost;
              return(
                <div key={i} style={S.card({opacity:locked?0.35:1,borderColor:done?C.gold+"44":isNext?C.purple+"44":C.border,background:done?"#050e05":isNext?"#080e08":C.card})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:done?C.goldBg:isNext?C.purple+"22":"#0d140d",border:`2px solid ${done?C.gold:isNext?C.purple:C.dim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,color:done?C.gold:isNext?C.purple:C.muted}}>
                          {done?"✓":i+1}
                        </div>
                        <span style={{color:done?C.gold:isNext?"#fff":C.muted,fontWeight:700,fontSize:13}}>{up.name}</span>
                        {done&&<span style={S.badge(C.gold)}>COMPLETE</span>}
                        {isNext&&<span style={S.badge(C.purple)}>AVAILABLE</span>}
                      </div>
                      <div style={{color:C.muted,fontSize:11,marginLeft:32,marginBottom:6}}>{up.desc}</div>
                      <div style={{marginLeft:32,display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
                        <span style={{color:C.green}}>+${up.incomeBonus.toLocaleString()}/hr per unit</span>
                        <span style={{color:done?C.muted:canAfford?C.gold:C.red}}>Cost: ${up.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {isNext&&(
                    <button
                      style={{...S.btnF(canAfford?C.purple:C.muted,canAfford?"#080e08":"#0d140d"),opacity:canAfford?1:0.4,marginTop:4}}
                      onClick={()=>{
                        if(!canAfford)return showMsg("❌ Not enough cash");
                        onUpgrade(detail, up);
                        showMsg(`✅ ${up.name} installed on ${prop.name}!`);
                      }}
                      disabled={!canAfford}>
                      {canAfford?`⬆ INSTALL — $${up.cost.toLocaleString()}`:`❌ NEED $${up.cost.toLocaleString()}`}
                    </button>
                  )}
                </div>
              );
            })}
            {curTier>=upgrades.length&&<div style={{...S.card({borderColor:C.gold+"44"}),textAlign:"center",color:C.gold,fontWeight:700,fontSize:13,padding:20}}>
              🏆 FULLY UPGRADED — Maximum income achieved
            </div>}
          </div>
        );
      })()}

      {!detail&&ownedProps.length>0&&<div style={{...S.card(),color:C.muted,textAlign:"center",padding:20}}>
        Select a property above to view its upgrades.
      </div>}
    </div>}
  </div>);
}

// ============================================================
// TRAVEL PAGE
// ============================================================
const ALL_LOOT = [...ITEMS, ...BM_POOL];

export default PropertiesPage;
