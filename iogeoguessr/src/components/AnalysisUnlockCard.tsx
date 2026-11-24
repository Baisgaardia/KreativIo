import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  GraduationCap,
  HelpCircle,
  Lock,
  XCircle,
} from 'lucide-react';
import {
  EconomicChallenge,
  EconomicPatternId,
  getAnalysisPointsForAttempt,
} from '../utils/bonusQuestion';
import { formatPoints } from '../utils/geo';

interface AnalysisUnlockCardProps {
  challenge: EconomicChallenge | null;
  isLoading: boolean;
  onUnlocked: (attemptsUsed: number, pointsEarned: number) => void;
}

export function AnalysisUnlockCard({
  challenge,
  isLoading,
  onUnlocked,
}: AnalysisUnlockCardProps) {
  const [wrongIds, setWrongIds] = useState<EconomicPatternId[]>([]);
  const [solved, setSolved] = useState(false);

  const currentAttempt = wrongIds.length + 1;
  const potentialPoints = getAnalysisPointsForAttempt(currentAttempt);

  const handleSelectOption = (optionId: EconomicPatternId) => {
    if (!challenge || solved || wrongIds.includes(optionId)) return;

    if (optionId === challenge.correctOptionId) {
      setSolved(true);
      const earned = getAnalysisPointsForAttempt(currentAttempt);
      window.setTimeout(() => {
        onUnlocked(currentAttempt, earned);
      }, 650);
    } else {
      setWrongIds((prev) => [...prev, optionId]);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 top-[56px] z-20 flex items-center justify-center p-4 lg:justify-end lg:pr-8">
      <div className="pointer-events-auto w-full max-w-[540px] rounded-2xl border border-slate-700/90 bg-[#0B1120]/96 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-400">
              {solved ? <Eye className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Trin 1 · Lås Street View & kort op
              </p>
              <h2 className="text-base font-bold tracking-tight text-white">
                {solved ? 'Rigtigt! Street View låses op…' : 'Afkod landets økonomiske sammenhæng'}
              </h2>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#101829] px-2.5 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              IØ-point
            </p>
            <p className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              +{formatPoints(potentialPoints)}
            </p>
          </div>
        </div>

        {isLoading || !challenge ? (
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60"
              />
            ))}
          </div>
        ) : (
          <>
            <p className="mt-3.5 text-xs leading-relaxed text-slate-300 sm:text-[13px]">
              {challenge.prompt}
            </p>

            <div className="mt-4 space-y-2">
              {challenge.options.map((opt) => {
                const isWrong = wrongIds.includes(opt.id);
                const isCorrectSolved = solved && opt.id === challenge.correctOptionId;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isWrong || solved}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      isCorrectSolved
                        ? 'border-emerald-400 bg-emerald-500/15 text-white'
                        : isWrong
                          ? 'cursor-not-allowed border-rose-500/35 bg-rose-950/20 opacity-60'
                          : 'border-slate-800 bg-[#101829]/90 hover:border-sky-400/70 hover:bg-[#142038]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCorrectSolved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : isWrong ? (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      ) : (
                        <GraduationCap className="h-4 w-4 text-sky-400" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-[13px] font-bold ${
                          isCorrectSolved
                            ? 'text-emerald-200'
                            : isWrong
                              ? 'text-rose-200 line-through'
                              : 'text-white'
                        }`}
                      >
                        {opt.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-slate-400">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {wrongIds.length > 0 && !solved && (
              <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-100">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-200">
                    Prøv igen (forsøg {currentAttempt} · næste rigtige giver +{formatPoints(potentialPoints)} pt)
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-100/90">
                    {challenge.hintDa}
                  </p>
                </div>
              </div>
            )}

            {solved && (
              <div className="mt-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-xs text-emerald-100">
                <strong className="text-emerald-300">
                  +{formatPoints(potentialPoints)} IØ-point!
                </strong>{' '}
                {challenge.explanationDa}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
