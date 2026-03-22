"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export function useRoomState(roomCode: string | null) {
  const [roomState, setRoomState] = useState<any>(null);

  useEffect(() => {
    if (!roomCode) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // Récupère l'état initial (lobby)
    supabase.from("rooms").select("*").eq("code", roomCode).single().then(({ data }) => {
      if (data) setRoomState(data);
    });

    // Écoute les changements (quand l'hôte lance le jeu)
    const channel = supabase.channel(`room_state:${roomCode}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` }, (payload) => {
        setRoomState(payload.new);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [roomCode]);

  return roomState;
}