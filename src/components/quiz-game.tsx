"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { QuizQuestion } from "@/lib/quiz-bank";
import type { Player } from "@/lib/lobby-types";

type QuizGameProps = {
  roomCode: string;
  roomState: any;
  myPlayerId: string;
  isHost: boolean;
  players: Player[];
};

const QUESTION_DURATION = 15; // 15 secondes pour répondre

export default function QuizGame({ roomCode, roomState, myPlayerId, isHost, players }: QuizGameProps) {
  const questions: QuizQuestion[] = roomState?.game_data?.questions || [];
  const currentIndex = roomState?.current_question_index || 0;
  const currentQuestion = questions[currentIndex];

  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [phase, setPhase] = useState<"question" | "reveal">("question");

  // --- LE CHRONOMÈTRE ---
  useEffect(() => {
    if (phase !== "question") return;
    
    // Réinitialise le chrono quand la question change
    setTimeLeft(QUESTION_DURATION); 
    setSelectedAnswer(null);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase("reveal"); // Le temps est écoulé, on passe aux résultats !
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, phase]);

  const handleAnswerClick = (answer: string) => {
    if (selectedAnswer !== null || phase !== "question") return;
    setSelectedAnswer(answer);
    // TODO : Envoyer la réponse à Supabase plus tard !
  };

  if (!currentQuestion) return <div className="text-center p-8">Chargement de la question...</div>;

  return (
    <div className="flex flex-1 flex-col items-center w-full max-w-md mx-auto">
      
      {/* HEADER : Numéro de question */}
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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full bg-white/90 rounded-[2rem] p-8 shadow-md text-center mb-8 relative overflow-hidden"
      >
        {/* BARRE DE TEMPS */}
        <div className="absolute top-0 left-0 h-2 bg-slate-100 w-full">
          <motion.div 
            className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / QUESTION_DURATION) * 100}%` }}
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

      {/* LES RÉPONSES (QCM ou Vrai/Faux) */}
      <div className="w-full flex-1 flex flex-col gap-3">
        {(currentQuestion.type === "qcm" || currentQuestion.type === "true_false") && currentQuestion.options ? (
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              
              // Couleurs si on est dans la phase de révélation
              let revealClass = "bg-white text-slate-700";
              if (phase === "reveal") {
                if (option === currentQuestion.answer) revealClass = "bg-green-500 text-white shadow-green-500/50";
                else if (isSelected) revealClass = "bg-red-500 text-white shadow-red-500/50";
                else revealClass = "bg-slate-100 text-slate-400 opacity-50";
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
          <div className="flex-1 flex items-center justify-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-300">
             <p className="text-slate-500 font-medium">Clavier spécial à venir...</p>
          </div>
        )}
      </div>

    </div>
  );
}