import { randomBytes, timingSafeEqual } from 'node:crypto';
import { LOCATIONS } from '../src/config/locations';
import { calculateHaversineDistanceKm, calculateRoundScore } from '../src/utils/geo';
import {
  getAnalysisPointsForAttempt,
  HINT_COST_POINTS,
} from '../src/utils/bonusQuestion';
import type {
  PublicPlayerSnapshot,
  PublicRoomSnapshot,
  RoomPhase,
  RoomRoundResult,
} from './roomTypes';

export interface RoomStore {
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
  deleteKey(key: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
}

interface StoredRoomState {
  roomCode: string;
  hostToken: string;
  packName: string;
  phase: RoomPhase;
  roundIndex: number;
  locationIds: string[];
  timerSeconds: number;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface StoredPlayerState {
  playerId: string;
  playerToken: string;
  name: string;
  joinedAt: number;
  unlockedRounds: Record<string, { attempts: number; analysisScore: number; unlockedAt: number }>;
  rounds: Record<string, RoomRoundResult>;
}

export interface RoomHandlerResult {
  status: number;
  body: unknown;
}

const LOCATION_BY_ID = new Map(LOCATIONS.map((loc) => [loc.id, loc]));
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_REGEX = /^[A-Z2-9]{4}$/;
const PLAYER_ID_REGEX = /^[a-f0-9]{16,32}$/;
const ALLOWED_TIMERS = new Set([0, 60, 90, 120, 180, 240, 300]);
const MAX_PLAYERS_PER_ROOM = 80;
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

export class MemoryRoomStore implements RoomStore {
  private map = new Map<string, { data: string; updatedAt: number }>();

  async getJson<T>(key: string): Promise<T | null> {
    this.pruneExpired();
    const item = this.map.get(key);
    if (!item) return null;
    return JSON.parse(item.data) as T;
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    this.pruneExpired();
    this.map.set(key, { data: JSON.stringify(value), updatedAt: Date.now() });
  }

  async deleteKey(key: string): Promise<void> {
    this.map.delete(key);
  }

