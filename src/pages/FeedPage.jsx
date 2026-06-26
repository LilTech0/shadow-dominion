import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
function FeedPage({player, onMarkAll}) {
  const [filter, setFilter] = useState("all");
  const notifs = player.notifications||[];
  const filters = ["all","combat","crime","income","level","system","reward","buy"];
  const visible = filter==="all" ? notifs : notifs.filter(n=>n.type===filter);

  return(<div>
    <div style={S.card({borderColor:C.blue+"44"})}>
      <div style={S.ct}>📋 ACTIVITY FEED</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:10}}>Your full event history — attacks, crimes, income and more.</div>
      {(player.notifUnread||0)>0&&<button style={S.btn(C.muted,"#0d140d")} onClick={onMarkAll}>✅ Mark all read</button>}
    </div>

    {/* Filter chips */}
    <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
      {filters.map(f=>{
        const meta=NOTIF_TYPES[f];
        return(<button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${filter===f?(meta?.color||C.blue):C.border}`,background:filter===f?(meta?.color||C.blue)+"22":"transparent",color:filter===f?(meta?.color||C.blue):C.muted,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",fontWeight:filter===f?700:400}}>
          {meta?.icon||"•"} {f.toUpperCase()}
        </button>);
      })}
    </div>

    {visible.length===0&&<div style={{...S.card(),color:C.dim,textAlign:"center"}}>No events yet. Go commit some crimes.</div>}
    {visible.map(n=>{
      const meta=NOTIF_TYPES[n.type]||NOTIF_TYPES.system;
      return(
        <div key={n.id} style={{...S.card({background:n.read?"#0c0c14":"#0f0f1c",borderColor:n.read?C.border:meta.color+"33"}),marginBottom:8,padding:"12px 14px"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20,flexShrink:0}}>{meta.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:n.read?"#ccc":"#fff",fontSize:12,lineHeight:1.5,marginBottom:3}}>{n.text}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{...S.badge(meta.color),fontSize:8}}>{n.type.toUpperCase()}</span>
                <span style={{color:C.muted,fontSize:9}}>{tsAgo(n.ts)}</span>
                {!n.read&&<span style={{...S.badge(meta.color),fontSize:8}}>NEW</span>}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>);
}

// ============================================================
// PLAYER PROFILE MODAL
// ============================================================
function PlayerProfileModal({target, viewer, onClose, onAttack}) {
  const isMe = target.username === viewer.username;
  const prestige = getPrestige(target.prestigeTier||0);
  const wpn = ITEMS.find(i=>i.id===target.equippedWeapon);
  const arm = ITEMS.find(i=>i.id===target.equippedArmor);
  const wr = target.wins+target.losses>0
    ? ((target.wins/(target.wins+target.losses))*100).toFixed(0)+"%" : "—";
  const inHosp = target.inHospitalUntil && target.inHospitalUntil > Date.now();
  const hospLeft = inHosp ? Math.ceil((target.inHospitalUntil-Date.now())/60000) : 0;
  const propCount = Object.values(target.properties||{}).reduce((s,v)=>s+(v||0),0);
  const viewerInHosp = viewer.inHospitalUntil && viewer.inHospitalUntil > Date.now();

  return(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:10000}} onClick={onClose}>
      <div
        style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:"12px 12px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{color:"#fff",fontSize:20,fontWeight:900,letterSpacing:2,marginBottom:2}}>{target.name}</div>
            <div style={{color:C.muted,fontSize:11,marginBottom:6}}>@{target.username}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {prestige&&<span style={S.badge(prestige.color)}>{prestige.label} T{target.prestigeTier}</span>}
              {target.syndicate&&<span style={S.badge(C.purple)}>🏴 {target.syndicate}</span>}
              {inHosp&&<span style={S.badge(C.blue)}>🏥 hospital {hospLeft}m</span>}
              {isMe&&<span style={S.badge(C.green)}>YOU</span>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.red,fontSize:26,fontWeight:900,lineHeight:1}}>LVL {target.level}</div>
            <div style={{color:C.orange,fontSize:12,marginTop:2}}>⭐ {target.reputation} REP</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[
            ["⚔ ATK", calcAttack(target), C.red],
            ["🛡 DEF", calcDefense(target), C.blue],
            ["❤ HP",  target.health,        C.green],
            ["💪 STR", target.strength,      "#ff6e6e"],
            ["🧲 DEF", target.defense,       "#6eb4ff"],
            ["⚡ DEX", target.dexterity,     C.orange],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
              <div style={{color:c,fontWeight:900,fontSize:15}}>{typeof v==="number"?Math.floor(v):v}</div>
              <div style={{color:C.muted,fontSize:9,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Record + cash */}
        <div style={S.card({marginBottom:10})}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[
              ["WINS",   target.wins,   C.green],
              ["LOSSES", target.losses, C.red],
              ["W/L",    wr,            C.orange],
              ["CRIMES", target.crimeStats?.total||0, C.muted],
              ["PROPS",  propCount,     C.gold],
            ].map(([l,v,c])=>(
              <div key={l}>
                <div style={{color:c,fontWeight:900,fontSize:15}}>{v}</div>
                <div style={{color:C.muted,fontSize:9}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loadout */}
        <div style={S.card({marginBottom:14})}>
          <div style={S.ct}>🎒 LOADOUT</div>
          <div style={{display:"flex",gap:20}}>
            <div>
              <div style={{color:C.muted,fontSize:9,marginBottom:3}}>WEAPON</div>
              <div style={{color:wpn?C.orange:"#333",fontWeight:700,fontSize:12}}>{wpn?.name||"Bare Hands"}</div>
              {wpn&&<div style={{color:C.muted,fontSize:10}}>+{wpn.weaponDmg} ATK</div>}
            </div>
            <div>
              <div style={{color:C.muted,fontSize:9,marginBottom:3}}>ARMOR</div>
              <div style={{color:arm?C.blue:"#333",fontWeight:700,fontSize:12}}>{arm?.name||"None"}</div>
              {arm&&<div style={{color:C.muted,fontSize:10}}>+{arm.armorRating} DEF</div>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:8}}>
          {!isMe&&(
            <button
              style={{...S.btnF(viewerInHosp?C.muted:C.red, viewerInHosp?C.dim:C.redBg), opacity:viewerInHosp?0.4:1, cursor:viewerInHosp?"not-allowed":"pointer", flex:2}}
              onClick={()=>{ if(!viewerInHosp){onAttack(target); onClose();} }}
              disabled={viewerInHosp}
            >
              {viewerInHosp?"🏥 HOSPITALIZED":"⚔ CHALLENGE"}
            </button>
          )}
          <button style={{...S.btnF(C.muted,"#0d140d"), flex:1}} onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LEADERBOARD PAGE
// ============================================================
export default FeedPage;
