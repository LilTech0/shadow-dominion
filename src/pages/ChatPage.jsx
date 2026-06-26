import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import Confirm from "../components/Confirm";
import { useChat } from "../hooks/useChat";
import { CHAT_CHANNELS, MAX_MSG_LEN } from "../data/constants";

function ChatPage({ player, onlineUsers }) {
  const [channelId, setChannelId] = useState("global");
  const [tab, setTab]             = useState("chat");
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [err, setErr]             = useState("");
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  const { messages, loading, error, sendMessage } = useChat(channelId, player);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if(!text || sending) return;
    if(text.length > MAX_MSG_LEN) { setErr(`Max ${MAX_MSG_LEN} chars`); return; }

    // Syndicate channel guard
    if(channelId==="syndicate" && !player.syndicate) {
      setErr("❌ Join a syndicate to use this channel"); return;
    }

    setSending(true); setErr("");
    const res = await sendMessage(text);
    if(res?.error) setErr("❌ "+res.error);
    else setInput("");
    setSending(false);
    inputRef.current?.focus();
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  }

  function msgColor(msg) {
    if(msg.username === player.username) return C.green;
    if(msg.syndicate && msg.syndicate === player.syndicate) return C.blue;
    return C.text;
  }

  const CITIES_MAP = { hometown:"Maplewood", portclay:"Port Clay", neonridge:"Neon Ridge", irongate:"Iron Gate", ghosthaven:"Ghost Haven" };

  const sbConfigured = SUPABASE_URL !== "https://YOUR_PROJECT.supabase.co";

  return(<div>
    {/* Not configured banner */}
    {!sbConfigured && <div style={{background:C.orangeBg,border:`1px solid ${C.orange}44`,borderRadius:6,padding:14,marginBottom:12}}>
      <div style={{color:C.orange,fontWeight:700,fontSize:12,marginBottom:4}}>⚠ Supabase Not Configured</div>
      <div style={{color:C.muted,fontSize:11,lineHeight:1.7}}>
        Open <span style={{color:C.text}}>App.jsx</span> and replace <span style={{color:C.orange}}>SUPABASE_URL</span> and <span style={{color:C.orange}}>SUPABASE_ANON_KEY</span> with your project values from supabase.com → Settings → API.
        <br/><br/>
        Also run this SQL in your Supabase SQL editor to create the tables:
      </div>
      <pre style={{background:C.logBg,borderRadius:4,padding:10,fontSize:10,color:C.green,marginTop:8,overflowX:"auto",lineHeight:1.6}}>{`create table chat_messages (
  id bigint generated always as identity primary key,
  channel text not null,
  username text not null,
  name text not null,
  level int default 1,
  syndicate text,
  text text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;
create policy "Anyone can read" on chat_messages for select using (true);
create policy "Anyone can insert" on chat_messages for insert with check (true);

-- Optional: auto-delete messages older than 7 days
create index on chat_messages (created_at);`}</pre>
    </div>}

    {/* Tabs: Chat | Online */}
    <div style={{display:"flex",gap:4,marginBottom:14}}>
      {["chat","online"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",background:tab===t?C.blue:"#0d140d",border:`1px solid ${tab===t?C.blue:C.border}`,borderRadius:4,color:tab===t?"#fff":C.muted,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:tab===t?900:400,position:"relative"}}>
          {t==="chat"?"💬 CHAT":"🟢 ONLINE"}
          {t==="online"&&<span style={{marginLeft:5,background:C.green,color:"#000",borderRadius:8,fontSize:8,padding:"1px 5px",fontWeight:900}}>{onlineUsers.length}</span>}
        </button>
      ))}
    </div>

    {/* ── CHAT TAB ── */}
    {tab==="chat"&&<div>
      {/* Channel selector */}
      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
        {CHAT_CHANNELS.map(ch=>{
          const locked = ch.id==="syndicate" && !player.syndicate;
          return(
            <button key={ch.id} onClick={()=>!locked&&setChannelId(ch.id)}
              style={{padding:"5px 12px",background:channelId===ch.id?C.blue+"22":"#0d140d",border:`1px solid ${channelId===ch.id?C.blue:C.border}`,borderRadius:4,color:channelId===ch.id?C.blue:locked?C.dim:C.muted,cursor:locked?"not-allowed":"pointer",fontSize:10,opacity:locked?0.4:1}}>
              {ch.name} <span style={{fontSize:9,color:C.dim}}>{ch.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Message area */}
      <div style={{background:C.logBg,border:`1px solid ${C.border}`,borderRadius:6,padding:10,height:340,overflowY:"auto",marginBottom:10,display:"flex",flexDirection:"column",gap:2}}>
        {loading&&<div style={{color:C.muted,fontSize:12,textAlign:"center",marginTop:20}}>Loading messages...</div>}
        {error&&!sbConfigured&&<div style={{color:C.muted,fontSize:11,textAlign:"center",marginTop:40,lineHeight:2}}>
          Configure Supabase above to enable real-time chat.
        </div>}
        {error&&sbConfigured&&<div style={{color:C.red,fontSize:11,textAlign:"center",marginTop:20}}>{error}</div>}
        {!loading&&!error&&messages.length===0&&<div style={{color:C.muted,fontSize:11,textAlign:"center",marginTop:40}}>
          No messages yet. Say something!
        </div>}
        {messages.map((msg,i)=>{
          const isMe = msg.username === player.username;
          const isSyn = msg.syndicate && msg.syndicate === player.syndicate;
          return(
            <div key={msg.id||i} style={{padding:"5px 0",borderBottom:`1px solid ${C.dim}22`}}>
              <div style={{display:"flex",gap:6,alignItems:"baseline",flexWrap:"wrap"}}>
                <span style={{color:isMe?C.green:isSyn?C.blue:C.orange,fontWeight:700,fontSize:11}}>{msg.name}</span>
                <span style={{color:C.dim,fontSize:9}}>Lv{msg.level}</span>
                {msg.syndicate&&<span style={{color:C.purple,fontSize:9}}>[{msg.syndicate}]</span>}
                <span style={{color:C.dim,fontSize:9,marginLeft:"auto"}}>{fmtTime(msg.created_at)}</span>
              </div>
              <div style={{color:msgColor(msg),fontSize:12,marginTop:2,wordBreak:"break-word",lineHeight:1.5}}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Error */}
      {err&&<div style={{color:C.red,fontSize:11,marginBottom:6}}>{err}</div>}

      {/* Input */}
      <div style={{display:"flex",gap:6}}>
        <input
          ref={inputRef}
          style={{...S.inp,marginBottom:0,flex:1,fontSize:12}}
          placeholder={sbConfigured?"Type a message...":"Configure Supabase to chat"}
          value={input}
          disabled={!sbConfigured||sending}
          maxLength={MAX_MSG_LEN}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleSend()}
        />
        <button
          style={{...S.btn(C.blue,C.blue+"22"),padding:"9px 14px",opacity:(!input.trim()||sending||!sbConfigured)?0.4:1}}
          onClick={handleSend}
          disabled={!input.trim()||sending||!sbConfigured}>
          {sending?"...":"SEND"}
        </button>
      </div>
      <div style={{color:C.dim,fontSize:9,marginTop:4,textAlign:"right"}}>{input.length}/{MAX_MSG_LEN}</div>
    </div>}

    {/* ── ONLINE TAB ── */}
    {tab==="online"&&<div>
      <div style={S.card({borderColor:C.green+"33"})}>
        <div style={S.ct}>🟢 ONLINE NOW — {onlineUsers.length} PLAYER{onlineUsers.length!==1?"S":""}</div>
        {!sbConfigured&&<div style={{color:C.muted,fontSize:11}}>Configure Supabase to see who's online.</div>}
        {sbConfigured&&onlineUsers.length===0&&<div style={{color:C.muted,fontSize:11}}>No one else online right now.</div>}
        {onlineUsers.map(u=>{
          const isMe = u.username===player.username;
          const isSyn = u.syndicate && u.syndicate===player.syndicate;
          const cityName = CITIES_MAP[u.city]||u.city||"Unknown";
          return(
            <div key={u.username} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 6px ${C.green}`}}/>
                  <span style={{color:isMe?C.green:isSyn?C.blue:"#fff",fontWeight:700,fontSize:12}}>{u.name}{isMe?" (you)":""}</span>
                  {isSyn&&!isMe&&<span style={S.badge(C.blue)}>SYNDICATE</span>}
                </div>
                <div style={{color:C.muted,fontSize:10}}>@{u.username} · Lv{u.level} · 📍{cityName}</div>
                {u.syndicate&&<div style={{color:C.purple,fontSize:9,marginTop:2}}>🏴 {u.syndicate}</div>}
              </div>
              <div style={{fontSize:9,color:C.dim,textAlign:"right"}}>
                {isMe?"YOU":"online"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      {sbConfigured&&onlineUsers.length>0&&<div style={S.card()}>
        <div style={S.ct}>📊 SESSION STATS</div>
        <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
          {[
            ["ONLINE",     onlineUsers.length,                                      C.green],
            ["SYNDICATES", new Set(onlineUsers.map(u=>u.syndicate).filter(Boolean)).size, C.purple],
            ["AVG LEVEL",  Math.round(onlineUsers.reduce((s,u)=>s+(u.level||1),0)/onlineUsers.length), C.orange],
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 30%",marginBottom:8}}>
              <div style={{color:c,fontWeight:900,fontSize:16}}>{v}</div>
              <div style={{color:C.muted,fontSize:9}}>{l}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>}
  </div>);
}

// ============================================================
// MAIN GAME — NAV now includes properties, blackmarket, prestige
// ============================================================

// ============================================================
// WORLD MAP PAGE
// ============================================================
const CITY_COORDS = {
  hometown:   { x:20, y:60, name:"Maplewood",  flag:"🏙" },
  portclay:   { x:40, y:35, name:"Port Clay",   flag:"⚓" },
  neonridge:  { x:65, y:50, name:"Neon Ridge",  flag:"🌆" },
  irongate:   { x:55, y:75, name:"Iron Gate",   flag:"🏭" },
  ghosthaven: { x:82, y:25, name:"Ghost Haven", flag:"💀" },
};

export default ChatPage;