  async listKeys(prefix: string): Promise<string[]> {
    this.pruneExpired();
    const keys: string[] = [];
    for (const k of this.map.keys()) {
      if (k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [k, v] of this.map.entries()) {
      if (v.updatedAt < cutoff) {
        this.map.delete(k);
      }
    }
  }
}

function stateKey(roomCode: string): string {
  return `room:${roomCode}:state`;
}

function playerPrefix(roomCode: string): string {
  return `room:${roomCode}:player:`;
}

function playerKey(roomCode: string, playerId: string): string {
  return `room:${roomCode}:player:${playerId}`;
}

function generateToken(): string {
  return randomBytes(24).toString('hex');
}

function generatePlayerId(): string {
  return randomBytes(10).toString('hex');
}

function generateRoomCode(): string {
  const bytes = randomBytes(4);
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

function safeTokenEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function extractBearerToken(headers: Record<string, string | undefined>): string | null {
  const auth = headers['authorization'] || headers['Authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

function normalizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (!ROOM_CODE_REGEX.test(cleaned)) return null;
  return cleaned;
}

function sanitizePlayerName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Fjern kontroltegn og sammentræk mellemrum
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 1 || cleaned.length > 28) return null;
  return cleaned;
}

function sanitizePackName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Hele OECD';
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return 'Hele OECD';
  return cleaned.slice(0, 60);
}

function summarizePlayer(
  player: StoredPlayerState,
  room: StoredRoomState,
  includeGuessesForCurrentRound: boolean,
  includeAllRounds: boolean
): PublicPlayerSnapshot {
  const allRounds = Object.values(player.rounds).sort(
    (a, b) => a.roundIndex - b.roundIndex
  );
  const totalScore = allRounds.reduce((sum, r) => sum + r.score, 0);
  const totalGeoScore = allRounds.reduce((sum, r) => sum + r.geoScore, 0);
  const totalAnalysisScore = allRounds.reduce((sum, r) => sum + r.analysisScore, 0);
  const firstTryCount = allRounds.filter((r) => r.analysisAttempts === 1).length;
  const distances = allRounds
    .map((r) => r.distanceKm)
    .filter((d): d is number => d !== null);
  const avgDistanceKm =
    distances.length > 0
      ? Math.round((distances.reduce((s, d) => s + d, 0) / distances.length) * 10) / 10
      : null;

  const roundKey = String(room.roundIndex);
  const unlocked = player.unlockedRounds[roundKey];
  const currentResult = player.rounds[roundKey] ?? null;

  return {
    playerId: player.playerId,
    name: player.name,
    joinedAt: player.joinedAt,
    totalScore,
    totalGeoScore,
    totalAnalysisScore,
    firstTryCount,
    avgDistanceKm,
    currentRoundUnlocked: Boolean(unlocked || currentResult),
    currentRoundAnalysisAttempts:
      currentResult?.analysisAttempts ?? unlocked?.attempts ?? 0,
    currentRoundAnalysisScore:
      currentResult?.analysisScore ?? unlocked?.analysisScore ?? 0,
    currentRoundSubmitted: Boolean(currentResult),
    currentRoundResult: includeGuessesForCurrentRound ? currentResult : null,
    ...(includeAllRounds ? { rounds: allRounds } : {}),
  };
}

async function loadPlayers(
  store: RoomStore,
  roomCode: string
): Promise<StoredPlayerState[]> {
  const keys = await store.listKeys(playerPrefix(roomCode));
  if (keys.length === 0) return [];
  const items = await Promise.all(
    keys.map((k) => store.getJson<StoredPlayerState>(k))
  );
  return items.filter((p): p is StoredPlayerState => p !== null);
}

async function buildSnapshot(
  store: RoomStore,
  room: StoredRoomState,
  callerRole: 'host' | 'player',
  callerPlayerId?: string | null
): Promise<PublicRoomSnapshot> {
  const storedPlayers = await loadPlayers(store, room.roomCode);
  const revealGuesses = room.phase === 'reveal' || room.phase === 'finished';
  const includeAllRoundsForLeaderboard = room.phase === 'finished';

  const players = storedPlayers
    .map((p) => {
      const isSelf = Boolean(callerPlayerId && p.playerId === callerPlayerId);
      return summarizePlayer(
        p,
        room,
        revealGuesses || isSelf,
        includeAllRoundsForLeaderboard || (callerRole === 'host' && room.phase === 'finished')
      );
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.joinedAt - b.joinedAt;
    });

  let me: PublicPlayerSnapshot | null | undefined = undefined;
  if (callerPlayerId) {
    const found = storedPlayers.find((p) => p.playerId === callerPlayerId);
    me = found ? summarizePlayer(found, room, true, true) : null;
  }

  return {
    roomCode: room.roomCode,
    packName: room.packName,
    phase: room.phase,
    roundIndex: room.roundIndex,
    totalRounds: room.locationIds.length,
    locationIds: room.locationIds,
    currentLocationId:
      room.phase === 'lobby' ? null : (room.locationIds[room.roundIndex] ?? null),
    timerSeconds: room.timerSeconds,
    roundStartedAt: room.roundStartedAt,
    roundEndsAt: room.roundEndsAt,
    serverNow: Date.now(),
    players,
    ...(callerPlayerId ? { me } : {}),
  };
}

export async function handleRoomRequest(params: {
  method: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  body: unknown;
  store: RoomStore;
}): Promise<RoomHandlerResult> {
  const { method, query, headers, body, store } = params;

  if (method === 'GET') {
    const roomCode = normalizeRoomCode(query.code);
    if (!roomCode) {
      return { status: 400, body: { error: 'Ugyldig rumkode.' } };
    }
    const room = await store.getJson<StoredRoomState>(stateKey(roomCode));
    if (!room) {
      return { status: 404, body: { error: 'Rummet blev ikke fundet. Tjek rumkoden.' } };
    }

    const token = extractBearerToken(headers);
    const requestedRole = query.role === 'host' ? 'host' : 'player';

    if (requestedRole === 'host') {
      if (!safeTokenEquals(token, room.hostToken)) {
        return { status: 403, body: { error: 'Manglende eller ugyldig værtsadgang.' } };
      }
      const snapshot = await buildSnapshot(store, room, 'host');
      return { status: 200, body: { snapshot } };
    }

    let verifiedPlayerId: string | null = null;
    if (query.playerId && PLAYER_ID_REGEX.test(query.playerId) && token) {
      const player = await store.getJson<StoredPlayerState>(
        playerKey(roomCode, query.playerId)
      );
      if (player && safeTokenEquals(token, player.playerToken)) {
        verifiedPlayerId = player.playerId;
      }
    }

    const snapshot = await buildSnapshot(store, room, 'player', verifiedPlayerId);
    return { status: 200, body: { snapshot } };
  }

  if (method !== 'POST') {
    return { status: 405, body: { error: 'Metode ikke tilladt.' } };
  }

  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Ugyldig forespørgsel.' } };
  }

