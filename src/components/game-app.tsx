"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useLobbyPlayers } from "@/hooks/use-lobby-players";
import { useSupabasePing } from "@/hooks/use-supabase-ping";
import { isSupabaseConfigured } from "@/lib/env";
import NetworkDebugPanel from "@/components/network-debug-panel";
import {
  createRoomRemote,
  joinRoomRemote,
} from "@/lib/lobby-remote";
import type { Player } from "@/lib/lobby-types";
import { mockLobbyStore } from "@/lib/mock-lobby-store";

type View = "home" | "join" | "lobby";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const pageTransition = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export default function GameApp() {
  const remote = isSupabaseConfigured();

  const [view, setView] = useState<View>("home");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [pin, setPin] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    players: remotePlayers,
    loading: remoteLoading,
    error: remoteError,
    realtimeState,
    lastEventAt,
  } = useLobbyPlayers(roomCode, Boolean(remote && view === "lobby"));

  const pingMs = useSupabasePing(Boolean(remote && view === "lobby"));

  const players = remote ? remotePlayers : localPlayers;

  const goHome = useCallback(() => {
    setView("home");
    setRoomCode(null);
    setLocalPlayers([]);
    setPin("");
    setJoinError(null);
    setBusy(false);
  }, []);

  const handleCreate = async () => {
    setJoinError(null);
    if (remote) {
      setBusy(true);
      const result = await createRoomRemote();
      setBusy(false);
      if (result.ok) {
        setRoomCode(result.code);
        setView("lobby");
      } else {
        setJoinError(result.error);
      }
      return;
    }
    const { code, players: p } = mockLobbyStore.createRoom();
    setRoomCode(code);
    setLocalPlayers(p);
    setView("lobby");
  };

  const handleJoinClick = () => {
    setJoinError(null);
    setPin("");
    setView("join");
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remote) {
      setBusy(true);
      const result = await joinRoomRemote(pin);
      setBusy(false);
      if (result.ok) {
        setRoomCode(result.code);
        setView("lobby");
        setJoinError(null);
      } else {
        setJoinError(result.error);
      }
      return;
    }
    const result = mockLobbyStore.joinRoom(pin);
    if (result.ok) {
      setRoomCode(result.code);
      setLocalPlayers(result.players);
      setView("lobby");
      setJoinError(null);
    } else {
      setJoinError(result.error);
    }
  };

  const onPinChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    setJoinError(null);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--app-bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="absolute -right-16 bottom-32 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
      </div>

      <header className="relative z-10 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-600/90">
            Samedi
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Parties en ligne
          </h1>
        </div>
        {view !== "home" && (
          <motion.button
            type="button"
            onClick={goHome}
            className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] backdrop-blur-sm transition hover:bg-white"
            whileTap={{ scale: 0.97 }}
          >
            Accueil
          </motion.button>
        )}
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.section
              key="home"
              className="flex flex-1 flex-col justify-center gap-6"
              {...pageTransition}
            >
              <p className="text-center text-sm leading-relaxed text-slate-600">
                Lance une salle ou rejoins tes amis avec un code à 4 chiffres.
              </p>
              {joinError && (
                <p
                  className="text-center text-sm font-medium text-red-600"
                  role="alert"
                >
                  {joinError}
                </p>
              )}
              <div className="flex flex-col gap-4">
                <motion.button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy}
                  className="flex min-h-[4.5rem] w-full items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-lg font-semibold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105 active:brightness-95 disabled:opacity-60"
                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                  transition={spring}
                >
                  {busy ? "Création…" : "Créer une partie"}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleJoinClick}
                  disabled={busy}
                  className="flex min-h-[4.5rem] w-full items-center justify-center rounded-[1.75rem] border border-slate-200/80 bg-white/90 px-6 text-lg font-semibold text-slate-800 shadow-[var(--shadow-soft)] backdrop-blur-sm transition hover:bg-white disabled:opacity-60"
                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                  transition={spring}
                >
                  Rejoindre une partie
                </motion.button>
              </div>
            </motion.section>
          )}

          {view === "join" && (
            <motion.section
              key="join"
              className="flex flex-1 flex-col justify-center"
              {...pageTransition}
            >
              <form onSubmit={handleJoinSubmit} className="flex flex-col gap-6">
                <div>
                  <label
                    htmlFor="code"
                    className="mb-3 block text-center text-sm font-medium text-slate-700"
                  >
                    Code à 4 chiffres
                  </label>
                  <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="• • • •"
                    value={pin}
                    onChange={(e) => onPinChange(e.target.value)}
                    className="w-full rounded-[1.5rem] border border-slate-200/90 bg-white/95 px-6 py-5 text-center font-mono text-3xl tracking-[0.5em] text-slate-900 shadow-[var(--shadow-soft)] outline-none ring-violet-500/30 transition placeholder:text-slate-300 focus:border-violet-400 focus:ring-4"
                  />
                </div>
                {joinError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm font-medium text-red-600"
                    role="alert"
                  >
                    {joinError}
                  </motion.p>
                )}
                <motion.button
                  type="submit"
                  disabled={pin.length !== 4 || busy}
                  className="flex min-h-[3.75rem] w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-base font-semibold text-white shadow-[var(--shadow-cta)] transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  whileTap={
                    pin.length === 4 && !busy ? { scale: 0.98 } : undefined
                  }
                >
                  {busy ? "Connexion…" : "Entrer dans la salle"}
                </motion.button>
              </form>
            </motion.section>
          )}

          {view === "lobby" && roomCode && (
            <motion.section
              key="lobby"
              className="flex flex-1 flex-col"
              {...pageTransition}
            >
              <div className="mb-8 rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur-md">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Code de la salle
                </p>
                <motion.p
                  className="mt-3 text-center font-mono text-4xl font-bold tracking-[0.35em] text-slate-900"
                  initial={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  transition={spring}
                >
                  {roomCode}
                </motion.p>
              </div>

              <div className="flex flex-1 flex-col rounded-[2rem] border border-slate-100 bg-white/70 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-600">
                  Joueurs dans la salle (
                  {remoteLoading && players.length === 0 ? "…" : players.length}
                  )
                </h2>
                {remote && remoteError && (
                  <p className="mb-3 text-sm font-medium text-red-600">
                    {remoteError}
                  </p>
                )}
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {players.map((p, i) => (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: i * 0.05, ...spring }}
                        className="flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-inner">
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-900">
                          {p.name}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {remote && (
                  <NetworkDebugPanel
                    pingMs={pingMs}
                    realtimeState={realtimeState}
                    lastEventAt={lastEventAt}
                    mode="remote"
                  />
                )}
                {!remote && (
                  <NetworkDebugPanel
                    pingMs={null}
                    realtimeState="idle"
                    lastEventAt={null}
                    mode="local"
                  />
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
