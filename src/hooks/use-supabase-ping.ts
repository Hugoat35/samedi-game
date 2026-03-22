"use client";

import { useEffect, useState } from "react";
import { measureSupabasePingMs } from "@/lib/lobby-remote";

const INTERVAL_MS = 2500;

export function useSupabasePing(active: boolean) {
  const [pingMs, setPingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setPingMs(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const ms = await measureSupabasePingMs();
      if (!cancelled) setPingMs(ms);
    };

    void run();
    const id = window.setInterval(run, INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active]);

  return pingMs;
}
