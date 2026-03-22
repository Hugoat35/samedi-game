"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  pingMs: number | null;
  realtimeState: "idle" | "connecting" | "subscribed" | "error";
  lastEventAt: number | null;
  mode: "remote" | "local";
};

function formatAgeMs(lastAt: number | null): string {
  if (lastAt == null) return "—";
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const delta = Math.max(0, now - lastAt);
  if (delta < 1000) return `${Math.round(delta)} ms`;
  return `${(delta / 1000).toFixed(1)} s`;
}

export default function NetworkDebugPanel({
  pingMs,
  realtimeState,
  lastEventAt,
  mode,
}: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  if (mode === "local") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-sm"
      >
        <p className="font-semibold">Mode local (mock)</p>
        <p className="mt-1 text-amber-800/90">
          Les joueurs ne sont pas synchronisés entre appareils. Ajoute les
          variables Supabase sur Vercel pour tester le multijoueur en ligne.
        </p>
      </motion.div>
    );
  }

  const rtLabel =
    realtimeState === "subscribed"
      ? "Temps réel OK"
      : realtimeState === "connecting"
        ? "Connexion…"
        : realtimeState === "error"
          ? "Erreur canal"
          : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 text-xs text-slate-700 shadow-[var(--shadow-soft)] backdrop-blur-sm"
    >
      <p className="mb-2 font-semibold text-slate-900">Réseau (test)</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <dt className="text-slate-500">Ping API</dt>
        <dd className="font-mono text-right">
          {pingMs != null ? `~${pingMs} ms` : "…"}
        </dd>
        <dt className="text-slate-500">Realtime</dt>
        <dd className="text-right font-medium">{rtLabel}</dd>
        <dt className="text-slate-500">Dernière synchro</dt>
        <dd className="font-mono text-right text-slate-600">
          il y a {formatAgeMs(lastEventAt)}
        </dd>
      </dl>
    </motion.div>
  );
}