  const payload = body as Record<string, unknown>;
  const action = typeof payload.action === 'string' ? payload.action : '';

  // 1. Opret nyt lærerrum
  if (action === 'create_room') {
    const rawIds = Array.isArray(payload.locationIds) ? payload.locationIds : [];
    const validIds: string[] = [];
    const seen = new Set<string>();
    for (const id of rawIds) {
      if (typeof id === 'string' && LOCATION_BY_ID.has(id) && !seen.has(id)) {
        seen.add(id);
        validIds.push(id);
      }
    }
    if (validIds.length === 0 || validIds.length > 15) {
      return {
        status: 400,
        body: { error: 'Vælg mellem 1 og 15 gyldige OECD-lokationer.' },
      };
    }

    const rawTimer = typeof payload.timerSeconds === 'number' ? payload.timerSeconds : 0;
    const timerSeconds = ALLOWED_TIMERS.has(rawTimer) ? rawTimer : 0;
    const packName = sanitizePackName(payload.packName);

    let roomCode = '';
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = generateRoomCode();
      const existing = await store.getJson<StoredRoomState>(stateKey(candidate));
      if (!existing) {
        roomCode = candidate;
        break;
      }
    }
    if (!roomCode) {
      return { status: 503, body: { error: 'Kunne ikke oprette en ledig rumkode. Prøv igen.' } };
    }

    const hostToken = generateToken();
    const now = Date.now();
    const room: StoredRoomState = {
      roomCode,
      hostToken,
      packName,
      phase: 'lobby',
      roundIndex: 0,
      locationIds: validIds,
      timerSeconds,
      roundStartedAt: null,
      roundEndsAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await store.setJson(stateKey(roomCode), room);
    const snapshot = await buildSnapshot(store, room, 'host');
    return { status: 201, body: { roomCode, hostToken, snapshot } };
  }

  // Alle øvrige handlinger kræver gyldig roomCode
  const roomCode = normalizeRoomCode(payload.roomCode);
  if (!roomCode) {
    return { status: 400, body: { error: 'Ugyldig rumkode (skal være 4 tegn).' } };
  }
  const room = await store.getJson<StoredRoomState>(stateKey(roomCode));
  if (!room) {
    return { status: 404, body: { error: 'Rummet findes ikke. Tjek koden hos din lærer.' } };
  }

  // 2. Elev deltager i rum
  if (action === 'join_room') {
    if (room.phase === 'finished') {
      return { status: 409, body: { error: 'Spillet i dette rum er allerede afsluttet.' } };
    }
    const playerName = sanitizePlayerName(payload.playerName);
    if (!playerName) {
      return {
        status: 400,
        body: { error: 'Skriv et navn eller makkerpar (1–28 tegn).' },
      };
    }

    const existingPlayers = await loadPlayers(store, roomCode);
    if (existingPlayers.length >= MAX_PLAYERS_PER_ROOM) {
      return { status: 409, body: { error: 'Rummet er fyldt.' } };
    }

    // Undgå navnekollision ved at tilføje diskret nummer hvis samme navn findes
    const lowerSet = new Set(existingPlayers.map((p) => p.name.toLowerCase()));
    let finalName = playerName;
    if (lowerSet.has(finalName.toLowerCase())) {
      let suffix = 2;
      while (lowerSet.has(`${playerName} (${suffix})`.toLowerCase())) {
        suffix++;
      }
      finalName = `${playerName.slice(0, 23)} (${suffix})`;
    }

    const playerId = generatePlayerId();
    const playerToken = generateToken();
    const player: StoredPlayerState = {
      playerId,
      playerToken,
      name: finalName,
      joinedAt: Date.now(),
      unlockedRounds: {},
      rounds: {},
    };

    await store.setJson(playerKey(roomCode, playerId), player);
    const snapshot = await buildSnapshot(store, room, 'player', playerId);
    return { status: 200, body: { roomCode, playerId, playerToken, snapshot } };
  }

