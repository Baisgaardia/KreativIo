import { useMemo, useState } from 'react';
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
  BarChart3,
  ChevronLeft,
  HelpCircle,
  Layers,
  Lightbulb,
  Lock,
  TrendingUp,
  Unlock,
} from 'lucide-react';
import {
  CountryEconomicSummary,
  formatDaNumber,
  RecentMetricRow,
} from '../utils/oecdData';
import { INDICATOR_META, OECD_SOURCE_CITATION } from '../data/oecdTranslations';
import { HINT_COST_POINTS } from '../utils/bonusQuestion';

export type HintGroupId = 'pricesAndGrowth' | 'laborAndDebt' | 'externalBalance';

type YearRangeKey = '2000-2025' | '2010-2025' | '1995-2027';

interface EconomyPanelProps {
  summary: CountryEconomicSummary | null;
  comparisonSummary?: CountryEconomicSummary | null;
  comparisonLabel?: string;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  onClose: () => void;
  revealedCountryName?: string;
  unlockedHints?: HintGroupId[];
  onUnlockHint?: (hintId: HintGroupId) => void;
}

const YEAR_RANGES: { key: YearRangeKey; label: string; min: number; max: number }[] = [
  { key: '2000-2025', label: '2000–2025', min: 2000, max: 2025 },
  { key: '2010-2025', label: '2010–2025', min: 2010, max: 2025 },
  { key: '1995-2027', label: '1995–2027', min: 1995, max: 2027 },
];

const HINT_METADATA: { id: HintGroupId; title: string; subtitle: string }[] = [
  {
    id: 'pricesAndGrowth',
    title: 'Konjunktur & priser',
    subtitle: 'BNP-vækst, samlet inflation og kerneinflation',
  },
  {
    id: 'laborAndDebt',
    title: 'Arbejdsmarked & gæld',
    subtitle: 'Arbejdsløshed og offentlig gæld i % af BNP',
  },
  {
    id: 'externalBalance',
    title: 'Udenrigsøkonomi',
    subtitle: 'Betalingsbalance (% af BNP), eksport- og importvækst',
  },
];

interface MergedChartRow {
  year: number;
  pdty: number | null;
  ulcdr: number | null;
  cpidr: number | null;
  cmpPdty: number | null;
  cmpUlcdr: number | null;
  cmpCpidr: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    dataKey: string;
  }>;
  label?: number | string;
  decimals?: number;
}

