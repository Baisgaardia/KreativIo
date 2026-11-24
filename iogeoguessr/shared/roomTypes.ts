export type RoomPhase = 'lobby' | 'playing' | 'reveal' | 'finished';

export interface RoomRoundResult {
  roundIndex: number;
  locationId: string;
  analysisAttempts: number;
  analysisScore: number;
  guess: { lat: number; lng: number } | null;
  distanceKm: number | null;
  geoScore: number;
  hintsUsedCount: number;
  hintPenalty: number;
  score: number;
  submittedAt: number;
}

export interface PublicPlayerSnapshot {
  playerId: string;
  name: string;
  joinedAt: number;
  totalScore: number;
  totalGeoScore: number;
  totalAnalysisScore: number;
  firstTryCount: number;
  avgDistanceKm: number | null;
  /** Fremdrift for den aktuelle runde */
  currentRoundUnlocked: boolean;
  currentRoundAnalysisAttempts: number;
  currentRoundAnalysisScore: number;
  currentRoundSubmitted: boolean;
  /** Udfyldes kun i reveal/finished (eller for spillerens eget view) */
  currentRoundResult: RoomRoundResult | null;
  /** Alle runderesultater (sendes i finished-fasen eller til spilleren selv) */
  rounds?: RoomRoundResult[];
}

export interface PublicRoomSnapshot {
  roomCode: string;
  packName: string;
  phase: RoomPhase;
  roundIndex: number;
  totalRounds: number;
  locationIds: string[];
  currentLocationId: string | null;
  timerSeconds: number;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  serverNow: number;
  players: PublicPlayerSnapshot[];
  /** Hvis kalderen er spiller med gyldig token, returneres spillerens egne runder */
  me?: PublicPlayerSnapshot | null;
}

export interface CreateRoomResponse {
  roomCode: string;
  hostToken: string;
  snapshot: PublicRoomSnapshot;
}

export interface JoinRoomResponse {
  roomCode: string;
  playerId: string;
  playerToken: string;
  snapshot: PublicRoomSnapshot;
}
