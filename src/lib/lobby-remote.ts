import type { Player } from "@/lib/lobby-types";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { generateBombConstraint, type BombConstraint } from "./questions/bomb";
import { getRandomQuestionsByTheme, type QuestionDifficulty } from "./quiz-bank";



export type { Player };

const MAX_CODE_ATTEMPTS = 40;

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createRoomRemote(playerName: string, avatar: string): Promise<
  | { ok: true; code: string; players: Player[]; myPlayerId: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  for (let a = 0; a < MAX_CODE_ATTEMPTS; a++) {
    const code = randomCode();
    const { error: roomErr } = await supabase.from("rooms").insert({ code });

    if (roomErr) {
      if (roomErr.code === "23505") continue;
      return { ok: false, error: roomErr.message };
    }

    const { data: inserted, error: playerErr } = await supabase
      .from("lobby_players")
      .insert({ room_code: code, display_name: playerName, avatar })
      .select("id, display_name, avatar")
      .single();

    if (playerErr) {
      await supabase.from("rooms").delete().eq("code", code);
      return { ok: false, error: playerErr.message };
    }

    return {
      ok: true,
      code,
      myPlayerId: inserted.id,
      players: [
        { id: inserted.id, name: inserted.display_name ?? "Hôte", avatar: inserted.avatar },
      ],
    };
  }
  return { ok: false, error: "Impossible de générer un code libre, réessaie." };
}

export async function joinRoomRemote(
  codeInput: string,
  playerName: string,
  avatar: string
): Promise<
  | { ok: true; code: string; players: Player[]; myPlayerId: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const code = codeInput.trim();
  if (!/^\d{4}$/.test(code)) return { ok: false, error: "Code invalide." };

  const { data: room, error: roomErr } = await supabase.from("rooms").select("id").eq("code", code).maybeSingle();
  if (roomErr) return { ok: false, error: roomErr.message };
  if (!room) return { ok: false, error: "Aucune salle ne correspond à ce code." };

  const { data: newRow, error: insErr } = await supabase
    .from("lobby_players")
    .insert({ room_code: code, display_name: playerName, avatar })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  if (!newRow) return { ok: false, error: "Joueur non créé." };

  const { data: rows, error: listErr } = await supabase
    .from("lobby_players")
    .select("id, display_name, avatar")
    .eq("room_code", code)
    .order("created_at", { ascending: true });

  if (listErr) return { ok: false, error: listErr.message };

  return {
    ok: true,
    code,
    myPlayerId: newRow.id,
    players: (rows ?? []).map((r) => ({
      id: r.id,
      name: r.display_name ?? "?",
      avatar: r.avatar,
    })),
  };
}

export async function leaveRoomRemote(
  roomCode: string,
  myPlayerId: string,
  isHost: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  if (isHost) {
    const { data, error } = await supabase.from("rooms").delete().eq("code", roomCode.trim()).select("code");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { data, error } = await supabase.from("lobby_players").delete().eq("id", myPlayerId).select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchPlayersRemote(roomCode: string): Promise<
  { ok: true; players: Player[] } | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error } = await supabase
    .from("lobby_players")
    .select("id, display_name, avatar")
    .eq("room_code", roomCode.trim())
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    players: (data ?? []).map((r) => ({
      id: r.id,
      name: r.display_name ?? "?",
      avatar: r.avatar,
    })),
  };
}

export async function fetchRoomByCode(
  roomCode: string,
): Promise<{ ok: true; room: Record<string, unknown> } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode.trim())
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Salle introuvable." };
  return { ok: true, room: data as Record<string, unknown> };
}

/**
 * Réinsère un joueur avec le même UUID (scores conservés dans game_data) si la ligne avait été supprimée.
 */
export async function reconnectPlayerRemote(
  roomCode: string,
  playerId: string,
  displayName: string,
  avatar: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const code = roomCode.trim();
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("game_state")
    .eq("code", code)
    .maybeSingle();

  if (roomErr) return { ok: false, error: roomErr.message };
  if (!room) return { ok: false, error: "Cette salle n’existe plus." };

  const gameState = (room as { game_state?: string }).game_state;
  if (gameState !== "playing") {
    return { ok: false, error: "La partie n’est plus en cours." };
  }

  const { data: existing } = await supabase
    .from("lobby_players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();

  if (existing) return { ok: true };

  const { error: insErr } = await supabase.from("lobby_players").insert({
    id: playerId,
    room_code: code,
    display_name: displayName,
    avatar: avatar || null,
  });

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}

export async function measureSupabasePingMs(): Promise<number | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { error } = await supabase.from("rooms").select("id").limit(1);
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (error) return null;
  return Math.round(t1 - t0);
}

