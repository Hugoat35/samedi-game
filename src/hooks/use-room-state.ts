"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export function useRoomState(roomCode: string | null) {
  const [roomState, setRoomState] = useState<any>(null);

  const refreshRoomState = useCallback(async (codeOverride?: string | null) => {
    const code = (codeOverride ?? roomCode)?.trim();
    if (!code) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { data } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (data) setRoomState(data);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    void refreshRoomState();

    const code = roomCode.trim();
    const channel = supabase.channel(`room_state:${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (payload) => {
        setRoomState(payload.new);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [roomCode, refreshRoomState]);

  // DANS src/hooks/use-room-state.ts (juste avant le return)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Dès que l'onglet redevient visible, on force la synchro !
      if (document.visibilityState === "visible") {
        void refreshRoomState();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [refreshRoomState]);

  return { roomState, refreshRoomState };
}