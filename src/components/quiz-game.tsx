"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
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
import { levenshtein, normalizeAnswer } from "@/lib/levenshtein";

type QuizGameProps = {
  roomCode: string;
  roomState: any;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

const GET_DURATION = (type: string) => {
  if (type === "true_false") return 8;
  if (type === "qcm") return 12;
  if (type === "date") return 12;
  if (type === "minibac") return 90;
  return 15;
};

const REVEAL_DURATION = 6;

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
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [minibacValues, setMinibacValues] = useState(["", "", "", ""]);

  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;
    setPhase("question");
    setTimeLeft(GET_DURATION(currentQuestion.type));
    setRevealTimeLeft(REVEAL_DURATION);
    setInputValue("");
    setMinibacValues(["", "", "", ""]);
    setLocalSubmitted(false);
  }, [currentQuestion?.id, gameState]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount > 0 && answeredCount >= players.length;
  const myAnswer = answers[myPlayerId] ?? null;
  const hasLockedAnswer = localSubmitted || myAnswer !== null;

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
          setPhase("reveal");
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

    if (currentQuestion.type === "minibac") {
      return earned;
    }

    if (currentQuestion.type === "estimation") {
      const validAnswers = Object.entries(answers)
        .map(([pId, ans]) => ({
          pId,
          val: Number(ans),
          dist: Math.abs(Number(ans) - Number(currentQuestion.answer)),
        }))
        .filter((a) => !isNaN(a.val));
      validAnswers.sort((a, b) => a.dist - b.dist);
      const pointsDistribution = [100, 80, 60, 40, 20];
      validAnswers.forEach((ans, idx) => {
        earned[ans.pId] =
          ans.dist === 0 ? currentQuestion.points + 50 : pointsDistribution[idx] || 0;
      });
      return earned;
    }

    if (currentQuestion.type === "date") {
      const correct = Number(currentQuestion.answer);
      Object.entries(answers).forEach(([pId, ans]) => {
        const y = parseYear(ans);
        if (y === null) return;
        const d = Math.abs(y - correct);
        if (d === 0) earned[pId] = pts;
        else if (d <= 3) earned[pId] = Math.floor(pts * 0.5);
      });
      return earned;
    }

    if (currentQuestion.type === "open") {
      const expected = normalizeAnswer(String(currentQuestion.answer));
      Object.entries(answers).forEach(([pId, ans]) => {
        const got = normalizeAnswer(String(ans));
        if (levenshtein(got, expected) <= 2) earned[pId] = pts;
      });
      return earned;
    }

    Object.entries(answers).forEach(([pId, ans]) => {
      if (
        String(ans).trim().toLowerCase() === String(currentQuestion.answer).trim().toLowerCase()
      ) {
        earned[pId] = pts;
      }
    });
    return earned;
  }, [phase, answers, currentQuestion]);

  useEffect(() => {
    if (phase !== "reveal" || gameState !== "playing") return;

    const timer = setInterval(() => {
      setRevealTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          if (isHost) {
            const newTotalScores = { ...currentScores };
            Object.entries(pointsEarnedThisRound).forEach(([pId, p]) => {
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

    return () => clearInterval(timer);
  }, [phase, gameState, isHost, currentIndex, questions, roomCode, currentScores, pointsEarnedThisRound]);

  const handleAnswerClick = async (answer: string | number) => {
    const answerStr = String(answer).trim();
    if (!currentQuestion) return;
    if (hasLockedAnswer || phase !== "question" || !answerStr) return;

    setLocalSubmitted(true);
    const res = await submitAnswerRemote(roomCode, myPlayerId, {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      answerStr,
    });
    if (!res.ok) setLocalSubmitted(false);
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
      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-md mx-auto text-center px-2">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/95 p-8 rounded-[2rem] shadow-lg w-full border border-violet-100"
        >
          <h2 className="text-3xl font-black text-slate-900 mb-2">⚖️ Le Tribunal</h2>
          <p className="text-slate-600 mb-2 text-sm font-medium leading-snug">
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
                <p className="text-slate-500 font-bold animate-pulse">Les autres votent…</p>
              ) : (
                <div className="flex gap-3 justify-center">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote("accept")}
                    disabled={!!votesForGrid[myPlayerId]}
                    className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-md transition ${
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
                    className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-md transition ${
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
                <div className="mt-8 flex flex-col gap-3">
                  <p className="text-xs text-slate-400">
                    Votes : {Object.keys(votesForGrid).length}/{voters.length}
                    {allVotersDone ? " ✓" : ""}
                  </p>
                  {tribunalCursor < tribunalQueue.length - 1 ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => advanceTribunalRemote(roomCode)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg"
                    >
                      Réponse suivante
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => finishTribunalRemote(roomCode)}
                      className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold text-lg"
                    >
                      Terminer le Tribunal — Voir le podium
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
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-bold text-lg mt-4"
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
      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 p-8 rounded-[2rem] shadow-lg w-full"
        >
          <h2 className="text-4xl font-bold mb-4">🏆 Fin du Jeu !</h2>
          <p className="text-slate-600 mb-8 font-medium">Voici les résultats finaux :</p>

          <ul className="flex flex-col gap-3 mb-8">
            {sortedPlayers.map((p, i) => (
              <li
                key={p.id}
                className="bg-white py-4 px-5 rounded-2xl font-bold text-slate-800 text-lg flex justify-between items-center shadow-sm border border-slate-100 relative overflow-hidden"
              >
                {i === 0 && <div className="absolute inset-0 bg-yellow-100/50"></div>}
                <span className="relative z-10">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}
                </span>
                <span className="text-violet-600 text-xl relative z-10">{currentScores[p.id] || 0} pts</span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleReturnLobby}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition shadow-lg"
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

  const duration = GET_DURATION(currentQuestion.type);
  const isTextBased =
    currentQuestion.type === "estimation" ||
    currentQuestion.type === "open" ||
    currentQuestion.type === "date" ||
    currentQuestion.type === "minibac";
  const isEstimation = currentQuestion.type === "estimation";
  const isDate = currentQuestion.type === "date";
  const isMinibac = currentQuestion.type === "minibac";
  const myPoints = pointsEarnedThisRound[myPlayerId] || 0;
  const myMinibac = parseMinibacAnswer(myAnswer);

  const submitLockedClass =
    hasLockedAnswer && phase === "question"
      ? "bg-emerald-600 text-white shadow-emerald-500/40"
      : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg";

  return (
    <div className="flex flex-1 flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full flex justify-between items-center mb-6 bg-white/60 px-6 py-3 rounded-full shadow-sm backdrop-blur-md">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span className="text-sm font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full flex gap-2">
          {currentQuestion.points} PTS
          <span className="text-slate-400">| Score: {currentScores[myPlayerId] || 0}</span>
        </span>
      </div>

      <motion.div
        key={`q-${currentQuestion.id}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full bg-white/90 rounded-[2rem] p-8 shadow-md text-center mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-2 bg-slate-100 w-full">
          <motion.div
            className={`h-full ${timeLeft <= 3 && phase === "question" ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
            initial={{ width: "100%" }}
            animate={{ width: phase === "reveal" ? "0%" : `${(timeLeft / duration) * 100}%` }}
            transition={{ ease: "linear", duration: phase === "reveal" ? 0.3 : 1 }}
          />
        </div>

        <span className="block text-4xl mb-4 mt-2">
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
        <h2 className="text-2xl font-bold text-slate-800 leading-snug">{currentQuestion.question}</h2>
      </motion.div>

      <div className="w-full flex-1 flex flex-col gap-3">
        {isTextBased ? (
          <div className="flex-1 flex flex-col gap-4 w-full">
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
                        disabled={hasLockedAnswer || phase !== "question"}
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
                    phase !== "question" ||
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
                  disabled={hasLockedAnswer || phase !== "question"}
                  placeholder={
                    isDate
                      ? "Année (ex. 1998)…"
                      : isEstimation
                        ? "Entre un nombre…"
                        : "Ta réponse…"
                  }
                  className="w-full text-center text-3xl font-bold py-6 rounded-2xl border-none shadow-inner bg-white/90 focus:ring-4 focus:ring-violet-400 outline-none disabled:opacity-50"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTextSubmit}
                  disabled={hasLockedAnswer || phase !== "question" || inputValue.trim() === ""}
                  className={`w-full py-5 rounded-2xl font-bold text-xl transition ${submitLockedClass} disabled:opacity-50`}
                >
                  {hasLockedAnswer ? "Réponse envoyée ✓" : "Valider"}
                </motion.button>
              </>
            )}

            {phase === "reveal" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-6 rounded-2xl bg-white/90 shadow-md text-center"
              >
                {isMinibac ? (
                  <>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Mini-Bac
                    </p>
                    <p className="text-slate-600 text-sm mb-3">
                      Points au Tribunal : <span className="font-bold text-violet-700">+{MINIBAC_POINTS_PER_CELL} pts</span>{" "}
                      par réponse acceptée.
                    </p>
                    {myMinibac && (
                      <div className="text-left mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-left">
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
                      {isDate ? "La bonne année" : "La bonne réponse"}
                    </p>
                    <p className="text-4xl font-black text-green-500">{String(currentQuestion.answer)}</p>
                    <div className="h-px w-full bg-slate-200 my-4"></div>
                    <p className="text-sm font-bold text-slate-500">
                      Ton choix :{" "}
                      <span className={myPoints > 0 ? "text-green-500" : "text-red-500"}>
                        {myAnswer || "Rien"}
                      </span>
                    </p>
                    {myPoints > 0 && (
                      <p className="text-violet-600 font-bold text-xl mt-2">+{myPoints} points !</p>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          currentQuestion.options?.map((option, i) => {
            const isSelected = myAnswer === option;
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

            return (
              <motion.button
                key={i}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswerClick(option)}
                disabled={hasLockedAnswer || phase !== "question"}
                className={`relative overflow-hidden w-full p-5 rounded-2xl text-lg font-bold transition-all shadow-sm border ${revealClass} ${!hasLockedAnswer && phase === "question" ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}
              >
                {option}
                {phase === "reveal" && option === currentQuestion.answer && myPoints > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-black drop-shadow-md">
                    +{myPoints}
                  </span>
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