// --- FONCTIONS DE JEU MISES À JOUR AVEC LE SYSTÈME DE SCORES ---

export type MinibacSubmission = {
  letter: string;
  categories: string[];
  values: string[];
};

export type MinibacHistoryEntry = {
  questionId: string;
  submissions: Record<string, MinibacSubmission>;
};

/** Ancienne voie lecture → fusion → écriture (course possible si deux clics simultanés). */
async function submitAnswerRemoteLegacy(
  roomCode: string,
  playerId: string,
  payload: {
    questionId: string;
    questionType: string;
    answerStr: string;
    minibac?: MinibacSubmission;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error: fetchErr } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();

  if (fetchErr || !data) {
    return { ok: false, error: fetchErr?.message ?? "Salle introuvable." };
  }

  const gd = (data.game_data || {}) as Record<string, unknown>;
  const prevAnswers =
    typeof gd.answers === "object" && gd.answers !== null
      ? (gd.answers as Record<string, string>)
      : {};
  const answers = { ...prevAnswers };
  const prevOrder = Array.isArray(gd.answer_order)
    ? [...(gd.answer_order as string[])]
    : [];
  if (!(playerId in prevAnswers)) {
    prevOrder.push(playerId);
  }

  if (payload.questionType === "minibac" && payload.minibac) {
    answers[playerId] = JSON.stringify({
      type: "minibac",
      letter: payload.minibac.letter,
      categories: payload.minibac.categories,
      values: payload.minibac.values,
    });
    const history: MinibacHistoryEntry[] = Array.isArray(gd.minibac_history)
      ? [...(gd.minibac_history as MinibacHistoryEntry[])]
      : [];
    let entry = history.find((h) => h.questionId === payload.questionId);
    if (!entry) {
      entry = { questionId: payload.questionId, submissions: {} };
      history.push(entry);
    }
    entry.submissions[playerId] = payload.minibac;

    const { error: upErr } = await supabase
      .from("rooms")
      .update({
        game_data: {
          ...gd,
          answers,
          minibac_history: history,
          answer_order: prevOrder,
        },
      })
      .eq("code", roomCode.trim());

    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  }

  answers[playerId] = payload.answerStr;

  const { error: upErr } = await supabase
    .from("rooms")
    .update({
      game_data: {
        ...gd,
        answers,
        answer_order: prevOrder,
      },
    })
    .eq("code", roomCode.trim());

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

function shouldFallbackToLegacyRpc(rpcError: { message?: string; code?: string } | null): boolean {
  if (!rpcError) return false;
  const msg = (rpcError.message ?? "").toLowerCase();
  if (rpcError.code === "PGRST202") return true;
  if (msg.includes("merge_room_answer")) return true;
  if (msg.includes("function") && msg.includes("does not exist")) return true;
  return false;
}

/**
 * Met à jour `game_data.answers` (+ `minibac_history` si Mini-Bac).
 * Utilise la RPC Postgres `merge_room_answer` (migration 006) pour une fusion atomique
 * et éviter qu’une seule réponse survive si plusieurs joueurs valident en même temps.
 */
export async function submitAnswerRemote(
  roomCode: string,
  playerId: string,
  payload: {
    questionId: string;
    questionType: string;
    answerStr: string;
    minibac?: MinibacSubmission;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const answerStrStored =
    payload.questionType === "minibac" && payload.minibac
      ? JSON.stringify({
          type: "minibac",
          letter: payload.minibac.letter,
          categories: payload.minibac.categories,
          values: payload.minibac.values,
        })
      : payload.answerStr;

  const minibacJson =
    payload.questionType === "minibac" && payload.minibac
      ? (payload.minibac as unknown as Record<string, unknown>)
      : null;

  let lastError = "Impossible d'enregistrer la réponse.";

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
    }

    const { error: rpcError } = await supabase.rpc("merge_room_answer", {
      p_code: roomCode.trim(),
      p_player_id: playerId,
      p_question_id: payload.questionId,
      p_question_type: payload.questionType,
      p_answer_str: answerStrStored,
      p_minibac: minibacJson,
    });

    if (rpcError && shouldFallbackToLegacyRpc(rpcError)) {
      const leg = await submitAnswerRemoteLegacy(roomCode, playerId, payload);
      if (leg.ok) return leg;
      lastError = leg.error;
      continue;
    }

    if (rpcError) {
      lastError = rpcError.message;
      continue;
    }

    return { ok: true };
  }

  return { ok: false, error: lastError };
}

