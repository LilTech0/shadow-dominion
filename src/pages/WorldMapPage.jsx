import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { CITY_COORDS } from "../data/cities";

function WorldMapPage({ player, onlineUsers, onAttackPlayer }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [tab, setTab] = useState("map");
  const myCity = player.currentCity || "hometown";

  const cityGroups = {};
  onlineUsers.forEach(u => {
    const c = u.city || "hometown";
    if(!cityGroups[c]) cityGroups[c] = [];
    cityGroups[c].push(u);
  });

  return(<div>
    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {["map","players"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.orange:"#0d140d",border:`1px solid ${tab===t?C.orange:C.border}`,borderRadius:4,color:tab===t?"#000":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400}}>
          {t==="map"?"🗺 WORLD MAP":"👥 ALL PLAYERS"}
        </button>
      ))}
    </div>

    {tab==="map"&&<div>
      <div style={{...S.card({borderColor:C.orange+"44",background:"#050e05"}),padding:0,overflow:"hidden"}}>
        <svg viewBox="0 0 100 100" style={{width:"100%",height:280,display:"block"}}>
          {[20,40,60,80].map(v=>(<g key={v}>
            <line x1={v} y1={0} x2={v} y2={100} stroke={C.border} strokeWidth="0.3" strokeDasharray="1,2"/>
            <line x1={0} y1={v} x2={100} y2={v} stroke={C.border} strokeWidth="0.3" strokeDasharray="1,2"/>
          </g>))}
          {[["hometown","portclay"],["portclay","neonridge"],["portclay","irongate"],["neonridge","ghosthaven"],["irongate","ghosthaven"]].map(([a,b])=>{
            const ca=CITY_COORDS[a],cb=CITY_COORDS[b];
            return <line key={a+b} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke={C.dim} strokeWidth="0.5"/>;
          })}
          {Object.entries(CITY_COORDS).map(([id,c])=>{
            const count=(cityGroups[id]||[]).length;
            const isHere=id===myCity;
            const isSelected=id===selectedCity;
            return(<g key={id} onClick={()=>setSelectedCity(selectedCity===id?null:id)} style={{cursor:"pointer"}}>
              {isHere&&<circle cx={c.x} cy={c.y} r={8} fill="none" stroke={C.green} strokeWidth="0.5" opacity="0.4">
                <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
              </circle>}
              <circle cx={c.x} cy={c.y} r={isSelected?5.5:4} fill={isHere?C.green:C.orange} stroke={isSelected?"#fff":"none"} strokeWidth="0.6"/>
              {count>0&&<circle cx={c.x+4} cy={c.y-4} r={2.5} fill={C.green}/>}
              {count>0&&<text x={c.x+4} y={c.y-3} fontSize="2.5" fill="#000" textAnchor="middle" fontWeight="bold">{count}</text>}
              <text x={c.x} y={c.y+8} fontSize="3" fill={isHere?C.green:C.muted} textAnchor="middle">{c.flag} {c.name}</text>
            </g>);
          })}
        </svg>
      </div>

      {selectedCity&&<div style={S.card({borderColor:C.orange+"44"})}>
        <div style={S.ct}>{CITY_COORDS[selectedCity].flag} {CITY_COORDS[selectedCity].name} — {(cityGroups[selectedCity]||[]).length} online</div>
        {(cityGroups[selectedCity]||[]).length===0
          ?<div style={{color:C.muted,fontSize:11}}>No one here right now.</div>
          :(cityGroups[selectedCity]||[]).map(u=>{
            const isMe=u.username===player.username;
            const sameSyn=u.syndicate&&u.syndicate===player.syndicate;
            return(<div key={u.username} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 4px ${C.green}`}}/>
                  <span style={{color:isMe?C.green:sameSyn?C.blue:"#fff",fontWeight:700,fontSize:12}}>{u.name}{isMe?" (you)":""}</span>
                  {sameSyn&&!isMe&&<span style={S.badge(C.blue)}>ALLY</span>}
                </div>
                <div style={{color:C.muted,fontSize:10}}>Lv{u.level} · @{u.username}{u.syndicate?` · 🏴${u.syndicate}`:""}</div>
              </div>
              {!isMe&&!sameSyn&&<button style={{...S.btn(C.red,C.redBg),padding:"5px 12px",fontSize:9}} onClick={()=>onAttackPlayer(u)}>⚔ ATTACK</button>}
              {!isMe&&sameSyn&&<span style={{color:C.muted,fontSize:9}}>ALLY</span>}
            </div>);
          })
        }
      </div>}

      <div style={S.card()}>
        <div style={S.ct}>📍 CITY STATUS</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {Object.entries(CITY_COORDS).map(([id,c])=>{
            const count=(cityGroups[id]||[]).length;
            const isHere=id===myCity;
            return(<div key={id} onClick={()=>setSelectedCity(id)} style={{padding:"8px 10px",background:isHere?C.green+"11":"#0d140d",border:`1px solid ${isHere?C.green:count>0?C.orange+"44":C.border}`,borderRadius:4,cursor:"pointer",minWidth:90,textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:2}}>{c.flag}</div>
              <div style={{color:isHere?C.green:"#fff",fontSize:10,fontWeight:700}}>{c.name}</div>
              <div style={{color:count>0?C.green:C.dim,fontSize:9,marginTop:2}}>{count>0?count+" online":"empty"}</div>
              {isHere&&<div style={{color:C.green,fontSize:8,marginTop:1}}>YOU ARE HERE</div>}
            </div>);
          })}
        </div>
      </div>
    </div>}

    {tab==="players"&&<div>
      <div style={S.card({borderColor:C.green+"33"})}>
        <div style={S.ct}>🟢 ALL ONLINE PLAYERS ({onlineUsers.length})</div>
        {onlineUsers.length===0&&<div style={{color:C.muted,fontSize:11}}>No one else online right now.</div>}
        {onlineUsers.map(u=>{
          const isMe=u.username===player.username;
          const sameSyn=u.syndicate&&u.syndicate===player.syndicate;
          const cityInfo=CITY_COORDS[u.city||"hometown"];
          return(<div key={u.username} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 5px ${C.green}`}}/>
                <span style={{color:isMe?C.green:sameSyn?C.blue:"#fff",fontWeight:700,fontSize:12}}>{u.name}</span>
                {isMe&&<span style={S.badge(C.green)}>YOU</span>}
                {sameSyn&&!isMe&&<span style={S.badge(C.blue)}>ALLY</span>}
              </div>
              <div style={{color:C.muted,fontSize:10}}>Lv{u.level} · 📍{cityInfo?.name||u.city}{u.syndicate?` · 🏴${u.syndicate}`:""}</div>
            </div>
            {!isMe&&!sameSyn&&<button style={{...S.btn(C.red,C.redBg),padding:"5px 10px",fontSize:9}} onClick={()=>onAttackPlayer(u)}>⚔ ATK</button>}
          </div>);
        })}
      </div>
      {onlineUsers.length>1&&<div style={S.card()}>
        <div style={S.ct}>📊 SESSION STATS</div>
        <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
          {[
            ["ONLINE",      onlineUsers.length,                                                                       C.green],
            ["SYNDICATES",  new Set(onlineUsers.map(u=>u.syndicate).filter(Boolean)).size,                            C.purple],
            ["AVG LEVEL",   Math.round(onlineUsers.reduce((s,u)=>s+(u.level||1),0)/onlineUsers.length),              C.orange],
            ["CITIES",      new Set(onlineUsers.map(u=>u.city||"hometown")).size,                                     C.blue],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 45%",marginBottom:10}}>
              <div style={{color:c,fontWeight:900,fontSize:15}}>{v}</div>
              <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>}
  </div>);
}

// ============================================================
// SYNDICATE WARS PAGE
// ============================================================
async function sbInsert(table, row) {
  const { error } = await getSB().from(table).insert(row);
  return error;
}

export default WorldMapPage;
