"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, useRef } from "react";
import { useLobbyPlayers } from "@/hooks/use-lobby-players";
import { useRoomState } from "@/hooks/use-room-state";
import { isSupabaseConfigured } from "@/lib/env";
import {
  createRoomRemote,
  fetchPlayersRemote,
  fetchRoomByCode,
  joinRoomRemote,
  leaveRoomRemote,
  reconnectPlayerRemote,
  startGameRemote,
  startWordleGameRemote,
} from "@/lib/lobby-remote";
import type { Player } from "@/lib/lobby-types";
import {
  clearReconnectOffer,
  clearSession,
  loadReconnectOffer,
  loadSession,
  saveReconnectOffer,
  saveSession,
  type StoredSession,
} from "@/lib/local-session";
import { mockLobbyStore } from "@/lib/mock-lobby-store";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import type { QuestionTheme } from "@/lib/quiz-bank"; 
// IMPORT DU NOUVEAU JEU !
import QuizGame from "@/components/quiz-game";
import WordleGame from "@/components/wordle-game";
import FloatingReactions from "@/components/floating-reactions";

type View = "home" | "join" | "create" | "lobby" | "playing";

function selectedGameFromRoom(room: Record<string, unknown>): string {
  const gk = (room.game_data as { game_kind?: string } | undefined)?.game_kind;
  return gk === "wordle" ? "wordle-team" : "culture-quiz";
}

