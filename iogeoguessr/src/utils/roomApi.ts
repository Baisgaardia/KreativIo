import type {
  CreateRoomResponse,
  JoinRoomResponse,
  PublicRoomSnapshot,
} from '../../shared/roomTypes';

const API_ENDPOINT = '/api/room';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Uventet svar fra serveren.');
  }

  if (!res.ok) {
    const errMsg =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Serverfejl (${res.status}).`;
    throw new Error(errMsg);
  }

  return parsed as T;
}

export async function createRoom(params: {
  packName: string;
  locationIds: string[];
  timerSeconds: number;
}): Promise<CreateRoomResponse> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_room',
      packName: params.packName,
      locationIds: params.locationIds,
      timerSeconds: params.timerSeconds,
    }),
  });
  return parseJsonResponse<CreateRoomResponse>(res);
}

export async function joinRoom(params: {
  roomCode: string;
  playerName: string;
}): Promise<JoinRoomResponse> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'join_room',
      roomCode: params.roomCode,
      playerName: params.playerName,
    }),
  });
  return parseJsonResponse<JoinRoomResponse>(res);
}

export async function fetchRoomAsHost(
  roomCode: string,
  hostToken: string
): Promise<PublicRoomSnapshot> {
  const url = `${API_ENDPOINT}?code=${encodeURIComponent(roomCode)}&role=host`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${hostToken}` },
    cache: 'no-store',
  });
  const data = await parseJsonResponse<{ snapshot: PublicRoomSnapshot }>(res);
  return data.snapshot;
}

export async function fetchRoomAsPlayer(
  roomCode: string,
  playerId: string,
  playerToken: string
): Promise<PublicRoomSnapshot> {
  const url = `${API_ENDPOINT}?code=${encodeURIComponent(roomCode)}&role=player&playerId=${encodeURIComponent(playerId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${playerToken}` },
    cache: 'no-store',
  });
  const data = await parseJsonResponse<{ snapshot: PublicRoomSnapshot }>(res);
  return data.snapshot;
}

async function postHostAction(
  action: 'host_start_round' | 'host_reveal_round' | 'host_next_round' | 'host_kick_player',
  roomCode: string,
  hostToken: string,
  extra?: Record<string, unknown>
): Promise<PublicRoomSnapshot> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hostToken}`,
    },
    body: JSON.stringify({
      action,
      roomCode,
      ...extra,
    }),
  });
  const data = await parseJsonResponse<{ snapshot: PublicRoomSnapshot }>(res);
  return data.snapshot;
}

export function hostStartRound(roomCode: string, hostToken: string) {
  return postHostAction('host_start_round', roomCode, hostToken);
}

export function hostRevealRound(roomCode: string, hostToken: string) {
  return postHostAction('host_reveal_round', roomCode, hostToken);
}

export function hostNextRound(roomCode: string, hostToken: string) {
  return postHostAction('host_next_round', roomCode, hostToken);
}

export function hostKickPlayer(
  roomCode: string,
  hostToken: string,
  playerId: string
) {
  return postHostAction('host_kick_player', roomCode, hostToken, { playerId });
}

export async function playerUnlockAnalysis(params: {
  roomCode: string;
  playerId: string;
  playerToken: string;
  roundIndex: number;
  attempts: number;
}): Promise<PublicRoomSnapshot> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.playerToken}`,
    },
    body: JSON.stringify({
      action: 'player_unlock_analysis',
      roomCode: params.roomCode,
      playerId: params.playerId,
      roundIndex: params.roundIndex,
      attempts: params.attempts,
    }),
  });
  const data = await parseJsonResponse<{ snapshot: PublicRoomSnapshot }>(res);
  return data.snapshot;
}

export async function playerSubmitGuess(params: {
  roomCode: string;
  playerId: string;
  playerToken: string;
  roundIndex: number;
  guess: { lat: number; lng: number } | null;
  hintsUsedCount: number;
}): Promise<PublicRoomSnapshot> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.playerToken}`,
    },
    body: JSON.stringify({
      action: 'player_submit_guess',
      roomCode: params.roomCode,
      playerId: params.playerId,
      roundIndex: params.roundIndex,
      guess: params.guess,
      hintsUsedCount: params.hintsUsedCount,
    }),
  });
  const data = await parseJsonResponse<{ snapshot: PublicRoomSnapshot }>(res);
  return data.snapshot;
}

export function buildRoomJoinUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `?rum=${encodeURIComponent(roomCode)}`;
  const url = new URL(window.location.href);
  url.searchParams.delete('kode');
  url.searchParams.set('rum', roomCode);
  return url.toString();
}

export function readRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('rum') ?? params.get('room');
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
  return cleaned.length === 4 ? cleaned : null;
}
