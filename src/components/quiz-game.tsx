"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
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

// Durées dynamiques et optimisées
const GET_DURATION = (type: string) => {
  if (type === "true_false") return 8; 
  if (type === "qcm") return 12;
  return 15; // Estimation
};

const REVEAL_DURATION = 6; // 6 secondes pour lire la bonne réponse sans frustration

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const answers: Record<string, string> = roomState?.game_data?.answers || {};
  const currentIndex = roomState?.current_question_index || 0;
  const gameState = roomState?.game_state; 
  const currentQuestion = questions[currentIndex];

  const [timeLeft, setTimeLeft] = useState(15);
  const [revealTimeLeft, setRevealTimeLeft] = useState(REVEAL_DURATION);
  const [phase, setPhase] = useState<"question" | "reveal">("question");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 1. NOUVELLE QUESTION : On remet tout à zéro
  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;
    setPhase("question");
    setTimeLeft(GET_DURATION(currentQuestion.type));
    setRevealTimeLeft(REVEAL_DURATION);
    setInputValue("");
  }, [currentIndex, currentQuestion, gameState]);

  // 2. VÉRIFICATION AUTO-SKIP (Si tous les joueurs ont cliqué)
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount > 0 && answeredCount >= players.length;
  const myAnswer = answers[myPlayerId] || null;

  useEffect(() => {
    if (allAnswered && phase === "question" && gameState === "playing") {
      setPhase("reveal");
      setTimeLeft(0);
    }
  }, [allAnswered, phase, gameState]);

  // 3. CHRONO DE LA QUESTION
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

  // 4. CHRONO DE TRANSITION (Le fameux délai réparé !)
  useEffect(() => {
    if (phase !== "reveal" || gameState !== "playing") return;

    const timer = setInterval(() => {
      setRevealTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          
          // Seul l'hôte donne l'ordre de passer à la suite (pour éviter les doublons)
          if (isHost) {
            const nextIdx = currentIndex + 1;
            if (nextIdx >= questions.length) {
              endGameRemote(roomCode);
            } else {
              nextQuestionRemote(roomCode, nextIdx, questions);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, gameState, isHost, currentIndex, questions, roomCode]);


  // 5. ENVOI DE LA RÉPONSE (Textes ou Boutons)
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

  // --- ÉCRAN DE FIN ---
  if (gameState === "finished") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center w-full max-w-md mx-auto text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/90 p-8 rounded-[2rem] shadow-lg w-full">
          <h2 className="text-4xl font-bold mb-4">🏆 Fin du Jeu !</h2>
          <p className="text-slate-600 mb-8 font-medium">Le calcul des scores arrive bientôt...</p>
          
          <ul className="flex flex-col gap-3 mb-8">
            {players.map((p, i) => (
              <li key={p.id} className="bg-white py-3 px-4 rounded-xl font-bold text-slate-800 text-lg flex justify-between items-center shadow-sm border border-slate-100">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}</span>
                <span className="text-violet-600">0 pts</span>
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

  return (
    <div className="flex flex-1 flex-col items-center w-full max-w-md mx-auto">
      
      {/* HEADER */}
      <div className="w-full flex justify-between items-center mb-6 bg-white/60 px-6 py-3 rounded-full shadow-sm backdrop-blur-md">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span className="text-sm font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
          {currentQuestion.points} PTS
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
          {phase === "reveal" ? "🛑" : (timeLeft <= 3 ? "⏳" : "🤔")}
        </span>
        <h2 className="text-2xl font-bold text-slate-800 leading-snug">
          {currentQuestion.question}
        </h2>
      </motion.div>

      {/* ZONE DE RÉPONSES */}
      <div className="w-full flex-1 flex flex-col gap-3">
        
        {/* CAS 1 : C'est une question de Texte/Estimation */}
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

            {/* Révélation spéciale pour l'estimation */}
            {phase === "reveal" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-6 rounded-2xl bg-white/90 shadow-md text-center">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">La bonne réponse</p>
                <p className="text-4xl font-black text-green-500">{currentQuestion.answer}</p>
                <div className="h-px w-full bg-slate-200 my-4"></div>
                <p className="text-sm font-bold text-slate-500">Ton choix : <span className={myAnswer == currentQuestion.answer ? "text-green-500" : "text-red-500"}>{myAnswer || "Rien"}</span></p>
              </motion.div>
            )}
          </div>
        ) : (
          
          /* CAS 2 : C'est un QCM ou Vrai/Faux */
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