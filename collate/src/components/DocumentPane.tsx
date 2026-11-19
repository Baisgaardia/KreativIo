import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, Pencil, Eye, X, AlertCircle } from 'lucide-react';
import { parseUploadedFile } from '../lib/documentParser';
import type { MatchKind } from '../lib/similarityEngine';

export interface HighlightSpan {
  id: string;
  label: string;
  startChar: number;
  endChar: number;
  kind: MatchKind;
  category: 'unique_similarity' | 'answer_key_overlap';
  similarityPct: number;
}

interface DocumentPaneProps {
  roleLabel: string;
  title: string;
  onTitleChange: (title: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  highlights: HighlightSpan[];
  activeMatchId: string | null;
  hoveredMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onHoverMatch: (id: string | null) => void;
  wordCount: number;
  statSummary: string;
  placeholder: string;
  isAnswerKey?: boolean;
  readOnly?: boolean;
}

interface RenderedSegment {
  text: string;
  highlight: HighlightSpan | null;
}

function buildNonOverlappingSegments(text: string, highlights: HighlightSpan[]): RenderedSegment[] {
  if (!text) return [];
  if (highlights.length === 0) return [{ text, highlight: null }];

  const sorted = [...highlights].sort((a, b) => {
    if (a.startChar !== b.startChar) return a.startChar - b.startChar;
    if (a.category !== b.category) {
      return a.category === 'unique_similarity' ? -1 : 1;
    }
    return b.endChar - b.startChar - (a.endChar - a.startChar);
  });

  const clean: HighlightSpan[] = [];
  let cursor = 0;
  for (const h of sorted) {
    const start = Math.max(0, h.startChar);
    const end = Math.min(text.length, h.endChar);
    if (end <= start) continue;

    if (start >= cursor) {
      clean.push({ ...h, startChar: start, endChar: end });
      cursor = end;
    } else if (end > cursor && h.category === 'unique_similarity') {
      clean.push({ ...h, startChar: cursor, endChar: end });
      cursor = end;
    }
  }

  const segments: RenderedSegment[] = [];
  let pos = 0;
  for (const h of clean) {
    if (h.startChar > pos) {
      segments.push({ text: text.slice(pos, h.startChar), highlight: null });
    }
    segments.push({ text: text.slice(h.startChar, h.endChar), highlight: h });
    pos = h.endChar;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), highlight: null });
  }
  return segments;
}

