const SESSION_KEY = "samedi_quiz_session";
const RECONNECT_KEY = "samedi_quiz_reconnect";

export type StoredSession = {
  v: 1;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  displayName: string;
  avatar: string | null;
};

const MAX_AVATAR_CHARS = 120_000;

function safeAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return avatar.length <= MAX_AVATAR_CHARS ? avatar : null;
}

export function saveSession(p: Omit<StoredSession, "v"> & { v?: 1 }): void {
  if (typeof window === "undefined") return;
  const payload: StoredSession = {
    v: 1,
    roomCode: p.roomCode.trim(),
    playerId: p.playerId,
    isHost: p.isHost,
    displayName: p.displayName,
    avatar: safeAvatar(p.avatar),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ...payload, avatar: null }),
      );
    } catch {
      /* ignore quota */
    }
  }
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredSession>;
    if (o.v !== 1 || !o.roomCode || !o.playerId || typeof o.isHost !== "boolean") {
      return null;
    }
    return {
      v: 1,
      roomCode: String(o.roomCode).trim(),
      playerId: String(o.playerId),
      isHost: o.isHost,
      displayName: String(o.displayName ?? "Joueur"),
      avatar: typeof o.avatar === "string" ? o.avatar : null,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function saveReconnectOffer(p: Omit<StoredSession, "v"> & { v?: 1 }): void {
  if (typeof window === "undefined") return;
  const payload: StoredSession = {
    v: 1,
    roomCode: p.roomCode.trim(),
    playerId: p.playerId,
    isHost: p.isHost,
    displayName: p.displayName,
    avatar: safeAvatar(p.avatar),
  };
  try {
    localStorage.setItem(RECONNECT_KEY, JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(
        RECONNECT_KEY,
        JSON.stringify({ ...payload, avatar: null }),
      );
    } catch {
      /* ignore */
    }
  }
}

export function loadReconnectOffer(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RECONNECT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredSession>;
    if (o.v !== 1 || !o.roomCode || !o.playerId || typeof o.isHost !== "boolean") {
      return null;
    }
    return {
      v: 1,
      roomCode: String(o.roomCode).trim(),
      playerId: String(o.playerId),
      isHost: o.isHost,
      displayName: String(o.displayName ?? "Joueur"),
      avatar: typeof o.avatar === "string" ? o.avatar : null,
    };
  } catch {
    return null;
  }
}

export function clearReconnectOffer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECONNECT_KEY);
  } catch {
    /* ignore */
  }
}
