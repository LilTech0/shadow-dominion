import { useState, useEffect } from "react";
import { C, S } from "../hooks/useTheme";
import { getSB } from "../services/supabase";
import { getSyndicates } from "../services/storage";

function Tabs({tabs,active,onSelect}){
  return(<div style={{display:"flex",gap:4,marginBottom:14}}>
    {tabs.map(t=><button key={t} onClick={()=>onSelect(t)} style={{padding:"7px 14px",background:active===t?C.red:"#0d140d",border:`1px solid ${active===t?C.red:C.border}`,borderRadius:4,color:active===t?"#fff":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:active===t?900:400}}>{t.toUpperCase()}</button>)}
  </div>);
}

function LeaderboardPage({player, onAttackFromLB, onViewProfile}) {
  const [tab, setTab]       = useState("players");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const syndicates = getSyndicates().sort((a,b)=>b.level-a.level||b.treasury-a.treasury);
  const inHosp = player.inHospitalUntil && player.inHospitalUntil > Date.now();

  async function loadPlayers() {
    setLoading(true);
    const sb = getSB();
    if(!sb) { setLoading(false); return; }
    const { data } = await sb.from("players")
      .select("*")
      .order("level", { ascending:false })
      .order("reputation", { ascending:false })
      .limit(100);
    setPlayers(data||[]);
    setLoading(false);
  }

  async function handleSearch(q) {
    setSearch(q);
    if(!q.trim()) { loadPlayers(); return; }
    const sb = getSB();
    if(!sb) return;
    const { data } = await sb.from("players")
      .select("*")
      .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
      .order("level", { ascending:false })
      .limit(30);
    setPlayers(data||[]);
  }

  useEffect(()=>{ loadPlayers(); },[]);

  return(<div>
    <Tabs tabs={["players","syndicates"]} active={tab} onSelect={setTab}/>

    {tab==="players"&&<div>
      {/* Search */}
      <div style={S.card()}>
        <input
          style={{...S.inp, marginBottom:0}}
          placeholder="Search players by name or username..."
          value={search}
          onChange={e=>handleSearch(e.target.value)}
        />
      </div>

      <div style={S.card()}>
        <div style={S.ct}>🏆 TOP PLAYERS {loading&&"— loading..."}</div>
        <div style={{color:C.muted,fontSize:10,marginBottom:10}}>
          {players.length} players registered globally
          {inHosp&&<span style={{color:C.blue,marginLeft:8}}>· 🏥 You are hospitalized</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"28px 1fr 40px 45px 55px 96px",gap:6,color:C.dim,fontSize:9,letterSpacing:1,marginBottom:8,padding:"0 4px"}}>
          <span>#</span><span>NAME</span><span>LVL</span><span>REP</span><span>CASH</span><span></span>
        </div>
        {players.map((p,i)=>{
          const isMe = p.username===player.username;
          return(
            <div key={p.username} style={{display:"grid",gridTemplateColumns:"28px 1fr 40px 45px 55px 96px",gap:6,padding:"8px 4px",borderBottom:`1px solid ${C.border}`,background:isMe?C.redBg:"transparent",borderRadius:2,alignItems:"center"}}>
              <span style={{color:i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.muted,fontWeight:i<3?900:400,fontSize:i<3?13:11}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
              </span>
              <div style={{cursor:"pointer"}} onClick={()=>onViewProfile&&onViewProfile(p)}>
                <div style={{color:isMe?C.red:C.blue,fontWeight:700,fontSize:11,textDecoration:"underline",textDecorationStyle:"dotted"}}>{p.name}{isMe&&" 👈"}</div>
                <div style={{color:C.muted,fontSize:9}}>@{p.username}{p.syndicate?` · 🏴${p.syndicate}`:""}</div>
              </div>
              <span style={{color:C.purple,fontWeight:700,fontSize:11}}>{p.level}</span>
              <span style={{color:C.orange,fontSize:11}}>{p.reputation||0}</span>
              <span style={{color:C.green,fontSize:10}}>${Math.floor((p.cash||0)/1000)}k</span>
              <div style={{display:"flex",gap:4}}>
                {!isMe&&<button
                  style={{...S.btn(inHosp?C.muted:C.red,inHosp?C.dim:C.redBg),padding:"4px 6px",fontSize:9,opacity:inHosp?0.4:1,cursor:inHosp?"not-allowed":"pointer",flex:1}}
                  onClick={()=>!inHosp&&onAttackFromLB(p)}
                  disabled={inHosp}
                >⚔</button>}
                <button
                  style={{...S.btn(C.blue,"#060e1a"),padding:"4px 6px",fontSize:9,cursor:"pointer",flex:1}}
                  onClick={()=>onViewProfile&&onViewProfile(p)}
                >👤</button>
              </div>
            </div>
          );
        })}
        {!loading&&players.length===0&&<div style={{color:C.dim,textAlign:"center",padding:20}}>No players found.</div>}
      </div>
    </div>}

    {tab==="syndicates"&&<div style={S.card()}>
      <div style={S.ct}>🏴 TOP SYNDICATES</div>
      {syndicates.length===0&&<div style={{color:C.dim}}>No syndicates yet.</div>}
      {syndicates.map((s,i)=>(
        <div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"10px 4px",borderBottom:`1px solid ${C.border}`,background:s.name===player.syndicate?C.redBg:"transparent"}}>
          <div><span style={{color:i===0?C.gold:C.muted,marginRight:10,fontWeight:900}}>{i+1}</span><span style={{color:"#fff",fontWeight:700}}>{s.name}</span></div>
          <div style={{textAlign:"right",fontSize:11}}>
            <div style={{color:C.purple}}>Lvl {s.level||1} · {s.members.length} members</div>
            <div style={{color:C.gold}}>💰${(s.treasury||0).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>}
  </div>);
}

export default LeaderboardPage;