export async function startGameRemote(
  roomCode: string, 
  questionCount: number, 
  activeThemes: string[],
  difficulties: QuestionDifficulty[] = ["facile", "moyen", "difficile"]
) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const selectedQuestions = getRandomQuestionsByTheme(questionCount, activeThemes as any, difficulties);
  
  if (selectedQuestions.length === 0) {
    return { ok: false, error: "Aucune question trouvée pour cette combinaison. Cochez plus de thèmes/difficultés !" };
  }
  const { error } = await supabase
    .from("rooms")
    .update({
      game_state: "playing",
      game_data: {
        questions: selectedQuestions,
        answers: {},
        scores: {},
        minibac_history: [] as MinibacHistoryEntry[],
        answer_order: [] as string[],
      },
      current_question_index: 0,
    })
    .eq("code", roomCode.trim());

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function startWordleGameRemote(
  roomCode: string,
  rounds: number,
  wordLenMin: number,
  wordLenMax: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error } = await supabase.rpc("wordle_start_game", {
    p_code: roomCode.trim(),
    p_rounds: rounds,
    p_word_len_min: wordLenMin,
    p_word_len_max: wordLenMax,
  });

  if (error) return { ok: false, error: error.message };
  const o = data as { ok?: boolean; error?: string };
  if (!o?.ok) return { ok: false, error: (o?.error as string) ?? "Réponse serveur invalide." };
  return { ok: true };
}

export type WordleWordLookup = {
  inDictionary: boolean;
  /** Si défini, la présence dans le dictionnaire n’a pas pu être vérifiée (réseau, RPC manquante, etc.). */
  rpcError: string | null;
};

/** Indique si le mot figure dans `wordle_dictionary` (source de vérité = base). */
export async function wordleWordExistsRemote(word: string): Promise<WordleWordLookup> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { inDictionary: false, rpcError: "Supabase non configuré." };
  }
  const { data, error } = await supabase.rpc("wordle_word_exists", {
    p_word: word.trim().toUpperCase(),
  });
  if (error) {
    return { inDictionary: false, rpcError: error.message };
  }
  return { inDictionary: Boolean(data), rpcError: null };
}

export async function submitWordleGuessRemote(
  roomCode: string,
  playerId: string,
  guess: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error } = await supabase.rpc("wordle_submit_guess", {
    p_code: roomCode.trim(),
    p_player_id: playerId,
    p_guess: guess.trim().toUpperCase(),
  });

  if (error) return { ok: false, error: error.message };
  const o = data as { ok?: boolean; error?: string };
  if (!o?.ok) return { ok: false, error: (o?.error as string) ?? "Réponse serveur invalide." };
  return { ok: true };
}

export async function nextQuestionRemote(
  roomCode: string,
  nextIndex: number,
  currentQuestions: unknown[],
  currentScores: Record<string, number>,
) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false };

  const { data } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();

  const gd = (data?.game_data || {}) as Record<string, unknown>;
  const minibac_history = Array.isArray(gd.minibac_history)
    ? gd.minibac_history
    : [];

  const { error } = await supabase
    .from("rooms")
    .update({
      current_question_index: nextIndex,
      game_data: {
        ...gd,
        questions: currentQuestions,
        answers: {},
        scores: currentScores,
        minibac_history,
        answer_order: [] as string[],
      },
    })
    .eq("code", roomCode.trim());

  return { ok: !error };
}

export async function endGameRemote(
  roomCode: string,
  finalScores: Record<string, number>,
) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false };

  const { data: room } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();
  const gameData = (room?.game_data || {}) as Record<string, unknown>;
  const hadMinibac =
    Array.isArray(gameData.minibac_history) &&
    (gameData.minibac_history as unknown[]).length > 0;

  const { error } = await supabase
    .from("rooms")
    .update({
      game_state: "finished",
      game_data: {
        ...gameData,
        scores: finalScores,
        tribunal_complete: !hadMinibac,
        tribunal_cursor: 0,
        tribunal_votes: {} as Record<string, Record<string, "accept" | "reject">>,
      },
    })
    .eq("code", roomCode.trim());

  return { ok: !error };
}

/** Points par case acceptée au Tribunal — doit rester aligné avec `MINIBAC_POINTS_PER_VALIDATED_CELL` dans quiz-bank. */
export const MINIBAC_POINTS_PER_CELL = 20;

export function buildTribunalCellVoteKey(
  questionId: string,
  playerId: string,
  cellIndex: number,
) {
  return `${questionId}::${playerId}::${cellIndex}`;
}