  const token = extractBearerToken(headers);

  // 3. Værts-handlinger (kræver hostToken)
  if (
    action === 'host_start_round' ||
    action === 'host_reveal_round' ||
    action === 'host_next_round' ||
    action === 'host_kick_player'
  ) {
    if (!safeTokenEquals(token, room.hostToken)) {
      return { status: 403, body: { error: 'Kun læreren (værten) kan styre rummet.' } };
    }

    const now = Date.now();

    if (action === 'host_kick_player') {
      const targetId = typeof payload.playerId === 'string' ? payload.playerId : '';
      if (!PLAYER_ID_REGEX.test(targetId)) {
        return { status: 400, body: { error: 'Ugyldigt spiller-ID.' } };
      }
      await store.deleteKey(playerKey(roomCode, targetId));
      const snapshot = await buildSnapshot(store, room, 'host');
      return { status: 200, body: { snapshot } };
    }

    if (action === 'host_start_round') {
      if (room.phase !== 'lobby') {
        const snapshot = await buildSnapshot(store, room, 'host');
        return { status: 200, body: { snapshot } };
      }
      room.phase = 'playing';
      room.roundIndex = 0;
      room.roundStartedAt = now;
      room.roundEndsAt = room.timerSeconds > 0 ? now + room.timerSeconds * 1000 : null;
      room.updatedAt = now;
      await store.setJson(stateKey(roomCode), room);
      const snapshot = await buildSnapshot(store, room, 'host');
      return { status: 200, body: { snapshot } };
    }

    if (action === 'host_reveal_round') {
      if (room.phase !== 'playing') {
        const snapshot = await buildSnapshot(store, room, 'host');
        return { status: 200, body: { snapshot } };
      }
      // Registrer 0-points rundepost for spillere der nåede at løse IØ-analyse men ikke nåede kort-gæt
      const players = await loadPlayers(store, roomCode);
      const rKey = String(room.roundIndex);
      const locId = room.locationIds[room.roundIndex] ?? '';
      await Promise.all(
        players.map(async (p) => {
          if (p.rounds[rKey]) return;
          const unlocked = p.unlockedRounds[rKey];
          const analysisAttempts = unlocked?.attempts ?? 0;
          const analysisScore = unlocked?.analysisScore ?? 0;
          p.rounds[rKey] = {
            roundIndex: room.roundIndex,
            locationId: locId,
            analysisAttempts,
            analysisScore,
            guess: null,
            distanceKm: null,
            geoScore: 0,
            hintsUsedCount: 0,
            hintPenalty: 0,
            score: analysisScore,
            submittedAt: now,
          };
          await store.setJson(playerKey(roomCode, p.playerId), p);
        })
      );

      room.phase = 'reveal';
      room.roundEndsAt = null;
      room.updatedAt = now;
      await store.setJson(stateKey(roomCode), room);
      const snapshot = await buildSnapshot(store, room, 'host');
      return { status: 200, body: { snapshot } };
    }

    if (action === 'host_next_round') {
      if (room.phase !== 'reveal') {
        const snapshot = await buildSnapshot(store, room, 'host');
        return { status: 200, body: { snapshot } };
      }
      if (room.roundIndex + 1 >= room.locationIds.length) {
        room.phase = 'finished';
        room.roundStartedAt = null;
        room.roundEndsAt = null;
        room.updatedAt = now;
      } else {
        room.roundIndex += 1;
        room.phase = 'playing';
        room.roundStartedAt = now;
        room.roundEndsAt = room.timerSeconds > 0 ? now + room.timerSeconds * 1000 : null;
        room.updatedAt = now;
      }
      await store.setJson(stateKey(roomCode), room);
      const snapshot = await buildSnapshot(store, room, 'host');
      return { status: 200, body: { snapshot } };
    }
  }