export const DocumentPane: React.FC<DocumentPaneProps> = ({
  roleLabel,
  title,
  onTitleChange,
  text,
  onTextChange,
  highlights,
  activeMatchId,
  hoveredMatchId,
  onSelectMatch,
  onHoverMatch,
  wordCount,
  statSummary,
  placeholder,
  isAnswerKey = false,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => buildNonOverlappingSegments(text, highlights),
    [text, highlights]
  );

  useEffect(() => {
    if (!activeMatchId || isEditing || !scrollContainerRef.current) return;
    const target = scrollContainerRef.current.querySelector(
      `[data-match-id="${CSS.escape(activeMatchId)}"]`
    ) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeMatchId, isEditing]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsParsing(true);
    try {
      const parsed = await parseUploadedFile(file);
      onTitleChange(parsed.title);
      onTextChange(parsed.text);
      setIsEditing(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Kunne ikke læse det uploadede dokument.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (readOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <section
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      className={`flex flex-col bg-white rounded-xl border transition-colors duration-150 ${
        isDragging ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-slate-200'
      }`}
    >
      {/* Pane Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap shrink-0">
              {roleLabel}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-600 truncate">
              {wordCount.toLocaleString('da-DK')} ord
            </span>
            {statSummary && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className={`text-xs font-mono tabular-nums whitespace-nowrap shrink-0 ${
                    isAnswerKey ? 'text-emerald-700' : 'text-slate-700 font-medium'
                  }`}
                >
                  {statSummary}
                </span>
              </>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.pdf,.docx,.html,.htm,.csv"
                onChange={handleFileChange}
                className="hidden"
                aria-label={`Upload fil til ${roleLabel}`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isParsing ? 'Indlæser…' : 'Upload'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                disabled={!text && !isEditing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {isEditing ? (
                  <>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Vis</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Rediger</span>
                  </>
                )}
              </button>

              {text && (
                <button
                  type="button"
                  onClick={() => {
                    onTextChange('');
                    setIsEditing(false);
                    setUploadError(null);
                  }}
                  title="Ryd dokument"
                  aria-label={`Ryd ${roleLabel}`}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        <input
          type="text"
          value={title}
          readOnly={readOnly}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label={`Titel på ${roleLabel}`}
          className={`w-full text-sm font-semibold text-slate-900 bg-transparent border border-transparent rounded px-1.5 py-0.5 -mx-1.5 focus:outline-none transition-colors ${
            readOnly
              ? 'cursor-default'
              : 'hover:border-slate-200 focus:border-blue-600 focus:bg-slate-50/50'
          }`}
        />
      </div>

      {uploadError && (
        <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-700 hover:text-rose-900 font-medium whitespace-nowrap cursor-pointer"
          >
            Luk
          </button>
        </div>
      )}

      {/* Document Body */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 min-h-[400px] max-h-[540px] overflow-y-auto p-5"
      >
        {isDragging && (
          <div className="absolute inset-3 z-20 rounded-lg border-2 border-dashed border-blue-600 bg-blue-50/90 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
            <Upload className="w-6 h-6 text-blue-700 mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900">
              Slip dokument i {roleLabel}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Understøtter .pdf, .docx, .txt, .md, .html og .csv
            </p>
          </div>
        )}

        {!text && !isEditing ? (
          <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center px-4">
            <FileText className="w-8 h-8 text-slate-300 mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900">
              Intet dokument indlæst for {roleLabel}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              {placeholder}
            </p>
            {!readOnly && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Upload fil
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Indsæt tekst
                </button>
              </div>
            )}
          </div>
        ) : isEditing ? (
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={placeholder}
            aria-label={`Tekstredigering for ${roleLabel}`}
            className="w-full h-full min-h-[350px] resize-none text-[14.5px] leading-[1.7] text-slate-800 bg-transparent focus:outline-none font-sans"
          />
        ) : (
          <div className="text-[14.5px] leading-[1.75] text-slate-800 whitespace-pre-wrap break-words">
            {segments.map((seg, idx) => {
              if (!seg.highlight) {
                return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
              }

              const h = seg.highlight;
              const isActive = activeMatchId === h.id;
              const isHovered = hoveredMatchId === h.id;

              let styleClass = '';
              if (h.category === 'answer_key_overlap') {
                styleClass =
                  isActive || isHovered
                    ? 'bg-emerald-200/90 text-emerald-950 border-b-2 border-emerald-600'
                    : 'bg-emerald-50 text-emerald-950 border-b border-emerald-400';
              } else if (h.kind === 'exact') {
                styleClass =
                  isActive || isHovered
                    ? 'bg-rose-200 text-rose-950 border-b-2 border-rose-700 ring-1 ring-rose-500/50'
                    : 'bg-rose-100/85 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-200/80';
              } else {
                styleClass =
                  isActive || isHovered
                    ? 'bg-amber-200 text-amber-950 border-b-2 border-dashed border-amber-700 ring-1 ring-amber-500/50'
                    : 'bg-amber-100/80 text-amber-950 border-b-2 border-dashed border-amber-500 hover:bg-amber-200/75';
              }

              return (
                <mark
                  key={`${h.id}-${idx}`}
                  data-match-id={h.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMatch(h.id)}
                  onMouseEnter={() => onHoverMatch(h.id)}
                  onMouseLeave={() => onHoverMatch(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMatch(h.id);
                    }
                  }}
                  title={`${h.label} · ${
                    h.category === 'answer_key_overlap'
                      ? 'Matcher facit'
                      : h.kind === 'exact'
                      ? 'Unik ordret lighed'
                      : `Omskrivning (${h.similarityPct} %)`
                  }`}
                  className={`inline cursor-pointer rounded-[2px] px-0.5 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${styleClass}`}
                >
                  {seg.text}
                  <sup
                    className={`ml-0.5 font-mono text-[10px] font-semibold select-none ${
                      h.category === 'answer_key_overlap'
                        ? 'text-emerald-800'
                        : h.kind === 'exact'
                        ? 'text-rose-800'
                        : 'text-amber-800'
                    }`}
                  >
                    {h.label}
                  </sup>
                </mark>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
