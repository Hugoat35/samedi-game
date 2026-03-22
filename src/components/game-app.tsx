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
  
  // Nouveaux états pour le jeu
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10); // Curseur de l'hôte
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomState = useRoomState(roomCode);

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
  }, []);

  const { players: remotePlayers, loading: remoteLoading } = useLobbyPlayers(
    roomCode,
    Boolean(remote && view !== "home" && view !== "join" && view !== "create"),
    remote ? { isHost, onRoomClosedByHost: handleKickedByHost } : undefined,
  );

  // --- NOUVEAU : ÉCOUTER LE LANCEMENT DU JEU ---
  useEffect(() => {
    if (roomState?.game_state === "playing" && view === "lobby") {
      setView("playing");
    }
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
    if (remote && roomCode) {
      setBusy(true);
      await startGameRemote(roomCode, questionCount);
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--app-bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="relative z-10 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-600/90">Samedi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Parties en ligne</h1>
        </div>
        {view !== "home" && (
          <button onClick={() => void goHome()} disabled={busy} className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white">
            Quitter
          </button>
        )}
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          
          {view === "home" && (
            <motion.section key="home" className="flex flex-1 flex-col justify-center gap-4" {...pageTransition}>
              <button onClick={() => setView("create")} disabled={busy} className="flex min-h-[4.5rem] w-full items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-lg font-semibold text-white shadow-md transition hover:brightness-105">
                Créer une partie
              </button>
              <button onClick={() => setView("join")} disabled={busy} className="flex min-h-[4.5rem] w-full items-center justify-center rounded-[1.75rem] bg-white/90 px-6 text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-white">
                Rejoindre une partie
              </button>
            </motion.section>
          )}

          {view === "create" && (
            <motion.section key="create" className="flex flex-1 flex-col justify-center" {...pageTransition}>
              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4 bg-white/60 p-6 rounded-[2rem] shadow-sm backdrop-blur-md">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Créer une salle</h2>
                  
                  <div 
                    className="relative h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center shadow-inner cursor-pointer overflow-hidden ring-4 ring-white transition hover:scale-105"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold text-center leading-tight">Photo<br/>(Optionnel)</span>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <span className="text-white text-2xl">📷</span>
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />

                  <input
                    type="text" required placeholder="Entre ton pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={15}
                    className="w-full rounded-2xl border-none bg-white/90 px-4 py-4 text-center text-lg font-bold text-slate-800 shadow-inner focus:ring-4 focus:ring-violet-400/50 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                {joinError && <p className="text-center text-sm font-medium text-red-600">{joinError}</p>}
                
                <button type="submit" disabled={busy || !pseudo.trim()} className="flex min-h-[3.75rem] w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-base font-semibold text-white shadow-md disabled:opacity-40">
                  {busy ? "Création en cours…" : "Confirmer et Créer"}
                </button>
                <button type="button" onClick={() => setView("home")} className="text-sm text-slate-500 font-medium mt-2">← Retour</button>
              </form>
            </motion.section>
          )}

          {view === "join" && (
            <motion.section key="join" className="flex flex-1 flex-col justify-center" {...pageTransition}>
              <form onSubmit={handleJoinSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4 bg-white/60 p-6 rounded-[2rem] shadow-sm backdrop-blur-md">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Rejoindre une salle</h2>
                  
                  <input
                    inputMode="numeric" pattern="\d{4}" maxLength={4} required placeholder="Code : • • • •"
                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-[1.5rem] border-none bg-white/95 px-6 py-4 text-center font-mono text-2xl tracking-[0.2em] text-slate-900 shadow-sm outline-none focus:ring-4 focus:ring-violet-400/50"
                  />
                  
                  <div className="h-px w-full bg-slate-200/50 my-2"></div>

                  <div 
                    className="relative h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center shadow-inner cursor-pointer overflow-hidden ring-4 ring-white transition hover:scale-105"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold text-center leading-tight">Photo<br/>(Opt)</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />

                  <input
                    type="text" required placeholder="Ton pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={15}
                    className="w-full rounded-2xl border-none bg-white/90 px-4 py-3 text-center text-lg font-bold text-slate-800 shadow-inner focus:ring-4 focus:ring-violet-400/50 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                {joinError && <p className="text-center text-sm font-medium text-red-600">{joinError}</p>}
                <button type="submit" disabled={pin.length !== 4 || busy || !pseudo.trim()} className="flex min-h-[3.75rem] w-full items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-base font-semibold text-white shadow-md disabled:opacity-40">
                  {busy ? "Connexion…" : "Entrer dans la salle"}
                </button>
                <button type="button" onClick={() => setView("home")} className="text-sm text-slate-500 font-medium mt-2">← Retour</button>
              </form>
            </motion.section>
          )}

          {view === "lobby" && roomCode && (
            <motion.section key="lobby" className="flex flex-1 flex-col" {...pageTransition}>
              <div className="mb-8 rounded-[2rem] bg-white/85 p-6 shadow-sm backdrop-blur-md">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Code de la salle</p>
                <p className="mt-3 text-center font-mono text-4xl font-bold tracking-[0.35em] text-slate-900">{roomCode}</p>
              </div>

              <div className="flex flex-1 flex-col rounded-[2rem] bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-600 uppercase tracking-wide">Joueurs ({players.length})</h2>
                <ul className="flex flex-col gap-3">
                  <AnimatePresence>
                    {players.map((p) => (
                      <motion.li key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white shadow-inner overflow-hidden border-2 border-white">
                          {p.avatar && p.avatar.startsWith("data:image") ? <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" /> : <span>{p.name.slice(0, 2).toUpperCase()}</span>}
                        </span>
                        <span className="font-bold text-slate-800 text-lg">{p.name}</span>
                        {p.id === myPlayerId && <span className="ml-auto text-xs font-bold text-violet-500 bg-violet-100 px-2 py-1 rounded-full">MOI</span>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                {/* --- PANNEAU DE L'HÔTE (Uniquement visible par le créateur) --- */}
                {isHost ? (
                  <div className="mt-8 border-t border-slate-200/50 pt-6">
                    <label className="text-sm font-bold text-slate-600 uppercase tracking-wider block text-center mb-2">
                      Nombre de questions : <span className="text-violet-600 text-lg">{questionCount}</span>
                    </label>
                    <input 
                      type="range" min="5" max="30" step="1" 
                      value={questionCount} 
                      onChange={(e) => setQuestionCount(Number(e.target.value))} 
                      className="w-full accent-violet-600 mb-6" 
                    />
                    <button 
                      onClick={handleStartGame} disabled={busy || players.length < 1} 
                      className="flex w-full items-center justify-center rounded-2xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {busy ? "Démarrage..." : "LANCER LA PARTIE !"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 border-t border-slate-200/50 pt-6 text-center">
                    <p className="text-sm font-bold text-slate-500 animate-pulse">En attente de l'hôte...</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* VUE PLAYING : L'écran de jeu (On fera l'interface complète plus tard !) */}
          {view === "playing" && roomState && (
            <motion.section key="playing" className="flex flex-1 flex-col justify-center items-center text-center bg-white/80 rounded-[2rem] p-6 shadow-sm backdrop-blur-md" {...pageTransition}>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">C'est parti ! 🚀</h2>
              <p className="text-slate-600 font-medium text-lg">Préparez-vous à répondre...</p>
              
              <div className="mt-8 p-4 bg-violet-100 rounded-xl">
                <p className="text-sm font-bold text-violet-800">
                  {roomState.game_data?.questions?.length} questions ont été tirées au sort !
                </p>
              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}