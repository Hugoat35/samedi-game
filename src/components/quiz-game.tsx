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

// Durées rapides et dynamiques !
const GET_DURATION = (type: string) => {
  if (type === "true_false") return 5;
  if (type === "qcm") return 10;
  return 15; // Estimation et Ouverte
};

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const answers: Record<string, string> = roomState?.game_data?.answers || {};
  const currentIndex = roomState?.current_question_index || 0;
  const gameState = roomState?.game_state; 
  const currentQuestion = questions[currentIndex];

  const [timeLeft, setTimeLeft] = useState(15);
  const [phase, setPhase] = useState<"question" | "reveal">("question");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. NOUVELLE QUESTION : On réinitialise
  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;
    setPhase("question");
    setTimeLeft(GET_DURATION(currentQuestion.type));
  }, [currentIndex, currentQuestion, gameState]);

  // 2. VÉRIFICATION AUTO-SKIP (La Magie !)
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount > 0 && answeredCount >= players.length;
  const myAnswer = answers[myPlayerId] || null;

  useEffect(() => {
    // Dès que le dernier joueur a cliqué, on coupe le chrono instantanément !
    if (allAnswered && phase === "question" && gameState === "playing") {
      setPhase("reveal");
      setTimeLeft(0);
    }
  }, [allAnswered, phase, gameState]);

  // 3. LE CHRONOMÈTRE
  useEffect(() => {
    // Si tout le monde a répondu, on arrête de faire tourner le chrono
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

  // 4. LE PASSAGE AUTO À LA SUITE (Géré par l'hôte)
  useEffect(() => {
    if (phase === "reveal" && isHost && gameState === "playing") {
      const transitionTimer = setTimeout(async () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx >= questions.length) {
          await endGameRemote(roomCode);
        } else {
          // On passe à la suivante et on informe la DB qu'on doit garder les questions actuelles
          await nextQuestionRemote(roomCode, nextIdx, questions);
        }
      }, 4000); // 4 petites secondes de révélation

      return () => clearTimeout(transitionTimer);
    }
  }, [phase, isHost, currentIndex, questions.length, roomCode, gameState, questions]);


  // 5. ENVOI DE LA RÉPONSE VERS LA BASE DE DONNÉES
  const handleAnswerClick = async (answer: string) => {
    if (myAnswer !== null || phase !== "question" || isSubmitting) return;
    setIsSubmitting(true);
    
    const supabase = getSupabaseBrowser();
    if (supabase) {
      // On va chercher les réponses actuelles pour ajouter la nôtre
      const { data } = await supabase.from("rooms").select("game_data").eq("code", roomCode).single();
      const gameData = data?.game_data || {};
      const currentAnswers = gameData.answers || {};
      
      currentAnswers[myPlayerId] = answer;
      
      // On renvoie le tout mis à jour !
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
              <li key={p.id} className="bg-slate-100 py-3 px-4 rounded-xl font-bold text-slate-800 text-lg flex justify-between items-center">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👏"} {p.name}</span>
                <span className="text-violet-600">0 pts</span>
              </li>
            ))}
          </ul>

          {isHost ? (
            <button onClick={handleReturnLobby} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition">
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

      {/* LES RÉPONSES */}
      <div className="w-full flex-1 flex flex-col gap-3">
        {(currentQuestion.type === "qcm" || currentQuestion.type === "true_false") && currentQuestion.options ? (
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, i) => {
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
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center">
             <span className="text-4xl mb-2">🔢</span>
             <p className="text-slate-500 font-bold">L'écran pour taper un chiffre arrive très bientôt !</p>
          </div>
        )}

        {/* --- NOUVEAU : LE COMPTEUR DE RÉPONSES --- */}
        {phase === "question" && (
          <p className="text-center font-bold mt-4 text-sm text-slate-500 animate-pulse">
            {myAnswer 
              ? `En attente des autres... (${answeredCount}/${players.length})` 
              : `Réponses : ${answeredCount}/${players.length}`}
          </p>
        )}

      </div>

    </div>
  );
}