"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import type { QuizQuestion } from "@/lib/quiz-bank";
import type { Player } from "@/lib/lobby-types";
import { nextQuestionRemote, endGameRemote, returnToLobbyRemote } from "@/lib/lobby-remote";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

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
  return 15; 
};

const REVEAL_DURATION = 6;

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const answers: Record<string, string> = roomState?.game_data?.answers || {};
  const currentScores: Record<string, number> = roomState?.game_data?.scores || {};
  const currentIndex = roomState?.current_question_index || 0;
  const gameState = roomState?.game_state; 
  const currentQuestion = questions[currentIndex];

  const [timeLeft, setTimeLeft] = useState(15);
  const [revealTimeLeft, setRevealTimeLeft] = useState(REVEAL_DURATION);
  const [phase, setPhase] = useState<"question" | "reveal">("question");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 1. CORRECTION DU BUG 1 & 2 : On ne remet à zéro QUE quand l'ID de la question change !
  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;
    setPhase("question");
    setTimeLeft(GET_DURATION(currentQuestion.type));
    setRevealTimeLeft(REVEAL_DURATION);
    setInputValue("");
  }, [currentIndex, currentQuestion?.id, gameState]); // Le secret est ici : dépendance stricte à l'ID !

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount > 0 && answeredCount >= players.length;
  const myAnswer = answers[myPlayerId] || null;

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


  // 2. LE MOTEUR DE CALCUL DES POINTS (Local)
  const pointsEarnedThisRound = useMemo(() => {
    if (phase !== "reveal" || !currentQuestion) return {};
    const earned: Record<string, number> = {};

    if (currentQuestion.type === "estimation") {
      // Calculer la distance pour chaque joueur
      const validAnswers = Object.entries(answers).map(([pId, ans]) => ({
        pId, val: Number(ans), dist: Math.abs(Number(ans) - Number(currentQuestion.answer))
      })).filter(a => !isNaN(a.val));

      // Trier du plus proche au plus éloigné
      validAnswers.sort((a, b) => a.dist - b.dist);
      const pointsDistribution = [100, 80, 60, 40, 20]; // Les points par position
      
      validAnswers.forEach((ans, idx) => {
        earned[ans.pId] = ans.dist === 0 ? currentQuestion.points + 50 : (pointsDistribution[idx] || 0); // Bonus +50 si tout pile
      });
    } else {
      // QCM / TrueFalse / Open Text (Tolérance à la casse)
      Object.entries(answers).forEach(([pId, ans]) => {
        if (String(ans).trim().toLowerCase() === String(currentQuestion.answer).trim().toLowerCase()) {
          earned[pId] = currentQuestion.points;
        }
      });
    }
    return earned;
  }, [phase, answers, currentQuestion]);


  // 3. LE MAÎTRE DU JEU (L'hôte met à jour la base avec les scores additionnés)
  useEffect(() => {
    if (phase !== "reveal" || gameState !== "playing") return;

    const timer = setInterval(() => {
      setRevealTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          
          if (isHost) {
            // Additionner les anciens scores avec les nouveaux
            const newTotalScores = { ...currentScores };
            Object.entries(pointsEarnedThisRound).forEach(([pId, pts]) => {
              newTotalScores[pId] = (newTotalScores[pId] || 0) + pts;
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
    if (myAnswer !== null || phase !== "question" || isSubmitting || !answerStr) return;
    
    setIsSubmitting(true);
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { data } = await supabase.from("rooms").select("game_data").eq("code", roomCode).single();
      const gameData = data?.game_data || {};
      const currentAnswers = gameData.answers || {};
      currentAnswers[myPlayerId] = answerStr;
      await supabase.from("rooms").update({ 
        game_data: { ...gameData, answers: currentAnswers } 
      }).eq("code", roomCode);
    }
    setIsSubmitting(false);
  };

  const handleReturnLobby = async () => {
    if (isHost) await returnToLobbyRemote(roomCode);
  };

  // --- LE PODIUM DE FIN (Trie les joueurs par leur score !) ---
  if (gameState === "finished") {
    const sortedPlayers = [...players].sort((a, b) => (currentScores[b.id] || 0) - (currentScores[a.id] || 0));

    return (
      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-md mx-auto text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/90 p-8 rounded-[2rem] shadow-lg w-full">
          <h2 className="text-4xl font-bold mb-4">🏆 Fin du Jeu !</h2>
          <p className="text-slate-600 mb-8 font-medium">Voici les résultats finaux :</p>
          
          <ul className="flex flex-col gap-3 mb-8">
            {sortedPlayers.map((p, i) => (
              <li key={p.id} className="bg-white py-4 px-5 rounded-2xl font-bold text-slate-800 text-lg flex justify-between items-center shadow-sm border border-slate-100 relative overflow-hidden">
                {i === 0 && <div className="absolute inset-0 bg-yellow-100/50"></div>}
                <span className="relative z-10">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}</span>
                <span className="text-violet-600 text-xl relative z-10">{currentScores[p.id] || 0} pts</span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <button onClick={handleReturnLobby} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition shadow-lg">
              Retour au Salon
            </button>
          ) : (
            <p className="text-slate-400 font-bold animate-pulse">L'hôte va vous ramener au salon...</p>
          )}
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return <div className="text-center p-8 text-slate-500 font-bold">Chargement...</div>;

  const duration = GET_DURATION(currentQuestion.type);
  const isTextBased = currentQuestion.type === "estimation" || currentQuestion.type === "open";
  const isEstimation = currentQuestion.type === "estimation";
  const myPoints = pointsEarnedThisRound[myPlayerId] || 0;

  return (
    <div className="flex flex-1 flex-col items-center w-full max-w-md mx-auto">
      
      {/* HEADER */}
      <div className="w-full flex justify-between items-center mb-6 bg-white/60 px-6 py-3 rounded-full shadow-sm backdrop-blur-md">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span className="text-sm font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full flex gap-2">
          {currentQuestion.points} PTS
          {/* Affiche le score en direct du joueur */}
          <span className="text-slate-400">| Score: {currentScores[myPlayerId] || 0}</span>
        </span>
      </div>

      {/* LA QUESTION */}
      <motion.div 
        key={`q-${currentIndex}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full bg-white/90 rounded-[2rem] p-8 shadow-md text-center mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 h-2 bg-slate-100 w-full">
          <motion.div 
            className={`h-full ${timeLeft <= 3 && phase === "question" ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
            initial={{ width: "100%" }}
            animate={{ width: phase === "reveal" ? "0%" : `${(timeLeft / duration) * 100}%` }}
            transition={{ ease: "linear", duration: phase === "reveal" ? 0.3 : 1 }}
          />
        </div>

        <span className="block text-4xl mb-4 mt-2">
          {phase === "reveal" ? (myPoints > 0 ? "🎉" : "😭") : (timeLeft <= 3 ? "⏳" : "🤔")}
        </span>
        <h2 className="text-2xl font-bold text-slate-800 leading-snug">
          {currentQuestion.question}
        </h2>
      </motion.div>

      {/* ZONE DE RÉPONSES */}
      <div className="w-full flex-1 flex flex-col gap-3">
        
        {isTextBased ? (
          <div className="flex-1 flex flex-col gap-4 w-full">
            <input
              type="text"
              inputMode={isEstimation ? "numeric" : "text"}
              pattern={isEstimation ? "[0-9]*" : undefined}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={myAnswer !== null || phase !== "question"}
              placeholder={isEstimation ? "Entre un nombre..." : "Ta réponse..."}
              className="w-full text-center text-3xl font-bold py-6 rounded-2xl border-none shadow-inner bg-white/90 focus:ring-4 focus:ring-violet-400 outline-none disabled:opacity-50"
            />
            <button
              onClick={() => handleAnswerClick(inputValue)}
              disabled={myAnswer !== null || phase !== "question" || inputValue.trim() === ""}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xl shadow-lg disabled:opacity-50 transition hover:scale-[1.02] active:scale-95"
            >
              {myAnswer !== null ? "Réponse envoyée ✅" : "Valider"}
            </button>

            {/* Révélation Estimation */}
            {phase === "reveal" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-6 rounded-2xl bg-white/90 shadow-md text-center">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">La bonne réponse</p>
                <p className="text-4xl font-black text-green-500">{currentQuestion.answer}</p>
                <div className="h-px w-full bg-slate-200 my-4"></div>
                <p className="text-sm font-bold text-slate-500">Ton choix : <span className={myPoints > 0 ? "text-green-500" : "text-red-500"}>{myAnswer || "Rien"}</span></p>
                {myPoints > 0 && <p className="text-violet-600 font-bold text-xl mt-2">+{myPoints} points !</p>}
              </motion.div>
            )}
          </div>
        ) : (
          
          /* Révélation QCM */
          currentQuestion.options?.map((option, i) => {
            const isSelected = myAnswer === option;
            let revealClass = "bg-white text-slate-700 border-slate-100/50";
            
            if (phase === "reveal") {
              if (option === currentQuestion.answer) revealClass = "bg-green-500 text-white shadow-green-500/50 scale-[1.02] border-green-400";
              else if (isSelected) revealClass = "bg-red-500 text-white shadow-red-500/50 opacity-80 border-red-400";
              else revealClass = "bg-slate-100 text-slate-400 opacity-40 border-slate-100";
            } else if (isSelected) {
              revealClass = "bg-violet-600 text-white shadow-violet-500/50 ring-4 ring-violet-200 border-violet-500";
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswerClick(option)}
                disabled={myAnswer !== null || phase !== "question"}
                className={`relative overflow-hidden w-full p-5 rounded-2xl text-lg font-bold transition-all shadow-sm border ${revealClass} ${myAnswer === null && phase === "question" ? "hover:scale-[1.02] active:scale-95 hover:shadow-md cursor-pointer" : "cursor-default"}`}
              >
                {option}
                {/* Affiche les points gagnés directement sur le bon bouton */}
                {phase === "reveal" && option === currentQuestion.answer && myPoints > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-black drop-shadow-md">+{myPoints}</span>
                )}
              </button>
            );
          })
        )}

        {/* --- LE COMPTEUR DE RÉPONSES ET LE CHRONO DE SUITE --- */}
        {phase === "question" ? (
          <p className="text-center font-bold mt-4 text-sm text-slate-500">
            {myAnswer ? "En attente des autres..." : "À toi de jouer !"} 
            <span className="ml-2 bg-slate-200 px-2 py-1 rounded-md text-slate-700">{answeredCount}/{players.length}</span>
          </p>
        ) : (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-bold mt-4 text-sm text-slate-500 animate-pulse">
            Prochaine question dans {revealTimeLeft}...
          </motion.p>
        )}

      </div>
    </div>
  );
}