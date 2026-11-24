import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Globe2,
  Hash,
  Home,
  Loader2,
  Satellite,
  Users,
} from 'lucide-react';
import type { PublicRoomSnapshot } from '../shared/roomTypes';
import {
  GameLocation,
  LOCATIONS,
  THEME_PACKS,
  ThemePackId,
} from './config/locations';
import { AnalysisUnlockCard } from './components/AnalysisUnlockCard';
import { EconomyPanel, HintGroupId } from './components/EconomyPanel';
import { EndScreen } from './components/EndScreen';
import { GuessMap } from './components/GuessMap';
import { HostRoomView } from './components/HostRoomView';
import { RoundResult, RoundResultRecord } from './components/RoundResult';
import { StartScreen } from './components/StartScreen';
import { StreetViewStage } from './components/StreetViewStage';
import {
  calculateHaversineDistanceKm,
  calculateRoundScore,
  Coordinates,
  formatPoints,
} from './utils/geo';
import {
  CountryEconomicSummary,
  fetchCountrySummary,
} from './utils/oecdData';
import {
  decodeClassCode,
  encodeClassCode,
  readClassCodeFromUrl,
  seededShuffle,
} from './utils/gameCode';
import {
  buildEconomicChallenge,
  HINT_COST_POINTS,
} from './utils/bonusQuestion';
import {
  createRoom,
  fetchRoomAsHost,
  fetchRoomAsPlayer,
  hostKickPlayer,
  hostNextRound,
  hostRevealRound,
  hostStartRound,
  joinRoom,
  playerSubmitGuess,
  playerUnlockAnalysis,
  readRoomCodeFromUrl,
} from './utils/roomApi';

type GamePhase = 'start' | 'playing' | 'roundResult' | 'finished' | 'roomHost' | 'roomPlayer';

interface HostSession {
  roomCode: string;
  hostToken: string;
}

interface PlayerSession {
  roomCode: string;
  playerId: string;
  playerToken: string;
  playerName: string;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const [locations, setLocations] = useState<GameLocation[]>(() => [...LOCATIONS]);
  const [disabledLocationIds, setDisabledLocationIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<GamePhase>('start');

  // Spilindstillinger
  const [packId, setPackId] = useState<ThemePackId>('all');
  const [roundCount, setRoundCount] = useState<number>(5);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [activeClassCode, setActiveClassCode] = useState<string>('');
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);