const WORDLE_LEN_LO = 3;
const WORDLE_LEN_HI = 10;

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
  const [wordleRounds, setWordleRounds] = useState(5);
  const WORDLE_LEN_LO = 3;
  const WORDLE_LEN_HI = 10;
  const [wordleLenMin, setWordleLenMin] = useState(5);
  const [wordleLenMax, setWordleLenMax] = useState(10);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionRestoring, setSessionRestoring] = useState(() => remote);
  const [reconnectOffer, setReconnectOffer] = useState<StoredSession | null>(null);
  const [playerDepartedNotice, setPlayerDepartedNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshRoomStateRef = useRef<(code?: string | null) => Promise<void>>(async () => {});
  const prevRemotePlayersRef = useRef<Player[]>([]);
  const { roomState, refreshRoomState } = useRoomState(roomCode);
  refreshRoomStateRef.current = refreshRoomState;

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
    clearSession();
    clearReconnectOffer();
    setReconnectOffer(null);
  }, []);

  const { players: remotePlayers } = useLobbyPlayers(
    roomCode,
    Boolean(remote && !sessionRestoring && view !== "home" && view !== "join" && view !== "create"),
    remote ? { isHost, onRoomClosedByHost: handleKickedByHost } : undefined,
  );

  // ÉCOUTE LE JEU (Si l'hôte lance ou revient au lobby)
  useEffect(() => {
    if (roomState?.game_state === "playing" && view === "lobby") setView("playing");
    if (roomState?.game_state === "lobby" && view === "playing") setView("lobby");
  }, [roomState?.game_state, view]);

  // Restauration session (rafraîchissement page) + offre « reprendre » si la partie tourne encore
  useEffect(() => {
    if (!remote) {
      setSessionRestoring(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const session = loadSession();
      if (session) {
        const roomRes = await fetchRoomByCode(session.roomCode);
        if (cancelled) return;
        if (!roomRes.ok) {
          clearSession();
        } else {
          const room = roomRes.room;
          const gameState = room.game_state as string | undefined;
          const playersRes = await fetchPlayersRemote(session.roomCode);
          const inLobby =
            playersRes.ok && playersRes.players.some((p) => p.id === session.playerId);

          if (inLobby) {
            setRoomCode(session.roomCode);
            setMyPlayerId(session.playerId);
            setIsHost(session.isHost);
            setPseudo(session.displayName);
            setAvatar(session.avatar);
            setSelectedGame(selectedGameFromRoom(room));
            await refreshRoomStateRef.current(session.roomCode);
            if (cancelled) return;
            setView(gameState === "playing" ? "playing" : "lobby");
            setSessionRestoring(false);
            return;
          }

          const scores = (room.game_data as { scores?: Record<string, number> } | undefined)?.scores ?? {};
          if (gameState === "playing" && scores[session.playerId] != null) {
            const res = await reconnectPlayerRemote(
              session.roomCode,
              session.playerId,
              session.displayName,
              session.avatar ?? "",
            );
            if (cancelled) return;
            if (res.ok) {
              setRoomCode(session.roomCode);
              setMyPlayerId(session.playerId);
              setIsHost(session.isHost);
              setPseudo(session.displayName);
              setAvatar(session.avatar);
              setSelectedGame(selectedGameFromRoom(room));
              await refreshRoomStateRef.current(session.roomCode);
              setView("playing");
              setSessionRestoring(false);
              return;
            }
          }
          clearSession();
        }
      }

      if (cancelled) return;
      setSessionRestoring(false);

      const offer = loadReconnectOffer();
      if (!offer) return;
      const check = await fetchRoomByCode(offer.roomCode);
      if (cancelled) return;
      if (check.ok && (check.room.game_state as string) === "playing") {
        setReconnectOffer(offer);
      } else {
        clearReconnectOffer();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remote]);

  useEffect(() => {
    if (!remote || view !== "playing") {
      if (view !== "playing") prevRemotePlayersRef.current = [];
      return;
    }
    const prev = prevRemotePlayersRef.current;
    const next = remotePlayers;
    if (prev.length === 0) {
      prevRemotePlayersRef.current = next;
      return;
    }
    const nextIds = new Set(next.map((p: Player) => p.id));
    const departed = prev.filter((p: Player) => !nextIds.has(p.id));
    if (departed.length > 0 && myPlayerId) {
      const others = departed.filter((p: Player) => p.id !== myPlayerId);
      if (others.length > 0) {
        const msg =
          others.length === 1
            ? `${others[0].name} a quitté la partie.`
            : `${others.map((p) => p.name).join(", ")} ont quitté la partie.`;
        setPlayerDepartedNotice(msg);
        window.setTimeout(() => setPlayerDepartedNotice(null), 9000);
      }
    }
    prevRemotePlayersRef.current = next;
  }, [remote, view, remotePlayers, myPlayerId]);

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
    let savedReconnectPayload: StoredSession | null = null;
    if (roomCode && myPlayerId) {
      const wasPlaying = roomState?.game_state === "playing";
      if (remote && wasPlaying && !isHost) {
        savedReconnectPayload = {
          v: 1,
          roomCode,
          playerId: myPlayerId,
          isHost,
          displayName: pseudo.trim() || "Joueur",
          avatar,
        };
        saveReconnectOffer(savedReconnectPayload);
      }
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
    clearSession();
    if (savedReconnectPayload) {
      setReconnectOffer(savedReconnectPayload);
    } else {
      clearReconnectOffer();
      setReconnectOffer(null);
    }
  }, [remote, roomCode, myPlayerId, isHost, roomState?.game_state, pseudo, avatar]);

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
        clearReconnectOffer();
        setReconnectOffer(null);
        saveSession({
          v: 1,
          roomCode: result.code,
          playerId: result.myPlayerId,
          isHost: false,
          displayName: pseudo.trim() || "Anonyme",
          avatar,
        });
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
      const result =
        selectedGame === "wordle-team"
          ? await startWordleGameRemote(roomCode, wordleRounds, wordleLenMin, wordleLenMax)
          // ICI : On envoie la jauge ET la liste des thèmes activés
          : await startGameRemote(roomCode, questionCount, activeThemes);
      setBusy(false);

      if (!result.ok) {
        setStartError(result.error || "Erreur inconnue au lancement");
        return;
      }
      await refreshRoomState();
      setView("playing");
    }
  };


