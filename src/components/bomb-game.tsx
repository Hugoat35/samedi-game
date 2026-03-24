"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useRef } from "react";
import type { Player } from "@/lib/lobby-types";
import { submitBombGuessRemote, handleBombExplosionRemote, returnToLobbyRemote } from "@/lib/lobby-remote";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";


type BombGameProps = {
  roomCode: string;
  roomState: Record<string, unknown>;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

export default function BombGame({ roomCode, roomState, myPlayerId, isHost, players }: BombGameProps) {
  const gd = (roomState?.game_data || {}) as any;
  const status = gd.status || "playing";
  const playerOrder = (gd.player_order || []) as string[];
  const turnIndex = Number(gd.turn_index || 0);
  const lives = (gd.lives || {}) as Record<string, number>;
  const constraint = gd.current_constraint as { type: string; value: string; label: string };
  const explosionTime = Number(gd.explosion_time || 0);
  const usedWords = (gd.used_words || []) as string[];
  
  const currentTurnId = playerOrder[turnIndex] ?? null;
  const myTurn = currentTurnId === myPlayerId && status === "playing";
  const currentPlayerName = players.find(p => p.id === currentTurnId)?.name || "Un joueur";

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null); // <-- NOUVEAU
  // NOUVEAU : State pour stocker ce que les autres tapent
  const [liveTyping, setLiveTyping] = useState("");
  const channelRef = useRef<any>(null);

  // NOUVEAU : Connexion au canal "Broadcast" de Supabase pour la frappe en temps réel
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !roomCode) return;
    
    // On crée un canal spécifique pour cette salle
    const channel = supabase.channel(`bomb_typing_${roomCode}`);
    
    // On écoute les événements "type" envoyés par les autres
    channel.on("broadcast", { event: "type" }, ({ payload }) => {
      // Si le message vient bien du joueur dont c'est le tour (et pas de nous-même)
      if (payload.playerId === currentTurnId && payload.playerId !== myPlayerId) {
        setLiveTyping(payload.word);
      }
    }).subscribe();

    channelRef.current = channel;

    return () => { 
      supabase.removeChannel(channel); 
      channelRef.current = null;
    };
  }, [roomCode, currentTurnId, myPlayerId]);

  // On vide la zone de frappe à chaque changement de tour OU de consigne (explosion)
  useEffect(() => {
    setLiveTyping("");
    setDraft("");
  }, [currentTurnId, constraint?.label]);

  // NOUVEAU : Fonction modifiée pour diffuser la frappe à chaque touche
  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const word = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    setDraft(word);
    setErr(null);

    // Si c'est mon tour, j'envoie ce que je tape aux autres via Supabase
    if (myTurn && channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "type",
        payload: { playerId: myPlayerId, word: word }
      }).catch(() => {});
    }
  };

  // Moteur du chronomètre (tourne à 60fps pour la fluidité)
  useEffect(() => {
    if (status !== "playing") return;

    let reqId: number;
    const updateTimer = () => {
      const remaining = Math.max(0, explosionTime - Date.now());
      setTimeLeft(remaining / 1000);

      // Si le temps est écoulé, c'est l'hôte qui déclare l'explosion
      if (remaining <= 0 && isHost && !busy) {
        setBusy(true);
        handleBombExplosionRemote(roomCode, gd).finally(() => setBusy(false));
      } else if (remaining > 0) {
        reqId = requestAnimationFrame(updateTimer);
      }
    };

    reqId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(reqId);
  }, [explosionTime, isHost, status, roomCode, gd, busy]);

  const submit = async () => {
    const word = draft.trim().toUpperCase();
    if (!myTurn || busy || !word) return;

    if (inputRef.current) {
      inputRef.current.blur();
    }

    setBusy(true);
    setErr(null);
    const res = await submitBombGuessRemote(roomCode, myPlayerId, word, gd);
    setBusy(false);

    if (!res.ok) {
      setErr(res.error || "Mot invalide");
    }
  };

  // Calcul de l'intensité du tremblement de la bombe
  const isPanic = timeLeft < 5;
  const shakeAnimation = isPanic 
    ? { x: [-6, 6, -6, 6, 0], y: [-3, 3, -3, 3, 0], transition: { repeat: Infinity, duration: 0.15 } }
    : { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1 } };

  if (status === "game_over" || roomState.game_state === "finished") {
    // Écran de fin
    const winner = players.find(p => (lives[p.id] || 0) > 0);
    return (
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-white/90 rounded-3xl shadow-xl max-w-md mx-auto mt-10">
        <h2 className="text-4xl font-black text-slate-800 mb-4">🏆 Fin de partie !</h2>
        <p className="text-xl font-bold text-emerald-600 mb-8">
          {winner ? `${winner.name} a survécu !` : "Tout le monde a explosé !"}
        </p>
        {isHost && (
          <button
            onClick={() => returnToLobbyRemote(roomCode)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition"
          >
            Retour au salon
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-1 max-w-md mx-auto w-full gap-4">
      
      {/* HUD : Vies des joueurs */}
      <div className="w-full flex flex-wrap justify-center gap-2 p-4 bg-white/80 rounded-3xl shadow-sm border border-slate-100">
        {players.map(p => (
          <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${p.id === currentTurnId ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-400' : 'bg-white border-slate-200'}`}>
            <span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{p.name}</span>
            <div className="flex gap-0.5">
              {[...Array(2)].map((_, i) => (
                <span key={i} className={`text-sm ${i < (lives[p.id] || 0) ? '' : 'grayscale opacity-30'}`}>❤️</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ZONE CENTRALE : La Bombe (chrono masqué) */}
      <div className="flex flex-col items-center justify-center py-6">
        <motion.div animate={shakeAnimation} className="text-8xl md:text-9xl drop-shadow-2xl mb-2">
          💣
        </motion.div>
        <p className={`text-2xl font-black uppercase tracking-widest ${isPanic ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
          Tic Tac...
        </p>
      </div>

      {/* CONSIGNE & MOTS DÉJÀ UTILISÉS */}
      <div className="w-full text-center p-4 bg-rose-500 rounded-2xl shadow-lg border-b-4 border-rose-700 text-white flex flex-col items-center gap-2">
        <div className="w-full">
          <p className="text-sm font-semibold opacity-90 mb-1">
            {myTurn ? "À TON TOUR ! TROUVE UN MOT QUI :" : `Tour de ${currentPlayerName} :`}
          </p>
          <p className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
            {constraint?.label}
          </p>
        </div>

        {/* NOUVEAU : Affichage des mots déjà joués dans la manche */}
        {usedWords.length > 0 && (
          <div className="mt-2 w-full pt-3 border-t border-white/20">
            <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1.5 font-bold">Mots déjà utilisés :</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {usedWords.map((w, idx) => (
                <span key={idx} className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ZONE DE SAISIE ET D'AFFICHAGE EN TEMPS RÉEL */}
      <div className="w-full p-4 bg-white/90 rounded-3xl shadow-md border border-slate-100 mt-auto sm:mt-4">
        
        {myTurn ? (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-2">
            <input
            ref={inputRef} // <-- NOUVEAU
            type="text"
            value={draft}
            disabled={!myTurn || busy}
            // Attention : S'il y a le mot "autoFocus" écrit ici, supprime-le absolument !
            onChange={(e) => {
              setDraft(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
              setErr(null);
            }}
            placeholder={myTurn ? "Tape ton mot ici..." : "Attends ton tour..."}
            className="w-full text-center text-2xl font-black tracking-widest p-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none transition disabled:opacity-50"
          />
            <AnimatePresence>
              {err && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-rose-600 text-sm font-bold text-center"
                >
                  {err}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={busy || !draft}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg uppercase tracking-wider hover:bg-slate-800 disabled:opacity-40 transition"
            >
              {busy ? "Vérification..." : "Passer la bombe !"}
            </button>
          </form>
        ) : (
          /* NOUVEAU : Vue spectateur quand ce n'est pas mon tour */
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <p className="text-sm font-bold text-slate-500 animate-pulse">
              {currentPlayerName} réfléchit...
            </p>
            <div className="w-full text-center min-h-[3.5rem] p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <span className={`text-2xl font-black tracking-widest ${liveTyping ? 'text-slate-800' : 'text-slate-300'}`}>
                {liveTyping || "..."}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}