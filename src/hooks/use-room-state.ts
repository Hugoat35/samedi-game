"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export function useRoomState(roomCode: string | null) {
  const [roomState, setRoomState] = useState<any>(null);

  const refreshRoomState = useCallback(async () => {
    if (!roomCode) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { data } = await supabase.from("rooms").select("*").eq("code", roomCode.trim()).single();
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

  return { roomState, refreshRoomState };
}