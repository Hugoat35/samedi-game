import type { Player } from "./lobby-types";

let currentRoomCode: string | null = null;
let currentPlayers: Player[] = [];

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const mockLobbyStore = {
  createRoom(playerName: string, avatar: string) {
    currentRoomCode = randomCode();
    const hostId = "host-id-" + Math.random().toString(36).slice(2);
    currentPlayers = [{ id: hostId, name: playerName, avatar }];
    return {
      code: currentRoomCode,
      players: [...currentPlayers],
      myPlayerId: hostId,
    };
  },
  joinRoom(pin: string, playerName: string, avatar: string) {
    if (!currentRoomCode || currentRoomCode !== pin) {
      return { ok: false as const, error: "Salle introuvable (Mock)." };
    }
    const myId = "player-id-" + Math.random().toString(36).slice(2);
    currentPlayers.push({ id: myId, name: playerName, avatar });
    return {
      ok: true as const,
      code: currentRoomCode,
      players: [...currentPlayers],
      myPlayerId: myId,
    };
  },
  leaveRoom(pin: string, playerId: string) {
    if (currentRoomCode === pin) {
      currentPlayers = currentPlayers.filter((p) => p.id !== playerId);
      if (currentPlayers.length === 0) {
        currentRoomCode = null;
      }
    }
  },
};