// --- NOUVEAUX STATES (Thèmes ON/OFF) ---
  const ALL_THEMES: QuestionTheme[] = ["Géographie", "Sciences", "Histoire", "Culture G", "Sport", "Dessin animé", "Mini-Bac"];
  const [activeThemes, setActiveThemes] = useState<QuestionTheme[]>(ALL_THEMES);
  // (La jauge "questionCount" est déjà déclarée plus haut dans ton fichier !)

  const toggleTheme = (theme: QuestionTheme) => {
    setActiveThemes(prev => 
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const handleReconnectToGame = useCallback(async () => {
    if (!reconnectOffer || !remote) return;
    setBusy(true);
    setJoinError(null);
    const offer = reconnectOffer;
    const r = await reconnectPlayerRemote(
      offer.roomCode,
      offer.playerId,
      offer.displayName,
      offer.avatar ?? "",
    );
    setBusy(false);
    if (!r.ok) {
      setJoinError(r.error);
      clearReconnectOffer();
      setReconnectOffer(null);
      return;
    }
    clearReconnectOffer();
    saveSession(offer);
    setReconnectOffer(null);
    setRoomCode(offer.roomCode);
    setMyPlayerId(offer.playerId);
    setIsHost(offer.isHost);
    setPseudo(offer.displayName);
    setAvatar(offer.avatar);
    const roomCheck = await fetchRoomByCode(offer.roomCode);
    setSelectedGame(roomCheck.ok ? selectedGameFromRoom(roomCheck.room) : "culture-quiz");
    await refreshRoomState(offer.roomCode);
    setView("playing");
  }, [reconnectOffer, remote, refreshRoomState]);

  const handleDismissReconnect = useCallback(() => {
    clearReconnectOffer();
    setReconnectOffer(null);
  }, []);

  if (remote && sessionRestoring) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--app-bg)] px-6">
        <p className="text-center text-sm font-semibold text-slate-600">Chargement de la session…</p>
      </div>
    );
  }

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

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable] scroll-touch">
        <AnimatePresence mode="wait">
          
          {view === "home" && (
            <motion.section
              key="home"
              className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-2 sm:gap-4 sm:py-0"
              {...pageTransition}
            >
              {reconnectOffer && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 shadow-sm sm:rounded-[1.75rem] sm:px-5 sm:py-4">
                  <p className="text-center text-xs font-semibold text-amber-900 sm:text-sm">
                    Une partie est toujours en cours sur la salle{" "}
                    <span className="font-mono tabular-nums">{reconnectOffer.roomCode}</span>. Tu peux reprendre ta place
                    (même joueur, score conservé côté serveur).
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReconnectToGame()}
                      className="flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50 sm:min-h-12 sm:w-auto sm:min-w-[200px] sm:rounded-2xl sm:text-base"
                    >
                      {busy ? "Connexion…" : "Reprendre la partie"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDismissReconnect}
                      className="rounded-xl py-2 text-center text-xs font-semibold text-amber-800/90 underline-offset-2 hover:underline sm:py-2.5 sm:text-sm"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              )}
              {joinError && (
                <p className="text-center text-xs font-medium text-red-600 sm:text-sm">{joinError}</p>
              )}
              <button
                onClick={() => {
                  setJoinError(null);
                  setView("create");
                }}
                disabled={busy}
                className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-base font-semibold text-white shadow-md transition hover:brightness-105 sm:min-h-[4.25rem] sm:rounded-[1.75rem] sm:text-lg"
              >
                Créer une partie
              </button>
              <button
                onClick={() => {
                  setJoinError(null);
                  setView("join");
                }}
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
                        <button
                          onClick={() => setSelectedGame("wordle-team")}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-[1.5px] shadow-sm transition hover:brightness-[1.02] sm:rounded-2xl sm:p-[2px]"
                        >
                          <div className="flex w-full items-center justify-between gap-2 rounded-[11px] bg-white px-3 py-3 sm:rounded-[14px] sm:px-5 sm:py-3.5">
                            <span className="min-w-0 truncate text-left text-sm font-bold text-slate-800 sm:text-base">
                              🔤 Wordle à plusieurs
                            </span>
                            <span className="shrink-0 text-xs font-bold text-emerald-600 sm:text-sm">→</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="min-w-0 truncate text-sm font-bold text-slate-800 sm:text-base">
                            {selectedGame === "wordle-team" ? "🔤 Wordle à plusieurs" : "🧠 Culture Quiz"}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setSelectedGame(null)}
                            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-200 sm:px-3 sm:text-xs"
                          >
                            Changer
                          </button>
                        </div>

                        {selectedGame === "wordle-team" ? (
                          <>
                            <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">
                              Un mot secret caché pour tous : mêmes indices, tour à tour. Ordre mélangé à chaque
                              manche.
                            </p>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 sm:px-4">
                              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-800 sm:text-xs">
                                Longueur des mots ({WORDLE_LEN_LO}–{WORDLE_LEN_HI} lettres)
                              </p>
                              <div className="mb-2 flex items-center gap-2 sm:gap-3">
                                <span className="w-9 shrink-0 text-[10px] font-bold text-slate-600 sm:w-10 sm:text-xs">
                                  Min
                                </span>
                                <input
                                  type="range"
                                  min={WORDLE_LEN_LO}
                                  max={WORDLE_LEN_HI}
                                  step={1}
                                  value={wordleLenMin}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setWordleLenMin(Math.min(v, wordleLenMax));
                                  }}
                                  className="min-h-9 flex-1 cursor-pointer accent-emerald-600"
                                  aria-label="Longueur minimale des mots"
                                />
                                <span className="w-7 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-emerald-700 sm:w-8">
                                  {wordleLenMin}
                                </span>
                              </div>
                              <div className="mb-2 flex items-center gap-2 sm:gap-3">
                                <span className="w-9 shrink-0 text-[10px] font-bold text-slate-600 sm:w-10 sm:text-xs">
                                  Max
                                </span>
                                <input
                                  type="range"
                                  min={WORDLE_LEN_LO}
                                  max={WORDLE_LEN_HI}
                                  step={1}
                                  value={wordleLenMax}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setWordleLenMax(Math.max(v, wordleLenMin));
                                  }}
                                  className="min-h-9 flex-1 cursor-pointer accent-teal-600"
                                  aria-label="Longueur maximale des mots"
                                />
                                <span className="w-7 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-teal-700 sm:w-8">
                                  {wordleLenMax}
                                </span>
                              </div>
                              <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="absolute inset-y-0 rounded-full bg-emerald-500"
                                  style={{
                                    left: `${((wordleLenMin - WORDLE_LEN_LO) / (WORDLE_LEN_HI - WORDLE_LEN_LO)) * 100}%`,
                                    width: `${((wordleLenMax - wordleLenMin) / (WORDLE_LEN_HI - WORDLE_LEN_LO)) * 100}%`,
                                  }}
                                />
                              </div>
                              <p className="mt-2 text-center text-[10px] font-semibold text-emerald-800 sm:text-xs">
                                {wordleLenMin === wordleLenMax
                                  ? `Fixé à ${wordleLenMin} lettre${wordleLenMin > 1 ? "s" : ""}`
                                  : `Plage active : ${wordleLenMin} à ${wordleLenMax} lettres`}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                              <span className="font-semibold text-slate-600">Manches</span>
                              <span className="font-mono text-lg font-bold text-emerald-600 tabular-nums sm:text-xl">
                                {wordleRounds}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="15"
                              step="1"
                              value={wordleRounds}
                              onChange={(e) => setWordleRounds(Number(e.target.value))}
                              className="mb-1 w-full accent-emerald-600"
                            />
                          </>
                        ) : (
                              <div className="flex flex-col gap-2">
                          {/* JAUGE DE QUESTIONS */}
                          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm mb-1 mt-2">
                            <span className="font-semibold text-slate-600">Nombre de questions</span>
                            <span className="font-mono text-lg font-bold text-violet-600 tabular-nums sm:text-xl">
                              {questionCount}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="40"
                            step="1"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="mb-4 w-full accent-violet-600"
                          />

                          {/* SÉLECTEUR DE THÈMES ON/OFF */}
                          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700 sm:text-sm">Thèmes activés</span>
                              <button
                                type="button"
                                onClick={() => setActiveThemes(ALL_THEMES)}
                                className="text-[10px] text-violet-600 hover:underline font-bold"
                              >
                                Tout cocher
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_THEMES.map((theme) => {
                                const isActive = activeThemes.includes(theme);
                                return (
                                  <button
                                    key={theme}
                                    type="button"
                                    onClick={() => toggleTheme(theme)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border sm:text-xs ${
                                      isActive 
                                        ? "bg-violet-100 border-violet-200 text-violet-700 shadow-sm" 
                                        : "bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100"
                                    }`}
                                  >
                                    {isActive ? "✓" : "+"} {theme}
                                  </button>
                                );
                              })}
                            </div>
                            {activeThemes.length === 0 && (
                              <p className="text-xs text-red-500 font-bold mt-1 text-center">⚠️ Active au moins un thème !</p>
                            )}
                          </div>
                        </div>
                        )}

                        {startError && (
                          <p className="rounded-lg border border-red-100 bg-red-50 p-2 text-center text-xs font-bold text-red-500 sm:p-3 sm:text-sm">
                            {startError}
                          </p>
                        )}

                        <button
                          onClick={handleStartGame}
                          disabled={busy || players.length < 1 || activeThemes.length === 0}
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
            <motion.section key="playing" className="flex min-h-0 flex-1 flex-col gap-2" {...pageTransition}>
              {playerDepartedNotice && (
                <div
                  role="status"
                  className="shrink-0 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-center text-xs font-semibold text-amber-950 shadow-sm sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                >
                  {playerDepartedNotice}
                </div>
              )}
              <FloatingReactions roomCode={roomCode} myPlayerId={myPlayerId} players={players} />
              {(roomState?.game_data as { game_kind?: string } | undefined)?.game_kind === "wordle" ? (
                <WordleGame
                  roomCode={roomCode}
                  roomState={roomState}
                  myPlayerId={myPlayerId}
                  isHost={isHost}
                  players={players}
                />
              ) : (
                <QuizGame
                  roomCode={roomCode}
                  roomState={roomState}
                  myPlayerId={myPlayerId}
                  isHost={isHost}
                  players={players}
                />
              )}
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}