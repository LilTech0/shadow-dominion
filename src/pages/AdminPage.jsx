import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { getAccounts, saveAccounts, getSyndicates, saveSyndicates, getAnnouncements, saveAnnouncements } from "../services/storage";

function AdminPage({player,notify}) {
  const [tab,setTab]=useState("players");
  const [players,setPlayers]=useState([]);
  const [sel,setSel]=useState(null);
  const [ann,setAnn]=useState("");
  const [anns,setAnns]=useState(getAnnouncements);
  const [give,setGive]=useState({cash:"",itemId:""});
  const [edit,setEdit]=useState({level:"",cash:"",strength:"",defense:"",dexterity:"",reputation:""});
  const [confirm,setConfirm]=useState(null);
  const [search,setSearch]=useState("");

  function refresh(){
    const accs=getAccounts();
    setPlayers(Object.values(accs).map(a=>a.player));
    setAnns(getAnnouncements());
  }
  useEffect(()=>{refresh();},[]);

  function selectP(p){setSel(p);setEdit({level:p.level,cash:p.cash,strength:p.strength,defense:p.defense,dexterity:p.dexterity,reputation:p.reputation});}

  function saveP(updated) {
    const accs=getAccounts();
    if(accs[updated.username]){accs[updated.username].player=updated;saveAccounts(accs);}
    setSel(updated);setPlayers(ps=>ps.map(p=>p.username===updated.username?updated:p));
    notify("✅ Player saved");
  }

  function banP(username) {
    setConfirm({msg:`Ban & delete "${username}"? Cannot be undone.`,action:()=>{
      const accs=getAccounts(); delete accs[username]; saveAccounts(accs);
      setSel(null);refresh();notify(`🚫 ${username} banned`);
    }});
  }

  function applyEdit() {
    if(!sel)return;
    saveP({...sel,
      level:Math.max(1,parseInt(edit.level)||sel.level),
      cash:Math.max(0,parseInt(edit.cash)||sel.cash),
      strength:Math.max(1,parseInt(edit.strength)||sel.strength),
      defense:Math.max(1,parseInt(edit.defense)||sel.defense),
      dexterity:Math.max(1,parseInt(edit.dexterity)||sel.dexterity),
      reputation:Math.max(0,parseInt(edit.reputation)||sel.reputation),
    });
  }

  function giveCash() {
    if(!sel)return;
    const a=parseInt(give.cash);
    if(!a||a<=0)return notify("❌ Enter valid amount");
    saveP({...sel,cash:sel.cash+a});
    notify(`✅ Gave $${a.toLocaleString()} to ${sel.name}`);
  }

  function giveItem() {
    if(!sel||!give.itemId)return;
    if(sel.inventory.includes(give.itemId))return notify("❌ Already owned");
    saveP({...sel,inventory:[...sel.inventory,give.itemId]});
    notify(`✅ Gave ${ITEMS.find(i=>i.id===give.itemId)?.name} to ${sel.name}`);
  }

  function postAnn() {
    if(!ann.trim())return;
    const msg={id:Date.now(),text:ann.trim(),time:new Date().toLocaleString(),active:true};
    const updated=[msg,...anns.slice(0,9)];
    saveAnnouncements(updated);setAnns(updated);setAnn("");
    notify("📢 Announcement posted");
  }

  function delAnn(id) {
    const updated=anns.filter(a=>a.id!==id);
    saveAnnouncements(updated);setAnns(updated);
  }

  const filtered=players.filter(p=>p.username?.includes(search.toLowerCase())||p.name?.toLowerCase().includes(search.toLowerCase()));
  const totalCash=players.reduce((s,p)=>s+(p.cash||0),0);
  const totalCrimes=players.reduce((s,p)=>s+(p.crimeStats?.total||0),0);

  return(<div>
    {confirm&&<Confirm msg={confirm.msg} onYes={()=>{confirm.action();setConfirm(null);}} onNo={()=>setConfirm(null)}/>}
    <Tabs tabs={["players","give","edit","announce"]} active={tab} onSelect={setTab}/>

    <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      {[["👥 PLAYERS",players.length,C.blue],["💰 CASH","$"+totalCash.toLocaleString(),C.green],["🔪 CRIMES",totalCrimes,C.orange]].map(([l,v,c])=>(
        <div key={l} style={{background:"#090f09",border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 16px"}}>
          <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
          <div style={{color:C.muted,fontSize:9}}>{l}</div>
        </div>
      ))}
      <button style={{...S.btn(C.muted,"#0d140d"),marginLeft:"auto"}} onClick={refresh}>↺ REFRESH</button>
    </div>

    {tab==="players"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>👥 ALL PLAYERS</div>
        <input style={{...S.inp,marginBottom:12}} placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {filtered.length===0&&<div style={{color:C.dim}}>No players found.</div>}
        {filtered.map(p=>(
          <div key={p.username} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 80px",gap:6,padding:"10px 4px",borderBottom:`1px solid ${C.border}`,background:sel?.username===p.username?"#1a1a00":"transparent",cursor:"pointer",borderRadius:2}} onClick={()=>selectP(p)}>
            <div><div style={{color:"#fff",fontSize:12,fontWeight:700}}>{p.name}</div><div style={{color:C.muted,fontSize:9}}>@{p.username}</div></div>
            <span style={{color:C.purple,fontWeight:700}}>{p.level}</span>
            <span style={{color:C.orange}}>{p.reputation}</span>
            <span style={{color:C.green,fontSize:10}}>${Math.floor((p.cash||0)/1000)}k</span>
            <button style={{...S.btn(C.red,C.redBg),padding:"3px 8px",fontSize:9}} onClick={e=>{e.stopPropagation();banP(p.username);}}>BAN</button>
          </div>
        ))}
      </div>
      {sel&&<div style={S.card()}>
        <div style={S.ct}>📊 {sel.name}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Username",sel.username],["Level",sel.level],["Cash","$"+(sel.cash||0).toLocaleString()],["Rep",sel.reputation],["STR",sel.strength],["DEF",sel.defense],["DEX",sel.dexterity],["Wins",sel.wins],["Losses",sel.losses],["Crimes",sel.crimeStats?.total||0],["Syndicate",sel.syndicate||"None"],["Items",(sel.inventory?.length||0)+" items"]].map(([l,v])=>(
            <div key={l} style={{...S.row,justifyContent:"space-between",background:"#0a0808",padding:"6px 10px",borderRadius:4}}><span style={{color:C.muted,fontSize:10}}>{l}</span><span style={{color:"#fff",fontWeight:700}}>{v}</span></div>
          ))}
        </div>
      </div>}
    </div>}

    {tab==="give"&&<div>
      {!sel&&<div style={{...S.card(),color:C.muted}}>👈 Select a player from Players tab first.</div>}
      {sel&&<><div style={S.card()}>
        <div style={S.ct}>🎁 GIVE TO: {sel.name}</div>
        <div style={{color:C.muted,fontSize:11,marginBottom:10}}>Cash: <span style={{color:C.green}}>${(sel.cash||0).toLocaleString()}</span></div>
        <div style={{display:"flex",gap:8,marginBottom:10}}><input style={{...S.inp,marginBottom:0,flex:1}} type="number" placeholder="Cash amount..." value={give.cash} onChange={e=>setGive(g=>({...g,cash:e.target.value}))}/><button style={S.btn(C.green,C.greenBg)} onClick={giveCash}>GIVE</button></div>
        <div style={{display:"flex",gap:8}}><select style={{...S.inp,marginBottom:0,flex:1}} value={give.itemId} onChange={e=>setGive(g=>({...g,itemId:e.target.value}))}><option value="">Select item...</option>{ITEMS.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><button style={S.btn(C.orange,C.orangeBg)} onClick={giveItem}>GIVE ITEM</button></div>
      </div></>}
    </div>}

    {tab==="edit"&&<div>
      {!sel&&<div style={{...S.card(),color:C.muted}}>👈 Select a player from Players tab first.</div>}
      {sel&&<div style={S.card()}>
        <div style={S.ct}>✏ EDIT: {sel.name}</div>
        <div style={S.g2}>
          {[["Level","level"],["Cash","cash"],["Strength","strength"],["Defense","defense"],["Dexterity","dexterity"],["Reputation","reputation"]].map(([label,key])=>(
            <div key={key}><div style={{color:C.muted,fontSize:10,marginBottom:4}}>{label.toUpperCase()}</div><input style={S.inp} type="number" value={edit[key]} onChange={e=>setEdit(f=>({...f,[key]:e.target.value}))}/></div>
          ))}
        </div>
        <button style={S.btnF(C.orange,C.orangeBg)} onClick={applyEdit}>💾 SAVE CHANGES</button>
        <div style={{marginTop:10}}><button style={S.btn(C.red,C.redBg)} onClick={()=>banP(sel.username)}>🚫 BAN PLAYER</button></div>
      </div>}
    </div>}

    {tab==="announce"&&<div>
      <div style={S.card()}>
        <div style={S.ct}>📢 BROADCAST</div>
        <textarea style={{...S.inp,height:80,resize:"vertical",marginBottom:10}} placeholder="Announcement message..." value={ann} onChange={e=>setAnn(e.target.value)}/>
        <button style={S.btn(C.orange,C.orangeBg)} onClick={postAnn}>📢 POST</button>
      </div>
      <div style={S.card()}>
        <div style={S.ct}>📋 ACTIVE ANNOUNCEMENTS</div>
        {anns.length===0&&<div style={{color:C.dim}}>None.</div>}
        {anns.map(a=>(
          <div key={a.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{color:"#fff",fontSize:12}}>{a.text}</div><div style={{color:C.muted,fontSize:10}}>{a.time}</div></div>
              <button style={{...S.btn(C.red,C.redBg),padding:"3px 8px",fontSize:9}} onClick={()=>delAnn(a.id)}>DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>}
  </div>);
}

// ============================================================
// JAIL PAGE
// ============================================================
function JailPage({player,onBail,onBreakout}) {
  const [log,setLog]=useState([]);
  const [busy,setBusy]=useState(false);
  const [bustInput,setBustInput]=useState("");

  const inJail=player.jailUntil&&player.jailUntil>Date.now();
  const timeLeft=inJail?Math.ceil((player.jailUntil-Date.now())/60000):0;
  const bail=BAIL_COST(player.level);
  const canAffordBail=player.cash>=bail;
  const breakoutChance=Math.min(80,20+player.dexterity*0.5);
  const pct=inJail?Math.max(0,100-(timeLeft/player.jailSentence)*100):100;

  function attemptBreakout(){
    if(!inJail||busy)return;
    if(player.energy<10){setLog(l=>[`❌ Need 10 energy to attempt breakout`,...l]);return;}
    setBusy(true);
    setTimeout(()=>{
      const success=Math.random()*100<=breakoutChance;
      if(success){
        setLog(l=>[`✅ Breakout successful! You slipped past the guards.`,...l]);
        onBreakout({success:true,energyCost:10});
      } else {
        setLog(l=>[`❌ Caught trying to escape! +5 min added.`,...l]);
        onBreakout({success:false,energyCost:10,extraTime:5*60000});
      }
      setBusy(false);
    },1200);
  }

  function bustOut(){
    const uname=bustInput.trim().toLowerCase();
    if(!uname)return;
    if(player.energy<15){setLog(l=>[`❌ Need 15 energy to bust someone out`,...l]);return;}
    const accs=getAccounts();
    if(!accs[uname]){setLog(l=>[`❌ Player not found`,...l]);return;}
    const target=accs[uname].player;
    if(!target.jailUntil||target.jailUntil<=Date.now()){setLog(l=>[`❌ ${target.name} is not in jail`,...l]);return;}
    const success=Math.random()*100<=breakoutChance;
    if(success){
      accs[uname].player={...target,jailUntil:null};
      saveAccounts(accs);
      setLog(l=>[`✅ Busted ${target.name} out of jail!`,...l]);
      onBreakout({success:true,energyCost:15,bustedOut:target.name});
    } else {
      setLog(l=>[`❌ Failed to bust out ${target.name}. Guards spotted you!`,...l]);
      onBreakout({success:false,energyCost:15});
    }
    setBustInput("");
  }

  return(<div>
    {/* Status card */}
    <div style={S.card({borderColor:inJail?C.red+"55":C.green+"44"})}>
      <div style={S.ct}>🔒 JAIL STATUS</div>
      {inJail?(
        <>
          <div style={{color:C.red,fontSize:20,fontWeight:900,marginBottom:8}}>YOU ARE LOCKED UP</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:12}}>
            Time remaining: <span style={{color:"#fff",fontWeight:700}}>{timeLeft} min</span>
            <span style={{color:C.muted,marginLeft:12}}>· Sentence: {player.jailSentence} min</span>
          </div>
          <div style={{...S.barW,height:14,marginBottom:16}}>
            <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${C.red}88,${C.red})`,transition:"width 0.5s",boxShadow:`0 0 8px ${C.red}55`}}/>
            <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,textShadow:"0 0 4px #000"}}>{pct.toFixed(0)}% served</span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button
              style={{...S.btn(canAffordBail?C.gold:C.muted,canAffordBail?C.goldBg:"#0d140d"),opacity:canAffordBail?1:0.4}}
              onClick={()=>canAffordBail&&onBail(bail)}
              disabled={!canAffordBail}>
              💰 PAY BAIL ${bail.toLocaleString()}
            </button>
            <button
              style={{...S.btn(C.orange,C.orangeBg),opacity:player.energy>=10&&!busy?1:0.4}}
              onClick={attemptBreakout}
              disabled={busy||player.energy<10}>
              {busy?"ATTEMPTING...":"🏃 BREAKOUT ("+breakoutChance.toFixed(0)+"%)"}
            </button>
          </div>
          <div style={{color:C.muted,fontSize:10,marginTop:10}}>
            Energy: <span style={{color:C.blue}}>{Math.floor(player.energy)}</span> · Breakout chance scales with DEX ({player.dexterity})
          </div>
        </>
      ):(
        <div style={{color:C.green,fontSize:14,fontWeight:700}}>✅ You are free. Stay out of trouble.</div>
      )}
    </div>

    {/* Bust someone out */}
    <div style={S.card()}>
      <div style={S.ct}>🤝 BUST SOMEONE OUT</div>
      <div style={{color:C.muted,fontSize:11,marginBottom:10}}>
        Costs 15 energy · {breakoutChance.toFixed(0)}% success chance based on your DEX
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          style={{...S.inp,marginBottom:0,flex:1}}
          placeholder="Their username..."
          value={bustInput}
          onChange={e=>setBustInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&bustOut()}
        />
        <button style={S.btn(C.blue,"#060e1a")} onClick={bustOut}>BUST OUT</button>
      </div>
    </div>

    {/* Stats */}
    <div style={S.card()}>
      <div style={S.ct}>📊 CRIMINAL RECORD</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[
          ["TIMES JAILED",player.timesJailed||0,C.red],
          ["BREAKOUTS",player.breakouts||0,C.green],
          ["BAIL PAID","$"+(player.bailPaid||0).toLocaleString(),C.gold],
        ].map(([l,v,c])=>(
          <div key={l}>
            <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
            <div style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Sentence guide */}
    <div style={S.card()}>
      <div style={S.ct}>📋 SENTENCE GUIDE</div>
      {Object.entries(JAIL_SENTENCES).map(([crime,s])=>(
        <div key={crime} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
          <span style={{color:C.muted,textTransform:"capitalize"}}>{crime}</span>
          <span style={{color:C.red,fontWeight:700}}>{s.time} min</span>
        </div>
      ))}
    </div>

    {/* Log */}
    {log.length>0&&<div style={S.card()}>
      <div style={S.ct}>📋 JAIL LOG</div>
      <div style={S.logB}>
        {log.map((l,i)=><div key={i} style={{color:l.startsWith("✅")?C.green:"#ff6e6e"}}>{l}</div>)}
      </div>
    </div>}
  </div>);
}
// ============================================================
// ADMIN LOGIN
// ============================================================
export default AdminPage;