  // 4. Elev-handlinger (kræver gyldig playerToken for netop den spiller)
  if (action === 'player_unlock_analysis' || action === 'player_submit_guess') {
    const playerId = typeof payload.playerId === 'string' ? payload.playerId : '';
    if (!PLAYER_ID_REGEX.test(playerId)) {
      return { status: 400, body: { error: 'Ugyldigt spiller-ID.' } };
    }
    const player = await store.getJson<StoredPlayerState>(playerKey(roomCode, playerId));
    if (!player) {
      return { status: 404, body: { error: 'Du er ikke længere tilmeldt rummet.' } };
    }
    if (!safeTokenEquals(token, player.playerToken)) {
      return { status: 403, body: { error: 'Ugyldig spillersession.' } };
    }

    const roundIndex =
      typeof payload.roundIndex === 'number' && Number.isInteger(payload.roundIndex)
        ? payload.roundIndex
        : -1;

    if (room.phase !== 'playing' || roundIndex !== room.roundIndex) {
      const snapshot = await buildSnapshot(store, room, 'player', playerId);
      return { status: 200, body: { snapshot, stale: true } };
    }

    const rKey = String(roundIndex);

    if (action === 'player_unlock_analysis') {
      // Idempotent: overskriv ikke hvis allerede låst op i denne runde
      if (!player.unlockedRounds[rKey]) {
        const rawAttempts =
          typeof payload.attempts === 'number' && Number.isInteger(payload.attempts)
            ? payload.attempts
            : 1;
        const clampedAttempts = Math.max(1, Math.min(4, rawAttempts));
        const analysisScore = getAnalysisPointsForAttempt(clampedAttempts);
        player.unlockedRounds[rKey] = {
          attempts: clampedAttempts,
          analysisScore,
          unlockedAt: Date.now(),
        };
        await store.setJson(playerKey(roomCode, playerId), player);
      }
      const snapshot = await buildSnapshot(store, room, 'player', playerId);
      return { status: 200, body: { snapshot } };
    }

    if (action === 'player_submit_guess') {
      // Idempotent: hvis spilleren allerede har låst sit gæt, returnér nuværende status
      if (!player.rounds[rKey]) {
        const locationId = room.locationIds[roundIndex];
        const location = LOCATION_BY_ID.get(locationId);
        if (!location) {
          return { status: 500, body: { error: 'Lokation ikke fundet for runden.' } };
        }

        let validatedGuess: { lat: number; lng: number } | null = null;
        if (payload.guess && typeof payload.guess === 'object') {
          const g = payload.guess as Record<string, unknown>;
          if (
            typeof g.lat === 'number' &&
            typeof g.lng === 'number' &&
            Number.isFinite(g.lat) &&
            Number.isFinite(g.lng) &&
            g.lat >= -90 &&
            g.lat <= 90 &&
            g.lng >= -180 &&
            g.lng <= 180
          ) {
            validatedGuess = { lat: g.lat, lng: g.lng };
          }
        }

        const rawHints =
          typeof payload.hintsUsedCount === 'number' &&
          Number.isInteger(payload.hintsUsedCount)
            ? payload.hintsUsedCount
            : 0;
        const hintsUsedCount = Math.max(0, Math.min(3, rawHints));
        const hintPenalty = hintsUsedCount * HINT_COST_POINTS;

        const unlocked = player.unlockedRounds[rKey];
        const analysisAttempts = unlocked?.attempts ?? 0;
        const analysisScore = unlocked?.analysisScore ?? 0;

        const distanceKm = validatedGuess
          ? calculateHaversineDistanceKm(validatedGuess, {
              lat: location.lat,
              lng: location.lng,
            })
          : null;
        const geoScore = distanceKm !== null ? calculateRoundScore(distanceKm) : 0;
        const netScore = Math.max(0, geoScore + analysisScore - hintPenalty);

        player.rounds[rKey] = {
          roundIndex,
          locationId,
          analysisAttempts,
          analysisScore,
          guess: validatedGuess,
          distanceKm,
          geoScore,
          hintsUsedCount,
          hintPenalty,
          score: netScore,
          submittedAt: Date.now(),
        };

        await store.setJson(playerKey(roomCode, playerId), player);
      }

      const snapshot = await buildSnapshot(store, room, 'player', playerId);
      return { status: 200, body: { snapshot } };
    }
  }

  return { status: 400, body: { error: 'Ukendt handling.' } };
}
