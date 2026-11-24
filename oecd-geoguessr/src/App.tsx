import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Clock, Eye, Globe2, Hash, Home, Satellite } from 'lucide-react';
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

type GamePhase = 'start' | 'playing' | 'roundResult' | 'finished';

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
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

  // Aktivt spils tilstand
  const [sessionLocations, setSessionLocations] = useState<GameLocation[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [results, setResults] = useState<RoundResultRecord[]>([]);

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

  // Indlæs evt. klassekode fra URL (?kode=...) ved opstart
  useEffect(() => {
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

  const currentLocation: GameLocation | null =
    sessionLocations[currentRoundIndex] ?? null;

  const totalScore = useMemo(
    () => results.reduce((sum, r) => sum + r.score, 0),
    [results]
  );

  // Hent faktiske OECD-data for rundens land når runden skifter
  useEffect(() => {
    if (phase !== 'playing' || !currentLocation) return;

    let cancelled = false;
    setIsLoadingData(true);
    setDataError(null);
    setCurrentSummary(null);

    fetchCountrySummary(currentLocation.countryCode)
      .then((analyzed) => {
        if (cancelled) return;
        setCurrentSummary(analyzed);
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
  }, [phase, currentLocation]);

  const currentChallenge = useMemo(
    () => buildEconomicChallenge(currentSummary, currentRoundIndex),
    [currentSummary, currentRoundIndex]
  );

  const finishRound = useCallback(
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

  // Ref til sikker auto-afslutning ved timer-udløb
  const finishRoundRef = useRef(finishRound);
  finishRoundRef.current = finishRound;
  const selectedGuessRef = useRef(selectedGuess);
  selectedGuessRef.current = selectedGuess;

  // Valgfri nedtællingstimer under runden
  useEffect(() => {
    if (phase !== 'playing' || timerSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            finishRoundRef.current(selectedGuessRef.current, true);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, timerSeconds, currentRoundIndex]);

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

  const startNewGame = useCallback(() => {
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
  }, [
    locations,
    disabledLocationIds,
    packId,
    roundCount,
    activeClassCode,
    timerSeconds,
  ]);

  const handleAnalysisUnlocked = useCallback(
    (attemptsUsed: number, pointsEarned: number) => {
      setAnalysisAttempts(attemptsUsed);
      setAnalysisScore(pointsEarned);
      setIsStreetViewUnlocked(true);
    },
    []
  );

  const handleLockGuess = useCallback(() => {
    if (!selectedGuess) return;
    finishRound(selectedGuess, false);
  }, [selectedGuess, finishRound]);

  const handleUnlockHint = useCallback((hintId: HintGroupId) => {
    setUnlockedHints((prev) => (prev.includes(hintId) ? prev : [...prev, hintId]));
  }, []);

  const handleNextRound = useCallback(() => {
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
        onStartGame={startNewGame}
        onUpdateLocationUrl={handleUpdateLocationUrl}
        onResetLocations={handleResetLocations}
      />
    );
  }

  if (phase === 'finished') {
    return (
      <EndScreen
        results={results}
        activeClassCode={activeClassCode}
        onPlayAgain={startNewGame}
        onBackToStart={() => setPhase('start')}
      />
    );
  }

  const latestResult = results[results.length - 1] ?? null;
  const isTimerUrgent = timerSeconds > 0 && secondsLeft <= 15;
  const isTimerWarn = timerSeconds > 0 && secondsLeft <= 35 && secondsLeft > 15;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#090D16] text-slate-100">
      {/* Fast øverste HUD-linje under spil og runderesultat */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-slate-800/90 bg-[#090D16]/94 px-3.5 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setPhase('start')}
            title="Tilbage til startskærm"
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
              {currentRoundIndex + 1}/{sessionLocations.length}
            </span>
          </div>

          {activeClassCode && (
            <span className="hidden items-center gap-1 font-mono text-[11px] text-amber-300/90 lg:inline-flex">
              <Hash className="h-3 w-3" />
              {activeClassCode}
            </span>
          )}
        </div>

        {/* Højre side: Timer, Kontroller og samlet score */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {phase === 'playing' && timerSeconds > 0 && (
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
              <span>{formatCountdown(secondsLeft)}</span>
            </div>
          )}

          {phase === 'playing' && isStreetViewUnlocked && (
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

          {phase === 'playing' && (
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
      {phase === 'playing' && currentLocation && (
        <main className="h-full w-full pt-[56px]">
          <StreetViewStage
            location={currentLocation}
            viewMode={stageViewMode}
            isLocked={!isStreetViewUnlocked}
          />

          <EconomyPanel
            summary={currentSummary}
            isLoading={isLoadingData}
            error={dataError}
            isOpen={isEconomyPanelOpen}
            onClose={() => setIsEconomyPanelOpen(false)}
            unlockedHints={unlockedHints}
            onUnlockHint={handleUnlockHint}
          />

          {!isStreetViewUnlocked ? (
            <AnalysisUnlockCard
              key={`${currentLocation.id}-${currentRoundIndex}`}
              challenge={currentChallenge}
              isLoading={isLoadingData}
              onUnlocked={handleAnalysisUnlocked}
            />
          ) : (
            <GuessMap
              selectedGuess={selectedGuess}
              onSelectGuess={setSelectedGuess}
              onLockGuess={handleLockGuess}
              roundKey={`${currentLocation.id}-${currentRoundIndex}`}
            />
          )}
        </main>
      )}

      {/* Resultatskærm efter hver runde */}
      {phase === 'roundResult' && latestResult && (
        <RoundResult
          result={latestResult}
          denmarkSummary={denmarkSummary}
          totalRounds={sessionLocations.length}
          totalScore={totalScore}
          isLastRound={currentRoundIndex + 1 >= sessionLocations.length}
          onNext={handleNextRound}
        />
      )}
    </div>
  );
}
