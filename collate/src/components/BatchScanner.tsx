import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  FolderPlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { parseUploadedFile } from '../lib/documentParser';
import {
  tokenizeText,
  type BatchComparisonResult,
  type BatchDocumentInput,
  type BatchPairSummary,
} from '../lib/similarityEngine';
import { DocumentPane, type HighlightSpan } from './DocumentPane';
import { MatchLedger } from './MatchLedger';

interface BatchScannerProps {
  docs: BatchDocumentInput[];
  onDocsChange: (docs: BatchDocumentInput[]) => void;
  answerKeyTitle: string;
  onAnswerKeyTitleChange: (title: string) => void;
  answerKeyText: string;
  onAnswerKeyTextChange: (text: string) => void;
  result: BatchComparisonResult;
  showAnswerKeyOverlaps: boolean;
}

type BatchViewMode = 'table' | 'matrix';

function fmtPct(val: number): string {
  return String(val).replace('.', ',') + ' %';
}

export const BatchScanner: React.FC<BatchScannerProps> = ({
  docs,
  onDocsChange,
  answerKeyTitle,
  onAnswerKeyTitleChange,
  answerKeyText,
  onAnswerKeyTextChange,
  result,
  showAnswerKeyOverlaps,
}) => {
  const [viewMode, setViewMode] = useState<BatchViewMode>('table');
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [showAnswerKeyBox, setShowAnswerKeyBox] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [onlyFlaggedPairs, setOnlyFlaggedPairs] = useState(false);

  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const selectedPair: BatchPairSummary | null = useMemo(() => {
    if (!selectedPairId) return null;
    return result.pairs.find((p) => p.pairId === selectedPairId) || null;
  }, [result.pairs, selectedPairId]);

  const docMap = useMemo(() => {
    const map = new Map<string, BatchDocumentInput>();
    for (const d of docs) map.set(d.id, d);
    return map;
  }, [docs]);

  const handleBatchFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadError(null);
    setIsParsing(true);
    const added: BatchDocumentInput[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const parsed = await parseUploadedFile(file);
        added.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: parsed.title,
          text: parsed.text,
        });
      } catch (err) {
        errors.push(
          err instanceof Error ? err.message : `Kunne ikke læse "${file.name}".`
        );
      }
    }

    if (added.length > 0) {
      onDocsChange([...docs, ...added]);
    }
    if (errors.length > 0) {
      setUploadError(errors.join(' '));
    }
    setIsParsing(false);
  };

  const handleAnswerKeyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const parsed = await parseUploadedFile(file);
      onAnswerKeyTitleChange(parsed.title);
      onAnswerKeyTextChange(parsed.text);
      setShowAnswerKeyBox(true);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Kunne ikke læse facit-filen.'
      );
    }
    e.target.value = '';
  };

  const removeDoc = (id: string) => {
    const next = docs.filter((d) => d.id !== id);
    onDocsChange(next);
    if (selectedPair && (selectedPair.docAId === id || selectedPair.docBId === id)) {
      setSelectedPairId(null);
      setActiveMatchId(null);
    }
  };

  const displayedPairs = useMemo(() => {
    if (!onlyFlaggedPairs) return result.pairs;
    return result.pairs.filter((p) => p.uniqueMatchCount > 0);
  }, [result.pairs, onlyFlaggedPairs]);

  // Lookup map for N x N matrix cells
  const pairLookup = useMemo(() => {
    const map = new Map<string, BatchPairSummary>();
    for (const p of result.pairs) {
      map.set(`${p.docAId}__${p.docBId}`, p);
      map.set(`${p.docBId}__${p.docAId}`, p);
    }
    return map;
  }, [result.pairs]);

  const { pairHighlightsA, pairHighlightsB } = useMemo(() => {
    const hA: HighlightSpan[] = [];
    const hB: HighlightSpan[] = [];
    if (!selectedPair) return { pairHighlightsA: hA, pairHighlightsB: hB };

    for (const m of selectedPair.matches) {
      hA.push({
        id: m.id,
        label: m.label,
        startChar: m.spanA.startChar,
        endChar: m.spanA.endChar,
        kind: m.kind,
        category: 'unique_similarity',
        similarityPct: m.similarityPct,
      });
      hB.push({
        id: m.id,
        label: m.label,
        startChar: m.spanB.startChar,
        endChar: m.spanB.endChar,
        kind: m.kind,
        category: 'unique_similarity',
        similarityPct: m.similarityPct,
      });
    }

    if (showAnswerKeyOverlaps && result.usedAnswerKey) {
      for (const m of selectedPair.expectedMatches) {
        hA.push({
          id: m.id,
          label: m.label,
          startChar: m.spanA.startChar,
          endChar: m.spanA.endChar,
          kind: m.kind,
          category: 'answer_key_overlap',
          similarityPct: m.similarityPct,
        });
        hB.push({
          id: m.id,
          label: m.label,
          startChar: m.spanB.startChar,
          endChar: m.spanB.endChar,
          kind: m.kind,
          category: 'answer_key_overlap',
          similarityPct: m.similarityPct,
        });
      }
    }

    return { pairHighlightsA: hA, pairHighlightsB: hB };
  }, [selectedPair, showAnswerKeyOverlaps, result.usedAnswerKey]);

  return (
    <div className="space-y-6">
      {/* Multi-file Dropzone & Optional Facit Bar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Left 2 cols: Batch Upload & Student File Roster */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              void handleBatchFiles(e.dataTransfer.files);
            }
          }}
          className={`lg:col-span-2 bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors ${
            isDragging ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Indlæs bunke af opgavebesvarelser
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Træk flere filer ind på én gang (.pdf, .docx, .txt, .md) for at krydssammenligne alle besvarelser før retning.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.markdown,.pdf,.docx,.html,.htm,.csv"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void handleBatchFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
                className="hidden"
                aria-label="Tilføj flere opgavefiler til holdscanning"
              />
              <button
                type="button"
                onClick={() => multiFileInputRef.current?.click()}
                disabled={isParsing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isParsing ? 'Indlæser filer…' : 'Tilføj flere filer'}</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="font-medium text-rose-700 hover:text-rose-900 cursor-pointer"
              >
                Luk
              </button>
            </div>
          )}

          {docs.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-lg py-10 px-4 text-center bg-slate-50/60">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs font-semibold text-slate-800">
                Ingen besvarelser i bunken endnu
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Slip 2 eller flere elevbesvarelser her, eller vælg et klassesæt i prøvemenuen ovenfor.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
              {result.docStats.map((stat) => (
                <div
                  key={stat.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-slate-900 truncate">
                      {stat.title}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                      {stat.wordCount.toLocaleString('da-DK')} ord
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-mono tabular-nums font-semibold whitespace-nowrap ${
                        stat.highestPairPct >= 20
                          ? 'text-rose-700'
                          : stat.highestPairPct > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      Maks {fmtPct(stat.highestPairPct)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDoc(stat.id)}
                      aria-label={`Fjern ${stat.title}`}
                      className="p-1 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col: Optional Facit / Opgaveoplæg exclusion */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Facit / opgaveoplæg (valgfri)
              </h2>
              <input
                ref={keyFileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.pdf,.docx,.html,.htm,.csv"
                onChange={handleAnswerKeyFile}
                className="hidden"
                aria-label="Upload facit eller opgaveoplæg til holdscanning"
              />
              <button
                type="button"
                onClick={() => keyFileInputRef.current?.click()}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
              >
                Upload facit
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Hvis alle elever besvarer samme opgave, kan du indsætte facit eller opgaveteksten her. Så frasorteres forventede fagudtryk i hele holdet.
            </p>
          </div>

          {showAnswerKeyBox || answerKeyText.trim().length > 0 ? (
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={answerKeyTitle}
                  onChange={(e) => onAnswerKeyTitleChange(e.target.value)}
                  aria-label="Titel på facit"
                  className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1 min-w-0 focus:outline-none focus:border-blue-600"
                />
                {answerKeyText && (
                  <button
                    type="button"
                    onClick={() => {
                      onAnswerKeyTextChange('');
                      setShowAnswerKeyBox(false);
                    }}
                    className="text-xs text-slate-500 hover:text-rose-700 whitespace-nowrap cursor-pointer"
                  >
                    Fjern facit
                  </button>
                )}
              </div>
              <textarea
                value={answerKeyText}
                onChange={(e) => onAnswerKeyTextChange(e.target.value)}
                placeholder="Indsæt facit eller opgavetekst her…"
                aria-label="Facit tekst til frasortering i holdscanning"
                className="w-full flex-1 min-h-[120px] resize-none text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAnswerKeyBox(true)}
              className="w-full py-2.5 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              + Tilføj facit eller opgaveformulering
            </button>
          )}
        </div>
      </section>

      {/* 4-Column Tabular KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Besvarelser i holdet</p>
          <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
            {docs.length}
          </p>
          <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
            {result.totalPairs} par sammenlignet
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Par med unik lighed</p>
          <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-rose-700">
            {result.flaggedPairCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {result.usedAnswerKey ? 'Uden for indsat facit' : 'Direkte par-sammenligning'}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Højeste par-lighed</p>
          <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
            {fmtPct(result.highestPairPct)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate" title={result.highestPairLabel}>
            {result.highestPairLabel}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Længste fælles passage</p>
          <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
            {result.longestSpanWords}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">ord</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {result.longestSpanWords > 0
              ? 'På tværs af alle par'
              : 'Ingen passager over grænsen'}
          </p>
        </div>
      </section>

      {/* Pairwise Results: Ranked Table OR N x N Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Vurdering før retning — alle sammenlignede par
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik på et par i listen eller i matrixen for at åbne begge besvarelser side om side med fremhævede ligheder.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {viewMode === 'table' && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyFlaggedPairs}
                  onChange={(e) => setOnlyFlaggedPairs(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-blue-600"
                />
                <span>Vis kun par med lighed</span>
              </label>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rangeret liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lighedsmatrix
              </button>
            </div>
          </div>
        </div>

        {docs.length < 2 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              Tilføj mindst 2 besvarelser for at starte holdscanning
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Alle uploadede dokumenter sammenlignes automatisk på kryds og tværs.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          displayedPairs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">
                Ingen par havde unikke ligheder over den valgte tærskel.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Fjern fluebenet i "Vis kun par med lighed" for at se alle {result.totalPairs} par.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4 whitespace-nowrap w-16">Rang</th>
                    <th className="py-2.5 px-3">Besvarelse A</th>
                    <th className="py-2.5 px-3">Besvarelse B</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Unik lighed (maks)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Passager</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Længste</th>
                    {result.usedAnswerKey && (
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">Facit frasorteret</th>
                    )}
                    <th className="py-2.5 px-4 whitespace-nowrap text-right">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedPairs.map((pair, idx) => {
                    const isSelected = selectedPairId === pair.pairId;
                    return (
                      <tr
                        key={pair.pairId}
                        onClick={() => {
                          setSelectedPairId(pair.pairId);
                          setActiveMatchId(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          <span className="truncate block max-w-[220px]">{pair.docATitle}</span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500">
                            {fmtPct(pair.similarityPctA)} overlappet
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          <span className="truncate block max-w-[220px]">{pair.docBTitle}</span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500">
                            {fmtPct(pair.similarityPctB)} overlappet
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                          <span
                            className={
                              pair.maxSimilarityPct >= 20
                                ? 'text-rose-700'
                                : pair.uniqueMatchCount > 0
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }
                          >
                            {fmtPct(pair.maxSimilarityPct)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {pair.uniqueMatchCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {pair.longestSpanWords} ord
                        </td>
                        {result.usedAnswerKey && (
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                            {pair.filteredOverlapCount}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                            <span>Inspicer</span>
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-semibold text-slate-500 min-w-[160px]">
                    Besvarelse
                  </th>
                  {docs.map((colDoc, colIdx) => (
                    <th
                      key={colDoc.id}
                      title={colDoc.title}
                      className="p-2 text-center font-mono text-slate-600 min-w-[74px]"
                    >
                      <span className="block truncate max-w-[72px]">
                        #{colIdx + 1}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((rowDoc, rowIdx) => (
                  <tr key={rowDoc.id} className="border-t border-slate-100">
                    <td className="p-2 font-medium text-slate-900 whitespace-nowrap">
                      <span className="font-mono text-slate-400 mr-1.5">#{rowIdx + 1}</span>
                      <span className="truncate inline-block max-w-[160px] align-bottom" title={rowDoc.title}>
                        {rowDoc.title}
                      </span>
                    </td>
                    {docs.map((colDoc) => {
                      if (rowDoc.id === colDoc.id) {
                        return (
                          <td
                            key={colDoc.id}
                            className="p-2 text-center font-mono text-slate-300 bg-slate-50"
                          >
                            —
                          </td>
                        );
                      }
                      const pair = pairLookup.get(`${rowDoc.id}__${colDoc.id}`);
                      if (!pair) return <td key={colDoc.id} className="p-2" />;
                      const pct = pair.maxSimilarityPct;
                      const isSelected = selectedPairId === pair.pairId;
                      let cellStyle = 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100';
                      if (pct >= 20) {
                        cellStyle = 'bg-rose-100 text-rose-900 font-semibold hover:bg-rose-200';
                      } else if (pair.uniqueMatchCount > 0) {
                        cellStyle = 'bg-amber-100/80 text-amber-900 font-medium hover:bg-amber-200';
                      }

                      return (
                        <td key={colDoc.id} className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPairId(pair.pairId);
                              setActiveMatchId(null);
                            }}
                            title={`${rowDoc.title} ↔ ${colDoc.title}: ${fmtPct(pct)} (${pair.uniqueMatchCount} unikke passager)`}
                            className={`w-full py-1.5 px-1 rounded font-mono tabular-nums transition-colors cursor-pointer ${cellStyle} ${
                              isSelected ? 'ring-2 ring-slate-900' : ''
                            }`}
                          >
                            {fmtPct(pct)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Selected Pair Side-by-Side Inspector */}
      {selectedPair && docMap.has(selectedPair.docAId) && docMap.has(selectedPair.docBId) && (
        <section className="space-y-4 pt-2">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Detaljeret par-inspektion
              </p>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                {selectedPair.docATitle} ↔ {selectedPair.docBTitle}
                <span className="ml-2 font-mono tabular-nums text-rose-700">
                  ({fmtPct(selectedPair.maxSimilarityPct)} maks unik lighed)
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPairId(null);
                setActiveMatchId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Luk par-visning</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <DocumentPane
              roleLabel="Valgt besvarelse A"
              title={selectedPair.docATitle}
              onTitleChange={() => {}}
              text={docMap.get(selectedPair.docAId)!.text}
              onTextChange={() => {}}
              highlights={pairHighlightsA}
              activeMatchId={activeMatchId}
              hoveredMatchId={hoveredMatchId}
              onSelectMatch={setActiveMatchId}
              onHoverMatch={setHoveredMatchId}
              wordCount={tokenizeText(docMap.get(selectedPair.docAId)!.text).length}
              statSummary={`${fmtPct(selectedPair.similarityPctA)} unik lighed`}
              placeholder=""
              readOnly
            />
            <DocumentPane
              roleLabel="Valgt besvarelse B"
              title={selectedPair.docBTitle}
              onTitleChange={() => {}}
              text={docMap.get(selectedPair.docBId)!.text}
              onTextChange={() => {}}
              highlights={pairHighlightsB}
              activeMatchId={activeMatchId}
              hoveredMatchId={hoveredMatchId}
              onSelectMatch={setActiveMatchId}
              onHoverMatch={setHoveredMatchId}
              wordCount={tokenizeText(docMap.get(selectedPair.docBId)!.text).length}
              statSummary={`${fmtPct(selectedPair.similarityPctB)} unik lighed`}
              placeholder=""
              readOnly
            />
          </div>

          <MatchLedger
            mode={result.usedAnswerKey ? 'answer_key' : 'direct'}
            uniqueMatches={selectedPair.matches}
            expectedMatches={selectedPair.expectedMatches}
            activeMatchId={activeMatchId}
            onSelectMatch={setActiveMatchId}
            onHoverMatch={setHoveredMatchId}
            docATitle={selectedPair.docATitle}
            docBTitle={selectedPair.docBTitle}
          />
        </section>
      )}
    </div>
  );
};