  // Solo-spils tilstand
  const [sessionLocations, setSessionLocations] = useState<GameLocation[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [results, setResults] = useState<RoundResultRecord[]>([]);

  // Lærerrum (vært + elev) – tokens holdes kun i hukommelsen (ikke localStorage)
  const [hostSession, setHostSession] = useState<HostSession | null>(null);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [roomSnapshot, setRoomSnapshot] = useState<PublicRoomSnapshot | null>(null);
  const [roomActionBusy, setRoomActionBusy] = useState<boolean>(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomNowMs, setRoomNowMs] = useState<number>(() => Date.now());
  const [roomSubmittedRound, setRoomSubmittedRound] = useState<number | null>(null);
  const [roomSubmittingGuess, setRoomSubmittingGuess] = useState<boolean>(false);
  const [roomSummariesByCode, setRoomSummariesByCode] = useState<
    Record<string, CountryEconomicSummary>
  >({});

  // Aktiv rundes UI-tilstand (bruges både i solo og i elev-rum)
  const [selectedGuess, setSelectedGuess] = useState<Coordinates | null>(null);
  const [isStreetViewUnlocked, setIsStreetViewUnlocked] = useState<boolean>(false);
  const [analysisAttempts, setAnalysisAttempts] = useState<number>(0);
  const [analysisScore, setAnalysisScore] = useState<number>(0);
  const [unlockedHints, setUnlockedHints] = useState<HintGroupId[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const [isEconomyPanelOpen, setIsEconomyPanelOpen] = useState<boolean>(true);
  const [stageViewMode, setStageViewMode] = useState<'streetview' | 'aerial'>('streetview');

  const [currentSummary, setCurrentSummary] = useState<CountryEconomicSummary | null>(null);
  const [denmarkSummary, setDenmarkSummary] = useState<CountryEconomicSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const locationsById = useMemo(
    () => new Map(locations.map((loc) => [loc.id, loc])),
    [locations]
  );

  // Indlæs evt. rumkode (?rum=...) eller spilkode (?kode=...) fra URL ved opstart
  useEffect(() => {
    const urlRoom = readRoomCodeFromUrl();
    if (urlRoom) {
      setInitialRoomCode(urlRoom);
      return;
    }
    const urlCode = readClassCodeFromUrl();
    if (!urlCode) return;
    const decoded = decodeClassCode(urlCode, {
      packId: 'all',
      roundCount: 5,
      timerSeconds: 0,
    });
    if (!decoded) return;
    setPackId(decoded.packId);
    setRoundCount(decoded.roundCount);
    setTimerSeconds(decoded.timerSeconds);
    setActiveClassCode(encodeClassCode(decoded));
  }, []);

  // Forudindlæs Danmarks OECD-data i baggrunden til resultatsammenligning
  useEffect(() => {
    fetchCountrySummary('DNK')
      .then(setDenmarkSummary)
      .catch(() => {
        // Ignorer fejl stille
      });
  }, []);

  // Aktiv lokation (solo eller elev-rum)
  const roomLocation: GameLocation | null = useMemo(() => {
    if (phase !== 'roomPlayer' || !roomSnapshot?.currentLocationId) return null;
    return locationsById.get(roomSnapshot.currentLocationId) ?? null;
  }, [phase, roomSnapshot?.currentLocationId, locationsById]);

  const currentLocation: GameLocation | null =
    phase === 'roomPlayer' ? roomLocation : (sessionLocations[currentRoundIndex] ?? null);

  const activeRoundIndex =
    phase === 'roomPlayer' ? (roomSnapshot?.roundIndex ?? 0) : currentRoundIndex;

  const totalScore = useMemo(() => {
    if (phase === 'roomPlayer') {
      return roomSnapshot?.me?.totalScore ?? 0;
    }
    return results.reduce((sum, r) => sum + r.score, 0);
  }, [phase, roomSnapshot?.me?.totalScore, results]);

  // Nulstil elevens lokale runde-UI, når læreren skifter til en ny runde
  const lastRoomRoundRef = useRef<number>(-1);
  useEffect(() => {
    if (phase !== 'roomPlayer' || !roomSnapshot) {
      lastRoomRoundRef.current = -1;
      return;
    }
    if (roomSnapshot.phase === 'playing' && roomSnapshot.roundIndex !== lastRoomRoundRef.current) {
      lastRoomRoundRef.current = roomSnapshot.roundIndex;
      const alreadyUnlocked = Boolean(roomSnapshot.me?.currentRoundUnlocked);
      const alreadySubmitted = Boolean(roomSnapshot.me?.currentRoundSubmitted);
      setSelectedGuess(null);
      setIsStreetViewUnlocked(alreadyUnlocked);
      setAnalysisAttempts(roomSnapshot.me?.currentRoundAnalysisAttempts ?? 0);
      setAnalysisScore(roomSnapshot.me?.currentRoundAnalysisScore ?? 0);
      setUnlockedHints([]);
      setStageViewMode('streetview');
      setIsEconomyPanelOpen(true);
      setRoomSubmittedRound(alreadySubmitted ? roomSnapshot.roundIndex : null);
    }
  }, [phase, roomSnapshot]);

  // Hent faktiske OECD-data for rundens land (både i solo og elev-rum)
  const shouldFetchRoundData =
    (phase === 'playing' && currentLocation !== null) ||
    (phase === 'roomPlayer' &&
      (roomSnapshot?.phase === 'playing' || roomSnapshot?.phase === 'reveal') &&
      currentLocation !== null);

  useEffect(() => {
    if (!shouldFetchRoundData || !currentLocation) return;

    let cancelled = false;
    setIsLoadingData(true);
    setDataError(null);
    setCurrentSummary(null);

    fetchCountrySummary(currentLocation.countryCode)
      .then((analyzed) => {
        if (cancelled) return;
        setCurrentSummary(analyzed);
        setRoomSummariesByCode((prev) => ({
          ...prev,
          [currentLocation.countryCode]: analyzed,
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Ukendt fejl ved indlæsning af OECD-data.';
        setDataError(msg);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchRoundData, currentLocation]);

  // Polling for Lærerskærm (hver 2,5 sek.)
  useEffect(() => {
    if (phase !== 'roomHost' || !hostSession) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const snap = await fetchRoomAsHost(hostSession.roomCode, hostSession.hostToken);
        if (!cancelled) {
          setRoomSnapshot(snap);
          setRoomActionError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setRoomActionError(
            err instanceof Error ? err.message : 'Kunne ikke opdatere rumstatus.'
          );
        }
      }
    };

    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase, hostSession]);

  // Polling for Elev i lærerrum (hver 2,5 sek.)
  useEffect(() => {
    if (phase !== 'roomPlayer' || !playerSession) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const snap = await fetchRoomAsPlayer(
          playerSession.roomCode,
          playerSession.playerId,
          playerSession.playerToken
        );
        if (!cancelled) {
          setRoomSnapshot(snap);
          setRoomActionError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setRoomActionError(
            err instanceof Error ? err.message : 'Mistede kortvarigt forbindelsen til rummet.'
          );
        }
      }
    };

    const interval = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase, playerSession]);

  // Tikkende ur for elev i rum med timer
  useEffect(() => {
    if (phase !== 'roomPlayer' || roomSnapshot?.phase !== 'playing' || !roomSnapshot.roundEndsAt) {
      return;
    }
    setRoomNowMs(Date.now());
    const id = window.setInterval(() => setRoomNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [phase, roomSnapshot?.phase, roomSnapshot?.roundEndsAt]);

  const roomRemainingSeconds = useMemo(() => {
    if (phase !== 'roomPlayer' || !roomSnapshot?.roundEndsAt) return null;
    const offset = roomSnapshot.serverNow - roomNowMs;
    return Math.max(0, Math.ceil((roomSnapshot.roundEndsAt - (roomNowMs + offset)) / 1000));
  }, [phase, roomSnapshot?.roundEndsAt, roomSnapshot?.serverNow, roomNowMs]);

  const currentChallenge = useMemo(
    () => buildEconomicChallenge(currentSummary, activeRoundIndex),
    [currentSummary, activeRoundIndex]
  );

  // Solo: afslut runde
  const finishSoloRound = useCallback(
    (guessCoords: Coordinates | null, timedOut: boolean) => {
      if (!currentLocation) return;

      const distanceKm = guessCoords
        ? calculateHaversineDistanceKm(guessCoords, {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          })
        : null;
      const geoScore = distanceKm !== null ? calculateRoundScore(distanceKm) : 0;
      const hintPenalty = unlockedHints.length * HINT_COST_POINTS;
      const netScore = Math.max(0, geoScore + analysisScore - hintPenalty);

      const record: RoundResultRecord = {
        roundNumber: currentRoundIndex + 1,
        location: currentLocation,
        guess: guessCoords,
        timedOut,
        distanceKm,
        geoScore,
        analysisAttempts,
        analysisScore,
        hintsUsed: [...unlockedHints],
        hintPenalty,
        score: netScore,
        summary: currentSummary,
      };

      setResults((prev) => [...prev, record]);
      setPhase('roundResult');
    },
    [
      currentLocation,
      unlockedHints,
      analysisScore,
      analysisAttempts,
      currentRoundIndex,
      currentSummary,
    ]
  );

  // Ref til sikker auto-afslutning ved solo-timer
  const finishSoloRoundRef = useRef(finishSoloRound);
  finishSoloRoundRef.current = finishSoloRound;
  const selectedGuessRef = useRef(selectedGuess);
  selectedGuessRef.current = selectedGuess;

  // Solo nedtællingstimer
  useEffect(() => {
    if (phase !== 'playing' || timerSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            finishSoloRoundRef.current(selectedGuessRef.current, true);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, timerSeconds, currentRoundIndex]);

  // Handlers til StartScreen (solo + klassekode)
  const handleApplyClassCode = useCallback(
    (rawCode: string) => {
      const decoded = decodeClassCode(rawCode, {
        packId,
        roundCount,
        timerSeconds,
      });
      if (!decoded) return;
      setPackId(decoded.packId);
      setRoundCount(decoded.roundCount);
      setTimerSeconds(decoded.timerSeconds);
      setActiveClassCode(encodeClassCode(decoded));
    },
    [packId, roundCount, timerSeconds]
  );

  const handleClearClassCode = useCallback(() => {
    setActiveClassCode('');
  }, []);

  const handleChangePackId = useCallback(
    (nextPackId: ThemePackId) => {
      setPackId(nextPackId);
      const pack = THEME_PACKS.find((p) => p.id === nextPackId) ?? THEME_PACKS[0];
      const disabledSet = new Set(disabledLocationIds);
      const availableCount = locations.filter(
        (loc) => !disabledSet.has(loc.id) && pack.filter(loc)
      ).length;
      const clampedRounds = Math.max(1, Math.min(roundCount, availableCount));
      setRoundCount(clampedRounds);
      if (activeClassCode) {
        const decoded = decodeClassCode(activeClassCode, {
          packId: nextPackId,
          roundCount: clampedRounds,
          timerSeconds,
        });
        if (decoded) {
          setActiveClassCode(
            encodeClassCode({
              packId: nextPackId,
              roundCount: clampedRounds,
              timerSeconds,
              seed: decoded.seed,
            })
          );
        }
      }
    },
    [locations, disabledLocationIds, roundCount, timerSeconds, activeClassCode]
  );

  const handleChangeRoundCount = useCallback(
    (nextCount: number) => {
      setRoundCount(nextCount);
      if (activeClassCode) {
        const decoded = decodeClassCode(activeClassCode, {
          packId,
          roundCount: nextCount,
          timerSeconds,
        });
        if (decoded) {
          setActiveClassCode(
            encodeClassCode({
              packId,
              roundCount: nextCount,
              timerSeconds,
              seed: decoded.seed,
            })
          );
        }
      }
    },
    [packId, timerSeconds, activeClassCode]
  );

  const handleChangeTimerSeconds = useCallback(
    (nextSeconds: number) => {
      setTimerSeconds(nextSeconds);
      if (activeClassCode) {
        const decoded = decodeClassCode(activeClassCode, {
          packId,
          roundCount,
          timerSeconds: nextSeconds,
        });
        if (decoded) {
          setActiveClassCode(
            encodeClassCode({
              packId,
              roundCount,
              timerSeconds: nextSeconds,
              seed: decoded.seed,
            })
          );
        }
      }
    },
    [packId, roundCount, activeClassCode]
  );

  const handleToggleLocationEnabled = useCallback((id: string) => {
    setDisabledLocationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const startNewSoloGame = useCallback(() => {
    const pack = THEME_PACKS.find((p) => p.id === packId) ?? THEME_PACKS[0];
    const disabledSet = new Set(disabledLocationIds);
    const pool = locations.filter(
      (loc) => !disabledSet.has(loc.id) && pack.filter(loc)
    );
    if (pool.length === 0) return;

    const count = Math.min(roundCount, pool.length);
    const ordered = seededShuffle(pool, activeClassCode || undefined).slice(0, count);

    setSessionLocations(ordered);
    setCurrentRoundIndex(0);
    setResults([]);
    setSelectedGuess(null);
    setIsStreetViewUnlocked(false);
    setAnalysisAttempts(0);
    setAnalysisScore(0);
    setUnlockedHints([]);
    setSecondsLeft(timerSeconds);
    setIsEconomyPanelOpen(true);
    setStageViewMode('streetview');
    setPhase('playing');
  }, [locations, disabledLocationIds, packId, roundCount, activeClassCode, timerSeconds]);

  // Lærer: opret nyt klasserum
  const handleCreateRoom = useCallback(async () => {
    const pack = THEME_PACKS.find((p) => p.id === packId) ?? THEME_PACKS[0];
    const disabledSet = new Set(disabledLocationIds);
    const pool = locations.filter(
      (loc) => !disabledSet.has(loc.id) && pack.filter(loc)
    );
    if (pool.length === 0) return;

    const count = Math.min(roundCount, pool.length);
    const ordered = seededShuffle(pool).slice(0, count);

    setRoomActionBusy(true);
    setRoomActionError(null);
    try {
      const res = await createRoom({
        packName: pack.nameDa,
        locationIds: ordered.map((l) => l.id),
        timerSeconds,
      });
      setHostSession({ roomCode: res.roomCode, hostToken: res.hostToken });
      setPlayerSession(null);
      setRoomSnapshot(res.snapshot);
      setPhase('roomHost');
    } catch (err: unknown) {
      setRoomActionError(
        err instanceof Error ? err.message : 'Kunne ikke oprette lærerrum.'
      );
    } finally {
      setRoomActionBusy(false);
    }
  }, [locations, disabledLocationIds, packId, roundCount, timerSeconds]);

  // Elev: deltag i lærerrum
  const handleJoinRoom = useCallback(async (roomCode: string, playerName: string) => {
    setRoomActionBusy(true);
    setRoomActionError(null);
    try {
      const res = await joinRoom({ roomCode, playerName });
      setPlayerSession({
        roomCode: res.roomCode,
        playerId: res.playerId,
        playerToken: res.playerToken,
        playerName: res.snapshot.me?.name ?? playerName.trim(),
      });
      setHostSession(null);
      setRoomSnapshot(res.snapshot);
      setRoomSubmittedRound(null);
      setRoomSummariesByCode({});
      setPhase('roomPlayer');
    } catch (err: unknown) {
      setRoomActionError(
        err instanceof Error ? err.message : 'Kunne ikke tilslutte til rummet.'
      );
    } finally {
      setRoomActionBusy(false);
    }
  }, []);

  // Værtshandlinger
  const runHostAction = useCallback(
    async (fn: (roomCode: string, hostToken: string) => Promise<PublicRoomSnapshot>) => {
      if (!hostSession) return;
      setRoomActionBusy(true);
      setRoomActionError(null);
      try {
        const snap = await fn(hostSession.roomCode, hostSession.hostToken);
        setRoomSnapshot(snap);
      } catch (err: unknown) {
        setRoomActionError(
          err instanceof Error ? err.message : 'Handlingen mislykkedes.'
        );
      } finally {
        setRoomActionBusy(false);
      }
    },
    [hostSession]
  );

  const handleHostStartRound = useCallback(
    () => void runHostAction(hostStartRound),
    [runHostAction]
  );

  const handleHostRevealRound = useCallback(
    () => void runHostAction(hostRevealRound),
    [runHostAction]
  );

  const handleHostNextRound = useCallback(
    () => void runHostAction(hostNextRound),
    [runHostAction]
  );

  const handleHostKickPlayer = useCallback(
    (playerId: string) => {
      void runHostAction((code, token) => hostKickPlayer(code, token, playerId));
    },
    [runHostAction]
  );

  const handleLeaveRoom = useCallback(() => {
    setHostSession(null);
    setPlayerSession(null);
    setRoomSnapshot(null);
    setRoomActionError(null);
    setRoomSubmittedRound(null);
    setPhase('start');
  }, []);

  // Elev + Solo: lås Street View op via IØ-analyse
  const handleAnalysisUnlocked = useCallback(
    (attemptsUsed: number, pointsEarned: number) => {
      setAnalysisAttempts(attemptsUsed);
      setAnalysisScore(pointsEarned);
      setIsStreetViewUnlocked(true);

      if (phase === 'roomPlayer' && playerSession && roomSnapshot) {
        void playerUnlockAnalysis({
          roomCode: playerSession.roomCode,
          playerId: playerSession.playerId,
          playerToken: playerSession.playerToken,
          roundIndex: roomSnapshot.roundIndex,
          attempts: attemptsUsed,
        })
          .then(setRoomSnapshot)
          .catch(() => {
            // Ignorer midlertidig fejl – næste handling eller poll synkroniserer
          });
      }
    },
    [phase, playerSession, roomSnapshot]
  );

  // Elev + Solo: lås gæt på kortet
  const handleLockGuess = useCallback(() => {
    if (!selectedGuess) return;

    if (phase === 'roomPlayer' && playerSession && roomSnapshot) {
      setRoomSubmittingGuess(true);
      void playerSubmitGuess({
        roomCode: playerSession.roomCode,
        playerId: playerSession.playerId,
        playerToken: playerSession.playerToken,
        roundIndex: roomSnapshot.roundIndex,
        guess: selectedGuess,
        hintsUsedCount: unlockedHints.length,
      })
        .then((snap) => {
          setRoomSnapshot(snap);
          setRoomSubmittedRound(roomSnapshot.roundIndex);
        })
        .catch((err: unknown) => {
          setRoomActionError(
            err instanceof Error ? err.message : 'Kunne ikke sende dit gæt. Prøv igen.'
          );
        })
        .finally(() => {
          setRoomSubmittingGuess(false);
        });
      return;
    }

    finishSoloRound(selectedGuess, false);
  }, [selectedGuess, phase, playerSession, roomSnapshot, unlockedHints.length, finishSoloRound]);

  const handleUnlockHint = useCallback((hintId: HintGroupId) => {
    setUnlockedHints((prev) => (prev.includes(hintId) ? prev : [...prev, hintId]));
  }, []);

  const handleNextSoloRound = useCallback(() => {
    if (currentRoundIndex + 1 >= sessionLocations.length) {
      setPhase('finished');
      return;
    }
    setCurrentRoundIndex((idx) => idx + 1);
    setSelectedGuess(null);
    setIsStreetViewUnlocked(false);
    setAnalysisAttempts(0);
    setAnalysisScore(0);
    setUnlockedHints([]);
    setSecondsLeft(timerSeconds);
    setStageViewMode('streetview');
    setIsEconomyPanelOpen(true);
    setPhase('playing');
  }, [currentRoundIndex, sessionLocations.length, timerSeconds]);

  const handleUpdateLocationUrl = useCallback((id: string, newUrl: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, streetViewEmbedUrl: newUrl } : loc
      )
    );
  }, []);

  const handleResetLocations = useCallback(() => {
    setLocations([...LOCATIONS]);
    setDisabledLocationIds([]);
  }, []);

  // =========================================================================
  // RENDER: STARTSKÆRM
  // =========================================================================
  if (phase === 'start') {
    return (
      <StartScreen
        locations={locations}
        disabledLocationIds={disabledLocationIds}
        onToggleLocationEnabled={handleToggleLocationEnabled}
        packId={packId}
        onChangePackId={handleChangePackId}
        roundCount={roundCount}
        onChangeRoundCount={handleChangeRoundCount}
        timerSeconds={timerSeconds}
        onChangeTimerSeconds={handleChangeTimerSeconds}
        activeClassCode={activeClassCode}
        onApplyClassCode={handleApplyClassCode}
        onClearClassCode={handleClearClassCode}
        onStartGame={startNewSoloGame}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        initialRoomCode={initialRoomCode}
        roomActionBusy={roomActionBusy}
        roomActionError={roomActionError}
        onUpdateLocationUrl={handleUpdateLocationUrl}
        onResetLocations={handleResetLocations}
      />
    );
  }

  // =========================================================================
  // RENDER: LÆRERSKÆRM (VÆRT)
  // =========================================================================
  if (phase === 'roomHost' && roomSnapshot) {
    return (
      <HostRoomView
        snapshot={roomSnapshot}
        locationsById={locationsById}
        isBusy={roomActionBusy}
        error={roomActionError}
        onStartRound={handleHostStartRound}
        onRevealRound={handleHostRevealRound}
        onNextRound={handleHostNextRound}
        onKickPlayer={handleHostKickPlayer}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // =========================================================================
  // RENDER: SOLO SLUTSKÆRM
  // =========================================================================
  if (phase === 'finished') {
    return (
      <EndScreen
        results={results}
        activeClassCode={activeClassCode}
        onPlayAgain={startNewSoloGame}
        onBackToStart={() => setPhase('start')}
      />
    );
  }

  // =========================================================================
  // RENDER: ELEV I LÆRERRUM (LOBBY / FINISHED)
  // =========================================================================
  if (phase === 'roomPlayer' && roomSnapshot && playerSession) {
    if (roomSnapshot.phase === 'lobby') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#090D16] px-4 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#101829] p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Rum {roomSnapshot.roomCode} · {roomSnapshot.packName}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-white">
              Velkommen, {playerSession.playerName}!
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Du er klar i lobbyen. Hold øje med tavlen – spillet går automatisk i gang, så snart
              din lærer starter runde 1.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#090D16] px-4 py-3 text-xs text-slate-300">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-white tabular-nums">
                {roomSnapshot.players.length}
              </span>
              <span>
                {roomSnapshot.players.length === 1 ? 'deltager' : 'deltagere'} i rummet ·{' '}
                {roomSnapshot.totalRounds} runder
              </span>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Venter på læreren…</span>
            </div>

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="mt-6 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Forlad rum
            </button>
          </div>
        </div>
      );
    }

    if (roomSnapshot.phase === 'finished') {
      const myRounds = roomSnapshot.me?.rounds ?? [];
      const endRecords: RoundResultRecord[] = roomSnapshot.locationIds
        .map((locId, idx): RoundResultRecord | null => {
          const loc = locationsById.get(locId);
          if (!loc) return null;
          const r = myRounds.find((item) => item.roundIndex === idx);
          return {
            roundNumber: idx + 1,
            location: loc,
            guess: r?.guess ?? null,
            timedOut: !r?.guess,
            distanceKm: r?.distanceKm ?? null,
            geoScore: r?.geoScore ?? 0,
            analysisAttempts: r?.analysisAttempts ?? 0,
            analysisScore: r?.analysisScore ?? 0,
            hintsUsed: [],
            hintPenalty: r?.hintPenalty ?? 0,
            score: r?.score ?? 0,
            summary: roomSummariesByCode[loc.countryCode] ?? null,
          };
        })
        .filter((x): x is RoundResultRecord => x !== null);

      return (
        <EndScreen
          results={endRecords}
          activeClassCode={`RUM ${roomSnapshot.roomCode}`}
          onPlayAgain={handleLeaveRoom}
          onBackToStart={handleLeaveRoom}
          roomLeaderboard={{
            roomCode: roomSnapshot.roomCode,
            myPlayerId: playerSession.playerId,
            players: roomSnapshot.players,
          }}
        />
      );
    }
  }

  // =========================================================================
  // RENDER: AKTIV SPILSKÆRM & RUNDERESULTAT (BÅDE SOLO OG ELEV I LÆRERRUM)
  // =========================================================================
  const isRoomPlayer = phase === 'roomPlayer' && roomSnapshot !== null && playerSession !== null;
  const isPlayingView =
    phase === 'playing' || (isRoomPlayer && roomSnapshot.phase === 'playing');
  const isResultView =
    phase === 'roundResult' || (isRoomPlayer && roomSnapshot.phase === 'reveal');

  const hasSubmittedCurrentRoomRound =
    isRoomPlayer &&
    (roomSubmittedRound === roomSnapshot.roundIndex ||
      Boolean(roomSnapshot.me?.currentRoundSubmitted));

  const activeTimerSeconds = isRoomPlayer
    ? roomRemainingSeconds
    : timerSeconds > 0
      ? secondsLeft
      : null;
  const isTimerUrgent = activeTimerSeconds !== null && activeTimerSeconds <= 15;
  const isTimerWarn =
    activeTimerSeconds !== null && activeTimerSeconds <= 35 && activeTimerSeconds > 15;

  const totalRoundsCount = isRoomPlayer
    ? roomSnapshot.totalRounds
    : sessionLocations.length;

  // Byg result-objekt for enten solo eller elev i lærerrum (reveal)
  let displayResult: RoundResultRecord | null = null;
  let roomRankInfo: { roomCode: string; playerRank: number; totalPlayers: number } | null =
    null;

  if (phase === 'roundResult') {
    displayResult = results[results.length - 1] ?? null;
  } else if (isRoomPlayer && roomSnapshot.phase === 'reveal' && roomLocation) {
    const serverRes = roomSnapshot.me?.currentRoundResult ?? null;
    displayResult = {
      roundNumber: roomSnapshot.roundIndex + 1,
      location: roomLocation,
      guess: serverRes?.guess ?? null,
      timedOut: !serverRes?.guess,
      distanceKm: serverRes?.distanceKm ?? null,
      geoScore: serverRes?.geoScore ?? 0,
      analysisAttempts: serverRes?.analysisAttempts ?? analysisAttempts,
      analysisScore: serverRes?.analysisScore ?? analysisScore,
      hintsUsed: unlockedHints,
      hintPenalty: serverRes?.hintPenalty ?? unlockedHints.length * HINT_COST_POINTS,
      score: serverRes?.score ?? 0,
      summary: currentSummary,
    };
    const rankIdx = roomSnapshot.players.findIndex(
      (p) => p.playerId === playerSession.playerId
    );
    roomRankInfo = {
      roomCode: roomSnapshot.roomCode,
      playerRank: rankIdx >= 0 ? rankIdx + 1 : roomSnapshot.players.length,
      totalPlayers: roomSnapshot.players.length,
    };
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#090D16] text-slate-100">
      {/* Fast øverste HUD-linje */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-slate-800/90 bg-[#090D16]/94 px-3.5 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={isRoomPlayer ? handleLeaveRoom : () => setPhase('start')}
            title={isRoomPlayer ? 'Forlad klasserum' : 'Tilbage til startskærm'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#101829] text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <Home className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <Globe2 className="hidden h-4 w-4 text-emerald-400 sm:block" />
            <span className="text-sm font-bold tracking-tight text-white">
              OECD GeoGuessr
            </span>
          </div>

          <span className="text-slate-700">/</span>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <span>Runde</span>
            <span className="font-mono text-sm font-bold text-white tabular-nums">
              {activeRoundIndex + 1}/{totalRoundsCount}
            </span>
          </div>

          {isRoomPlayer ? (
            <span className="hidden items-center gap-1.5 font-mono text-[11px] text-amber-300/95 md:inline-flex">
              <span>RUM {roomSnapshot.roomCode}</span>
              <span className="text-slate-600">·</span>
              <span className="font-sans font-medium text-slate-300">
                {playerSession.playerName}
              </span>
            </span>
          ) : (
            activeClassCode && (
              <span className="hidden items-center gap-1 font-mono text-[11px] text-amber-300/90 lg:inline-flex">
                <Hash className="h-3 w-3" />
                {activeClassCode}
              </span>
            )
          )}
        </div>

        {/* Højre side: Timer, Kontroller og samlet score */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isPlayingView && activeTimerSeconds !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums ${
                isTimerUrgent
                  ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
                  : isTimerWarn
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                    : 'border-slate-800 bg-[#101829] text-slate-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatCountdown(activeTimerSeconds)}</span>
            </div>
          )}

          {isPlayingView && isStreetViewUnlocked && !hasSubmittedCurrentRoomRound && (
            <button
              type="button"
              onClick={() =>
                setStageViewMode((m) =>
                  m === 'streetview' ? 'aerial' : 'streetview'
                )
              }
              title="Skift mellem Google Street View og luftfoto uden stednavne"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-[#101829] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white md:flex"
            >
              {stageViewMode === 'streetview' ? (
                <>
                  <Satellite className="h-3.5 w-3.5 text-slate-400" />
                  <span>Luftfoto</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Street View</span>
                </>
              )}
            </button>
          )}

          {isPlayingView && !hasSubmittedCurrentRoomRound && (
            <button
              type="button"
              onClick={() => setIsEconomyPanelOpen((open) => !open)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isEconomyPanelOpen
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-[#101829] text-slate-200 hover:border-slate-600 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{isEconomyPanelOpen ? 'Skjul økonomi' : 'Økonomi-panel'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5">
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Samlet score
            </span>
            <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
              {formatPoints(totalScore)}
            </span>
          </div>
        </div>
      </header>

      {/* Spilskærm */}
      {isPlayingView && currentLocation && (
        <main className="h-full w-full pt-[56px]">
          <StreetViewStage
            location={currentLocation}
            viewMode={stageViewMode}
            isLocked={!isStreetViewUnlocked || hasSubmittedCurrentRoomRound}
          />

          {!hasSubmittedCurrentRoomRound && (
            <EconomyPanel
              summary={currentSummary}
              isLoading={isLoadingData}
              error={dataError}
              isOpen={isEconomyPanelOpen}
              onClose={() => setIsEconomyPanelOpen(false)}
              unlockedHints={unlockedHints}
              onUnlockHint={handleUnlockHint}
            />
          )}

          {hasSubmittedCurrentRoomRound ? (
            /* Elev har låst sit gæt – venter på at læreren afslutter runden */
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#090D16]/70 px-4 pt-[56px] backdrop-blur-md">
              <div className="w-full max-w-md rounded-2xl border border-emerald-500/35 bg-[#101829] p-7 text-center shadow-2xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-extrabold text-white">
                  Dit gæt er låst!
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Venter på at resten af klassen bliver færdig, og at din lærer viser facit og
                  live scoreboard på tavlen.
                </p>
                {isRoomPlayer && (
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#090D16] px-4 py-2.5 font-mono text-xs text-slate-300 tabular-nums">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    <span>
                      {roomSnapshot.players.filter((p) => p.currentRoundSubmitted).length} /{' '}
                      {roomSnapshot.players.length} har låst deres gæt
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : !isStreetViewUnlocked ? (
            <AnalysisUnlockCard
              key={`${currentLocation.id}-${activeRoundIndex}`}
              challenge={currentChallenge}
              isLoading={isLoadingData}
              onUnlocked={handleAnalysisUnlocked}
            />
          ) : (
            <GuessMap
              selectedGuess={selectedGuess}
              onSelectGuess={setSelectedGuess}
              onLockGuess={roomSubmittingGuess ? () => {} : handleLockGuess}
              roundKey={`${currentLocation.id}-${activeRoundIndex}`}
            />
          )}
        </main>
      )}

      {/* Resultatskærm efter hver runde */}
      {isResultView && displayResult && (
        <RoundResult
          result={displayResult}
          denmarkSummary={denmarkSummary}
          totalRounds={totalRoundsCount}
          totalScore={totalScore}
          isLastRound={activeRoundIndex + 1 >= totalRoundsCount}
          onNext={handleNextSoloRound}
          roomInfo={roomRankInfo}
        />
      )}
    </div>
  );
}
