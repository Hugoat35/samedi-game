"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, useRef } from "react";
import { useLobbyPlayers } from "@/hooks/use-lobby-players";
import { useRoomState } from "@/hooks/use-room-state";
import { isSupabaseConfigured } from "@/lib/env";
import { createRoomRemote, joinRoomRemote, leaveRoomRemote, startGameRemote } from "@/lib/lobby-remote";
import type { Player } from "@/lib/lobby-types";
import { mockLobbyStore } from "@/lib/mock-lobby-store";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

// IMPORT DU NOUVEAU JEU !
import QuizGame from "@/components/quiz-game";

type View = "home" | "join" | "create" | "lobby" | "playing";

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
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [startError, setStartError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { roomState, refreshRoomState } = useRoomState(roomCode);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          setAvatar(canvas.toDataURL("image/jpeg", 0.7));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleKickedByHost = useCallback(() => {
    setIsLeavingRoom(false);
    setView("home");
    setRoomCode(null);
    setMyPlayerId(null);
    setIsHost(false);
    setLocalPlayers([]);
    setPin("");
    setJoinError(null);
    setBusy(false);
    setSelectedGame(null);
  }, []);

  const { players: remotePlayers } = useLobbyPlayers(
    roomCode,
    Boolean(remote && view !== "home" && view !== "join" && view !== "create"),
    remote ? { isHost, onRoomClosedByHost: handleKickedByHost } : undefined,
  );

  // ÉCOUTE LE JEU (Si l'hôte lance ou revient au lobby)
  useEffect(() => {
    if (roomState?.game_state === "playing" && view === "lobby") setView("playing");
    if (roomState?.game_state === "lobby" && view === "playing") setView("lobby");
  }, [roomState?.game_state, view]);

  useEffect(() => {
    if (!remote || !roomCode || !myPlayerId || view === "home") return;
    const handleBeforeUnload = () => {
      const supabase = getSupabaseBrowser();
      if (supabase) {
        supabase.channel(`lobby:${roomCode}`).send({
          type: "broadcast",
          event: isHost ? "room_closed" : "player_left"
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [remote, view, roomCode, myPlayerId, isHost]);

  const playersRaw = remote ? remotePlayers : localPlayers;
  const players = isLeavingRoom && myPlayerId ? playersRaw.filter((p) => p.id !== myPlayerId) : playersRaw;

  const goHome = useCallback(async () => {
    setJoinError(null);
    if (roomCode && myPlayerId) {
      setIsLeavingRoom(true);
      if (remote) {
        setBusy(true);
        const supabase = getSupabaseBrowser();
        if (supabase) {
          await supabase.channel(`lobby:${roomCode}`).send({
            type: "broadcast",
            event: isHost ? "room_closed" : "player_left"
          }).catch(() => {});
        }
        await leaveRoomRemote(roomCode, myPlayerId, isHost);
        setBusy(false);
      } else {
        mockLobbyStore.leaveRoom(roomCode, myPlayerId);
      }
    }
    setIsLeavingRoom(false);
    setView("home");
    setRoomCode(null);
    setLocalPlayers([]);
    setMyPlayerId(null);
    setIsHost(false);
    setPin("");
    setPseudo("");
    setAvatar(null);
    setSelectedGame(null);
  }, [remote, roomCode, myPlayerId, isHost]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (remote) {
      setBusy(true);
      const result = await createRoomRemote(pseudo.trim() || "Anonyme", avatar || "");
      setBusy(false);
      if (result.ok) {
        setRoomCode(result.code);
        setMyPlayerId(result.myPlayerId);
        setIsHost(true);
        setView("lobby");
      } else {
        setJoinError(result.error);
      }
      return;
    }
    const { code, players: p, myPlayerId: id } = mockLobbyStore.createRoom(pseudo.trim(), avatar || "");
    setRoomCode(code);
    setLocalPlayers(p);
    setMyPlayerId(id);
    setIsHost(true);
    setView("lobby");
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remote) {
      setBusy(true);
      const result = await joinRoomRemote(pin, pseudo.trim() || "Anonyme", avatar || "");
      setBusy(false);
      if (result.ok) {
        setRoomCode(result.code);
        setMyPlayerId(result.myPlayerId);
        setIsHost(false);
        setView("lobby");
      } else {
        setJoinError(result.error);
      }
      return;
    }
    const result = mockLobbyStore.joinRoom(pin, pseudo.trim(), avatar || "");
    if (result.ok) {
      setRoomCode(result.code);
      setLocalPlayers(result.players);
      setMyPlayerId(result.myPlayerId);
      setIsHost(false);
      setView("lobby");
    } else {
      setJoinError(result.error);
    }
  };

  const handleStartGame = async () => {
    setStartError(null);
    if (!roomCode) return;
    if (remote) {
      setBusy(true);
      const result = await startGameRemote(roomCode, questionCount);
      setBusy(false);

      if (!result.ok) {
        setStartError(result.error || "Erreur inconnue au lancement");
        return;
      }
      await refreshRoomState();
      setView("playing");
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--app-bg)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="relative z-10 mb-3 flex shrink-0 items-center justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600/90 sm:text-xs sm:tracking-[0.2em]">
            Samedi
          </p>
          <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 sm:mt-1 sm:text-2xl">
            Parties en ligne
          </h1>
        </div>
        {view !== "home" && (
          <button
            onClick={() => void goHome()}
            disabled={busy}
            className="shrink-0 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-white sm:px-4 sm:py-2 sm:text-sm"
          >
            Quitter
          </button>
        )}
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto scroll-touch">
        <AnimatePresence mode="wait">
          
          {view === "home" && (
            <motion.section
              key="home"
              className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-2 sm:gap-4 sm:py-0"
              {...pageTransition}
            >
              <button
                onClick={() => setView("create")}
                disabled={busy}
                className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-base font-semibold text-white shadow-md transition hover:brightness-105 sm:min-h-[4.25rem] sm:rounded-[1.75rem] sm:text-lg"
              >
                Créer une partie
              </button>
              <button
                onClick={() => setView("join")}
                disabled={busy}
                className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-white/90 px-5 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white sm:min-h-[4.25rem] sm:rounded-[1.75rem] sm:text-lg"
              >
                Rejoindre une partie
              </button>
            </motion.section>
          )}

          {view === "create" && (
            <motion.section key="create" className="flex min-h-0 flex-1 flex-col justify-start pt-1 sm:justify-center sm:pt-0" {...pageTransition}>
              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3 sm:gap-5">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/60 p-4 shadow-sm backdrop-blur-md sm:gap-4 sm:rounded-[2rem] sm:p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                    Créer une salle
                  </h2>

                  <div
                    className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-inner ring-2 ring-white transition hover:scale-[1.03] sm:h-24 sm:w-24 sm:ring-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-1 text-center text-[10px] font-semibold leading-tight text-slate-400 sm:text-xs">
                        Photo
                        <br />
                        (opt.)
                      </span>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />

                  <input
                    type="text"
                    required
                    placeholder="Ton pseudo…"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    maxLength={15}
                    className="w-full rounded-xl border-none bg-white/90 px-3 py-3 text-center text-base font-bold text-slate-800 shadow-inner outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/50 sm:rounded-2xl sm:py-3.5 sm:text-lg"
                  />
                </div>

                {joinError && <p className="text-center text-xs font-medium text-red-600 sm:text-sm">{joinError}</p>}

                <button
                  type="submit"
                  disabled={busy || !pseudo.trim()}
                  className="flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-md disabled:opacity-40 sm:min-h-[3.5rem] sm:rounded-[1.5rem] sm:text-base"
                >
                  {busy ? "Création…" : "Confirmer et créer"}
                </button>
                <button type="button" onClick={() => setView("home")} className="py-1 text-center text-xs font-medium text-slate-500 sm:text-sm">
                  ← Retour
                </button>
              </form>
            </motion.section>
          )}

          {view === "join" && (
            <motion.section key="join" className="flex min-h-0 flex-1 flex-col justify-start pt-1 sm:justify-center sm:pt-0" {...pageTransition}>
              <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3 sm:gap-5">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/60 p-4 shadow-sm backdrop-blur-md sm:gap-4 sm:rounded-[2rem] sm:p-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                    Rejoindre une salle
                  </h2>

                  <input
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    required
                    placeholder="• • • •"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-xl border-none bg-white/95 px-4 py-3 text-center font-mono text-xl tracking-[0.25em] text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-violet-400/50 sm:rounded-[1.5rem] sm:py-3.5 sm:text-2xl"
                  />

                  <div className="my-0.5 h-px w-full bg-slate-200/50 sm:my-1" />

                  <div className="flex w-full items-center gap-3">
                    <div
                      className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-inner ring-2 ring-white transition hover:scale-[1.03] sm:h-20 sm:w-20 sm:ring-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-center text-[10px] font-semibold leading-tight text-slate-400 sm:text-xs">
                          Photo
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Pseudo…"
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      maxLength={15}
                      className="min-w-0 flex-1 rounded-xl border-none bg-white/90 px-3 py-2.5 text-base font-bold text-slate-800 shadow-inner outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/50 sm:rounded-2xl sm:py-3 sm:text-lg"
                    />
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                </div>

                {joinError && <p className="text-center text-xs font-medium text-red-600 sm:text-sm">{joinError}</p>}
                <button
                  type="submit"
                  disabled={pin.length !== 4 || busy || !pseudo.trim()}
                  className="flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-md disabled:opacity-40 sm:min-h-[3.5rem] sm:rounded-[1.5rem] sm:text-base"
                >
                  {busy ? "Connexion…" : "Entrer dans la salle"}
                </button>
                <button type="button" onClick={() => setView("home")} className="py-1 text-center text-xs font-medium text-slate-500 sm:text-sm">
                  ← Retour
                </button>
              </form>
            </motion.section>
          )}

          {view === "lobby" && roomCode && (
            <motion.section key="lobby" className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4" {...pageTransition}>
              <div className="shrink-0 rounded-2xl bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md sm:rounded-[2rem] sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs sm:tracking-widest">
                    Code salle
                  </p>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 sm:text-xs">
                    {players.length} joueur{players.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-center font-mono text-3xl font-bold tracking-[0.28em] text-slate-900 sm:mt-2 sm:text-4xl sm:tracking-[0.35em]">
                  {roomCode}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/70 p-3 shadow-sm backdrop-blur-sm sm:rounded-[2rem] sm:p-5">
                <h2 className="mb-2 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:mb-3 sm:text-sm">
                  Joueurs
                </h2>
                <ul className="scroll-touch flex max-h-[min(36dvh,260px)] flex-col gap-2 overflow-y-auto pr-0.5 sm:max-h-[min(42dvh,320px)] sm:gap-2.5">
                  <AnimatePresence>
                    {players.map((p) => (
                      <motion.li
                        key={p.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        className="flex shrink-0 items-center gap-3 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-inner sm:h-11 sm:w-11 sm:text-base">
                          {p.avatar && p.avatar.startsWith("data:image") ? (
                            <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{p.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-bold text-slate-800 text-sm sm:text-base">{p.name}</span>
                        {p.id === myPlayerId && (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 sm:text-xs">
                            MOI
                          </span>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                {isHost ? (
                  <div className="mt-3 shrink-0 border-t border-slate-200/50 pt-3 sm:mt-4 sm:pt-4">
                    {!selectedGame ? (
                      <div className="flex flex-col gap-2">
                        <h3 className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
                          Choisir un jeu
                        </h3>
                        <button
                          onClick={() => setSelectedGame("culture-quiz")}
                          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-[1.5px] shadow-sm transition hover:brightness-[1.02] sm:rounded-2xl sm:p-[2px]"
                        >
                          <div className="flex w-full items-center justify-between gap-2 rounded-[11px] bg-white px-3 py-3 sm:rounded-[14px] sm:px-5 sm:py-3.5">
                            <span className="min-w-0 truncate text-left text-sm font-bold text-slate-800 sm:text-base">
                              🧠 Culture Quiz
                            </span>
                            <span className="shrink-0 text-xs font-bold text-violet-500 sm:text-sm">→</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="min-w-0 truncate text-sm font-bold text-slate-800 sm:text-base">🧠 Culture Quiz</h3>
                          <button
                            type="button"
                            onClick={() => setSelectedGame(null)}
                            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-200 sm:px-3 sm:text-xs"
                          >
                            Changer
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                          <span className="font-semibold text-slate-600">Questions</span>
                          <span className="font-mono text-lg font-bold text-violet-600 tabular-nums sm:text-xl">{questionCount}</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="50"
                          step="1"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          className="mb-1 w-full accent-violet-600"
                        />

                        {startError && (
                          <p className="rounded-lg border border-red-100 bg-red-50 p-2 text-center text-xs font-bold text-red-500 sm:p-3 sm:text-sm">
                            {startError}
                          </p>
                        )}

                        <button
                          onClick={handleStartGame}
                          disabled={busy || players.length < 1}
                          className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50 sm:rounded-2xl sm:py-3.5 sm:text-base"
                        >
                          {busy ? "Démarrage…" : "Lancer la partie"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 shrink-0 border-t border-slate-200/50 pt-3 text-center sm:mt-4 sm:pt-4">
                    <p className="text-xs font-bold text-slate-500 animate-pulse sm:text-sm">En attente de l&apos;hôte…</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* C'EST ICI QU'ON APPELLE TON NOUVEAU COMPOSANT DE JEU */}
          {view === "playing" && roomState && roomCode && myPlayerId && (
            <motion.section key="playing" className="flex min-h-0 flex-1 flex-col" {...pageTransition}>
              <QuizGame 
                roomCode={roomCode} 
                roomState={roomState} 
                myPlayerId={myPlayerId} 
                isHost={isHost} 
                players={players} 
              />
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}