function ChartTooltip({ active, payload, label, decimals = 1 }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const validItems = payload.filter(
    (item) => typeof item.value === 'number' && Number.isFinite(item.value)
  );
  if (validItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/90 bg-[#0D1424]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="mb-1 font-mono text-[11px] font-semibold text-slate-300 tabular-nums">
        År {label}
      </div>
      <div className="space-y-1">
        {validItems.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-mono font-semibold text-white tabular-nums">
              {formatDaNumber(item.value, decimals)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SingleMetricChartProps {
  title: string;
  code: string;
  baseNote: string;
  data: MergedChartRow[];
  dataKey: 'pdty' | 'ulcdr' | 'cpidr';
  cmpDataKey?: 'cmpPdty' | 'cmpUlcdr' | 'cmpCpidr';
  cmpLabel?: string;
  color: string;
  referenceValue: number;
  decimals: number;
  latestValue: number | null;
  latestYear: number | null;
}

function SingleMetricChart({
  title,
  code,
  baseNote,
  data,
  dataKey,
  cmpDataKey,
  cmpLabel,
  color,
  referenceValue,
  decimals,
  latestValue,
  latestYear,
}: SingleMetricChartProps) {
  const hasAnyData = useMemo(
    () => data.some((d) => d[dataKey] !== null),
    [data, dataKey]
  );

  return (
    <section className="rounded-xl border border-slate-800/90 bg-[#0F172A]/80 p-3.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-100">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400">
            Basisår {baseNote}
            {cmpDataKey && cmpLabel ? ` · Stiplet: ${cmpLabel}` : ''}
          </p>
        </div>
        {latestValue !== null && latestYear !== null && (
          <div className="text-right">
            <span
              className="font-mono text-sm font-semibold tabular-nums"
              style={{ color }}
            >
              {formatDaNumber(latestValue, decimals)}
            </span>
            <span className="ml-1 font-mono text-[10px] text-slate-500 tabular-nums">
              ({latestYear})
            </span>
          </div>
        )}
      </div>

      {!hasAnyData ? (
        <div className="flex h-[128px] items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500">
          Ingen datapunkter i den valgte periode
        </div>
      ) : (
        <div className="h-[136px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 6, right: 10, left: -16, bottom: 2 }}
            >
              <CartesianGrid
                stroke="#1E293B"
                strokeDasharray="3 3"
                vertical={false}
              />
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
                  decimals === 2
                    ? v.toFixed(2).replace('.', ',')
                    : Math.round(v).toString()
                }
              />
              <ReferenceLine
                y={referenceValue}
                stroke="#475569"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Tooltip content={<ChartTooltip decimals={decimals} />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                name={INDICATOR_META[code]?.shortNameDa ?? title}
                stroke={color}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#090D16', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {cmpDataKey && (
                <Line
                  type="monotone"
                  dataKey={cmpDataKey}
                  name={cmpLabel ?? 'Danmark'}
                  stroke="#E2E8F0"
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 3.5, fill: '#E2E8F0', stroke: '#090D16', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function HintMetricTable({ rows }: { rows: RecentMetricRow[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-800/90 bg-[#090D16]/75">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="px-2.5 py-1.5 font-medium">Nøgletal</th>
            <th className="px-2 py-1.5 text-right font-mono font-medium">2023</th>
            <th className="px-2 py-1.5 text-right font-mono font-medium">2024</th>
            <th className="px-2.5 py-1.5 text-right font-mono font-medium">2025</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rows.map((row) => (
            <tr key={row.code}>
              <td className="px-2.5 py-1.5 text-slate-300">
                {row.labelDa}{' '}
                <span className="text-[10px] text-slate-500">({row.unit})</span>
              </td>
              {row.values.map((cell) => (
                <td
                  key={cell.year}
                  className="px-2 py-1.5 text-right font-mono font-semibold text-slate-100 tabular-nums last:px-2.5"
                >
                  {cell.value !== null ? formatDaNumber(cell.value, 1) : '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EconomyPanel({
  summary,
  comparisonSummary,
  comparisonLabel = 'Danmark',
  isLoading,
  error,
  isOpen,
  onClose,
  revealedCountryName,
  unlockedHints = [],
  onUnlockHint,
}: EconomyPanelProps) {
  const [yearRange, setYearRange] = useState<YearRangeKey>('2000-2025');
  const [showOverlay, setShowOverlay] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const mergedData = useMemo<MergedChartRow[]>(() => {
    if (!summary) return [];
    const range = YEAR_RANGES.find((r) => r.key === yearRange) ?? YEAR_RANGES[0];

    const cmpByYear = new Map<
      number,
      { pdty: number | null; ulcdr: number | null; cpidr: number | null }
    >();
    if (comparisonSummary) {
      for (const pt of comparisonSummary.series) {
        cmpByYear.set(pt.year, {
          pdty: pt.pdty,
          ulcdr: pt.ulcdr,
          cpidr: pt.cpidr,
        });
      }
    }

    return summary.series
      .filter((pt) => pt.year >= range.min && pt.year <= range.max)
      .map((pt) => {
        const cmp = cmpByYear.get(pt.year);
        return {
          year: pt.year,
          pdty: pt.pdty,
          ulcdr: pt.ulcdr,
          cpidr: pt.cpidr,
          cmpPdty: cmp?.pdty ?? null,
          cmpUlcdr: cmp?.ulcdr ?? null,
          cmpCpidr: cmp?.cpidr ?? null,
        };
      });
  }, [summary, comparisonSummary, yearRange]);

  if (!isOpen) return null;

  const hasComparison = Boolean(
    comparisonSummary &&
      summary &&
      comparisonSummary.countryCode !== summary.countryCode
  );

  return (
    <aside
      aria-label="Økonomi-panel med OECD-nøgletal"
      className="fixed bottom-3 left-3 top-[64px] z-30 flex w-[calc(100vw-24px)] max-w-[436px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1120]/94 shadow-2xl backdrop-blur-xl"
    >
      {/* Topbar i økonomi-panelet */}
      <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">
              {revealedCountryName ?? 'Ukendt OECD-land'}
            </h2>
            <p className="text-[11px] text-slate-400">
              Priskonkurrenceevne · OECD-nøgletal
              {hasComparison ? ` · vs. ${comparisonLabel}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Fold økonomi-panelet ind"
          className="flex h-8 items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/70 px-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Skjul</span>
        </button>
      </div>

      {/* Periodevalg og visningstilstand */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 bg-[#0D1527]/70 px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-0.5">
          {YEAR_RANGES.map((range) => {
            const active = yearRange === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setYearRange(range.key)}
                className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium tabular-nums transition ${
                  active
                    ? 'bg-slate-700/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowOverlay((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
            showOverlay
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-600 hover:text-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{showOverlay ? '3 separate grafer' : 'Saml løn & priskonkurrence'}</span>
        </button>
      </div>

      {/* Indhold med grafer og ekstra IØ-hints */}
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3.5">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[175px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/60"
              />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
            <p className="font-semibold">Kunne ikke indlæse OECD-data</p>
            <p className="mt-1 text-rose-300/90">{error}</p>
          </div>
        )}

        {summary && !isLoading && !error && (
          <>
            <SingleMetricChart
              title={INDICATOR_META.PDTY.nameDa}
              code="PDTY"
              baseNote={INDICATOR_META.PDTY.baseNote}
              data={mergedData}
              dataKey="pdty"
              cmpDataKey={hasComparison ? 'cmpPdty' : undefined}
              cmpLabel={comparisonLabel}
              color="#38BDF8"
              referenceValue={1}
              decimals={2}
              latestValue={summary.pdty.latestValue}
              latestYear={summary.pdty.latestYear}
            />

            {showOverlay ? (
              <section className="rounded-xl border border-slate-800/90 bg-[#0F172A]/80 p-3.5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-semibold tracking-tight text-slate-100">
                      Lønomkostninger & Priskonkurrence
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Fælles indeksakse (2021 = 100)
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>

                <div className="mb-2 flex items-center gap-4 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    Lønomkostninger
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Priskonkurrence
                  </span>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={mergedData}
                      margin={{ top: 6, right: 10, left: -16, bottom: 2 }}
                    >
                      <CartesianGrid
                        stroke="#1E293B"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
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
                      />
                      <ReferenceLine
                        y={100}
                        stroke="#475569"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <Tooltip content={<ChartTooltip decimals={1} />} />
                      <Line
                        type="monotone"
                        dataKey="ulcdr"
                        name="Lønomkostninger"
                        stroke="#F59E0B"
                        strokeWidth={2.25}
                        dot={false}
                        activeDot={{ r: 4, fill: '#F59E0B', stroke: '#090D16', strokeWidth: 2 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="cpidr"
                        name="Priskonkurrence"
                        stroke="#34D399"
                        strokeWidth={2.25}
                        dot={false}
                        activeDot={{ r: 4, fill: '#34D399', stroke: '#090D16', strokeWidth: 2 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : (
              <>
                <SingleMetricChart
                  title={INDICATOR_META.ULCDR.nameDa}
                  code="ULCDR"
                  baseNote={INDICATOR_META.ULCDR.baseNote}
                  data={mergedData}
                  dataKey="ulcdr"
                  cmpDataKey={hasComparison ? 'cmpUlcdr' : undefined}
                  cmpLabel={comparisonLabel}
                  color="#F59E0B"
                  referenceValue={100}
                  decimals={1}
                  latestValue={summary.ulcdr.latestValue}
                  latestYear={summary.ulcdr.latestYear}
                />

                <SingleMetricChart
                  title={INDICATOR_META.CPIDR.nameDa}
                  code="CPIDR"
                  baseNote={INDICATOR_META.CPIDR.baseNote}
                  data={mergedData}
                  dataKey="cpidr"
                  cmpDataKey={hasComparison ? 'cmpCpidr' : undefined}
                  cmpLabel={comparisonLabel}
                  color="#34D399"
                  referenceValue={100}
                  decimals={1}
                  latestValue={summary.cpidr.latestValue}
                  latestYear={summary.cpidr.latestYear}
                />
              </>
            )}

            {/* Ekstra IØ-hints (mod pointfradrag under runden) */}
            {onUnlockHint && !revealedCountryName && (
              <section className="rounded-xl border border-amber-500/25 bg-[#121826] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold tracking-tight text-amber-100">
                      Ekstra IØ-hints (makrodata)
                    </h3>
                  </div>
                  <span className="font-mono text-[10.5px] text-amber-300/90 tabular-nums">
                    -{HINT_COST_POINTS} pt pr. hint
                  </span>
                </div>

                <div className="mt-2.5 space-y-2">
                  {HINT_METADATA.map((hint) => {
                    const isUnlocked = unlockedHints.includes(hint.id);
                    const rows = summary.hintGroups[hint.id];
                    return (
                      <div
                        key={hint.id}
                        className="rounded-lg border border-slate-800 bg-[#0B1120] p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-100">
                              {hint.title}
                            </p>
                            <p className="text-[10.5px] text-slate-400">
                              {hint.subtitle}
                            </p>
                          </div>

                          {isUnlocked ? (
                            <span className="flex items-center gap-1 font-mono text-[10.5px] font-semibold text-emerald-400">
                              <Unlock className="h-3 w-3" />
                              Åbnet
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUnlockHint(hint.id)}
                              className="flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/12 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/22 hover:text-white"
                            >
                              <Lock className="h-3 w-3" />
                              <span>-{HINT_COST_POINTS} pt</span>
                            </button>
                          )}
                        </div>

                        {isUnlocked && <HintMetricTable rows={rows} />}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Kompakt IØ-læseguide */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setShowGuide((g) => !g)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                  Sådan aflæser du OECD-indeksene (IØ)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {showGuide ? 'Skjul' : 'Vis'}
                </span>
              </button>
              {showGuide && (
                <div className="space-y-2 border-t border-slate-800/80 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-300">
                  <p>
                    <strong className="text-sky-300">Produktivitet:</strong>{' '}
                    Stigende kurve betyder mere produktion pr. beskæftiget, hvilket styrker
                    konkurrenceevnen.
                  </p>
                  <p>
                    <strong className="text-amber-300">Lønomkostninger</strong> &{' '}
                    <strong className="text-emerald-300">Priskonkurrence:</strong>{' '}
                    Målt relativt til samhandelspartnere i fælles valuta (2021 = 100). En{' '}
                    <span className="text-rose-300">stigende kurve</span> betyder dyrere
                    varer/lønninger (svækket priskonkurrenceevne), mens et{' '}
                    <span className="text-emerald-300">fald</span> betyder forbedret
                    priskonkurrenceevne.
                  </p>
                  <p className="text-[10.5px] text-slate-500">
                    Kilde: {OECD_SOURCE_CITATION}. Stiplede linjer markerer basisåret 2021.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
