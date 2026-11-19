import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from 'lucide-react';
import { BatchScanner } from './components/BatchScanner';
import { DocumentPane, type HighlightSpan } from './components/DocumentPane';
import { MatchLedger } from './components/MatchLedger';
import {
  compareBatchDocuments,
  compareDocuments,
  compareWithAnswerKey,
  tokenizeText,
  type BatchDocumentInput,
  type ComparisonOptions,
  type SimilarityMatch,
} from './lib/similarityEngine';
import {
  ANSWER_KEY_SAMPLES,
  BATCH_SAMPLES,
  DIRECT_SAMPLES,
} from './lib/sampleDocuments';
import { exportPdfReport } from './lib/reportExporter';

type ComparisonMode = 'direct' | 'answer_key' | 'batch';

function fmtPct(val: number): string {
  return String(val).replace('.', ',') + ' %';
}

export default function App() {
  const [mode, setMode] = useState<ComparisonMode>('direct');

  // Direct comparison state
  const [directSampleIdx, setDirectSampleIdx] = useState(0);
  const [directDocATitle, setDirectDocATitle] = useState(DIRECT_SAMPLES[0].docATitle);
  const [directDocAText, setDirectDocAText] = useState(DIRECT_SAMPLES[0].docAText);
  const [directDocBTitle, setDirectDocBTitle] = useState(DIRECT_SAMPLES[0].docBTitle);
  const [directDocBText, setDirectDocBText] = useState(DIRECT_SAMPLES[0].docBText);

  // Answer-key comparison state
  const [keySampleIdx, setKeySampleIdx] = useState(0);
  const [keyDocATitle, setKeyDocATitle] = useState(ANSWER_KEY_SAMPLES[0].docATitle);
  const [keyDocAText, setKeyDocAText] = useState(ANSWER_KEY_SAMPLES[0].docAText);
  const [keyDocBTitle, setKeyDocBTitle] = useState(ANSWER_KEY_SAMPLES[0].docBTitle);
  const [keyDocBText, setKeyDocBText] = useState(ANSWER_KEY_SAMPLES[0].docBText);
  const [answerKeyTitle, setAnswerKeyTitle] = useState(
    ANSWER_KEY_SAMPLES[0].answerKeyTitle || 'Facit.txt'
  );
  const [answerKeyText, setAnswerKeyText] = useState(
    ANSWER_KEY_SAMPLES[0].answerKeyText || ''
  );

  // Batch comparison state
  const [batchDocs, setBatchDocs] = useState<BatchDocumentInput[]>(BATCH_SAMPLES[0].docs);
  const [batchKeyTitle, setBatchKeyTitle] = useState(BATCH_SAMPLES[0].answerKeyTitle);
  const [batchKeyText, setBatchKeyText] = useState(BATCH_SAMPLES[0].answerKeyText);

  // Detection configuration
  const [minPhraseWords, setMinPhraseWords] = useState<number>(4);
  const [includeParaphrases, setIncludeParaphrases] = useState<boolean>(true);
  const [showAnswerKeyOverlaps, setShowAnswerKeyOverlaps] = useState<boolean>(true);

  // Interactive match focus
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  const options: ComparisonOptions = useMemo(
    () => ({
      minPhraseWords,
      includeParaphrases,
      ignoreStopwordOnly: true,
    }),
    [minPhraseWords, includeParaphrases]
  );

  const directResult = useMemo(() => {
    if (mode !== 'direct') return null;
    return compareDocuments(directDocAText, directDocBText, options);
  }, [mode, directDocAText, directDocBText, options]);

  const answerKeyResult = useMemo(() => {
    if (mode !== 'answer_key') return null;
    return compareWithAnswerKey(keyDocAText, keyDocBText, answerKeyText, options);
  }, [mode, keyDocAText, keyDocBText, answerKeyText, options]);

  const batchResult = useMemo(() => {
    if (mode !== 'batch') return null;
    return compareBatchDocuments(batchDocs, batchKeyText, options);
  }, [mode, batchDocs, batchKeyText, options]);

  const activeUniqueMatches: SimilarityMatch[] = useMemo(() => {
    if (mode === 'direct' && directResult) return directResult.matches;
    if (mode === 'answer_key' && answerKeyResult) return answerKeyResult.uniqueMatches;
    return [];
  }, [mode, directResult, answerKeyResult]);

  const { highlightsA, highlightsB, highlightsKey } = useMemo(() => {
    const hA: HighlightSpan[] = [];
    const hB: HighlightSpan[] = [];
    const hKey: HighlightSpan[] = [];

    if (mode === 'direct' && directResult) {
      for (const m of directResult.matches) {
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
    } else if (mode === 'answer_key' && answerKeyResult) {
      for (const m of answerKeyResult.uniqueMatches) {
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

      if (showAnswerKeyOverlaps) {
        for (const m of answerKeyResult.expectedMatches) {
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
        for (const km of answerKeyResult.keyMatchesA) {
          hKey.push({
            id: km.id,
            label: 'Facit',
            startChar: km.spanKey.startChar,
            endChar: km.spanKey.endChar,
            kind: km.kind,
            category: 'answer_key_overlap',
            similarityPct: km.similarityPct,
          });
        }
        for (const km of answerKeyResult.keyMatchesB) {
          hKey.push({
            id: km.id,
            label: 'Facit',
            startChar: km.spanKey.startChar,
            endChar: km.spanKey.endChar,
            kind: km.kind,
            category: 'answer_key_overlap',
            similarityPct: km.similarityPct,
          });
        }
      }
    }

    return { highlightsA: hA, highlightsB: hB, highlightsKey: hKey };
  }, [mode, directResult, answerKeyResult, showAnswerKeyOverlaps]);

  const activeMatchIndex = useMemo(() => {
    if (!activeMatchId) return -1;
    return activeUniqueMatches.findIndex((m) => m.id === activeMatchId);
  }, [activeUniqueMatches, activeMatchId]);

  const stepMatch = (direction: -1 | 1) => {
    if (activeUniqueMatches.length === 0) return;
    if (activeMatchIndex === -1) {
      setActiveMatchId(
        direction === 1
          ? activeUniqueMatches[0].id
          : activeUniqueMatches[activeUniqueMatches.length - 1].id
      );
      return;
    }
    const nextIdx =
      (activeMatchIndex + direction + activeUniqueMatches.length) %
      activeUniqueMatches.length;
    setActiveMatchId(activeUniqueMatches[nextIdx].id);
  };

  const handleLoadDirectSample = (idx: number) => {
    const sample = DIRECT_SAMPLES[idx];
    setDirectSampleIdx(idx);
    setDirectDocATitle(sample.docATitle);
    setDirectDocAText(sample.docAText);
    setDirectDocBTitle(sample.docBTitle);
    setDirectDocBText(sample.docBText);
    setActiveMatchId(null);
  };

  const handleLoadKeySample = (idx: number) => {
    const sample = ANSWER_KEY_SAMPLES[idx];
    setKeySampleIdx(idx);
    setKeyDocATitle(sample.docATitle);
    setKeyDocAText(sample.docAText);
    setKeyDocBTitle(sample.docBTitle);
    setKeyDocBText(sample.docBText);
    setAnswerKeyTitle(sample.answerKeyTitle || 'Facit.txt');
    setAnswerKeyText(sample.answerKeyText || '');
    setActiveMatchId(null);
  };

  const handleLoadBatchSample = () => {
    setBatchDocs(BATCH_SAMPLES[0].docs);
    setBatchKeyTitle(BATCH_SAMPLES[0].answerKeyTitle);
    setBatchKeyText(BATCH_SAMPLES[0].answerKeyText);
  };

  const handleClearAll = () => {
    setActiveMatchId(null);
    if (mode === 'direct') {
      setDirectDocATitle('Dokument A.txt');
      setDirectDocAText('');
      setDirectDocBTitle('Dokument B.txt');
      setDirectDocBText('');
    } else if (mode === 'answer_key') {
      setKeyDocATitle('Besvarelse A.txt');
      setKeyDocAText('');
      setKeyDocBTitle('Besvarelse B.txt');
      setKeyDocBText('');
      setAnswerKeyTitle('Facit.txt');
      setAnswerKeyText('');
    } else {
      setBatchDocs([]);
      setBatchKeyTitle('Facit.txt');
      setBatchKeyText('');
    }
  };

  const handleExportReport = () => {
    const activeResult =
      mode === 'direct'
        ? directResult
        : mode === 'answer_key'
        ? answerKeyResult
        : batchResult;
    if (!activeResult) return;

    const titles =
      mode === 'direct'
        ? { docA: directDocATitle, docB: directDocBTitle }
        : mode === 'answer_key'
        ? { docA: keyDocATitle, docB: keyDocBTitle, answerKey: answerKeyTitle }
        : { answerKey: batchKeyTitle };

    exportPdfReport(activeResult, titles, options);
  };

  const switchMode = (nextMode: ComparisonMode) => {
    setMode(nextMode);
    setActiveMatchId(null);
    setHoveredMatchId(null);
  };

  const longestMatchWords = useMemo(() => {
    if (activeUniqueMatches.length === 0) return 0;
    return Math.max(...activeUniqueMatches.map((m) => m.spanA.wordCount));
  }, [activeUniqueMatches]);

  const directWordsA = directResult ? directResult.tokensA.length : tokenizeText(directDocAText).length;
  const directWordsB = directResult ? directResult.tokensB.length : tokenizeText(directDocBText).length;
  const keyWordsA = answerKeyResult ? answerKeyResult.tokensA.length : tokenizeText(keyDocAText).length;
  const keyWordsB = answerKeyResult ? answerKeyResult.tokensB.length : tokenizeText(keyDocBText).length;
  const keyWordsKey = answerKeyResult ? answerKeyResult.tokensKey.length : tokenizeText(answerKeyText).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Collate
          </a>

          <nav
            aria-label="Primær navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => {
                switchMode('direct');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'direct' ? 'text-slate-900 underline' : ''
              }`}
            >
              Dokumentscan
            </button>
            <button
              type="button"
              onClick={() => {
                switchMode('answer_key');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'answer_key' ? 'text-slate-900 underline' : ''
              }`}
            >
              Facit-tjek
            </button>
            <button
              type="button"
              onClick={() => {
                switchMode('batch');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'batch' ? 'text-slate-900 underline' : ''
              }`}
            >
              Holdscanning
            </button>
            <a
              href="#methodology"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Metode
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Eksporter rapport</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Page Title & Mode Switcher */}
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              {mode === 'direct'
                ? 'Scan dokumenter mod hinanden og fremhæv alle unikke ligheder'
                : mode === 'answer_key'
                ? 'Hold to besvarelser op mod facit for at afsløre unikke sammenfald'
                : 'Sammenlign en hel bunke opgaver før du går i gang med at rette'}
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {mode === 'direct'
                ? 'Upload .pdf-, .docx-, .txt- eller .md-filer i begge felter. Ordrette passager og omskrivninger indekseres og krydslinkes automatisk.'
                : mode === 'answer_key'
                ? 'Fagudtryk og formuleringer, der stammer fra facit, frasorteres automatisk, så kun de unikke ligheder mellem de to besvarelser bliver fremhævet.'
                : 'Upload hele klassens besvarelser på én gang. Alle par krydstjekkes automatisk og rangeres efter unik lighed, så du kan inspicere mistænkelige par før retning.'}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Sammenligningstilstand"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start lg:self-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'direct'}
              onClick={() => switchMode('direct')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'direct'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dokument mod dokument
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'answer_key'}
              onClick={() => switchMode('answer_key')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'answer_key'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              To besvarelser mod facit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'batch'}
              onClick={() => switchMode('batch')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'batch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Holdscanning (batch)
            </button>
          </div>
        </section>

        {/* Workspace Controls Strip */}
        <section className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span className="whitespace-nowrap">Mindste frase</span>
              <select
                value={minPhraseWords}
                onChange={(e) => {
                  setMinPhraseWords(Number(e.target.value));
                  setActiveMatchId(null);
                }}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value={3}>3 ord</option>
                <option value={4}>4 ord</option>
                <option value={5}>5 ord</option>
                <option value={6}>6 ord</option>
              </select>
            </label>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => {
                  setIncludeParaphrases(true);
                  setActiveMatchId(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  includeParaphrases
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ordret & omskrivning
              </button>
              <button
                type="button"
                onClick={() => {
                  setIncludeParaphrases(false);
                  setActiveMatchId(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !includeParaphrases
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kun ordret
              </button>
            </div>

            {(mode === 'answer_key' || (mode === 'batch' && batchKeyText.trim().length > 0)) && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setShowAnswerKeyOverlaps(true)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showAnswerKeyOverlaps
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vis facit-overlap
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswerKeyOverlaps(false)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    !showAnswerKeyOverlaps
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kun unik lighed
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'direct' ? (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="whitespace-nowrap">Eksempel</span>
                <select
                  value={directSampleIdx}
                  onChange={(e) => handleLoadDirectSample(Number(e.target.value))}
                  aria-label="Indlæs eksempel på direkte sammenligning"
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  {DIRECT_SAMPLES.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : mode === 'answer_key' ? (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="whitespace-nowrap">Eksempel</span>
                <select
                  value={keySampleIdx}
                  onChange={(e) => handleLoadKeySample(Number(e.target.value))}
                  aria-label="Indlæs eksempel på facit-tjek"
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  {ANSWER_KEY_SAMPLES.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <button
                type="button"
                onClick={handleLoadBatchSample}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Indlæs klassesæt (eksempel)
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ryd alt</span>
            </button>
          </div>
        </section>

        {/* MODE 3: Batch Scanner */}
        {mode === 'batch' && batchResult ? (
          <BatchScanner
            docs={batchDocs}
            onDocsChange={setBatchDocs}
            answerKeyTitle={batchKeyTitle}
            onAnswerKeyTitleChange={setBatchKeyTitle}
            answerKeyText={batchKeyText}
            onAnswerKeyTextChange={setBatchKeyText}
            result={batchResult}
            showAnswerKeyOverlaps={showAnswerKeyOverlaps}
          />
        ) : (
          <>
            {/* 4-Column Tabular KPI Strip for Direct / Answer Key */}
            <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {mode === 'direct' && directResult ? (
                <>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Lighed i Dokument A</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
                      {fmtPct(directResult.similarityPctA)}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      {directResult.matchedWordsA} af {directResult.tokensA.length} ord matchet
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Overlap i Dokument B</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
                      {fmtPct(directResult.similarityPctB)}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      {directResult.matchedWordsB} af {directResult.tokensB.length} ord matchet
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Unikke ligheder</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-rose-700">
                      {directResult.matches.length}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      {directResult.exactCount} ordret · {directResult.paraphraseCount} omskrivning
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Længste fælles passage</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
                      {longestMatchWords}{' '}
                      <span className="text-sm font-sans font-normal text-slate-500">ord</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {longestMatchWords > 0
                        ? 'Over valgt fraselængde'
                        : 'Ingen passager over grænsen'}
                    </p>
                  </div>
                </>
              ) : mode === 'answer_key' && answerKeyResult ? (
                <>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Unik lighed (Besvarelse A)</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-rose-700">
                      {fmtPct(answerKeyResult.uniqueSimilarityPctA)}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      {answerKeyResult.uniqueMatchedWordsA} ord uden for facit
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Unik lighed (Besvarelse B)</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-rose-700">
                      {fmtPct(answerKeyResult.uniqueSimilarityPctB)}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      {answerKeyResult.uniqueMatchedWordsB} ord uden for facit
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Unikke sammenfald fundet</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
                      {answerKeyResult.uniqueMatches.length}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Kun delt mellem A & B
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">Frasorteret mod facit</p>
                    <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-emerald-700">
                      {answerKeyResult.filteredOverlapCount}
                    </p>
                    <p className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                      A: {fmtPct(answerKeyResult.answerCoveragePctA)} · B:{' '}
                      {fmtPct(answerKeyResult.answerCoveragePctB)} i facit
                    </p>
                  </div>
                </>
              ) : null}
            </section>

            {/* Legend & Match Stepper */}
            <section className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm bg-rose-100 border-b-2 border-rose-500"
                    aria-hidden="true"
                  />
                  <span className="font-medium">
                    {mode === 'answer_key'
                      ? 'Unik lighed · Ordret (uden for facit)'
                      : 'Unik lighed · Ordret sammenfald'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm bg-amber-100 border-b-2 border-dashed border-amber-500"
                    aria-hidden="true"
                  />
                  <span className="font-medium">
                    {mode === 'answer_key'
                      ? 'Unik lighed · Omskrivning (uden for facit)'
                      : 'Unik lighed · Omskrivning / næsten ens'}
                  </span>
                </span>
                {mode === 'answer_key' && showAnswerKeyOverlaps && (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-sm bg-emerald-50 border-b border-emerald-400"
                      aria-hidden="true"
                    />
                    <span className="font-medium">Matcher facit (forventet overlap)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  {activeUniqueMatches.length === 0
                    ? '0 unikke ligheder'
                    : activeMatchIndex >= 0
                    ? `${activeUniqueMatches[activeMatchIndex].label} (${activeMatchIndex + 1} af ${activeUniqueMatches.length})`
                    : `${activeUniqueMatches.length} unikke ligheder`}
                </span>
                <div className="inline-flex items-center border border-slate-200 rounded-md bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => stepMatch(-1)}
                    disabled={activeUniqueMatches.length === 0}
                    aria-label="Forrige unikke lighed"
                    className="p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-r border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepMatch(1)}
                    disabled={activeUniqueMatches.length === 0}
                    aria-label="Næste unikke lighed"
                    className="p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            {/* Document Comparison Stage */}
            {mode === 'direct' ? (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <DocumentPane
                  roleLabel="Dokument A (Mål)"
                  title={directDocATitle}
                  onTitleChange={setDirectDocATitle}
                  text={directDocAText}
                  onTextChange={(val) => {
                    setDirectDocAText(val);
                    setActiveMatchId(null);
                  }}
                  highlights={highlightsA}
                  activeMatchId={activeMatchId}
                  hoveredMatchId={hoveredMatchId}
                  onSelectMatch={setActiveMatchId}
                  onHoverMatch={setHoveredMatchId}
                  wordCount={directWordsA}
                  statSummary={directResult ? `${fmtPct(directResult.similarityPctA)} matchet` : ''}
                  placeholder="Træk en .pdf-, .docx-, .txt- eller .md-fil hertil, eller indsæt tekst til scanning."
                />
                <DocumentPane
                  roleLabel="Dokument B (Reference)"
                  title={directDocBTitle}
                  onTitleChange={setDirectDocBTitle}
                  text={directDocBText}
                  onTextChange={(val) => {
                    setDirectDocBText(val);
                    setActiveMatchId(null);
                  }}
                  highlights={highlightsB}
                  activeMatchId={activeMatchId}
                  hoveredMatchId={hoveredMatchId}
                  onSelectMatch={setActiveMatchId}
                  onHoverMatch={setHoveredMatchId}
                  wordCount={directWordsB}
                  statSummary={directResult ? `${fmtPct(directResult.similarityPctB)} matchet` : ''}
                  placeholder="Træk et referencedokument (.pdf, .docx, .txt, .md) hertil for at sammenligne med Dokument A."
                />
              </section>
            ) : (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                <DocumentPane
                  roleLabel="Besvarelse A"
                  title={keyDocATitle}
                  onTitleChange={setKeyDocATitle}
                  text={keyDocAText}
                  onTextChange={(val) => {
                    setKeyDocAText(val);
                    setActiveMatchId(null);
                  }}
                  highlights={highlightsA}
                  activeMatchId={activeMatchId}
                  hoveredMatchId={hoveredMatchId}
                  onSelectMatch={setActiveMatchId}
                  onHoverMatch={setHoveredMatchId}
                  wordCount={keyWordsA}
                  statSummary={
                    answerKeyResult
                      ? `${fmtPct(answerKeyResult.uniqueSimilarityPctA)} unik lighed`
                      : ''
                  }
                  placeholder="Træk Besvarelse A (.pdf, .docx, .txt, .md) hertil eller indsæt tekst."
                />
                <DocumentPane
                  roleLabel="Besvarelse B"
                  title={keyDocBTitle}
                  onTitleChange={setKeyDocBTitle}
                  text={keyDocBText}
                  onTextChange={(val) => {
                    setKeyDocBText(val);
                    setActiveMatchId(null);
                  }}
                  highlights={highlightsB}
                  activeMatchId={activeMatchId}
                  hoveredMatchId={hoveredMatchId}
                  onSelectMatch={setActiveMatchId}
                  onHoverMatch={setHoveredMatchId}
                  wordCount={keyWordsB}
                  statSummary={
                    answerKeyResult
                      ? `${fmtPct(answerKeyResult.uniqueSimilarityPctB)} unik lighed`
                      : ''
                  }
                  placeholder="Træk Besvarelse B (.pdf, .docx, .txt, .md) hertil eller indsæt tekst."
                />
                <DocumentPane
                  roleLabel="Facit (Rettevejledning)"
                  title={answerKeyTitle}
                  onTitleChange={setAnswerKeyTitle}
                  text={answerKeyText}
                  onTextChange={(val) => {
                    setAnswerKeyText(val);
                    setActiveMatchId(null);
                  }}
                  highlights={highlightsKey}
                  activeMatchId={activeMatchId}
                  hoveredMatchId={hoveredMatchId}
                  onSelectMatch={setActiveMatchId}
                  onHoverMatch={setHoveredMatchId}
                  wordCount={keyWordsKey}
                  statSummary="Referencefacit"
                  placeholder="Træk det officielle facit eller rettevejledningen hertil for at frasortere forventede svar."
                  isAnswerKey
                />
              </section>
            )}

            {/* Match Ledger Table */}
            <MatchLedger
              mode={mode === 'answer_key' ? 'answer_key' : 'direct'}
              uniqueMatches={activeUniqueMatches}
              expectedMatches={answerKeyResult ? answerKeyResult.expectedMatches : []}
              activeMatchId={activeMatchId}
              onSelectMatch={setActiveMatchId}
              onHoverMatch={setHoveredMatchId}
              docATitle={mode === 'direct' ? directDocATitle : keyDocATitle}
              docBTitle={mode === 'direct' ? directDocBTitle : keyDocBTitle}
            />
          </>
        )}

        {/* Methodology Section */}
        <section
          id="methodology"
          className="bg-white border border-slate-200 rounded-xl p-6"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Sådan isoleres unikke ligheder
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                01. Sammenhængende frase-ankre
              </h3>
              <p>
                Hvert dokument opdeles i ord med nøjagtige tegnpositioner og indekseres efter normaliserede n-grammer. Matchende ankre udvides i begge retninger, så hele ordrette passager fanges uden overflødige brudstykker.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                02. Bøjet og omskrevet lighed
              </h3>
              <p>
                Sætninger, der ikke allerede er markeret som ordrette, vurderes ved hjælp af dansk/engelsk ordstammereduktion og bigram-sekvenser, så også omskrivninger og ændret ordstilling opdages.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                03. Frasortering af facit og holdscanning
              </h3>
              <p>
                Når besvarelser holdes op mod et facit, udskilles forventede fagudtryk i et grønt facit-lag. I holdscanning krydstjekkes alle opgavepar på én gang, så du straks kan se eventuel afskrift før retning.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Collate · Dokument- og plagiatkontrol</span>
          <span>Al filindlæsning (.pdf, .docx, .txt, .md) og lighedsanalyse kører lokalt i din browser.</span>
        </div>
      </footer>
    </div>
  );
}
