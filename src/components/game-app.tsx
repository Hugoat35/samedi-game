"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { QuizQuestion } from "@/lib/quiz-bank";
import type { Player } from "@/lib/lobby-types";
import { nextQuestionRemote, endGameRemote, returnToLobbyRemote } from "@/lib/lobby-remote";

type QuizGameProps = {
  roomCode: string;
  roomState: any;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

// Durées dynamiques selon le type de question
const GET_DURATION = (type: string) => {
  if (type === "true_false") return 5;
  if (type === "qcm") return 10;
  return 15; // Estimation et Ouverte
};

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const currentIndex = roomState?.current_question_index || 0;
  const gameState = roomState?.game_state; // 'playing' ou 'finished'
  const currentQuestion = questions[currentIndex];

  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [phase, setPhase] = useState<"question" | "reveal">("question");

  // 1. DÉTECTER LE CHANGEMENT DE QUESTION
  // Quand la base de données met à jour la question, on réinitialise l'écran
  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;
    
    setPhase("question");
    setSelectedAnswer(null);
    setTimeLeft(GET_DURATION(currentQuestion.type));
  }, [currentIndex, currentQuestion, gameState]);

  // 2. LE CHRONOMÈTRE
  useEffect(() => {
    if (phase !== "question" || gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase("reveal"); // Temps écoulé !
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, gameState]);

  // 3. LE CHEF D'ORCHESTRE (L'Hôte gère la transition)
  useEffect(() => {
    // Seul l'hôte a le droit de donner des ordres à la base de données
    if (phase === "reveal" && isHost && gameState === "playing") {
      const transitionTimer = setTimeout(async () => {
        const nextIdx = currentIndex + 1;
        
        // Si c'était la dernière question, on termine le jeu
        if (nextIdx >= questions.length) {
          await endGameRemote(roomCode);
        } else {
          // Sinon, on passe à la suivante
          await nextQuestionRemote(roomCode, nextIdx);
        }
      }, 5000); // 5 secondes pour lire la bonne réponse

      return () => clearTimeout(transitionTimer);
    }
  }, [phase, isHost, currentIndex, questions.length, roomCode, gameState]);


  const handleAnswerClick = (answer: string) => {
    if (selectedAnswer !== null || phase !== "question") return;
    setSelectedAnswer(answer);
  };

  const handleReturnLobby = async () => {
    if (isHost) await returnToLobbyRemote(roomCode);
  };

  // --- ÉCRAN DE FIN (PODIUM) ---
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

  // --- SÉCURITÉ CHARGEMENT ---
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
            className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / duration) * 100}%` }}
            transition={{ ease: "linear", duration: 1 }}
          />
        </div>

        <span className="block text-4xl mb-4 mt-2">
          {timeLeft > 0 ? (timeLeft <= 3 ? "⏳" : "🤔") : "🛑"}
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
              const isSelected = selectedAnswer === option;
              
              let revealClass = "bg-white text-slate-700";
              if (phase === "reveal") {
                if (option === currentQuestion.answer) revealClass = "bg-green-500 text-white shadow-green-500/50 scale-[1.02] border-green-400";
                else if (isSelected) revealClass = "bg-red-500 text-white shadow-red-500/50 opacity-80";
                else revealClass = "bg-slate-100 text-slate-400 opacity-40";
              } else if (isSelected) {
                revealClass = "bg-violet-600 text-white shadow-violet-500/50 ring-4 ring-violet-200";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswerClick(option)}
                  disabled={selectedAnswer !== null || phase !== "question"}
                  className={`relative overflow-hidden w-full p-5 rounded-2xl text-lg font-bold transition-all shadow-sm border border-slate-100/50 ${revealClass} ${selectedAnswer === null && phase === "question" ? "hover:scale-[1.02] active:scale-95 hover:shadow-md" : ""}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center">
             <span className="text-4xl mb-2">🔢</span>
             <p className="text-slate-500 font-bold">L'écran pour taper un chiffre ou du texte arrive très bientôt !</p>
          </div>
        )}
      </div>

    </div>
  );
}