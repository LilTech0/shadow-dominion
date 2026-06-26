import { useState, useEffect, useRef } from "react";
import { getSB } from "../services/supabase";
import { MAX_MSG_LEN } from "../data/constants";

function useChat(channelId, player) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const subRef = useRef(null);

  // Load history
  useEffect(() => {
    const sb = getSB();
    if(!sb) { setError("Supabase not configured"); setLoading(false); return; }

    setLoading(true);
    setMessages([]);

    // Fetch last 60 messages
    sb.from("chat_messages")
      .select("*")
      .eq("channel", channelId)
      .order("created_at", { ascending:false })
      .limit(60)
      .then(({ data, error:e }) => {
        if(e) setError(e.message);
        else setMessages((data||[]).reverse());
        setLoading(false);
      });

    // Subscribe to new messages
    const ch = sb.channel(`chat:${channelId}`)
      .on("postgres_changes", {
        event:"INSERT", schema:"public", table:"chat_messages",
        filter:`channel=eq.${channelId}`
      }, payload => {
        setMessages(prev => {
          if(prev.find(m=>m.id===payload.new.id)) return prev;
          return [...prev.slice(-99), payload.new];
        });
      })
      .subscribe();

    subRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [channelId]);

  async function sendMessage(text) {
    const sb = getSB();
    if(!sb) return { error:"Supabase not configured" };
    if(!text?.trim()) return;
    const msg = {
      channel: channelId,
      username: player.username,
      name: player.name,
      level: player.level,
      syndicate: player.syndicate || null,
      text: text.trim().slice(0, MAX_MSG_LEN),
      created_at: new Date().toISOString(),
    };
    const { error:e } = await sb.from("chat_messages").insert(msg);
    return e ? { error:e.message } : { ok:true };
  }

  return { messages, loading, error, sendMessage };
}

// ── ChatPage ──────────────────────────────────────────────
export { useChat };
