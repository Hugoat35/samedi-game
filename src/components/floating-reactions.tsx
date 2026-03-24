"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import type { Player } from "@/lib/lobby-types";
import type { RealtimeChannel } from "@supabase/supabase-js"; // Pour corriger l'erreur de type

const EMOJIS = ["😂", "🤯", "🤬", "🤨", "😭", "💩"];
const MESSAGES = ["Bien joué !", "Aïe...", "Vite !", "Je sèche..."];

interface FloatingReactionsProps {
  roomCode: string;
  myPlayerId: string;
  players: Player[];
}

interface ActiveEmoji {
  id: string;
  char: string;
  xOffset: number;
}

interface ActiveMessage {
  id: string;
  text: string;
  senderName: string;
}

export default function FloatingReactions({ roomCode, myPlayerId, players }: FloatingReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emojis, setEmojis] = useState<ActiveEmoji[]>([]);
  const [messages, setMessages] = useState<ActiveMessage[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null); // État pour le canal stable
  const constraintsRef = useRef<HTMLDivElement>(null);

  // RÉFÉRENCE STABLE : Évite de couper la connexion quand les scores changent
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Écoute des messages en temps réel (Broadcast)
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !roomCode) return;

    // On crée un canal unique et stable
    const newChannel = supabase.channel(`reactions:${roomCode}`, {
      config: { broadcast: { self: false } }, // On ne reçoit pas ses propres messages (gérés en local)
    });

    newChannel
      .on("broadcast", { event: "reaction" }, (payload) => {
        // Correction de l'accès au payload
        const { type, content, senderId } = payload.payload || payload; 
        const sender = playersRef.current.find((p) => p.id === senderId);
        const senderName = sender ? sender.name : "Quelqu'un";

        if (type === "emoji") {
          setEmojis((prev) => [
            ...prev,
            { id: Math.random().toString(), char: content, xOffset: Math.random() * 60 - 30 },
          ]);
        } else if (type === "message") {
          const id = Math.random().toString();
          const newMsg = { id, text: content, senderName };
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== id));
          }, 3000);
        }
      })
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [roomCode]); // On ne dépend plus de "players" ici

  // Fonction pour envoyer une réaction
  const sendReaction = async (type: "emoji" | "message", content: string) => {
    setIsOpen(false);
    
    // 1. Optimistic UI : On l'affiche pour nous immédiatement
    if (type === "emoji") {
      setEmojis((prev) => [
        ...prev,
        { id: Math.random().toString(), char: content, xOffset: Math.random() * 60 - 30 },
      ]);
    } else if (type === "message") {
      const myName = playersRef.current.find((p) => p.id === myPlayerId)?.name || "Moi";
      const id = Math.random().toString();
      const newMsg = { id, text: content, senderName: myName };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), 3000);
    }

    // 2. Envoi via le canal stable (beaucoup plus rapide)
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "reaction",
        payload: { type, content, senderId: myPlayerId },
      });
    }
  };

  return (
    <>
      {/* CAGE INVISIBLE */}
      <div ref={constraintsRef} className="pointer-events-none fixed inset-4 z-40 sm:inset-8" />

      {/* ZONE DES EMOJIS VOLANTS */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center overflow-hidden pb-32">
        <AnimatePresence>
          {emojis.map((emoji) => (
            <motion.div
              key={emoji.id}
              initial={{ opacity: 0, y: 50, x: emoji.xOffset, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -400, x: emoji.xOffset + (Math.random() * 40 - 20), scale: 2 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              onAnimationComplete={() => setEmojis((prev) => prev.filter((e) => e.id !== emoji.id))}
              className="absolute text-5xl drop-shadow-lg"
            >
              {emoji.char}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ZONE DES MESSAGES RAPIDES */}
      <div className="pointer-events-none fixed left-0 right-0 top-16 z-[100] flex flex-col items-center gap-2">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm"
            >
              <span className="text-violet-300">{msg.senderName} :</span> {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* BOUTON DÉPLAÇABLE ET MENU */}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.1}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              // absolute et origin-bottom-right corrigent le "saut" visuel
              className="absolute bottom-[calc(100%+12px)] right-0 origin-bottom-right flex w-64 flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md"
            >
              {/* Emojis */}
              <div className="flex justify-between gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction("emoji", emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg transition hover:bg-violet-100 hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="h-px w-full bg-slate-200" />
              {/* Textes */}
              <div className="grid grid-cols-2 gap-2">
                {MESSAGES.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => sendReaction("message", msg)}
                    className="rounded-lg bg-slate-100 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-violet-100 hover:text-violet-700 active:scale-95 sm:text-xs"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onTap={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl text-white shadow-lg transition active:scale-95 sm:h-14 sm:w-14 sm:text-2xl"
          style={{ touchAction: "none" }}
        >
          {isOpen ? "✕" : "💬"}
        </motion.button>
      </motion.div>
    </>
  );
}