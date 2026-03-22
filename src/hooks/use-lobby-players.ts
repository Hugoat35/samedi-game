"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/lobby-types";
import { fetchPlayersRemote } from "@/lib/lobby-remote";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

type RealtimeState = "idle" | "connecting" | "subscribed" | "error";

export function useLobbyPlayers(roomCode: string | null, enabled: boolean) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("idle");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  const reload = useCallback(async () => {
    if (!roomCode) return;
    const res = await fetchPlayersRemote(roomCode);
    if (res.ok) {
      setPlayers(res.players);
      setLastEventAt(
        typeof performance !== "undefined" ? performance.now() : Date.now(),
      );
      setError(null);
    } else {
      setError(res.error);
    }
  }, [roomCode]);

  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled || !roomCode) {
      setPlayers([]);
      setLoading(false);
      setRealtimeState("idle");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      setError("Client Supabase indisponible.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setRealtimeState("connecting");

    void (async () => {
      await reloadRef.current();
      if (!cancelled) setLoading(false);
    })();

    const channel = supabase
      .channel(`lobby:${roomCode}`, {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_players",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void reloadRef.current();
        },
      )
      .subscribe((status, err) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setRealtimeState("subscribed");
        } else if (status === "CHANNEL_ERROR" || err) {
          setRealtimeState("error");
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      setRealtimeState("idle");
    };
  }, [enabled, roomCode]);

  return {
    players,
    loading,
    error,
    realtimeState,
    lastEventAt,
    reload,
  };
}
