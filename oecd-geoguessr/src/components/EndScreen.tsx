import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Compass,
  Copy,
  GraduationCap,
  Hash,
  Home,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { getCountryNameDa, OECD_SOURCE_CITATION } from '../data/oecdTranslations';
import { formatDistanceKm, formatPoints } from '../utils/geo';
import { formatDaNumber, formatSignedDaNumber } from '../utils/oecdData';
import { ANALYSIS_MAX_POINTS } from '../utils/bonusQuestion';
import { RoundResultRecord } from './RoundResult';

interface EndScreenProps {
  results: RoundResultRecord[];
  activeClassCode: string;
  onPlayAgain: () => void;
  onBackToStart: () => void;
}

function getPerformanceHeadline(ratio: number): string {
  if (ratio >= 0.85) return 'Suveræn makroøkonomisk og geografisk træfsikkerhed';
  if (ratio >= 0.65) return 'Stærk analyse af både kort og priskonkurrenceevne';
  if (ratio >= 0.45) return 'Godt overblik over OECD-landenes profiler';
  return 'God opvarmning – prøv en runde mere og aflæs kurverne tættere';
}

export function EndScreen({
  results,
  activeClassCode,
  onPlayAgain,
  onBackToStart,
}: EndScreenProps) {
  const [copiedResult, setCopiedResult] = useState(false);

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalGeoScore = results.reduce((sum, r) => sum + r.geoScore, 0);
  const totalAnalysisScore = results.reduce((sum, r) => sum + r.analysisScore, 0);
  const totalHintPenalty = results.reduce((sum, r) => sum + r.hintPenalty, 0);
  const firstTryCount = results.filter((r) => r.analysisAttempts === 1).length;

  const maxScore = results.length * (5000 + ANALYSIS_MAX_POINTS);
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;

  const validDistances = results
    .map((r) => r.distanceKm)
    .filter((d): d is number => d !== null);
  const avgDistanceKm =
    validDistances.length > 0
      ? validDistances.reduce((sum, d) => sum + d, 0) / validDistances.length
      : null;

  const handleCopySummary = async () => {
    const codePart = activeClassCode ? ` [${activeClassCode}]` : '';
    const text = `OECD GeoGuessr${codePart}: ${formatPoints(totalScore)} / ${formatPoints(
      maxScore
    )} point (Kort ${formatPoints(totalGeoScore)}, IØ-analyse ${formatPoints(
      totalAnalysisScore
    )} (${firstTryCount}/${results.length} i 1. forsøg), Hints −${formatPoints(
      totalHintPenalty
    )}).`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResult(true);
      window.setTimeout(() => setCopiedResult(false), 2000);
    } catch {
      // Ignorer hvis clipboard er blokeret
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Samlet score-kort */}
        <section className="rounded-2xl border border-slate-800 bg-[#101829] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
                <Trophy className="h-4 w-4" />
                <span>Spil afsluttet · {results.length} runder</span>
                {activeClassCode && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                      <Hash className="h-3.5 w-3.5" />
                      {activeClassCode}
                    </span>
                  </>
                )}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {getPerformanceHeadline(ratio)}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Gennemsnitlig afstand:{' '}
                <span className="font-mono font-semibold text-slate-200 tabular-nums">
                  {avgDistanceKm !== null ? formatDistanceKm(avgDistanceKm) : '–'}
                </span>
                {' · '}
                IØ-analyse i 1. forsøg:{' '}
                <span className="font-mono font-semibold text-sky-300 tabular-nums">
                  {firstTryCount} / {results.length}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-[#0B1120] px-6 py-4 text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Samlet score
              </p>
              <div className="mt-1 flex items-baseline justify-end gap-2">
                <span className="font-mono text-4xl font-extrabold text-emerald-400 tabular-nums">
                  {formatPoints(totalScore)}
                </span>
                <span className="font-mono text-sm text-slate-400 tabular-nums">
                  / {formatPoints(maxScore)}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                Kort {formatPoints(totalGeoScore)} · IØ +{formatPoints(totalAnalysisScore)}
                {totalHintPenalty > 0 ? ` · Hints −${formatPoints(totalHintPenalty)}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
              style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.99]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Spil igen</span>
            </button>
            <button
              type="button"
              onClick={onBackToStart}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span>Skift temapakke / kode</span>
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              {copiedResult ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Resultat kopieret</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>Kopiér resultat</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Oversigt over alle runder */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101829]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-bold text-white">Oversigt over alle runder</h2>
            <span className="text-xs text-slate-400">
              Nøgletal fra {OECD_SOURCE_CITATION}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0B1120] text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Runde</th>
                  <th className="px-4 py-3 font-semibold">OECD-land</th>
                  <th className="px-4 py-3 text-right font-semibold">Afstand</th>
                  <th className="px-4 py-3 text-center font-semibold">IØ-analyse</th>
                  <th className="px-4 py-3 text-right font-semibold">Point</th>
                  <th className="px-4 py-3 text-right font-semibold">Lønomk. (2015→25)</th>
                  <th className="px-4 py-3 text-right font-semibold">Priskonk. (2015→25)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {results.map((r) => {
                  const countryName = getCountryNameDa(r.location.countryCode);
                  const ulc = r.summary?.ulcdr;
                  const cpi = r.summary?.cpidr;
                  return (
                    <tr
                      key={r.location.id + r.roundNumber}
                      className="transition hover:bg-slate-800/35"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400 tabular-nums">
                        #{r.roundNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{countryName}</div>
                        <div className="text-xs text-slate-400">
                          {r.location.areaLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-200 tabular-nums">
                        {r.distanceKm !== null ? (
                          <span className="inline-flex items-center gap-1">
                            <Compass className="h-3.5 w-3.5 text-slate-500" />
                            {formatDistanceKm(r.distanceKm)}
                          </span>
                        ) : (
                          <span className="text-rose-300">Tiden udløb</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {r.analysisAttempts === 1 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                            <CheckCircle2 className="h-3.5 w-3.5" />+
                            {formatPoints(r.analysisScore)}
                          </span>
                        ) : r.analysisAttempts > 1 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 tabular-nums">
                            <GraduationCap className="h-3.5 w-3.5" />+
                            {formatPoints(r.analysisScore)} ({r.analysisAttempts}.)
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        {formatPoints(r.score)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-amber-300 tabular-nums">
                        {ulc?.latestValue != null ? (
                          <>
                            {formatDaNumber(ulc.latestValue, 1)}{' '}
                            <span className="text-slate-400">
                              ({formatSignedDaNumber(ulc.change, 1)})
                            </span>
                          </>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-emerald-300 tabular-nums">
                        {cpi?.latestValue != null ? (
                          <>
                            {formatDaNumber(cpi.latestValue, 1)}{' '}
                            <span className="text-slate-400">
                              ({formatSignedDaNumber(cpi.change, 1)})
                            </span>
                          </>
                        ) : (
                          '–'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
