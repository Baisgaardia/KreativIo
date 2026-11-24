import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Flag,
  Globe2,
  GraduationCap,
  Link2,
  LogOut,
  MapPin,
  Medal,
  MessageSquareQuote,
  Play,
  Trophy,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import type { PublicRoomSnapshot } from '../../shared/roomTypes';
import type { GameLocation } from '../config/locations';
import {
  getCountryNameDa,
  getCurrencyRegimeLabel,
} from '../data/oecdTranslations';
import { formatDistanceKm, formatPoints } from '../utils/geo';
import {
  buildFactualEconomicSummary,
  CountryEconomicSummary,
  fetchCountrySummary,
} from '../utils/oecdData';
import { buildRoomJoinUrl } from '../utils/roomApi';

interface HostRoomViewProps {
  snapshot: PublicRoomSnapshot;
  locationsById: Map<string, GameLocation>;
  isBusy: boolean;
  error: string | null;
  onStartRound: () => void;
  onRevealRound: () => void;
  onNextRound: () => void;
  onKickPlayer: (playerId: string) => void;
  onLeaveRoom: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function createTargetPin(label: string): L.DivIcon {
  const safeLabel = escapeHtml(label);
  return L.divIcon({
    className: 'oecd-host-target-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="
          background:#064E3B;
          color:#ECFDF5;
          border:1.5px solid #34D399;
          font-family:'DM Sans',sans-serif;
          font-size:12px;
          font-weight:700;
          padding:3px 10px;
          border-radius:7px;
          white-space:nowrap;
          margin-bottom:5px;
          box-shadow:0 6px 18px rgba(0,0,0,0.5);
        ">${safeLabel}</div>
        <div style="
          width:22px;
          height:22px;
          border-radius:9999px;
          background:#10B981;
          border:3px solid #ffffff;
          box-shadow:0 4px 16px rgba(16,185,129,0.75);
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createStudentPin(label: string | null): L.DivIcon {
  const safeLabel = label ? escapeHtml(label) : '';
  return L.divIcon({
    className: 'oecd-host-student-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        ${
          safeLabel
            ? `<div style="
                background:#090D16;
                color:#E2E8F0;
                border:1px solid #38BDF8;
                font-family:'DM Sans',sans-serif;
                font-size:10.5px;
                font-weight:600;
                padding:1px 7px;
                border-radius:5px;
                white-space:nowrap;
                margin-bottom:4px;
                box-shadow:0 3px 10px rgba(0,0,0,0.45);
              ">${safeLabel}</div>`
            : ''
        }
        <div style="
          width:14px;
          height:14px;
          border-radius:9999px;
          background:#0EA5E9;
          border:2.5px solid #ffffff;
          box-shadow:0 3px 10px rgba(14,165,233,0.6);
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function HostRoomView({
  snapshot,
  locationsById,
  isBusy,
  error,
  onStartRound,
  onRevealRound,
  onNextRound,
  onKickPlayer,
  onLeaveRoom,
}: HostRoomViewProps) {
  const [copiedType, setCopiedType] = useState<'code' | 'link' | 'results' | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showNamesOnMap, setShowNamesOnMap] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [revealedSummary, setRevealedSummary] = useState<CountryEconomicSummary | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Tikkende ur til nedtælling i playing-fasen
  useEffect(() => {
    if (snapshot.phase !== 'playing' || !snapshot.roundEndsAt) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [snapshot.phase, snapshot.roundEndsAt]);

  const currentLocation: GameLocation | null = snapshot.currentLocationId
    ? (locationsById.get(snapshot.currentLocationId) ?? null)
    : null;

  // Hent faktiske OECD-tal for landet i reveal-fasen til storskærmen
  useEffect(() => {
    if (snapshot.phase !== 'reveal' || !currentLocation) {
      setRevealedSummary(null);
      return;
    }
    let cancelled = false;
    fetchCountrySummary(currentLocation.countryCode)
      .then((s) => {
        if (!cancelled) setRevealedSummary(s);
      })
      .catch(() => {
        if (!cancelled) setRevealedSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot.phase, currentLocation]);

  // Byg Leaflet-kort med alle elevers gæt + det rigtige land i reveal-fasen
  useEffect(() => {
    if (snapshot.phase !== 'reveal' || !currentLocation || !mapContainerRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const countryName = getCountryNameDa(currentLocation.countryCode);
    const targetLatLng: L.LatLngExpression = [currentLocation.lat, currentLocation.lng];

    const boundsPoints: L.LatLngExpression[] = [targetLatLng];

    for (const player of snapshot.players) {
      const guess = player.currentRoundResult?.guess;
      if (!guess) continue;
      const gLatLng: L.LatLngExpression = [guess.lat, guess.lng];
      boundsPoints.push(gLatLng);

      L.polyline([gLatLng, targetLatLng], {
        color: '#38BDF8',
        weight: 2,
        opacity: 0.65,
        dashArray: '6, 6',
      }).addTo(map);

      L.marker(gLatLng, {
        icon: createStudentPin(showNamesOnMap ? player.name : null),
      }).addTo(map);
    }

    L.marker(targetLatLng, {
      icon: createTargetPin(countryName),
      zIndexOffset: 1000,
    }).addTo(map);

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [56, 56],
        maxZoom: 6,
      });
    } else {
      map.setView(targetLatLng, 5);
    }

    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [snapshot.phase, snapshot.roundIndex, snapshot.players, currentLocation, showNamesOnMap]);

  const joinUrl = useMemo(() => buildRoomJoinUrl(snapshot.roomCode), [snapshot.roomCode]);

  const totalPlayers = snapshot.players.length;
  const unlockedCount = snapshot.players.filter((p) => p.currentRoundUnlocked).length;
  const submittedCount = snapshot.players.filter((p) => p.currentRoundSubmitted).length;
  const allSubmitted = totalPlayers > 0 && submittedCount === totalPlayers;

  const remainingSeconds = useMemo(() => {
    if (!snapshot.roundEndsAt) return null;
    const serverOffset = snapshot.serverNow - nowMs;
    const remaining = Math.ceil((snapshot.roundEndsAt - (nowMs + serverOffset)) / 1000);
    return Math.max(0, remaining);
  }, [snapshot.roundEndsAt, snapshot.serverNow, nowMs]);

  const handleCopy = async (type: 'code' | 'link' | 'results') => {
    let text = snapshot.roomCode;
    if (type === 'link') {
      text = joinUrl;
    } else if (type === 'results') {
      const lines = [
        `OECD GeoGuessr · Lærerrum ${snapshot.roomCode} (${snapshot.packName}, ${snapshot.totalRounds} runder)`,
        ...snapshot.players.map(
          (p, idx) =>
            `${idx + 1}. ${p.name}: ${formatPoints(p.totalScore)} pt (IØ 1. forsøg: ${p.firstTryCount}/${snapshot.totalRounds}, gns. afstand: ${
              p.avgDistanceKm !== null ? formatDistanceKm(p.avgDistanceKm) : '–'
            })`
        ),
      ];
      text = lines.join('\n');
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignorer hvis udklipsholder er blokeret
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-slate-100">
      {/* Topbar for lærer-storskærm */}
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-slate-800/90 bg-[#090D16]/95 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Lærerskærm</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-sm font-extrabold tracking-widest text-amber-300">
                {snapshot.roomCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {snapshot.packName} ·{' '}
              {snapshot.phase === 'lobby'
                ? `${snapshot.totalRounds} runder klar`
                : snapshot.phase === 'finished'
                  ? `Alle ${snapshot.totalRounds} runder afsluttet`
                  : `Runde ${snapshot.roundIndex + 1} af ${snapshot.totalRounds}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5 text-xs text-slate-300 sm:flex">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono font-bold text-white tabular-nums">
              {totalPlayers}
            </span>
            <span>{totalPlayers === 1 ? 'deltager' : 'deltagere'}</span>
          </div>

          <button
            type="button"
            onClick={() => handleCopy('link')}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            {copiedType === 'link' ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Link kopieret</span>
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                <span>Kopiér elev-link</span>
              </>
            )}
          </button>

          {confirmLeave ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs">
              <span className="text-rose-200">Forlad rum?</span>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="rounded bg-rose-500 px-2 py-0.5 font-bold text-white hover:bg-rose-400"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:bg-slate-800"
              >
                Nej
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#101829] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Afslut rum</span>
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-3 w-full max-w-6xl px-5">
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        </div>
      )}

      {/* FASE 1: LOBBY */}
      {snapshot.phase === 'lobby' && (
        <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-5 py-7 lg:grid-cols-12">
          {/* Venstre: Kæmpe rumkode til tavlen */}
          <section className="rounded-2xl border border-slate-800 bg-[#101829] p-7 lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
              Klar til klassen · Lærerstyret spil
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              Deltag med rumkoden
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Bed eleverne åbne spillet, vælge <strong>Deltag i rum</strong> og indtaste koden
              herunder – eller del elev-linket direkte i klassens chat.
            </p>

            <div className="mt-6 rounded-2xl border border-amber-400/35 bg-[#090D16] px-6 py-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Rumkode
              </p>
              <p className="mt-2 font-mono text-6xl font-black tracking-[0.22em] text-amber-300">
                {snapshot.roomCode}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('code')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  {copiedType === 'code' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedType === 'code' ? 'Kode kopieret' : 'Kopiér kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('link')}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  {copiedType === 'link' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedType === 'link' ? 'Link kopieret' : 'Kopiér elev-link'}</span>
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-xl border border-slate-800/80 bg-[#0B1120] p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Temapakke</span>
                <span className="font-semibold text-white">{snapshot.packName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Antal runder</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {snapshot.totalRounds}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tidsgrænse pr. runde</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {snapshot.timerSeconds > 0 ? formatClock(snapshot.timerSeconds) : 'Styres af lærer'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={onStartRound}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-4 text-base font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>
                {totalPlayers > 0
                  ? `Start runde 1 (${totalPlayers} ${totalPlayers === 1 ? 'deltager' : 'deltagere'})`
                  : 'Start runde 1'}
              </span>
            </button>
          </section>

          {/* Højre: Tilmeldte elever i realtid */}
          <section className="rounded-2xl border border-slate-800 bg-[#101829] p-6 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Tilmeldte elever / makkerpar
                </h2>
                <p className="text-xs text-slate-400">
                  Listen opdateres automatisk, så snart eleverne taster rumkoden.
                </p>
              </div>
              <span className="font-mono text-2xl font-extrabold text-emerald-400 tabular-nums">
                {totalPlayers}
              </span>
            </div>

            {totalPlayers === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Users className="h-10 w-10 text-slate-700" />
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  Venter på at eleverne logger på rum {snapshot.roomCode}…
                </p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Eleverne skal ikke oprette bruger eller logge ind – de skriver blot rumkoden og
                  deres navn.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {snapshot.players.map((player) => (
                  <div
                    key={player.playerId}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0B1120] px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate text-sm font-semibold text-white">
                        {player.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onKickPlayer(player.playerId)}
                      title={`Fjern ${player.name}`}
                      className="text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* FASE 2: RUNDE I GANG (Anti-snyd storskærm med live fremdrift) */}
      {snapshot.phase === 'playing' && (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-5 py-8">
          <section className="rounded-2xl border border-slate-800 bg-[#101829] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                  Runde i gang · Land og grafer er skjult på tavlen
                </p>
                <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-white">
                  Runde {snapshot.roundIndex + 1} af {snapshot.totalRounds}
                </h1>
              </div>

              {remainingSeconds !== null && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-2xl font-extrabold tabular-nums ${
                    remainingSeconds <= 15
                      ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
                      : 'border-slate-700 bg-[#090D16] text-amber-300'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>{formatClock(remainingSeconds)}</span>
                </div>
              )}
            </div>

            {/* To store live-fremdriftsmålere */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
                    <Unlock className="h-4 w-4" />
                    IØ-analyse løst (Street View åben)
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-white tabular-nums">
                    {unlockedCount} / {totalPlayers}
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-300"
                    style={{
                      width: `${totalPlayers > 0 ? Math.round((unlockedCount / totalPlayers) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    <MapPin className="h-4 w-4" />
                    Kort-gæt låst og klar
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-emerald-400 tabular-nums">
                    {submittedCount} / {totalPlayers}
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{
                      width: `${totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Live elevstatus-oversigt */}
            <div className="mt-6">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status i klassen
              </p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {snapshot.players.map((p) => {
                  const statusLabel = p.currentRoundSubmitted
                    ? 'Gæt låst'
                    : p.currentRoundUnlocked
                      ? 'Street View åben'
                      : 'Analyserer grafer';
                  return (
                    <div
                      key={p.playerId}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                        p.currentRoundSubmitted
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : p.currentRoundUnlocked
                            ? 'border-sky-500/35 bg-sky-500/8'
                            : 'border-slate-800 bg-[#0B1120]'
                      }`}
                    >
                      <span className="truncate font-semibold text-white">{p.name}</span>
                      <span
                        className={`shrink-0 font-mono text-[11px] font-semibold ${
                          p.currentRoundSubmitted
                            ? 'text-emerald-300'
                            : p.currentRoundUnlocked
                              ? 'text-sky-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5">
              <p className="text-xs text-slate-400">
                {allSubmitted
                  ? 'Alle deltagere har låst deres gæt – klar til fælles opsamling!'
                  : remainingSeconds === 0
                    ? 'Tiden er gået – klik for at afsløre landet og vise stillingen.'
                    : 'Du kan afslutte runden når alle er klar, eller når du vil samle op.'}
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={onRevealRound}
                className={`flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold shadow-lg transition active:scale-[0.99] disabled:opacity-60 ${
                  allSubmitted || remainingSeconds === 0
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25 hover:bg-emerald-400'
                    : 'bg-amber-400 text-slate-950 shadow-amber-400/20 hover:bg-amber-300'
                }`}
              >
                <Flag className="h-4 w-4" />
                <span>Afslut runde & vis facit</span>
              </button>
            </div>
          </section>
        </main>
      )}

      {/* FASE 3: FÆLLES OPSAMLING + KLASSEKORT + LIVE SCOREBOARD */}
      {snapshot.phase === 'reveal' && currentLocation && (
        <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-4 p-4 lg:h-[calc(100vh-60px)] lg:grid-cols-12 lg:overflow-hidden">
          {/* Venstre: Stort klassekort med alle elevers nåle + facit */}
          <div className="flex flex-col gap-3 lg:col-span-7 lg:h-full">
            <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl">
              <div ref={mapContainerRef} className="h-full w-full" />

              <div className="absolute right-3 top-3 z-[400]">
                <button
                  type="button"
                  onClick={() => setShowNamesOnMap((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#090D16]/90 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md transition hover:border-slate-500 hover:text-white"
                >
                  {showNamesOnMap ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                      <span>Skjul elevnavne på kort</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-sky-400" />
                      <span>Vis elevnavne på kort</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/90 bg-[#090D16]/90 px-3.5 py-2 text-xs backdrop-blur-md">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Rigtigt land ({getCountryNameDa(currentLocation.countryCode)})
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
                  Klassens gæt (
                  {snapshot.players.filter((p) => p.currentRoundResult?.guess).length})
                </span>
              </div>
            </div>

            {/* Refleksionsspørgsmål til klassen under kortet */}
            <section className="rounded-2xl border border-amber-400/30 bg-[#101829] p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <MessageSquareQuote className="h-4 w-4" />
                  <span>Fælles refleksionsspørgsmål · {getCountryNameDa(currentLocation.countryCode)}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {getCurrencyRegimeLabel(currentLocation.countryCode)}
                </span>
              </div>
              <p className="mt-2 text-base font-semibold leading-snug text-white">
                {currentLocation.reflectionQuestion}
              </p>
              {revealedSummary && (
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {buildFactualEconomicSummary(
                    getCountryNameDa(currentLocation.countryCode),
                    revealedSummary
                  )}
                </p>
              )}
            </section>
          </div>

          {/* Højre: Live Scoreboard + Næste runde */}
          <div className="flex flex-col gap-3.5 lg:col-span-5 lg:h-full lg:overflow-hidden">
            <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#101829]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-300" />
                  <h2 className="text-base font-bold text-white">
                    Live Scoreboard · Efter runde {snapshot.roundIndex + 1}
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {totalPlayers} {totalPlayers === 1 ? 'hold' : 'hold'}
                </span>
              </div>

              <div className="custom-scrollbar flex-1 divide-y divide-slate-800/80 overflow-y-auto px-5 py-2">
                {snapshot.players.map((p, idx) => {
                  const roundRes = p.currentRoundResult;
                  return (
                    <div
                      key={p.playerId}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold tabular-nums ${
                            idx === 0
                              ? 'bg-amber-400/20 text-amber-300'
                              : idx === 1
                                ? 'bg-slate-400/20 text-slate-200'
                                : idx === 2
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : 'bg-slate-800/80 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{p.name}</p>
                          <p className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                            <span>
                              {roundRes?.distanceKm !== null && roundRes?.distanceKm !== undefined
                                ? formatDistanceKm(roundRes.distanceKm)
                                : 'Intet gæt'}
                            </span>
                            <span>·</span>
                            {roundRes && roundRes.analysisAttempts === 1 ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                IØ 1. forsøg
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-sky-300">
                                <GraduationCap className="h-3 w-3" />
                                IØ +{formatPoints(roundRes?.analysisScore ?? 0)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-mono text-base font-extrabold text-white tabular-nums">
                          {formatPoints(p.totalScore)}
                        </p>
                        <p className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
                          +{formatPoints(roundRes?.score ?? 0)} i runden
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              disabled={isBusy}
              onClick={onNextRound}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-4 text-base font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60"
            >
              {snapshot.roundIndex + 1 >= snapshot.totalRounds ? (
                <>
                  <Trophy className="h-5 w-5" />
                  <span>Vis endeligt podium & slutstilling</span>
                </>
              ) : (
                <>
                  <span>
                    Start runde {snapshot.roundIndex + 2} af {snapshot.totalRounds}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </main>
      )}

      {/* FASE 4: ENDELIGT PODIUM & SLUTSTILLING */}
      {snapshot.phase === 'finished' && (
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-5 py-8">
          <section className="rounded-2xl border border-slate-800 bg-[#101829] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                  <Trophy className="h-4 w-4" />
                  <span>Klassedyst afsluttet · Rum {snapshot.roomCode}</span>
                </p>
                <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-white">
                  Endelig stilling ({snapshot.totalRounds} runder)
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopy('results')}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {copiedType === 'results' ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Resultatliste kopieret</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-400" />
                      <span>Kopiér resultatliste</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Nyt spil / forside</span>
                </button>
              </div>
            </div>

            {/* Top 3 Podium */}
            {snapshot.players.length > 0 && (
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {snapshot.players.slice(0, 3).map((p, idx) => (
                  <div
                    key={p.playerId}
                    className={`rounded-2xl border p-5 text-center ${
                      idx === 0
                        ? 'border-amber-400/50 bg-amber-400/10'
                        : idx === 1
                          ? 'border-slate-500/40 bg-slate-800/40'
                          : 'border-orange-500/35 bg-orange-500/8'
                    }`}
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#090D16] font-mono text-base font-black">
                      <Medal
                        className={`h-5 w-5 ${
                          idx === 0
                            ? 'text-amber-300'
                            : idx === 1
                              ? 'text-slate-300'
                              : 'text-orange-400'
                        }`}
                      />
                    </div>
                    <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                      {idx + 1}. plads
                    </p>
                    <p className="mt-1 truncate text-lg font-extrabold text-white">{p.name}</p>
                    <p className="mt-2 font-mono text-2xl font-black text-emerald-400 tabular-nums">
                      {formatPoints(p.totalScore)} pt
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                      IØ 1. forsøg: {p.firstTryCount}/{snapshot.totalRounds} · Gns.{' '}
                      {p.avgDistanceKm !== null ? formatDistanceKm(p.avgDistanceKm) : '–'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Fuld tabel */}
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101829]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0B1120] text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5 font-semibold">Plads</th>
                    <th className="px-5 py-3.5 font-semibold">Elev / Makkerpar</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Kortpoint</th>
                    <th className="px-5 py-3.5 text-right font-semibold">IØ-analyse</th>
                    <th className="px-5 py-3.5 text-center font-semibold">IØ 1. forsøg</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Gns. afstand</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Samlet score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {snapshot.players.map((p, idx) => (
                    <tr key={p.playerId} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-400 tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-white">{p.name}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {formatPoints(p.totalGeoScore)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-sky-300 tabular-nums">
                        +{formatPoints(p.totalAnalysisScore)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-xs text-emerald-300 tabular-nums">
                        {p.firstTryCount} / {snapshot.totalRounds}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {p.avgDistanceKm !== null ? formatDistanceKm(p.avgDistanceKm) : '–'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold text-emerald-400 tabular-nums">
                        {formatPoints(p.totalScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
