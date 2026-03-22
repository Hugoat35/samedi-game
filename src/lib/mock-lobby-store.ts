import type { Player } from "@/lib/lobby-types";

export type { Player };

type Room = {
  code: string;
  players: Player[];
};

const rooms = new Map<string, Room>();

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateUniqueCode(): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

export const mockLobbyStore = {
  createRoom(): { code: string; players: Player[] } {
    const code = generateUniqueCode();
    const room: Room = {
      code,
      players: [{ id: randomId(), name: "Hôte" }],
    };
    rooms.set(code, room);
    return { code, players: [...room.players] };
  },

  joinRoom(codeInput: string):
    | { ok: true; code: string; players: Player[] }
    | { ok: false; error: string } {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      return { ok: false, error: "Le code doit contenir 4 chiffres." };
    }
    const room = rooms.get(code);
    if (!room) {
      return { ok: false, error: "Aucune salle ne correspond à ce code." };
    }
    const nextIndex = room.players.length;
    room.players.push({
      id: randomId(),
      name: `Joueur ${nextIndex}`,
    });
    return { ok: true, code, players: [...room.players] };
  },

  getRoom(code: string): Room | undefined {
    return rooms.get(code.trim());
  },
};
