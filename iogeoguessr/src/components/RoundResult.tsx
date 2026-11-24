import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flag,
  GitCompareArrows,
  GraduationCap,
  Lightbulb,
  MapPin,
  MessageSquareQuote,
  Trophy,
} from 'lucide-react';
import { GameLocation } from '../config/locations';
import {
  getCountryNameDa,
  getCurrencyRegimeLabel,
  OECD_SOURCE_CITATION,
} from '../data/oecdTranslations';
import { Coordinates, formatDistanceKm, formatPoints } from '../utils/geo';
import {
  buildFactualEconomicSummary,
  CountryEconomicSummary,
  formatDaNumber,
  formatSignedDaNumber,
} from '../utils/oecdData';
import { EconomyPanel, HintGroupId } from './EconomyPanel';

export interface RoundResultRecord {
  roundNumber: number;
  location: GameLocation;
  guess: Coordinates | null;
  timedOut: boolean;
  distanceKm: number | null;
  geoScore: number;
  analysisAttempts: number;
  analysisScore: number;
  hintsUsed: HintGroupId[];
  hintPenalty: number;
  score: number;
  summary: CountryEconomicSummary | null;
}

export interface RoundResultRoomInfo {
  roomCode: string;
  playerRank: number;
  totalPlayers: number;
}

interface RoundResultProps {
  result: RoundResultRecord;
  denmarkSummary: CountryEconomicSummary | null;
  totalRounds: number;
  totalScore: number;
  isLastRound: boolean;
  onNext: () => void;
  roomInfo?: RoundResultRoomInfo | null;
}

type CompareMetricKey = 'cpidr' | 'ulcdr' | 'pdty';