export async function submitTribunalVoteRemote(
  roomCode: string,
  voterId: string,
  targetQuestionId: string,
  targetPlayerId: string,
  cellIndex: number,
  vote: "accept" | "reject",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error: fetchErr } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();

  if (fetchErr || !data) {
    return { ok: false, error: fetchErr?.message ?? "Salle introuvable." };
  }

  const gd = (data.game_data || {}) as Record<string, unknown>;
  const key = buildTribunalCellVoteKey(targetQuestionId, targetPlayerId, cellIndex);
  const prev = (gd.tribunal_votes || {}) as Record<
    string,
    Record<string, "accept" | "reject">
  >;
  const forTarget = { ...(prev[key] || {}) };
  forTarget[voterId] = vote;
  const tribunal_votes = { ...prev, [key]: forTarget };

  const { error: upErr } = await supabase
    .from("rooms")
    .update({
      game_data: { ...gd, tribunal_votes },
    })
    .eq("code", roomCode.trim());

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

/** Passe à la grille suivante (hôte). */
export async function advanceTribunalRemote(roomCode: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false };

  const { data } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();

  const gd = (data?.game_data || {}) as Record<string, unknown>;
  const cur = Number(gd.tribunal_cursor ?? 0);

  const { error } = await supabase
    .from("rooms")
    .update({
      game_data: { ...gd, tribunal_cursor: cur + 1 },
    })
    .eq("code", roomCode.trim());

  return { ok: !error };
}

/** Ferme le Tribunal, applique les points Mini-Bac (votes majoritaires) et affiche le podium. */
export async function finishTribunalRemote(roomCode: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false };

  const { data } = await supabase
    .from("rooms")
    .select("game_data")
    .eq("code", roomCode.trim())
    .single();

  const gd = (data?.game_data || {}) as Record<string, unknown>;
  const questions = (gd.questions || []) as Array<{
    id: string;
    type?: string;
    points?: number;
  }>;
  const scores = {
    ...(typeof gd.scores === "object" && gd.scores !== null
      ? (gd.scores as Record<string, number>)
      : {}),
  };
  const tribunal_votes = (gd.tribunal_votes || {}) as Record<
    string,
    Record<string, "accept" | "reject">
  >;
  const minibac_history = (gd.minibac_history || []) as MinibacHistoryEntry[];

  for (const entry of minibac_history) {
    const q = questions.find((x) => x.id === entry.questionId);
    if (!q || q.type !== "minibac") continue;
    for (const playerId of Object.keys(entry.submissions || {})) {
      const sub = entry.submissions[playerId];
      const n = Math.min(
        4,
        sub.categories?.length ?? 0,
        sub.values?.length ?? 0,
      );
      for (let cellIndex = 0; cellIndex < n; cellIndex++) {
        const key = buildTribunalCellVoteKey(entry.questionId, playerId, cellIndex);
        const v = tribunal_votes[key] || {};
        const votes = Object.values(v);
        if (votes.length === 0) continue;
        const acc = votes.filter((x) => x === "accept").length;
        const rej = votes.filter((x) => x === "reject").length;
        if (acc > rej) {
          scores[playerId] = (scores[playerId] || 0) + MINIBAC_POINTS_PER_CELL;
        }
      }
    }
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      game_data: { ...gd, scores, tribunal_complete: true },
    })
    .eq("code", roomCode.trim());

  return { ok: !error };
}

export async function returnToLobbyRemote(roomCode: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("rooms")
    .update({ game_state: "lobby" })
    .eq("code", roomCode);

  return { ok: !error };
}

// ... (Garde tout le code existant) ...

// ============================================================================
// MODE "BOMB" (Patate Chaude)
// ============================================================================

