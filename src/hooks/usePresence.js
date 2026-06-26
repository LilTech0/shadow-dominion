import { useState, useEffect, useRef } from "react";
import { getSB } from "../services/supabase";

function usePresence(player) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    const sb = getSB();
    if(!sb || !player?.username) return;

    const ch = sb.channel("presence:game", {
      config: { presence: { key: player.username } }
    });

    ch.on("presence", { event:"sync" }, () => {
      const state = ch.presenceState();
      const users = Object.values(state).flat().map(u => ({
        username: u.username,
        name: u.name,
        level: u.level,
        syndicate: u.syndicate,
        city: u.city,
        lastSeen: u.lastSeen,
      }));
      setOnlineUsers(users);
    });

    ch.subscribe(async (status) => {
      if(status === "SUBSCRIBED") {
        await ch.track({
          username: player.username,
          name: player.name,
          level: player.level,
          syndicate: player.syndicate || null,
          city: player.currentCity || "hometown",
          lastSeen: Date.now(),
        });
      }
    });

    channelRef.current = ch;

    // Refresh presence every 90s to stay "online"
    const iv = setInterval(()=>{
      ch.track({ username:player.username, name:player.name, level:player.level,
        syndicate:player.syndicate||null, city:player.currentCity||"hometown", lastSeen:Date.now() });
    }, 90000);

    return () => {
      clearInterval(iv);
      ch.unsubscribe();
    };
  }, [player?.username]);

  return onlineUsers;
}

// ── Chat hook ─────────────────────────────────────────────
export { usePresence };
