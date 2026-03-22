import type { Player } from "@/lib/lobby-types";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { getRandomQuestions } from "./quiz-bank";

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

  const { error: rpcError } = await supabase.rpc("merge_room_answer", {
    p_code: roomCode.trim(),
    p_player_id: playerId,
    p_question_id: payload.questionId,
    p_question_type: payload.questionType,
    p_answer_str: answerStrStored,
    p_minibac: minibacJson,
  });

  if (rpcError && shouldFallbackToLegacyRpc(rpcError)) {
    return submitAnswerRemoteLegacy(roomCode, playerId, payload);
  }

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  return { ok: true };
}

export async function startGameRemote(roomCode: string, questionCount: number) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const selectedQuestions = getRandomQuestions(questionCount);

  const { error } = await supabase
    .from("rooms")
    .update({
      game_state: "playing",
      game_data: {
        questions: selectedQuestions,
        answers: {},
        scores: {},
        minibac_history: [] as MinibacHistoryEntry[],
      },
      current_question_index: 0,
    })
    .eq("code", roomCode.trim());

  if (error) return { ok: false, error: error.message };
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

/** Points attribués par réponse acceptée au Tribunal (une case du Mini-Bac). */
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