function createPinIcon(color: string, glowColor: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'oecd-result-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="
          background:#090D16;
          color:#F8FAFC;
          border:1px solid ${color};
          font-family:'DM Sans',sans-serif;
          font-size:11px;
          font-weight:700;
          padding:2px 8px;
          border-radius:6px;
          white-space:nowrap;
          margin-bottom:5px;
          box-shadow:0 4px 12px rgba(0,0,0,0.45);
        ">${label}</div>
        <div style="
          width:20px;
          height:20px;
          border-radius:9999px;
          background:${color};
          border:3px solid #ffffff;
          box-shadow:0 4px 14px ${glowColor};
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function RoundResult({
  result,
  denmarkSummary,
  totalRounds,
  totalScore,
  isLastRound,
  onNext,
  roomInfo = null,
}: RoundResultProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [showChartsOverlay, setShowChartsOverlay] = useState(false);
  const [compareDenmark, setCompareDenmark] = useState(false);
  const [compareMetric, setCompareMetric] = useState<CompareMetricKey>('cpidr');

  const countryNameDa = getCountryNameDa(result.location.countryCode);
  const currencyRegime = getCurrencyRegimeLabel(result.location.countryCode);
  const canCompareDenmark =
    result.location.countryCode !== 'DNK' &&
    denmarkSummary !== null &&
    result.summary !== null;

  const maxRoundScore = 6500;
  const scorePercent = Math.min(100, Math.round((result.score / maxRoundScore) * 100));

  const factualSummary = result.summary
    ? buildFactualEconomicSummary(countryNameDa, result.summary)
    : `Nøgletal for ${countryNameDa} blev hentet fra OECD-datasættet.`;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const actualLatLng: L.LatLngExpression = [
      result.location.lat,
      result.location.lng,
    ];

    L.marker(actualLatLng, {
      icon: createPinIcon('#10B981', 'rgba(16,185,129,0.65)', countryNameDa),
    }).addTo(map);

    if (result.guess) {
      const guessLatLng: L.LatLngExpression = [result.guess.lat, result.guess.lng];

      L.marker(guessLatLng, {
        icon: createPinIcon('#0EA5E9', 'rgba(14,165,233,0.65)', 'Dit gæt'),
      }).addTo(map);

      L.polyline([guessLatLng, actualLatLng], {
        color: '#F59E0B',
        weight: 3,
        opacity: 0.95,
        dashArray: '8, 8',
      }).addTo(map);

      const bounds = L.latLngBounds([guessLatLng, actualLatLng]);
      map.fitBounds(bounds, {
        padding: [64, 64],
        maxZoom: 7,
      });
    } else {
      map.setView(actualLatLng, 5);
    }

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [countryNameDa, result.guess, result.location.lat, result.location.lng]);

  const compareSeries = useMemo(() => {
    if (!result.summary || !denmarkSummary) return [];
    const dkByYear = new Map(denmarkSummary.series.map((p) => [p.year, p]));
    return result.summary.series
      .filter((p) => p.year >= 2005 && p.year <= 2025)
      .map((p) => {
        const dk = dkByYear.get(p.year);
        return {
          year: p.year,
          countryVal: p[compareMetric],
          dkVal: dk ? dk[compareMetric] : null,
        };
      });
  }, [result.summary, denmarkSummary, compareMetric]);

  const pdtySnap = result.summary?.pdty;
  const ulcdrSnap = result.summary?.ulcdr;
  const cpidrSnap = result.summary?.cpidr;

  const compareDecimals = compareMetric === 'pdty' ? 2 : 1;
  const compareRefLine = compareMetric === 'pdty' ? 1 : 100;
  const compareColor =
    compareMetric === 'pdty'
      ? '#38BDF8'
      : compareMetric === 'ulcdr'
        ? '#F59E0B'
        : '#34D399';

  return (
    <div className="flex h-full flex-col bg-[#090D16] pt-[56px]">
      <div className="mx-auto grid h-full w-full max-w-[1440px] flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-12 lg:overflow-hidden">
        {/* Venstre kolonne: Forstørret resultat-kort & pointkort */}
        <div className="flex flex-col gap-3 lg:col-span-7 lg:h-full">
          <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl">
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* Afstands- og legendeoverlejring */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/90 bg-[#090D16]/90 px-3.5 py-2 text-xs backdrop-blur-md">
              {result.guess ? (
                <>
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
                    Dit gæt
                  </span>
                  <span className="text-slate-600">·</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <Clock className="h-3.5 w-3.5" />
                    Tiden udløb uden gæt
                  </span>
                  <span className="text-slate-600">·</span>
                </>
              )}
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Faktisk lokation ({countryNameDa})
              </span>
              {result.distanceKm !== null && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1.5 font-mono font-semibold text-amber-300 tabular-nums">
                    <Compass className="h-3.5 w-3.5" />
                    {formatDistanceKm(result.distanceKm)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Rundepoint-bar med komplet udspecificering */}
          <div className="rounded-2xl border border-slate-800 bg-[#101829] px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Runde {result.roundNumber} af {totalRounds} · Rundescore
                </p>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="font-mono text-3xl font-bold text-emerald-400 tabular-nums">
                    +{formatPoints(result.score)}
                  </span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    Kort {formatPoints(result.geoScore)} + IØ-analyse{' '}
                    {formatPoints(result.analysisScore)}
                    {result.hintPenalty > 0 ? ` − Hints ${formatPoints(result.hintPenalty)}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-5 text-right">
                <div>
                  <p className="text-[11px] text-slate-400">Afstand</p>
                  <p className="font-mono text-base font-semibold text-slate-100 tabular-nums">
                    {result.distanceKm !== null
                      ? formatDistanceKm(result.distanceKm)
                      : 'Intet gæt'}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <p className="text-[11px] text-slate-400">Samlet score</p>
                  <p className="font-mono text-base font-semibold text-amber-300 tabular-nums">
                    {formatPoints(totalScore)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-500"
                style={{ width: `${Math.max(2, scorePercent)}%` }}
              />
            </div>

            {/* Status på IØ-analyse & brugte hints */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                {result.analysisAttempts === 1 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <GraduationCap className="h-4 w-4 shrink-0 text-sky-400" />
                )}
                <span>
                  <strong>IØ-sammenhæng:</strong>{' '}
                  {result.analysisAttempts > 0
                    ? `Løst på ${result.analysisAttempts}. forsøg (+${formatPoints(
                        result.analysisScore
                      )} pt)`
                    : 'Ikke løst inden tidsudløb (0 pt)'}
                </span>
              </div>

              {result.hintsUsed.length > 0 && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-amber-300 tabular-nums">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {result.hintsUsed.length} hint (−{result.hintPenalty} pt)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Højre kolonne: Landeafsløring, Danmark-sammenligning og IØ-refleksionsboks */}
        <div className="custom-scrollbar flex flex-col gap-3.5 lg:col-span-5 lg:h-full lg:overflow-y-auto lg:pr-1">
          {/* Landeafsløring */}
          <section className="rounded-2xl border border-slate-800 bg-[#101829] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Flag className="h-3.5 w-3.5" />
                  Rigtigt OECD-land
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
                  {countryNameDa}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span>{result.location.areaLabel}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canCompareDenmark && (
                  <button
                    type="button"
                    onClick={() => setCompareDenmark((prev) => !prev)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      compareDenmark
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{compareDenmark ? 'Skjul DK-graf' : 'Sammenlign med Danmark'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowChartsOverlay((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
                  <span>{showChartsOverlay ? 'Skjul alle grafer' : 'Alle 3 grafer'}</span>
                </button>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
              <span className="text-slate-400">Valutaregime: </span>
              <span className="font-medium text-slate-100">{currencyRegime}</span>
            </div>

            {/* Indbygget Danmark-sammenligning */}
            {compareDenmark && canCompareDenmark && denmarkSummary && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-[#0B1120] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {countryNameDa} vs. Danmark (2005–2025)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Fuldt optrukket: {countryNameDa} · Stiplet hvid: Danmark
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-0.5">
                    {(
                      [
                        { id: 'cpidr', label: 'Priskonkurrence' },
                        { id: 'ulcdr', label: 'Lønomkostninger' },
                        { id: 'pdty', label: 'Produktivitet' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCompareMetric(tab.id)}
                        className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition ${
                          compareMetric === tab.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 h-[155px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={compareSeries}
                      margin={{ top: 6, right: 10, left: -16, bottom: 2 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        minTickGap={22}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          compareDecimals === 2
                            ? v.toFixed(2).replace('.', ',')
                            : Math.round(v).toString()
                        }
                      />
                      <ReferenceLine
                        y={compareRefLine}
                        stroke="#475569"
                        strokeDasharray="4 4"
                      />
                      <Tooltip
                        formatter={(value: unknown, name?: string | number) => [
                          typeof value === 'number'
                            ? formatDaNumber(value, compareDecimals)
                            : '–',
                          String(name ?? ''),
                        ]}
                        contentStyle={{
                          backgroundColor: '#0D1424',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="countryVal"
                        name={countryNameDa}
                        stroke={compareColor}
                        strokeWidth={2.25}
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="dkVal"
                        name="Danmark"
                        stroke="#E2E8F0"
                        strokeWidth={1.8}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Kompakt 2025-sammenligningstabel */}
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-2.5 font-mono text-[10.5px] tabular-nums">
                  <div>
                    <span className="text-slate-400">Produktivitet: </span>
                    <span className="font-semibold text-sky-300">
                      {formatDaNumber(pdtySnap?.latestValue ?? null, 2)}
                    </span>
                    <span className="text-slate-500">
                      {' '}
                      (DK {formatDaNumber(denmarkSummary.pdty.latestValue, 2)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Lønomk.: </span>
                    <span className="font-semibold text-amber-300">
                      {formatDaNumber(ulcdrSnap?.latestValue ?? null, 1)}
                    </span>
                    <span className="text-slate-500">
                      {' '}
                      (DK {formatDaNumber(denmarkSummary.ulcdr.latestValue, 1)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Priskonk.: </span>
                    <span className="font-semibold text-emerald-300">
                      {formatDaNumber(cpidrSnap?.latestValue ?? null, 1)}
                    </span>
                    <span className="text-slate-500">
                      {' '}
                      (DK {formatDaNumber(denmarkSummary.cpidr.latestValue, 1)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3 faktiske nøgletal fra JSON */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-3">
                <p className="text-[11px] font-medium text-sky-300">Produktivitet</p>
                <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {formatDaNumber(pdtySnap?.latestValue ?? null, 2)}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-slate-400 tabular-nums">
                  {pdtySnap?.referenceYear ?? '–'}→{pdtySnap?.latestYear ?? '–'}:{' '}
                  {formatSignedDaNumber(pdtySnap?.percentChange ?? null, 1)} %
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-3">
                <p className="text-[11px] font-medium text-amber-300">Lønomkostninger</p>
                <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {formatDaNumber(ulcdrSnap?.latestValue ?? null, 1)}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-slate-400 tabular-nums">
                  {ulcdrSnap?.referenceYear ?? '–'}→{ulcdrSnap?.latestYear ?? '–'}:{' '}
                  {formatSignedDaNumber(ulcdrSnap?.change ?? null, 1)} pt
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-3">
                <p className="text-[11px] font-medium text-emerald-300">Priskonkurrence</p>
                <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {formatDaNumber(cpidrSnap?.latestValue ?? null, 1)}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-slate-400 tabular-nums">
                  {cpidrSnap?.referenceYear ?? '–'}→{cpidrSnap?.latestYear ?? '–'}:{' '}
                  {formatSignedDaNumber(cpidrSnap?.change ?? null, 1)} pt
                </p>
              </div>
            </div>
          </section>

          {/* IØ-refleksionsboks */}
          <section className="flex flex-1 flex-col justify-between rounded-2xl border border-emerald-500/30 bg-[#0E1926] p-5">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight text-white">
                  IØ-refleksionsboks · Makroøkonomisk opsummering
                </h3>
              </div>

              <p className="mt-3 text-[13.5px] leading-relaxed text-slate-200">
                {factualSummary}
              </p>

              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/8 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <MessageSquareQuote className="h-4 w-4" />
                  <span>Refleksionsspørgsmål til makkerparret</span>
                </div>
                <p className="mt-2 text-[14px] font-medium leading-snug text-amber-50">
                  {result.location.reflectionQuestion}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Datagrundlag: {OECD_SOURCE_CITATION} · Basisår 2021 (Produktivitet = 1,00;
              Lønomkostninger & Priskonkurrence = 100)
            </p>
          </section>

          {/* Næste runde (solo) eller lærerstyret vente-linje (klasserum) */}
          {roomInfo ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3.5 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
                <span>
                  Din placering i rum <strong className="font-mono">{roomInfo.roomCode}</strong>:{' '}
                  <strong className="font-mono text-white tabular-nums">
                    #{roomInfo.playerRank} af {roomInfo.totalPlayers}
                  </strong>
                </span>
              </div>
              <span className="font-medium text-slate-300">
                {isLastRound
                  ? 'Venter på at læreren viser slutstillingen…'
                  : 'Venter på at læreren starter næste runde…'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.99]"
            >
              {isLastRound ? (
                <>
                  <Trophy className="h-4 w-4" />
                  <span>Se samlet slutresultat</span>
                </>
              ) : (
                <>
                  <span>
                    Næste runde ({result.roundNumber + 1} / {totalRounds})
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mulighed for at genåbne alle 3 grafer (inkl. DK-sammenligning) på resultatskærmen */}
      <EconomyPanel
        summary={result.summary}
        comparisonSummary={compareDenmark ? denmarkSummary : null}
        comparisonLabel="Danmark"
        isLoading={false}
        error={null}
        isOpen={showChartsOverlay}
        onClose={() => setShowChartsOverlay(false)}
        revealedCountryName={countryNameDa}
      />
    </div>
  );
}
