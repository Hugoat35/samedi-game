"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@/lib/lobby-types";
import { returnToLobbyRemote, submitWordleGuessRemote, wordleWordExistsRemote } from "@/lib/lobby-remote";

type WordleGameProps = {
  roomCode: string;
  roomState: Record<string, unknown>;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

const ROW1 = ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"];
const ROW2 = ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"];
const ROW3 = ["W", "X", "C", "V", "B", "N"];

function PlayerFace({
  player,
  className = "h-7 w-7",
}: {
  player: Player;
  className?: string;
}) {
  const hasImg = player.avatar && player.avatar.startsWith("data:image");
  return (
    <span
      title={player.name}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[9px] font-bold uppercase text-white ring-2 ring-white shadow-sm ${className}`}
    >
      {hasImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.avatar!} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{player.name.slice(0, 2)}</span>
      )}
    </span>
  );
}

function cellClass(mark: string): string {
  if (mark === "G") return "bg-emerald-500 text-white border-emerald-600";
  if (mark === "Y") return "bg-amber-400 text-white border-amber-500";
  return "bg-slate-400 text-white border-slate-500";
}

function feedbackRank(f: string): number {
  if (f === "G") return 3;
  if (f === "Y") return 2;
  return 1;
}

/** Meilleur indice connu par lettre (vert > jaune > gris) sur la manche en cours. */
function bestKeyHints(
  rows: Array<{ word: string; feedback: string[] }>,
): Record<string, "G" | "Y" | "X"> {
  const rank: Record<string, number> = {};
  const best: Record<string, "G" | "Y" | "X"> = {};
  for (const g of rows) {
    const letters = g.word.toUpperCase().split("");
    const fb = g.feedback || [];
    for (let i = 0; i < letters.length; i++) {
      const L = letters[i];
      const f = (fb[i] ?? "X") as "G" | "Y" | "X";
      const rr = feedbackRank(f);
      if (rr > (rank[L] ?? 0)) {
        rank[L] = rr;
        best[L] = f;
      }
    }
  }
  return best;
}

function keyButtonClass(mark: string | undefined, disabled: boolean): string {
  // Le secret est le 'flex-1 max-w-[2rem]' pour rétrécir sans jamais dépasser la taille idéale
  const base =
    "flex-1 flex items-center justify-center h-9 max-w-[2rem] rounded-lg border text-[11px] font-bold shadow-sm transition sm:h-10 sm:max-w-[2.25rem] sm:text-sm ";
  if (!mark) {
    return (
      base +
      "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 " +
      (disabled ? "opacity-40" : "")
    );
  }
  return base + cellClass(mark) + " hover:brightness-95 " + (disabled ? "opacity-40" : "");
}

function mapRpcError(raw: string | undefined, wordLen: number): string {
  if (!raw) return "Action impossible.";
  if (raw.includes("unknown_word")) return `Mot inconnu (dictionnaire ${wordLen} lettres).`;
  if (raw.includes("not_your_turn")) return "Ce n’est pas ton tour.";
  if (raw.includes("bad_length")) return `Le mot doit faire ${wordLen} lettres.`;
  if (raw.includes("not_playing")) return "La partie n’est pas en cours.";
  if (raw.includes("not_wordle")) return "Mode de jeu incorrect.";
  if (raw.includes("no_secret")) return "Mot secret manquant — relance la partie.";
  return raw;
}

export default function WordleGame({ roomCode, roomState, myPlayerId, isHost, players }: WordleGameProps) {
  const gameState = roomState?.game_state as string | undefined;
  const gd = (roomState?.game_data || {}) as Record<string, unknown>;
  const scores = (gd.scores || {}) as Record<string, number>;
  const w = (gd.wordle || {}) as Record<string, unknown>;
  const guesses = (w.guesses || []) as Array<{
    playerId: string;
    word: string;
    feedback: string[];
  }>;
  const playerOrder = (w.player_order || []) as string[];
  const turnIndex = Number(w.turn_index ?? 0);
  const roundsTotal = Number(w.rounds_total ?? 1);
  const roundIndex = Number(w.round_index ?? 0);
  const status = String(w.status ?? "playing");
  const lastRevealed = w.last_revealed_word != null ? String(w.last_revealed_word) : null;
  const winPts = Number(w.win_points ?? 200);
  const greenPts = Number(w.green_points ?? 50);
  const yellowPts = Number(w.yellow_points ?? 20);
  const wordLen = Math.min(10, Math.max(3, Number(w.word_length ?? 5)));
  const lenMin = Math.min(10, Math.max(3, Number(w.word_len_min ?? w.word_length ?? 5)));
  const lenMax = Math.min(10, Math.max(3, Number(w.word_len_max ?? w.word_length ?? 5)));

  const currentTurnId = playerOrder[turnIndex] ?? null;
  const currentTurnPlayer = useMemo(
    () => players.find((p) => p.id === currentTurnId),
    [players, currentTurnId],
  );

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dictOk, setDictOk] = useState<boolean | null>(null);
  /** Erreur RPC : ne pas confondre avec « mot absent ». */
  const [dictRpcError, setDictRpcError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const wordLenRef = useRef(wordLen);
  wordLenRef.current = wordLen;

  const keyHints = useMemo(() => bestKeyHints(guesses), [guesses]);

  const draftWord = draft.trim().toUpperCase();
  const draftLooksFull = draftWord.length === wordLen && /^[A-Z]+$/.test(draftWord);

  useEffect(() => {
    const w = draft.trim().toUpperCase();
    const full = w.length === wordLen && /^[A-Z]+$/.test(w);
    if (!full) {
      setDictOk(null);
      setDictRpcError(null);
      return;
    }
    setDictOk(null);
    setDictRpcError(null);
    const target = w;
    const lenAtSchedule = wordLen;
    const t = setTimeout(() => {
      void (async () => {
        const res = await wordleWordExistsRemote(target);
        const cur = draftRef.current.trim().toUpperCase();
        if (cur !== target || cur.length !== wordLenRef.current || wordLenRef.current !== lenAtSchedule) {
          return;
        }
        if (res.rpcError) {
          setDictRpcError(res.rpcError);
          setDictOk(null);
          return;
        }
        setDictRpcError(null);
        setDictOk(res.inDictionary);
      })();
    }, 150);
    return () => clearTimeout(t);
  }, [draft, wordLen]);

  const myTurn = currentTurnId === myPlayerId && status === "playing";
  const canSubmit =
    myTurn &&
    draftLooksFull &&
    dictOk === true &&
    !dictRpcError &&
    !busy &&
    gameState === "playing";

  const handleReturnLobby = useCallback(async () => {
    if (isHost) await returnToLobbyRemote(roomCode);
  }, [isHost, roomCode]);

  const append = (ch: string) => {
    if (!myTurn || busy) return;
    setDraft((d) => (d.length >= wordLen ? d : d + ch));
    setErr(null);
    setDictRpcError(null);
  };

  const backspace = () => {
    if (!myTurn || busy) return;
    setDraft((d) => d.slice(0, -1));
    setDictRpcError(null);
  };

  const submit = async () => {
    const word = draft.trim().toUpperCase();
    if (!canSubmit || word.length !== wordLen) return;
    setBusy(true);
    setErr(null);
    const res = await submitWordleGuessRemote(roomCode, myPlayerId, word);
    setBusy(false);
    if (!res.ok) {
      const raw = res.error;
      setErr(mapRpcError(raw, wordLen));
      return;
    }
    setDraft("");
  };

  if (gameState === "finished" || status === "game_over") {
    const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center w-full max-w-md mx-auto px-1 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl bg-white/90 p-4 shadow-lg sm:rounded-[2rem] sm:p-8"
        >
          <h2 className="mb-2 text-2xl font-bold sm:mb-4 sm:text-4xl">🏆 Wordle terminé !</h2>
          <p className="mb-4 text-sm font-medium text-slate-600 sm:mb-8 sm:text-base">
            Mot secret : <span className="font-mono font-bold text-emerald-700">{lastRevealed ?? "—"}</span>
          </p>

          <ul className="mb-4 flex flex-col gap-2 sm:mb-8 sm:gap-3">
            {sortedPlayers.map((p, i) => (
              <li
                key={p.id}
                className="relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 shadow-sm sm:rounded-2xl sm:px-5 sm:py-4 sm:text-lg"
              >
                {i === 0 && <div className="absolute inset-0 bg-emerald-50/60" />}
                <span className="relative z-10 min-w-0 truncate pr-2 text-left">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}
                </span>
                <span className="relative z-10 shrink-0 text-base text-emerald-600 sm:text-xl">
                  {scores[p.id] || 0} pts
                </span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleReturnLobby()}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 sm:rounded-2xl sm:py-4 sm:text-lg"
            >
              Retour au salon
            </motion.button>
          ) : (
            <p className="text-slate-400 font-bold animate-pulse">L&apos;hôte ramène tout le monde au salon…</p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
      <div className="shrink-0 rounded-2xl border border-emerald-100 bg-white/90 px-3 py-3 shadow-sm sm:rounded-[2rem] sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <p className="font-bold text-slate-700">
            Manche{" "}
            <span className="tabular-nums text-emerald-700">
              {Math.min(roundIndex + 1, roundsTotal)} / {roundsTotal}
            </span>
          </p>
          {lastRevealed && (
            <p className="text-[10px] font-semibold text-emerald-800 sm:text-xs">
              Dernier mot : <span className="font-mono font-bold">{lastRevealed}</span>
            </p>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-slate-500 sm:text-xs">
          {lenMin === lenMax ? (
            <>
              Mots de {wordLen} lettres · +{winPts} pts si tu trouves le mot · +{greenPts} / lettre verte nouvelle · +
              {yellowPts} / lettre jaune nouvelle (sur ton tour).
            </>
          ) : (
            <>
              Mot actuel : {wordLen} lettres (plage hôte {lenMin}–{lenMax}) · +{winPts} pts si tu trouves le mot · +
              {greenPts} / lettre verte nouvelle · +{yellowPts} / lettre jaune nouvelle (sur ton tour).
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold sm:text-xs ${
                p.id === currentTurnId ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300" : "bg-slate-100 text-slate-600"
              }`}
            >
              <PlayerFace player={p} className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="max-w-[7rem] truncate">{p.name}</span>
              <span className="tabular-nums text-emerald-700">{scores[p.id] ?? 0} pts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch rounded-2xl border border-slate-100 bg-white/80 px-2 py-3 sm:rounded-[2rem] sm:px-4 sm:py-5">
        <p className="mb-3 text-center text-sm font-bold text-slate-800 sm:text-base">
          {status !== "playing" ? (
            "Partie terminée"
          ) : myTurn ? (
            <span className="text-emerald-700">À toi de proposer un mot</span>
          ) : (
            <span className="text-slate-500">
              Tour de <span className="font-bold text-slate-800">{currentTurnPlayer?.name ?? "…"}</span>
            </span>
          )}
        </p>

        <div className="mx-auto flex max-w-sm flex-col gap-1.5">
          {guesses.map((g, idx) => {
            const p = players.find((x) => x.id === g.playerId);
            const facePlayer = p ?? { id: "?", name: "?", avatar: null };
            const letters = g.word.toUpperCase().split("");
            const fb = g.feedback || [];
            return (
              <div key={`${g.playerId}-${idx}-${g.word}`} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  <PlayerFace player={facePlayer} className="h-5 w-5" />
                  <span className="truncate text-[10px] font-semibold text-slate-400">{p?.name ?? "?"}</span>
                </div>
                <div className="flex justify-center gap-0.5 sm:gap-1">
                  {letters.map((letter, i) => (
                    <span
                      key={i}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base font-black uppercase shadow-sm sm:h-10 sm:w-10 sm:text-lg md:h-11 md:w-11 md:text-xl ${cellClass(fb[i] ?? "X")}`}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 space-y-2 rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 shadow-inner sm:rounded-[2rem] sm:px-4 sm:py-4">
        <div className="flex items-center justify-center gap-2">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={wordLen}
            value={draft}
            disabled={!myTurn || busy}
            onChange={(e) => {
              const v = e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, "")
                .slice(0, wordLen);
              setDraft(v);
              setErr(null);
              setDictRpcError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Backspace") backspace();
            }}
            placeholder={"_".repeat(wordLen)}
            className="min-w-0 max-w-[min(100%,22rem)] rounded-xl border border-slate-200 bg-white px-2 py-2 text-center font-mono text-lg font-bold tracking-[0.2em] text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 sm:px-3 sm:text-xl md:text-2xl"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-40 sm:px-5 sm:py-2.5 sm:text-base"
          >
            {busy
              ? "…"
              : draftLooksFull && dictOk === null && !dictRpcError
                ? "…"
                : "Valider"}
          </motion.button>
        </div>
        {draftLooksFull && dictOk === null && !dictRpcError && myTurn && (
          <p className="text-center text-[11px] font-medium text-slate-500">Vérification du mot…</p>
        )}
        {draftLooksFull && dictOk === false && !dictRpcError && (
          <p className="text-center text-[11px] font-semibold text-amber-700">Mot absent du dictionnaire.</p>
        )}
        {dictRpcError && draftLooksFull && (
          <p className="text-center text-[11px] font-semibold text-red-600">
            Impossible de vérifier le mot. Connexion ou fonction SQL « wordle_word_exists » (migration 010). Détail :{" "}
            <span className="break-all font-mono font-normal opacity-90">{dictRpcError}</span>
          </p>
        )}
        {err && <p className="text-center text-xs font-semibold text-red-600">{err}</p>}

        {/* CLAVIER ADAPTATIF */}
        <div className="mt-2 flex flex-col gap-1.5 sm:gap-2">
          {/* LIGNE 1 */}
          <div className="flex w-full justify-center gap-[2px] px-1 sm:gap-1">
            {ROW1.map((k) => (
              <button
                key={k}
                type="button"
                disabled={!myTurn || busy}
                onClick={() => append(k)}
                className={keyButtonClass(keyHints[k], !myTurn || busy)}
              >
                {k}
              </button>
            ))}
          </div>
          {/* LIGNE 2 */}
          <div className="flex w-full justify-center gap-[2px] px-1 sm:gap-1">
            {ROW2.map((k) => (
              <button
                key={k}
                type="button"
                disabled={!myTurn || busy}
                onClick={() => append(k)}
                className={keyButtonClass(keyHints[k], !myTurn || busy)}
              >
                {k}
              </button>
            ))}
          </div>
          {/* LIGNE 3 */}
          <div className="flex w-full justify-center gap-[2px] px-1 sm:gap-1">
            <button
              type="button"
              disabled={!myTurn || busy}
              onClick={backspace}
              className="flex-[1.5] flex items-center justify-center h-9 max-w-[3rem] rounded-lg border border-slate-200 bg-slate-200 text-xs font-bold text-slate-700 shadow-sm sm:h-10 sm:text-sm sm:max-w-[3.5rem]"
            >
              ⌫
            </button>
            {ROW3.map((k) => (
              <button
                key={k}
                type="button"
                disabled={!myTurn || busy}
                onClick={() => append(k)}
                className={keyButtonClass(keyHints[k], !myTurn || busy)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