export async function startBombGameRemote(
  roomCode: string,
  players: Player[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  // Initialisation : on mélange les joueurs pour l'ordre de passage
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const playerOrder = shuffledPlayers.map((p) => p.id);
  
  // Tout le monde commence avec 2 vies
  const lives: Record<string, number> = {};
  playerOrder.forEach((id) => (lives[id] = 2));

  // Première consigne
  const initialConstraint = generateBombConstraint();
  
  // Timer aléatoire entre 15 et 30 secondes pour la première bombe
  const timerSeconds = Math.floor(Math.random() * 16) + 15; 
  // On stocke le timestamp de fin (en ms)
  const explosionTime = Date.now() + (timerSeconds * 1000);

  const { error } = await supabase
    .from("rooms")
    .update({
      game_state: "playing",
      game_data: {
        game_kind: "bomb",
        player_order: playerOrder,
        turn_index: 0,
        lives: lives,
        current_constraint: initialConstraint,
        explosion_time: explosionTime,
        used_words: [] as string[], // Pour empêcher de répéter les mots
        status: "playing",
        round_number: 1,
      },
    })
    .eq("code", roomCode.trim());

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
// Fonction spécifique pour vérifier le dico complet de la Bombe
export async function bombWordExistsRemote(word: string): Promise<{ inDictionary: boolean; rpcError: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { inDictionary: false, rpcError: "Supabase non configuré." };

  // On cherche le mot directement dans la nouvelle table
  const { data, error } = await supabase
    .from("french_dictionary")
    .select("word")
    .eq("word", word.trim().toUpperCase())
    .maybeSingle();

  if (error) return { inDictionary: false, rpcError: error.message };
  return { inDictionary: !!data, rpcError: null };
}
// Fonction pour soumettre un mot dans le mode Bombe
export async function submitBombGuessRemote(
  roomCode: string,
  playerId: string,
  word: string,
  currentData: any // On passe game_data pour éviter un fetch supplémentaire
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  // 1. On vérifie que le mot existe dans le dictionnaire
  const dictCheck = await bombWordExistsRemote(word);
  if (!dictCheck.inDictionary) {
    return { ok: false, error: "Mot inconnu." };
  }

  // 2. On vérifie qu'il n'a pas déjà été dit
  const usedWords = currentData.used_words || [];
  if (usedWords.includes(word.toUpperCase())) {
    return { ok: false, error: "Mot déjà utilisé !" };
  }

  // 3. C'est bon ! On passe au joueur suivant et on régénère une consigne
  const order = currentData.player_order as string[];
  const currentIndex = currentData.turn_index as number;
  
  // Trouver le prochain joueur en vie
  let nextIndex = (currentIndex + 1) % order.length;
  let attempts = 0;
  while ((currentData.lives[order[nextIndex]] || 0) <= 0 && attempts < order.length) {
    nextIndex = (nextIndex + 1) % order.length;
    attempts++;
  }

  const newConstraint = generateBombConstraint();
  
  // CALCUL DU SURSIS (6 SECONDES)
  const timeLeftMs = currentData.explosion_time - Date.now();
  
  // Si le joueur passe la bombe alors qu'il reste moins de 6 secondes, 
  // on redonne exactement 6 secondes au joueur suivant. Sinon, on ne touche à rien.
  const newExplosionTime = timeLeftMs < 6000 
    ? Date.now() + 6000 
    : currentData.explosion_time;

  const { error } = await supabase
    .from("rooms")
    .update({
      game_data: {
        ...currentData,
        turn_index: nextIndex,
        current_constraint: newConstraint,
        explosion_time: newExplosionTime,
        used_words: [...usedWords, word.toUpperCase()],
      },
    })
    .eq("code", roomCode.trim());

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Fonction appelée quand la bombe explose
export async function handleBombExplosionRemote(
  roomCode: string,
  currentData: any
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const order = currentData.player_order as string[];
  const currentIndex = currentData.turn_index as number;
  const loserId = order[currentIndex];
  
  const newLives = { ...currentData.lives };
  newLives[loserId] = Math.max(0, (newLives[loserId] || 0) - 1);

  // Vérifier combien de joueurs sont encore en vie
  const playersAlive = Object.values(newLives).filter(l => (l as number) > 0).length;

  if (playersAlive <= 1) {
    // Fin de la partie !
    const { error } = await supabase
      .from("rooms")
      .update({
        game_state: "finished",
        game_data: {
          ...currentData,
          lives: newLives,
          status: "game_over"
        }
      })
      .eq("code", roomCode.trim());
    return { ok: !error, error: error?.message || "" };
  }

  // La partie continue : nouvelle manche
  // Le perdant recommence (s'il n'est pas mort) ou on passe au suivant
  let nextIndex = currentIndex;
  if (newLives[loserId] <= 0) {
    nextIndex = (currentIndex + 1) % order.length;
    let attempts = 0;
    while ((newLives[order[nextIndex]] || 0) <= 0 && attempts < order.length) {
      nextIndex = (nextIndex + 1) % order.length;
      attempts++;
    }
  }

  const newConstraint = generateBombConstraint();
  const timerSeconds = Math.floor(Math.random() * 16) + 15; // Reset entre 15 et 30s
  const newExplosionTime = Date.now() + (timerSeconds * 1000);

  const { error } = await supabase
    .from("rooms")
    .update({
      game_data: {
        ...currentData,
        lives: newLives,
        turn_index: nextIndex,
        current_constraint: newConstraint,
        explosion_time: newExplosionTime,
        used_words: [], // On vide les mots utilisés pour le nouveau round
        round_number: (currentData.round_number || 1) + 1
      },
    })
    .eq("code", roomCode.trim());

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}