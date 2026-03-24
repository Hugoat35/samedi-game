"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import type { QuizQuestion } from "@/lib/quiz-bank";
import type { Player } from "@/lib/lobby-types";
import {
  nextQuestionRemote,
  endGameRemote,
  returnToLobbyRemote,
  submitAnswerRemote,
  submitTribunalVoteRemote,
  advanceTribunalRemote,
  finishTribunalRemote,
  buildTribunalCellVoteKey,
  MINIBAC_POINTS_PER_CELL,
  type MinibacSubmission,
} from "@/lib/lobby-remote";
import { matchOpenTolerance } from "@/lib/levenshtein";
import { buildGeoFlagUrl, buildGeoShapeUrl } from "@/lib/quiz-bank";

type QuizGameProps = {
  roomCode: string;
  roomState: any;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

// On passe la question entière à la fonction
const GET_DURATION = (q: QuizQuestion) => {
  // S'il y a un temps imposé pour cette question, on l'utilise en priorité !
  if (q.timeLimit) return q.timeLimit; 
  
  // Sinon, on garde tes règles habituelles
  if (q.type === "true_false") return 8;
  if (q.type === "qcm") return 12;
  if (q.type === "date") return 12;
  if (q.type === "minibac") return 90;
  if (q.type === "geo_flag") return 18;
  if (q.type === "geo_shape") return 22;
  return 15;
};

const REVEAL_DURATION = 6;
/** Dès qu’un joueur a validé son Mini-Bac, le temps restant pour tout le monde est plafonné à 10 s. */
const MINIBAC_RUSH_SECONDS = 10;

/**
 * Bonus « premier arrivé » : pool total ≈ proportionnel au nombre de joueurs,
 * réparti entre ceux qui ont marqué des points sur la question, du plus rapide au plus lent.
 */
function distributeSpeedBonus(
  earnedPoints: Record<string, number>,
  answerOrder: string[],
  numPlayers: number,
): Record<string, number> {
  const bonus: Record<string, number> = {};
  const winners = Object.entries(earnedPoints)
    .filter(([, pts]) => pts > 0)
    .map(([id]) => id);
  if (winners.length === 0 || numPlayers < 1) return bonus;

  const orderIndex = (id: string) => {
    const i = answerOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  winners.sort((a, b) => orderIndex(a) - orderIndex(b));

  const K = winners.length;
  const totalPool = Math.round(6 * numPlayers);
  const weightSum = (K * (K + 1)) / 2;
  winners.forEach((pid, idx) => {
    const rank = idx + 1;
    const weight = K - rank + 1;
    bonus[pid] = Math.round((totalPool * weight) / weightSum);
  });
  return bonus;
}

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
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[9px] font-bold uppercase text-white ring-2 ring-white shadow-sm ${className}`}
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

function parseYear(s: string): number | null {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseMinibacAnswer(raw: string | null): MinibacSubmission | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { type?: string; letter?: string; categories?: string[]; values?: string[] };
    if (o.type !== "minibac" || !o.letter || !Array.isArray(o.values)) return null;
    return {
      letter: o.letter,
      categories: o.categories ?? [],
      values: o.values,
    };
  } catch {
    return null;
  }
}

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const answers: Record<string, string> = roomState?.game_data?.answers || {};
  const currentScores: Record<string, number> = roomState?.game_data?.scores || {};
  const currentIndex = roomState?.current_question_index || 0;
  const gameState = roomState?.game_state;
  const currentQuestion = questions[currentIndex];
  const minibacHistory = roomState?.game_data?.minibac_history || [];
  const tribunalDone = roomState?.game_data?.tribunal_complete === true;
  const tribunalCursor = Number(roomState?.game_data?.tribunal_cursor ?? 0);
  const tribunalVotes =
    (roomState?.game_data?.tribunal_votes || {}) as Record<string, Record<string, "accept" | "reject">>;

  const [timeLeft, setTimeLeft] = useState(15);
  const [revealTimeLeft, setRevealTimeLeft] = useState(REVEAL_DURATION);
  const [phase, setPhase] = useState<"question" | "reveal">("question");
  /** Choix QCM / Vrai-Faux appliqué tout de suite au clic (avant Supabase). */
  const [localAnswer, setLocalAnswer] = useState<string | null>(null);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [minibacValues, setMinibacValues] = useState(["", "", "", ""]);

  /** Fin de chrono : envoyer ce qui est dans les champs (sans exiger « Valider »). Doit être await avant reveal. */
  const autoSubmitBeforeRevealRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!currentQuestion?.id) return;
    setPhase("question");
    setTimeLeft(GET_DURATION(currentQuestion));
    setRevealTimeLeft(REVEAL_DURATION);
    setInputValue("");
    setMinibacValues(["", "", "", ""]);
    setLocalSubmitted(false);
    setLocalAnswer(null);
  }, [currentQuestion?.id]);

  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (currentQuestion?.type !== "minibac") return;
    if (phase !== "question") return;
    if (answeredCount < 1) return;
    setTimeLeft((t) => Math.min(t, MINIBAC_RUSH_SECONDS));
  }, [currentQuestion?.type, currentQuestion?.id, phase, answeredCount]);
  const allAnswered = answeredCount > 0 && answeredCount >= players.length;
  const myAnswer = answers[myPlayerId] ?? null;
  /** Réponse affichée pour les boutons : locale d’abord, puis synchro serveur. */
  const effectiveChoice = localAnswer ?? myAnswer;
  const hasLockedAnswer = localSubmitted || myAnswer !== null || localAnswer !== null;

  autoSubmitBeforeRevealRef.current = async () => {
    if (!currentQuestion) return;
    if (phase !== "question" || gameState !== "playing") return;
    if (localSubmitted || myAnswer !== null || localAnswer !== null) return;

    if (currentQuestion.type === "minibac") {
      const letter = currentQuestion.letter ?? "?";
      const categories = currentQuestion.categories ?? [];
      const values = minibacValues.map((v) => String(v).trim());
      setLocalSubmitted(true);
      const minibac: MinibacSubmission = { letter, categories, values };
      const res = await submitAnswerRemote(roomCode, myPlayerId, {
        questionId: currentQuestion.id,
        questionType: "minibac",
        answerStr: JSON.stringify({ type: "minibac", letter, categories, values }),
        minibac,
      });
      if (!res.ok) setLocalSubmitted(false);
      return;
    }

    if (
      currentQuestion.type === "open" ||
      currentQuestion.type === "estimation" ||
      currentQuestion.type === "date" ||
      currentQuestion.type === "geo_flag" ||
      currentQuestion.type === "geo_shape"
    ) {
      const raw = inputValue.trim();
      setLocalSubmitted(true);
      const res = await submitAnswerRemote(roomCode, myPlayerId, {
        questionId: currentQuestion.id,
        questionType: currentQuestion.type,
        answerStr: raw,
      });
      if (!res.ok) setLocalSubmitted(false);
    }
  };

  useEffect(() => {
    if (allAnswered && phase === "question" && gameState === "playing") {
      setPhase("reveal");
      setTimeLeft(0);
    }
  }, [allAnswered, phase, gameState]);

  useEffect(() => {
    if (phase !== "question" || gameState !== "playing" || allAnswered) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void (async () => {
            await autoSubmitBeforeRevealRef.current();
            setPhase("reveal");
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, gameState, allAnswered]);

  const pointsEarnedThisRound = useMemo(() => {
    if (phase !== "reveal" || !currentQuestion) return {};
    const earned: Record<string, number> = {};
    const pts = currentQuestion.points;

    const withSpeedBonus = (e: Record<string, number>) => {
      const answerOrder = (roomState?.game_data?.answer_order as string[] | undefined) ?? [];
      const speedBonus = distributeSpeedBonus(e, answerOrder, Math.max(players.length, 1));
      Object.entries(speedBonus).forEach(([id, b]) => {
        e[id] = (e[id] || 0) + b;
      });
      return e;
    };

    if (currentQuestion.type === "minibac") {
      return earned;
    }

    if (currentQuestion.type === "estimation") {
      const target = Number(currentQuestion.answer);
      
      Object.entries(answers).forEach(([pId, ans]) => {
        const val = Number(ans);
        if (isNaN(val)) return;

        const dist = Math.abs(val - target);
        
        // Cas spécial : Réponse exacte
        if (dist === 0) {
          earned[pId] = pts + 50;
          return;
        }

        // Calcul du pourcentage d'erreur (si target est 0, on gère l'exception)
        const errorMargin = target !== 0 ? (dist / Math.abs(target)) : dist;

        if (errorMargin <= 0.05) { // Moins de 5% d'erreur
          earned[pId] = pts;
        } else if (errorMargin <= 0.15) { // Moins de 15% d'erreur
          earned[pId] = Math.floor(pts * 0.7);
        } else if (errorMargin <= 0.30) { // Moins de 30% d'erreur
          earned[pId] = Math.floor(pts * 0.4);
        } else if (errorMargin <= 0.50) { // Moins de 50% d'erreur
          earned[pId] = Math.floor(pts * 0.1);
        } else {
          earned[pId] = 0;
        }
      });

      return withSpeedBonus(earned);
    }

    if (currentQuestion.type === "date") {
      const correct = Number(currentQuestion.answer);
      Object.entries(answers).forEach(([pId, ans]) => {
        const y = parseYear(ans);
        if (y === null) return;
        const d = Math.abs(y - correct);
        
        if (d === 0) {
          earned[pId] = pts + 50; // Bonus pile-poil !
        } else if (d <= 1) {
          earned[pId] = pts; // 1 an d'écart, c'est quasiment parfait
        } else if (d <= 4) {
          earned[pId] = Math.floor(pts * 0.6); // 60% des points
        } else if (d <= 10) {
          earned[pId] = Math.floor(pts * 0.3); // 30% des points
        } else if (d <= 20) {
          earned[pId] = Math.floor(pts * 0.1); // Points de consolation (10%)
        } else {
          earned[pId] = 0;
        }
      });
      return withSpeedBonus(earned);
    }

    if (
      currentQuestion.type === "open" ||
      currentQuestion.type === "geo_flag" ||
      currentQuestion.type === "geo_shape"
    ) {
      Object.entries(answers).forEach(([pId, ans]) => {
        const answerStr = String(ans).trim();
        // CORRECTION : On ignore les réponses vides
        if (answerStr === "") return;
        
        if (
          matchOpenTolerance(answerStr, String(currentQuestion.answer), currentQuestion.answerAliases)
        ) {
          earned[pId] = pts;
        }
      });
      return withSpeedBonus(earned);
    }
    Object.entries(answers).forEach(([pId, ans]) => {
      if (
        String(ans).trim().toLowerCase() === String(currentQuestion.answer).trim().toLowerCase()
      ) {
        earned[pId] = pts;
      }
    });
    return withSpeedBonus(earned);
  }, [phase, answers, currentQuestion, roomState?.game_data?.answer_order, players.length]);

  const pointsEarnedRef = useRef(pointsEarnedThisRound);
  useEffect(() => { pointsEarnedRef.current = pointsEarnedThisRound; }, [pointsEarnedThisRound]);

  const currentScoresRef = useRef(currentScores);
  useEffect(() => { currentScoresRef.current = currentScores; }, [currentScores]);

  useEffect(() => {
    if (phase !== "reveal" || gameState !== "playing") return;

    const timer = setInterval(() => {
      setRevealTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          if (isHost) {
            // On utilise currentScoresRef.current au lieu de currentScores
            const newTotalScores = { ...currentScoresRef.current };
            
            // On utilise pointsEarnedRef.current au lieu de pointsEarnedThisRound
            Object.entries(pointsEarnedRef.current).forEach(([pId, p]) => {
              newTotalScores[pId] = (newTotalScores[pId] || 0) + p;
            });

            const nextIdx = currentIndex + 1;
            if (nextIdx >= questions.length) {
              endGameRemote(roomCode, newTotalScores);
            } else {
              nextQuestionRemote(roomCode, nextIdx, questions, newTotalScores);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Regarde la ligne ci-dessous : j'ai retiré currentScores et pointsEarnedThisRound
    return () => clearInterval(timer);
  }, [phase, gameState, isHost, currentIndex, questions, roomCode]);

  const handleAnswerClick = async (answer: string | number) => {
    const answerStr = String(answer).trim();
    if (!currentQuestion) return;
    if (localAnswer !== null || myAnswer !== null || phase !== "question" || !answerStr) return;

    setLocalAnswer(answerStr);
    const res = await submitAnswerRemote(roomCode, myPlayerId, {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      answerStr,
    });
    if (!res.ok) setLocalAnswer(null);
  };

  const handleTextSubmit = async () => {
    if (!currentQuestion) return;
    if (hasLockedAnswer || phase !== "question") return;
    if (currentQuestion.type === "minibac") return;

    const raw = inputValue.trim();
    if (!raw) return;

    setLocalSubmitted(true);
    const res = await submitAnswerRemote(roomCode, myPlayerId, {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      answerStr: raw,
    });
    if (!res.ok) setLocalSubmitted(false);
  };

  const handleMinibacSubmit = async () => {
    if (!currentQuestion || currentQuestion.type !== "minibac") return;
    if (hasLockedAnswer || phase !== "question") return;
    const letter = currentQuestion.letter ?? "?";
    const categories = currentQuestion.categories ?? [];
    if (minibacValues.some((v) => !String(v).trim())) return;

    setLocalSubmitted(true);
    const minibac: MinibacSubmission = {
      letter,
      categories,
      values: minibacValues.map((v) => v.trim()),
    };
    const res = await submitAnswerRemote(roomCode, myPlayerId, {
      questionId: currentQuestion.id,
      questionType: "minibac",
      answerStr: JSON.stringify({ type: "minibac", ...minibac }),
      minibac,
    });
    if (!res.ok) setLocalSubmitted(false);
  };

  const handleReturnLobby = async () => {
    if (isHost) await returnToLobbyRemote(roomCode);
  };

  const tribunalQueue = useMemo(() => {
    const items: Array<{
      questionId: string;
      playerId: string;
      cellIndex: number;
      categoryLabel: string;
      value: string;
      letter: string;
    }> = [];
    for (const entry of minibacHistory as Array<{
      questionId: string;
      submissions: Record<string, MinibacSubmission>;
    }>) {
      for (const [playerId, sub] of Object.entries(entry.submissions || {})) {
        const cats = sub.categories || [];
        const vals = sub.values || [];
        const n = Math.min(4, cats.length, vals.length);
        for (let i = 0; i < n; i++) {
          items.push({
            questionId: entry.questionId,
            playerId,
            cellIndex: i,
            categoryLabel: cats[i] ?? "",
            value: vals[i] ?? "",
            letter: sub.letter ?? "?",
          });
        }
      }
    }
    const order = new Map(players.map((p, i) => [p.id, i]));
    items.sort((a, b) => {
      const oa = order.get(a.playerId) ?? 0;
      const ob = order.get(b.playerId) ?? 0;
      if (oa !== ob) return oa - ob;
      if (a.questionId !== b.questionId) return a.questionId.localeCompare(b.questionId);
      return a.cellIndex - b.cellIndex;
    });
    return items;
  }, [minibacHistory, players]);

  const showTribunal =
    gameState === "finished" &&
    !tribunalDone &&
    Array.isArray(minibacHistory) &&
    minibacHistory.length > 0;

  if (gameState === "finished" && showTribunal) {
    const current = tribunalQueue[tribunalCursor];
    const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

    const handleVote = async (vote: "accept" | "reject") => {
      if (!current) return;
      await submitTribunalVoteRemote(
        roomCode,
        myPlayerId,
        current.questionId,
        current.playerId,
        current.cellIndex,
        vote,
      );
    };

    const voteKey = current
      ? buildTribunalCellVoteKey(current.questionId, current.playerId, current.cellIndex)
      : "";
    const votesForGrid = voteKey ? tribunalVotes[voteKey] || {} : {};
    const voters = players.filter((p) => p.id !== current?.playerId);
    const allVotersDone = voters.length === 0 || voters.every((v) => votesForGrid[v.id]);

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center w-full max-w-md mx-auto px-2 pb-2 text-center">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-violet-100 bg-white/95 p-4 shadow-lg sm:rounded-[2rem] sm:p-8"
        >
          <h2 className="mb-1 text-2xl font-black text-slate-900 sm:mb-2 sm:text-3xl">⚖️ Le Tribunal</h2>
          <p className="mb-2 text-xs font-medium leading-snug text-slate-600 sm:text-sm">
            Une réponse à la fois : votez pour chaque case.{" "}
            <span className="text-violet-700 font-bold">+{MINIBAC_POINTS_PER_CELL} pts</span> par réponse
            acceptée (majorité).
          </p>
          {tribunalQueue.length > 0 && (
            <p className="text-xs text-slate-400 mb-4 font-semibold">
              Étape {tribunalCursor + 1} / {tribunalQueue.length}
            </p>
          )}

          {!current ? (
            <p className="text-slate-500 mb-6">Aucune réponse à juger.</p>
          ) : (
            <>
              <p className="text-base font-bold text-violet-700 mb-3">
                <span className="text-slate-900">{playerName(current.playerId)}</span>
                <span className="text-slate-500 font-medium"> · réponse {current.cellIndex + 1}/4</span>
              </p>
              <div className="mb-5 rounded-xl bg-violet-50/90 p-4 text-left border border-violet-100">
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 flex h-14 w-14 items-center justify-center rounded-lg bg-violet-600 text-3xl font-black text-white shadow-sm">
                    {current.letter}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      {current.categoryLabel}
                    </span>
                    <p className="text-lg font-bold text-slate-900 leading-tight break-words">{current.value}</p>
                  </div>
                </div>
              </div>

              {myPlayerId === current.playerId ? (
                <div className="w-full text-left">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
                    Votes en direct
                  </p>
                  {voters.length === 0 ? (
                    <p className="text-center text-xs text-slate-400">Aucun autre joueur pour voter.</p>
                  ) : (
                    <ul className="flex max-h-[min(40vh,280px)] flex-col gap-1.5 overflow-y-auto pr-0.5">
                      {voters.map((v) => {
                        const vChoice = votesForGrid[v.id];
                        return (
                          <motion.li
                            key={v.id}
                            layout
                            initial={false}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate font-semibold text-slate-800">{v.name}</span>
                            <span className="shrink-0 text-xs font-bold sm:text-sm">
                              {vChoice === "accept" && (
                                <span className="text-green-600">✓ Accepté</span>
                              )}
                              {vChoice === "reject" && (
                                <span className="text-red-600">✗ Refusé</span>
                              )}
                              {!vChoice && (
                                <span className="text-slate-400 animate-pulse">En attente…</span>
                              )}
                            </span>
                          </motion.li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-3 text-center text-[10px] tabular-nums text-slate-400">
                    {Object.keys(votesForGrid).length} / {voters.length} votes reçus
                  </p>
                </div>
              ) : (
                <div className="flex justify-center gap-2 sm:gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote("accept")}
                    disabled={!!votesForGrid[myPlayerId]}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold shadow-md transition sm:rounded-2xl sm:py-4 sm:text-lg ${
                      votesForGrid[myPlayerId] === "accept"
                        ? "bg-green-600 text-white"
                        : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                    }`}
                  >
                    Accepter
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote("reject")}
                    disabled={!!votesForGrid[myPlayerId]}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold shadow-md transition sm:rounded-2xl sm:py-4 sm:text-lg ${
                      votesForGrid[myPlayerId] === "reject"
                        ? "bg-red-700 text-white"
                        : "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    }`}
                  >
                    Refuser
                  </motion.button>
                </div>
              )}

              {isHost && (
                <div className="mt-5 flex flex-col gap-2 sm:mt-8 sm:gap-3">
                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    Votes : {Object.keys(votesForGrid).length}/{voters.length}
                    {allVotersDone ? " ✓" : ""}
                  </p>
                  {tribunalCursor < tribunalQueue.length - 1 ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => advanceTribunalRemote(roomCode)}
                      className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white sm:rounded-2xl sm:py-4 sm:text-lg"
                    >
                      Réponse suivante
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => finishTribunalRemote(roomCode)}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold leading-tight text-white sm:rounded-2xl sm:py-4 sm:text-lg"
                    >
                      <span className="sm:hidden">Voir le podium</span>
                      <span className="hidden sm:inline">Terminer le Tribunal — Voir le podium</span>
                    </motion.button>
                  )}
                </div>
              )}
            </>
          )}

          {!current && isHost && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => finishTribunalRemote(roomCode)}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white sm:mt-4 sm:rounded-2xl sm:py-4 sm:text-lg"
            >
              Voir le podium
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  if (gameState === "finished") {
    const sortedPlayers = [...players].sort(
      (a, b) => (currentScores[b.id] || 0) - (currentScores[a.id] || 0),
    );

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center w-full max-w-md mx-auto px-1 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl bg-white/90 p-4 shadow-lg sm:rounded-[2rem] sm:p-8"
        >
          <h2 className="mb-2 text-2xl font-bold sm:mb-4 sm:text-4xl">🏆 Fin du Jeu !</h2>
          <p className="mb-4 text-sm font-medium text-slate-600 sm:mb-8 sm:text-base">Voici les résultats finaux :</p>

          <ul className="mb-4 flex flex-col gap-2 sm:mb-8 sm:gap-3">
            {sortedPlayers.map((p, i) => (
              <li
                key={p.id}
                className="relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 shadow-sm sm:rounded-2xl sm:px-5 sm:py-4 sm:text-lg"
              >
                {i === 0 && <div className="absolute inset-0 bg-yellow-100/50"></div>}
                <span className="relative z-10 min-w-0 truncate pr-2 text-left">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}
                </span>
                <span className="relative z-10 shrink-0 text-base text-violet-600 sm:text-xl">
                  {currentScores[p.id] || 0} pts
                </span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleReturnLobby}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 sm:rounded-2xl sm:py-4 sm:text-lg"
            >
              Retour au Salon
            </motion.button>
          ) : (
            <p className="text-slate-400 font-bold animate-pulse">L&apos;hôte va vous ramener au salon...</p>
          )}
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return <div className="text-center p-8 text-slate-500 font-bold">Chargement...</div>;

  const duration = GET_DURATION(currentQuestion);
  const isTextBased =
    currentQuestion.type === "estimation" ||
    currentQuestion.type === "open" ||
    currentQuestion.type === "date" ||
    currentQuestion.type === "minibac" ||
    currentQuestion.type === "geo_flag" ||
    currentQuestion.type === "geo_shape";
  const isEstimation = currentQuestion.type === "estimation";
  const isDate = currentQuestion.type === "date";
  const isMinibac = currentQuestion.type === "minibac";
  const isGeoFlag = currentQuestion.type === "geo_flag";
  const isGeoShape = currentQuestion.type === "geo_shape";
  const isGeo = isGeoFlag || isGeoShape;
  const geoImageUrl =
    isGeo && currentQuestion.countryCode
      ? isGeoFlag
        ? buildGeoFlagUrl(currentQuestion.countryCode)
        : buildGeoShapeUrl(currentQuestion.countryCode)
      : null;
  const myPoints = pointsEarnedThisRound[myPlayerId] || 0;
  const myMinibac = parseMinibacAnswer(myAnswer);

  const showPeerTextAnswers =
    phase === "reveal" &&
    !isMinibac &&
    (currentQuestion.type === "open" ||
      currentQuestion.type === "estimation" ||
      currentQuestion.type === "date" ||
      currentQuestion.type === "geo_flag" ||
      currentQuestion.type === "geo_shape");

  const submitLockedClass =
    hasLockedAnswer && phase === "question"
      ? "bg-emerald-600 text-white shadow-emerald-500/40"
      : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center w-full max-w-md mx-auto px-1 sm:px-0">
      <div className="mb-3 flex w-full items-center justify-between gap-2 rounded-full bg-white/60 px-3 py-2 shadow-sm backdrop-blur-md sm:mb-6 sm:px-6 sm:py-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-sm sm:tracking-widest">
          Q. {currentIndex + 1}/{questions.length}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600 sm:gap-2 sm:px-3 sm:py-1 sm:text-sm">
          <span>{currentQuestion.points} pts</span>
          <span className="text-slate-400">·</span>
          <span className="tabular-nums text-slate-600">{currentScores[myPlayerId] || 0}</span>
        </span>
      </div>

      <motion.div
        key={`q-${currentQuestion.id}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative mb-4 w-full overflow-hidden rounded-2xl bg-white/90 p-4 text-center shadow-md sm:mb-8 sm:rounded-[2rem] sm:p-8"
      >
        <div className="absolute top-0 left-0 h-2 bg-slate-100 w-full">
          <motion.div
            className={`h-full ${timeLeft <= 3 && phase === "question" ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
            initial={{ width: "100%" }}
            animate={{ width: phase === "reveal" ? "0%" : `${(timeLeft / duration) * 100}%` }}
            transition={{ ease: "linear", duration: phase === "reveal" ? 0.3 : 1 }}
          />
        </div>

        <span className="mb-2 mt-1 block text-3xl sm:mb-4 sm:mt-2 sm:text-4xl">
          {phase === "reveal"
            ? isMinibac
              ? "🎭"
              : myPoints > 0
                ? "🎉"
                : "😭"
            : timeLeft <= 3
              ? "⏳"
              : "🤔"}
        </span>
        <h2 className="text-lg font-bold leading-snug text-slate-800 sm:text-2xl">{currentQuestion.question}</h2>
        {geoImageUrl && (
          <div className="mt-4 flex justify-center">
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={geoImageUrl}
                alt=""
                className={`mx-auto max-h-[min(42vw,200px)] w-auto object-contain sm:max-h-[220px] ${isGeoShape ? "p-2" : ""}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex w-full min-h-0 flex-1 flex-col gap-2 pb-1 sm:gap-3 sm:pb-0">
        {isTextBased ? (
          <div className="flex-1 flex flex-col gap-4 w-full">
            {/* --- PHASE DE QUESTION : On affiche les champs de saisie --- */}
            {phase === "question" ? (
              <>
                {isMinibac ? (
                  <>
                    <div className="flex items-center justify-center gap-3 rounded-2xl bg-violet-50/80 px-4 py-3 border border-violet-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Lettre</span>
                      <span className="text-5xl font-black leading-none text-violet-600 tabular-nums">
                        {currentQuestion.letter}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {(currentQuestion.categories ?? []).map((cat, i) => (
                        <div key={i} className="flex flex-col gap-1 text-left min-w-0">
                          <label className="text-[11px] font-bold text-slate-500 leading-tight line-clamp-2">
                            {cat}
                          </label>
                          <input
                            type="text"
                            value={minibacValues[i] ?? ""}
                            onChange={(e) => {
                              const next = [...minibacValues];
                              next[i] = e.target.value;
                              setMinibacValues(next);
                            }}
                            disabled={hasLockedAnswer}
                            className="w-full text-base font-bold py-2.5 px-3 rounded-xl border border-slate-200 bg-white/95 focus:ring-2 focus:ring-violet-400 outline-none disabled:opacity-50"
                            placeholder="…"
                          />
                        </div>
                      ))}
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={handleMinibacSubmit}
                      disabled={
                        hasLockedAnswer ||
                        minibacValues.some((v) => !String(v).trim())
                      }
                      className={`w-full py-3.5 rounded-2xl font-bold text-lg transition ${submitLockedClass} disabled:opacity-50`}
                    >
                      {hasLockedAnswer ? "Réponse envoyée ✓" : "Valider ma grille"}
                    </motion.button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode={isEstimation || isDate ? "numeric" : "text"}
                      pattern={isEstimation || isDate ? "[0-9]*" : undefined}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={hasLockedAnswer}
                      placeholder={
                        isDate
                          ? "Année (ex. 1998)…"
                          : isEstimation
                            ? "Entre un nombre…"
                            : isGeo
                              ? "Nom du pays…"
                              : "Ta réponse…"
                      }
                      className="w-full text-center text-3xl font-bold py-6 rounded-2xl border-none shadow-inner bg-white/90 focus:ring-4 focus:ring-violet-400 outline-none disabled:opacity-50"
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTextSubmit}
                      disabled={hasLockedAnswer || inputValue.trim() === ""}
                      className={`w-full py-5 rounded-2xl font-bold text-xl transition ${submitLockedClass} disabled:opacity-50`}
                    >
                      {hasLockedAnswer ? "Réponse envoyée ✓" : "Valider"}
                    </motion.button>
                  </>
                )}
              </>
            ) : (
              /* --- PHASE DE REVEAL : On remplace la saisie par la réponse --- */
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex-1 flex flex-col justify-center items-center p-6 rounded-2xl bg-white/90 shadow-md text-center"
              >
                {isMinibac ? (
                  <>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Mini-Bac
                    </p>
                    <p className="text-slate-600 text-sm mb-3">
                      Points au Tribunal : <span className="font-bold text-violet-700">+{MINIBAC_POINTS_PER_CELL} pts</span>
                    </p>
                    {myMinibac && (
                      <div className="text-left mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-left w-full">
                        {(myMinibac.categories || []).map((c, i) => (
                          <p key={i} className="text-xs col-span-1">
                            <span className="font-semibold text-slate-500 block truncate" title={c}>
                              {c}
                            </span>
                            <span className="text-slate-800 font-bold">{myMinibac.values[i]}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                      {isDate ? "La bonne année" : isGeo ? "Le bon pays" : "La bonne réponse"}
                    </p>
                    
                    {/* Note: geoImageUrl supprimé ici car il est déjà affiché dans la carte du haut */}
                    
                    <p className="text-5xl font-black text-green-500 mb-6 drop-shadow-sm">
                      {String(currentQuestion.answer)}
                    </p>

                    {showPeerTextAnswers && players.some((p) => p.id !== myPlayerId) && (
                      <div className="w-full max-w-full rounded-xl border border-slate-100 bg-slate-50/95 px-3 py-2.5 text-left shadow-inner mb-4">
                        <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Les autres
                        </p>
                        <ul className="max-h-[120px] space-y-1.5 overflow-y-auto pr-0.5">
                          {players
                            .filter((p) => p.id !== myPlayerId)
                            .map((p) => {
                              const txt = answers[p.id];
                              return (
                                <li key={p.id} className="flex items-center gap-2">
                                  <PlayerFace player={p} className="h-5 w-5" />
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-[9px] font-semibold text-slate-400">
                                      {p.name}
                                    </span>
                                    <span className="line-clamp-1 text-xs font-bold leading-snug text-slate-800">
                                      {txt != null && String(txt).trim() !== "" ? txt : "—"}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}

                    <div className="h-px w-full bg-slate-200 my-4 opacity-50"></div>
                    <p className="text-sm font-bold text-slate-500">
                      Ton choix :{" "}
                      <span className={myPoints > 0 ? "text-green-500" : "text-red-500"}>
                        {effectiveChoice || "Rien"}
                      </span>
                    </p>
                    {myPoints > 0 && (
                      <p className="text-violet-600 font-bold text-2xl mt-1">+{myPoints} pts !</p>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          currentQuestion.options?.map((option, i) => {
            const isSelected = effectiveChoice === option;
            let revealClass = "bg-white text-slate-700 border-slate-100/50";

            if (phase === "reveal") {
              if (option === currentQuestion.answer)
                revealClass =
                  "bg-green-500 text-white shadow-green-500/50 scale-[1.02] border-green-400";
              else if (isSelected)
                revealClass = "bg-red-500 text-white shadow-red-500/50 opacity-80 border-red-400";
              else revealClass = "bg-slate-100 text-slate-400 opacity-40 border-slate-100";
            } else if (isSelected) {
              revealClass =
                "bg-violet-600 text-white shadow-violet-500/50 ring-4 ring-violet-200 border-violet-500";
            }

            const choiceLocked = localAnswer !== null || myAnswer !== null;

            const pickedHere = players.filter(
              (p) => String(answers[p.id] ?? "").trim() === String(option).trim(),
            );

            return (
              <motion.button
                key={i}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswerClick(option)}
                disabled={choiceLocked || phase !== "question"}
                className={`flex w-full flex-col items-stretch overflow-hidden rounded-xl border p-3.5 text-sm font-bold shadow-sm transition-all sm:rounded-2xl sm:p-5 sm:text-lg ${revealClass} ${!choiceLocked && phase === "question" ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-left leading-snug">{option}</span>
                  {phase === "reveal" && option === currentQuestion.answer && myPoints > 0 && (
                    <span className="shrink-0 text-base font-black text-white drop-shadow-md sm:text-lg">
                      +{myPoints}
                    </span>
                  )}
                </div>
                {phase === "reveal" && pickedHere.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1 border-t border-black/10 pt-2">
                    {pickedHere.map((p) => (
                      <PlayerFace key={p.id} player={p} className="h-6 w-6 sm:h-7 sm:w-7" />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })
        )}

        {phase === "question" ? (
          <p className="text-center font-bold mt-4 text-sm text-slate-500">
            {hasLockedAnswer ? "En attente des autres…" : "À toi de jouer !"}
            <span className="ml-2 bg-slate-200 px-2 py-1 rounded-md text-slate-700">
              {answeredCount}/{players.length}
            </span>
          </p>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center font-bold mt-4 text-sm text-slate-500 animate-pulse"
          >
            Prochaine question dans {revealTimeLeft}...
          </motion.p>
        )}
      </div>
    </div>
  );
}
