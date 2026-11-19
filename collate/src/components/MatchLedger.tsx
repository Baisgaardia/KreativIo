import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { SimilarityMatch } from '../lib/similarityEngine';

interface MatchLedgerProps {
  mode: 'direct' | 'answer_key';
  uniqueMatches: SimilarityMatch[];
  expectedMatches: SimilarityMatch[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onHoverMatch: (id: string | null) => void;
  docATitle: string;
  docBTitle: string;
}

type FilterTab = 'unique' | 'exact' | 'paraphrase' | 'answer_key';

export const MatchLedger: React.FC<MatchLedgerProps> = ({
  mode,
  uniqueMatches,
  expectedMatches,
  activeMatchId,
  onSelectMatch,
  onHoverMatch,
  docATitle,
  docBTitle,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('unique');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveTab: FilterTab =
    mode === 'direct' && filterTab === 'answer_key' ? 'unique' : filterTab;

  const displayedRows = useMemo(() => {
    let source: SimilarityMatch[];
    if (effectiveTab === 'answer_key') {
      source = expectedMatches;
    } else if (effectiveTab === 'exact') {
      source = uniqueMatches.filter((m) => m.kind === 'exact');
    } else if (effectiveTab === 'paraphrase') {
      source = uniqueMatches.filter((m) => m.kind === 'paraphrase');
    } else {
      source = uniqueMatches;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (m) =>
        m.spanA.text.toLowerCase().includes(q) ||
        m.spanB.text.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q)
    );
  }, [effectiveTab, uniqueMatches, expectedMatches, searchQuery]);

  return (
    <section
      id="match-ledger"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Ledger Header & Filters */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {mode === 'answer_key'
              ? 'Oversigt over unikke ligheder og facit-overlap'
              : 'Oversigt over unikke ligheder'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'answer_key'
              ? 'Passager der deles af begge besvarelser uden for facit, adskilt fra forventet overlap med rettevejledningen.'
              : 'Klik på en række for at fokusere og rulle direkte til det samme sted i begge dokumenter.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterTab('unique')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                effectiveTab === 'unique'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'answer_key'
                ? `Unik lighed (${uniqueMatches.length})`
                : `Alle unikke (${uniqueMatches.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('exact')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                effectiveTab === 'exact'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ordret ({uniqueMatches.filter((m) => m.kind === 'exact').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('paraphrase')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                effectiveTab === 'paraphrase'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Omskrivning ({uniqueMatches.filter((m) => m.kind === 'paraphrase').length})
            </button>
            {mode === 'answer_key' && (
              <button
                type="button"
                onClick={() => setFilterTab('answer_key')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  effectiveTab === 'answer_key'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matcher facit ({expectedMatches.length})
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søg i passager…"
              aria-label="Filtrer matchede passager"
              className="pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg w-48 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {displayedRows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">
            {effectiveTab === 'answer_key'
              ? 'Ingen fælles passager overlappede med facit.'
              : searchQuery
              ? 'Ingen fundne passager matcher din søgning.'
              : 'Ingen unikke ligheder fundet med den valgte grænse.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? 'Prøv at rydde søgefeltet eller skifte filter.'
              : 'Prøv at sænke minimumslængden for fraser eller aktivere omskrivnings-analyse.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap w-20">Nr.</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-40">Klassifikation</th>
                <th className="py-2.5 px-3 min-w-[240px]">
                  <span className="truncate block max-w-[260px]">{docATitle}</span>
                </th>
                <th className="py-2.5 px-3 min-w-[240px]">
                  <span className="truncate block max-w-[260px]">{docBTitle}</span>
                </th>
                {mode === 'answer_key' && (
                  <th className="py-2.5 px-3 whitespace-nowrap text-right w-28">
                    Facit-overlap
                  </th>
                )}
                <th className="py-2.5 px-3 whitespace-nowrap text-right w-24">Ord</th>
                <th className="py-2.5 px-4 whitespace-nowrap text-right w-24">Lighed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedRows.map((m) => {
                const isSelected = activeMatchId === m.id;
                const isAnswerKeyMatch = m.classification === 'matches_answer_key';

                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMatch(m.id)}
                    onMouseEnter={() => onHoverMatch(m.id)}
                    onMouseLeave={() => onHoverMatch(null)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap align-top">
                      {m.label}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <span
                        className={`font-medium ${
                          isAnswerKeyMatch
                            ? 'text-emerald-700'
                            : m.kind === 'exact'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {isAnswerKeyMatch
                          ? 'Matcher facit'
                          : m.kind === 'exact'
                          ? 'Unik · Ordret'
                          : 'Unik · Omskrivning'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 align-top leading-relaxed">
                      <span className="line-clamp-3">{m.spanA.text}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 align-top leading-relaxed">
                      <span className="line-clamp-3">{m.spanB.text}</span>
                    </td>
                    {mode === 'answer_key' && (
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap align-top">
                        {m.answerKeyOverlapPct} %
                      </td>
                    )}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap align-top">
                      {m.spanA.wordCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap align-top">
                      {m.similarityPct} %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
