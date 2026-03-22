import type { Player } from "@/lib/lobby-types";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export type { Player };

const MAX_CODE_ATTEMPTS = 40;

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createRoomRemote(): Promise<
  | { ok: true; code: string; players: Player[]; myPlayerId: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { ok: false, error: "Supabase non configuré." };
  }

  for (let a = 0; a < MAX_CODE_ATTEMPTS; a++) {
    const code = randomCode();
    const { error: roomErr } = await supabase.from("rooms").insert({ code });

    if (roomErr) {
      if (roomErr.code === "23505") continue;
      return { ok: false, error: roomErr.message };
    }

    const { data: inserted, error: playerErr } = await supabase
      .from("lobby_players")
      .insert({ room_code: code, display_name: "Hôte" })
      .select("id, display_name")
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
        { id: inserted.id, name: inserted.display_name ?? "Hôte" },
      ],
    };
  }

  return { ok: false, error: "Impossible de générer un code libre, réessaie." };
}

export async function joinRoomRemote(
  codeInput: string,
): Promise<
  | { ok: true; code: string; players: Player[]; myPlayerId: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { ok: false, error: "Supabase non configuré." };
  }

  const code = codeInput.trim();
  if (!/^\d{4}$/.test(code)) {
    return { ok: false, error: "Le code doit contenir 4 chiffres." };
  }

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (roomErr) return { ok: false, error: roomErr.message };
  if (!room) {
    return { ok: false, error: "Aucune salle ne correspond à ce code." };
  }

  const { count, error: countErr } = await supabase
    .from("lobby_players")
    .select("*", { count: "exact", head: true })
    .eq("room_code", code);

  if (countErr) return { ok: false, error: countErr.message };

  const nextNum = (count ?? 0) + 1;
  const displayName = `Joueur ${nextNum}`;

  const { data: newRow, error: insErr } = await supabase
    .from("lobby_players")
    .insert({
      room_code: code,
      display_name: displayName,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  if (!newRow) return { ok: false, error: "Joueur non créé." };

  const { data: rows, error: listErr } = await supabase
    .from("lobby_players")
    .select("id, display_name")
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
    })),
  };
}

export async function leaveRoomRemote(
  roomCode: string,
  myPlayerId: string,
  isHost: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { ok: false, error: "Supabase non configuré." };
  }

  const code = roomCode.trim();

  if (isHost) {
    const { data, error } = await supabase
      .from("rooms")
      .delete()
      .eq("code", code)
      .select("code");

    if (error) {
      return {
        ok: false,
        error: `${error.message} (code: ${error.code ?? "?"})`,
      };
    }
    if (!data?.length) {
      return {
        ok: false,
        error:
          "La salle n’a pas pu être supprimée (0 ligne). Vérifie les politiques RLS « DELETE » sur la table rooms dans Supabase, ou que le code de salle est correct.",
      };
    }
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("lobby_players")
    .delete()
    .eq("id", myPlayerId)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: `${error.message} (code: ${error.code ?? "?"})`,
    };
  }
  if (!data?.length) {
    return {
      ok: false,
      error:
        "Ton joueur n’a pas été retiré (0 ligne supprimée). Vérifie la politique RLS « DELETE » sur lobby_players.",
    };
  }
  return { ok: true };
}

export async function fetchPlayersRemote(roomCode: string): Promise<
  { ok: true; players: Player[] } | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: "Supabase non configuré." };

  const { data, error } = await supabase
    .from("lobby_players")
    .select("id, display_name")
    .eq("room_code", roomCode.trim())
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    players: (data ?? []).map((r) => ({
      id: r.id,
      name: r.display_name ?? "?",
    })),
  };
}

export async function measureSupabasePingMs(): Promise<number | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const { error } = await supabase.from("rooms").select("id").limit(1);
  const t1 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  if (error) return null;
  return Math.round(t1 - t0);
}
